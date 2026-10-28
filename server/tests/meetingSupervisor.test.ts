import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { type ChildProcess, type spawn } from "node:child_process";
import { MeetingStore, _setMeetingStoreForTests } from "../services/meetingStore.js";
import { activeMeeting, startMeeting, stopMeeting } from "../services/meetingSupervisor.js";

function fixture(t: TestContext) {
  const store = new MeetingStore(":memory:");
  _setMeetingStoreForTests(store);
  const child = Object.assign(new EventEmitter(), {
    stdout: new PassThrough(), stderr: new PassThrough(), stdin: new PassThrough(),
    kill: () => true,
  });
  const session = store.create("mic", null, "lifecycle");
  startMeeting(session.id, "mic", undefined, "sherpa", "", (() => child as unknown as ChildProcess) as typeof spawn);
  const send = (message: unknown) => child.stdout.write(JSON.stringify(message) + "\n");
  t.after(() => { child.emit("close", 1); _setMeetingStoreForTests(); });
  return { store, child, session, send };
}
const final = { type: "transcript.final", segment: { id: "00000000-0000-4000-8000-000000000001", revision: 1, start_ms: 0, end_ms: 5000, source: "mic", text_raw: "NGUYỄN AN nói hai mươi phần trăm" } };

test("final is durable and unchanged before a worker crash in the same stdout batch", t => {
  const { store, child, session } = fixture(t);
  child.stdout.write([ { type: "ready" }, final, { type: "error", message: "device lost" } ].map(x => JSON.stringify(x)).join("\n") + "\n");
  const events = store.events(session.id);
  assert.deepEqual(events.find(e => e.type === "transcript.final")?.segment, final.segment);
  assert.deepEqual(events.map(e => e.type), ["status", "status", "transcript.final", "gap", "error"]);
  assert.equal(store.get(session.id)?.status, "error");
  child.emit("close", 1);
  assert.equal(activeMeeting(), false);
});

test("stop waits for the final tail and stopped marker before closing the session", async t => {
  const { store, child, session, send } = fixture(t);
  send({ type: "ready" });
  const stopping = stopMeeting(session.id);
  assert.equal(store.get(session.id)?.status, "stopping");
  assert.match(child.stdin.read().toString(), /"type":"stop"/);
  send(final);
  send({ type: "stopped" });
  child.emit("close", 0);
  await stopping;
  assert.equal(store.get(session.id)?.status, "stopped");
  assert.deepEqual(store.events(session.id).map(e => e.type), ["status", "status", "status", "transcript.final", "status"]);
  assert.equal(activeMeeting(), false);
});

test("stop during startup is not changed back to recording by late ready", async t => {
  const { store, child, session, send } = fixture(t);
  const stopping = stopMeeting(session.id);
  send({ type: "ready" });
  assert.equal(store.get(session.id)?.status, "stopping");
  send({ type: "stopped" });
  child.emit("close", 0);
  await stopping;
  assert.equal(store.get(session.id)?.status, "stopped");
});

test("exit without the stop marker records a durable interruption", async t => {
  const { store, child, session, send } = fixture(t);
  send({ type: "ready" });
  const stopping = stopMeeting(session.id);
  child.emit("close", 0);
  await stopping;
  assert.equal(store.get(session.id)?.status, "error");
  assert.ok(store.events(session.id).some(e => e.type === "gap"));
});

test("command stream errors persist a gap instead of crashing the backend", t => {
  const { store, child, session, send } = fixture(t);
  send({ type: "ready" });
  child.stdin.emit("error", new Error("EPIPE"));
  assert.equal(store.get(session.id)?.status, "error");
  assert.ok(store.events(session.id).some(e => e.type === "gap"));
});

test("malformed or wrong-source worker frames fail closed without saving a final", t => {
  const { store, session, send } = fixture(t);
  send({ type: "ready" });
  send({ ...final, segment: { ...final.segment, source: "system" } });
  assert.equal(store.get(session.id)?.status, "error");
  assert.equal(store.events(session.id).filter(e => e.type === "transcript.final").length, 0);
});

test("readiness timeout and stop timeout fail closed", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { store, child, session } = fixture(t);
  t.mock.timers.tick(30000);
  assert.equal(store.get(session.id)?.status, "error");
  child.emit("close", 1);
  const next = store.create("system", null, "timeout");
  startMeeting(next.id, "system", undefined, "sherpa", "", (() => child as unknown as ChildProcess) as typeof spawn);
  const stopping = stopMeeting(next.id);
  t.mock.timers.tick(10000);
  await stopping;
  assert.equal(store.get(next.id)?.status, "error");
  assert.ok(store.events(next.id).some(e => e.type === "gap" && e.reason.includes("timed out")));
  child.emit("close", 1);
});
