import { test } from "node:test";
import assert from "node:assert/strict";
import { MeetingStore } from "../services/meetingStore.js";
import { validEvent } from "../../shared/meeting.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("meeting store sequences and reopens durable events; deletes cascaded rows",()=>{
 const store=new MeetingStore(":memory:");
 const s=store.create("mic",null,"test");
 const a=store.append(s.id,{type:"status",status:"recording"});
 assert.equal(a.seq,1);
 const b=store.append(s.id,{type:"transcript.final",segment:{id:"00000000-0000-4000-8000-000000000000",revision:1,start_ms:0,end_ms:100,source:"mic",text_raw:"hello"}});
 assert.equal(b.seq,2); assert.equal(store.events(s.id,1)[0].seq,2);
 assert.throws(()=>store.create("system",null,"second"),/already active/);
 store.append(s.id,{type:"status",status:"stopped"}); assert.equal(store.delete(s.id),true); assert.deepEqual(store.list(),[]);store.close();
});
test("reopening SQLite preserves raw finals, deduplicates retries and marks interrupted capture",()=>{
 const directory=mkdtempSync(join(tmpdir(),"meeting-store-"));
 let store:MeetingStore|undefined;
 try {
  const file=join(directory,"meeting.sqlite");
  store=new MeetingStore(file);
  const session=store.create("mic",null,"restart");
  const final={type:"transcript.final" as const,segment:{id:"00000000-0000-4000-8000-000000000001",revision:1 as const,start_ms:0,end_ms:5000,source:"mic" as const,text_raw:"KHÔNG đổi deadline hai mươi tháng ba"}};
  const saved=store.append(session.id,final);
  const note=store.saveNote(session.id,saved.seq,{summary:"Không đổi deadline",key_points:[],decisions:[],action_items:[],open_questions:[]});
  assert.deepEqual(store.append(session.id,final),saved);
  assert.throws(()=>store!.append(session.id,{...final,segment:{...final.segment,text_raw:"conflicting"}}),/Conflicting/);
  assert.throws(()=>store!.delete(session.id),/Stop/);
  store.close(); store=undefined;
  store=new MeetingStore(file);
  assert.equal(store.get(session.id)?.status,"error");
  assert.deepEqual(store.note(session.id),note);
  assert.deepEqual(store.events(session.id).map(e=>e.type),["transcript.final","gap","error"]);
  assert.deepEqual(store.events(session.id)[0],saved);
  assert.deepEqual(store.append(session.id,final),saved);
  store.close(); store=undefined;
  store=new MeetingStore(file);
  assert.equal(store.events(session.id).length,3);
 } finally {store?.close();rmSync(directory,{recursive:true,force:true});}
});
test("meeting IPC event validator checks bounds and source",()=>{
 assert.equal(validEvent({type:"gap",start_ms:0,end_ms:2,reason:"overflow"}),true);
 assert.equal(validEvent({type:"gap",start_ms:4,end_ms:2,reason:"bad"}),false);
 assert.equal(validEvent({type:"transcript.final",segment:{id:"x",revision:1,start_ms:0,end_ms:1,source:"random",text_raw:"x"}}),false);
});
