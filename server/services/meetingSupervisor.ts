import { randomBytes } from "node:crypto";
import { spawn, execFile, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import { StringDecoder } from "node:string_decoder";
import path from "node:path";
import { getMeetingStore } from "./meetingStore.js";
import { meetingNotes } from "./meetingNotes.js";
import { sentenceCase } from "./meetingText.js";
import { validEvent, type MeetingEventInput, type MeetingSource } from "../../shared/meeting.js";

const token = randomBytes(32).toString("base64url");
const execFileAsync=promisify(execFile);
export async function enumerateDevices(source: MeetingSource): Promise<{id:string;label:string}[]> {
  const python=process.env.MEETING_PYTHON||path.join(process.cwd(),".venv-meeting-m0","Scripts","python.exe"), script=path.join(process.cwd(),"server","python","meeting_worker.py");
  const {stdout}=await execFileAsync(python,[script,"--devices","--source",source],{timeout:5000,maxBuffer:65536,windowsHide:true});
  const value=JSON.parse(stdout); if(!Array.isArray(value.devices)||value.devices.length>128)throw new Error("Invalid device response");
  return value.devices.filter((d:any)=>d.source===source).map((d:any)=>{if(!Number.isSafeInteger(d.index)||typeof d.name!=="string"||d.name.length>256||d.source!==source)throw new Error("Invalid device response");return{id:String(d.index),label:d.name};});
}
const workers = new Map<string, { child: ChildProcess; stopping: boolean; workerStopped: boolean; terminal: boolean; ready: boolean; timer: NodeJS.Timeout }>();
const listeners = new Set<(message: unknown) => void>();
export function onMeetingMessage(listener: (message: unknown) => void): () => void { listeners.add(listener); return () => listeners.delete(listener); }
function broadcastMeeting(message: unknown): void { for (const listener of listeners) listener(message); }
export function getMeetingToken(): string { return token; }
export function activeMeeting(): boolean { return workers.size > 0; }
function append(id: string, event: MeetingEventInput): void { getMeetingStore().append(id,event); }
function command(source: MeetingSource, device?: string): string[] { return ["--source",source,"--threads","2",...(device?["--device",device]:[])]; }
export function startMeeting(id: string, source: MeetingSource, device?: string, finalEngine = "sherpa", vocabulary = "", spawnWorker = spawn): void {
  const python=process.env.MEETING_PYTHON||path.join(process.cwd(),".venv-meeting-m0","Scripts","python.exe"), script=path.join(process.cwd(),"server","python","meeting_worker.py");
  append(id,{type:"status",status:"starting"});
  let child:ChildProcess;
  try { child=spawnWorker(python,[script,...command(source,device),"--final-engine",finalEngine,"--vocabulary",vocabulary],{stdio:["pipe","pipe","pipe"],windowsHide:true}); }
  catch(e:any){append(id,{type:"error",message:e.message});return;}
  const state={child,stopping:false,workerStopped:false,terminal:false,ready:false,timer:setTimeout(()=>fail("Worker readiness timed out"),30000)};
  workers.set(id,state);
  const decoder=new StringDecoder("utf8"); let buffer="";
  function enqueue(event: MeetingEventInput) {
    // Persist raw finals before handling the next worker frame, including failures.
    try { append(id, event); } catch { fail("Failed to save meeting transcript"); }
  }
  function fail(message:string){if(state.terminal)return;state.terminal=true;clearTimeout(state.timer);try{append(id,{type:"gap",start_ms:0,end_ms:0,reason:"capture interrupted"});append(id,{type:"error",message:message.slice(0,2000)});}catch{}child.kill();}
  child.stdout?.on("data",chunk=>{
    buffer+=decoder.write(chunk); if(buffer.length>65536&&!buffer.includes("\n")){fail("Worker message exceeded limit");return;}
    let at:number;while((at=buffer.indexOf("\n"))>=0){const line=buffer.slice(0,at).trimEnd();buffer=buffer.slice(at+1);if(!line)continue;if(line.length>32768){fail("Worker message exceeded limit");return;}try{const msg=JSON.parse(line);
      if(state.terminal)continue;
      if(state.workerStopped){fail("Worker emitted data after stop");return;}
      if(msg.type==="ready"){if(state.ready){fail("Duplicate worker ready");return;}state.ready=true;clearTimeout(state.timer);if(!state.stopping)append(id,{type:"status",status:"recording"});continue;}
      if(msg.type==="transcript.partial"){const s=msg.segment;if(!s||typeof s.text_raw!=="string"||s.text_raw.length>20000||s.source!==source||!Number.isSafeInteger(s.start_ms)||s.start_ms<0||!Number.isSafeInteger(s.end_ms)||s.end_ms<s.start_ms){fail("Invalid partial transcript");return;}broadcastMeeting({type:"transcript.partial",session_id:id,segment:{...s,text_raw:sentenceCase(s.text_raw)}});continue;}
      if(msg.type==="meter"){if(Number.isFinite(msg.level))broadcastMeeting({type:"meter",session_id:id,level:Math.max(0,Math.min(1,msg.level))});continue;}
      if(msg.type==="stopped"){if(!state.stopping||state.workerStopped){fail("Unexpected worker stopped marker");return;}state.workerStopped=true;continue;}
      if(msg.type==="error"){fail(String(msg.message||"Worker failed"));return;}
      if(!validEvent(msg)||msg.type==="status"||msg.type==="transcript.final"&&msg.segment.source!==source){fail("Invalid worker event");return;}
      enqueue(msg as unknown as MeetingEventInput);
    }catch{fail("Malformed worker message");return;}}
  });
  child.stderr?.on("data",()=>{});
  child.stdin?.on("error",()=>fail("Worker command stream failed"));
  child.on("error",e=>fail(e.message));
  child.on("close",code=>{clearTimeout(state.timer);try{if(!state.terminal){if(state.stopping&&state.workerStopped&&code===0){append(id,{type:"status",status:"stopped"});state.terminal=true;}else fail(state.ready?`Worker exited unexpectedly (${code})`:`Worker failed to start (${code})`);}}finally{workers.delete(id);if(process.env.NODE_ENV!=="test") { try { meetingNotes.request(id); } catch {} }}});
}
export async function stopMeeting(id:string):Promise<void>{const state=workers.get(id);if(!state)return;if(!state.stopping){state.stopping=true;try{append(id,{type:"status",status:"stopping"});state.child.stdin?.write(JSON.stringify({type:"stop"})+"\n");}catch{}}
  await new Promise<void>(resolve=>{if(!workers.has(id))return resolve();const timer=setTimeout(()=>{if(!state.terminal) {state.terminal=true;try{append(id,{type:"gap",start_ms:0,end_ms:0,reason:"worker stop timed out; capture may be incomplete"});append(id,{type:"error",message:"Worker stop timed out"});}catch{}state.child.kill();}resolve();},10000);state.child.once("close",()=>{clearTimeout(timer);resolve();});});}
export async function shutdownMeeting():Promise<void>{await Promise.all([...workers.keys()].map(stopMeeting));}
