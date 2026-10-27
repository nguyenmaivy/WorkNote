import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, request } from "node:http";
import { once } from "node:events";
import express from "express";
import { WebSocket } from "ws";
import meetingRouter from "../routes/meeting.js";
import { MeetingStore, _setMeetingStoreForTests } from "../services/meetingStore.js";
import { getMeetingToken } from "../services/meetingSupervisor.js";
import { setupMeetingUpgrade } from "../websockets/meetingHandler.js";

 test("meeting HTTP/WS enforce access, replay a long session, isolate sessions and export gaps", async t => {
  const store = new MeetingStore(":memory:");
  _setMeetingStoreForTests(store);
  const session = store.create("mic", null, "durable meeting");
  for (let i = 0; i < 1200; i++) store.append(session.id, { type: "gap", start_ms: i, end_ms: i + 1, reason: `gap-${i}` });
  store.append(session.id, { type: "error", message: "device disconnected" });
  const other = store.create("system", null, "private other session");
  store.append(other.id, { type: "gap", start_ms: 0, end_ms: 1, reason: "OTHER-SESSION-SECRET" });
  store.append(other.id, { type: "status", status: "stopped" });
  const app = express();
  app.use(express.json());
  app.use("/api/meeting", meetingRouter);
  const server = createServer(app);
  server.on("upgrade", setupMeetingUpgrade);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}/api/meeting`;
  const headers = { "x-meeting-token": getMeetingToken() };
  const clients: WebSocket[] = [];
  t.after(async () => {
    for (const ws of clients) ws.terminate();
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    _setMeetingStoreForTests();
  });
  assert.equal((await fetch(`${base}/sessions/${session.id}/note`)).status, 401);
  assert.equal((await fetch(`${base}/sessions/${session.id}/note`, { method: "POST" })).status, 401);
  const noteState = await (await fetch(`${base}/sessions/${session.id}/note`, { headers })).json();
  assert.deepEqual(noteState, { note: null, status: "idle", error: null });
  assert.equal((await fetch(`${base}/sessions/${session.id}/note`, { method: "POST", headers })).status, 202);
  assert.equal((await fetch(`${base}/sessions`)).status, 401);
  assert.equal((await fetch(`${base}/sessions`, { headers: { ...headers, Origin: "http://example.com" } })).status, 403);
  const rejectedHost = await new Promise<number | undefined>((resolve, reject) => {
    const req = request(`${base}/sessions`, { headers: { ...headers, Host: "example.com" } }, res => { res.resume(); resolve(res.statusCode); });
    req.on("error", reject); req.end();
  });
  assert.equal(rejectedHost, 403);
  assert.equal((await fetch(`${base}/sessions/${session.id}/events?after=-1`, { headers })).status, 400);
  const page = await (await fetch(`${base}/sessions/${session.id}/events?after=0`, { headers })).json();
  assert.equal(page.events.length, 500);
  assert.equal(page.next_seq, 500);
  const markdown = await (await fetch(`${base}/sessions/${session.id}/export`, { headers })).text();
  assert.match(markdown, /gap-1199/);
  assert.match(markdown, /device disconnected/);
  assert.doesNotMatch(markdown, /OTHER-SESSION-SECRET/);

  const bad = new WebSocket(`ws://127.0.0.1:${port}`);
  clients.push(bad);
  await once(bad, "open");
  const closed = once(bad, "close");
  bad.send(JSON.stringify({ type: "auth", token: "wrong" }));
  assert.equal((await closed)[0], 1008);

  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  clients.push(ws);
  const received: number[] = [];
  const replay = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Replay timed out")), 5000);
    ws.on("message", raw => {
      const frame = JSON.parse(raw.toString());
      if (frame.type === "authenticated") ws.send(JSON.stringify({ type: "subscribe", session_id: session.id, after_seq: 0 }));
      if (frame.type === "event") {
        assert.equal(frame.event.session_id, session.id);
        received.push(frame.event.seq);
        if (received.length === 1201) { clearTimeout(timer); resolve(); }
      }
    });
  });
  await once(ws, "open");
  ws.send(JSON.stringify({ type: "auth", token: getMeetingToken() }));
  await replay;
  assert.deepEqual(received, Array.from({ length: 1201 }, (_, i) => i + 1));
  const removal = await fetch(`${base}/sessions/${session.id}`, { method: "DELETE", headers });
  assert.equal(removal.status, 200);
  assert.equal(store.get(session.id), null);
  assert.notEqual(store.get(other.id), null);
});
