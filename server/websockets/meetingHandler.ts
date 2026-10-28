import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, WebSocket } from "ws";
import { getMeetingToken, onMeetingMessage } from "../services/meetingSupervisor.js";
import { getMeetingStore } from "../services/meetingStore.js";

export function setupMeetingUpgrade(req:IncomingMessage,socket:Duplex,head:Buffer):void {
  const ip=req.socket.remoteAddress||""; if(!(ip==="127.0.0.1"||ip==="::1"||ip==="::ffff:127.0.0.1")){socket.destroy();return;}
  const host=req.headers.host||"", origin=req.headers.origin; if(!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host)){socket.destroy();return;} if(origin){try{const u=new URL(origin);if(u.host!==host||!(u.hostname==="localhost"||u.hostname==="127.0.0.1"||u.hostname==="[::1]")){socket.destroy();return;}}catch{socket.destroy();return;}}
  const wss=new WebSocketServer({noServer:true,maxPayload:8192});
  wss.handleUpgrade(req,socket,head,ws=>{let authed=false,subscribed=false;let last=0;let session="";
    const send=(x:any)=>{if(ws.readyState!==WebSocket.OPEN)return;if(ws.bufferedAmount>262144){ws.close(1013,"Replay required");return;}ws.send(JSON.stringify(x));};
    const flush=()=>{};
    ws.on("message",raw=>{try{const m=JSON.parse(raw.toString());if(!authed){if(m.type!=="auth"||m.token!==getMeetingToken())return ws.close(1008,"Unauthorized");authed=true;send({type:"authenticated"});return;}if(m.type!=="subscribe"||typeof m.session_id!=="string"||!Number.isSafeInteger(m.after_seq)||m.after_seq<0)return ws.close(1008,"Invalid subscription");if(subscribed&&m.session_id===session){last=Math.min(last,m.after_seq);return;}session=m.session_id;last=m.after_seq;subscribed=true;const s=getMeetingStore().get(session);if(!s)return ws.close(1008,"Unknown session");const events=getMeetingStore().events(session,last,500);send({type:"ready",session_id:session,after_seq:last});for(const event of events){send({type:"event",event});last=event.seq;}const again=getMeetingStore().events(session,last,500);for(const event of again){send({type:"event",event});last=event.seq;}}catch{ws.close(1008,"Invalid frame");}});
    const unsubscribe=onMeetingMessage((message:any)=>{if(subscribed&&message.session_id===session&&(message.type==="meter"||message.type==="transcript.partial"))send(message);});const timer=setInterval(()=>{if(subscribed&&ws.readyState===WebSocket.OPEN){try{if(ws.bufferedAmount>262144){ws.close(1013,"Replay required");return;}const events=getMeetingStore().events(session,last,100);for(const event of events){send({type:"event",event});last=event.seq;}}catch{ws.close(1011,"Replay failed");}}},250);ws.on("close",()=>{clearInterval(timer);unsubscribe();wss.close();});
  });
}
