import { test } from "node:test";
import assert from "node:assert/strict";
import { MeetingStore } from "../services/meetingStore.js";
import { MeetingNoteService, validateMeetingNote } from "../services/meetingNotes.js";
import type { MeetingNoteContent } from "../../shared/meeting.js";
const source = "00000000-0000-4000-8000-000000000001";
const content = (): MeetingNoteContent => ({ summary: "Thảo luận kế hoạch", key_points: [{ text: "Chưa có quyết định", source_segment_ids: [source] }], decisions: [], action_items: [{ text: "Kiểm tra yêu cầu", assignee: null, deadline: null, source_segment_ids: [source] }], open_questions: [] });
function final(store: MeetingStore, id: string, segmentId = source) { return store.append(id, { type: "transcript.final", segment: { id: segmentId, revision: 1, start_ms: 0, end_ms: 5000, source: "mic", text_raw: "Cần kiểm tra yêu cầu. Chưa quyết định." } }); }
async function idle(service: MeetingNoteService, id: string) { for (let n = 0; n < 100; n++) { if (!["running", "pending"].includes(service.state(id).status)) return; await new Promise(resolve => setImmediate(resolve)); } throw new Error("Note service did not settle"); }

test("note schema rejects unknown sources, duplicates and guessed fields missing null", () => {
  assert.deepEqual(validateMeetingNote(content(), new Set([source])), content());
  assert.throws(() => validateMeetingNote(content(), new Set()), /source/);
  const duplicate = content(); duplicate.action_items.push(duplicate.action_items[0]);
  assert.throws(() => validateMeetingNote(duplicate, new Set([source])), /Duplicate/);
  const missing = content(); delete (missing.action_items[0] as any).deadline;
  assert.throws(() => validateMeetingNote(missing, new Set([source])), /owner/);
});

test("notes defer while recording, coalesce requests, persist sources and retry idempotently", async () => {
  const store = new MeetingStore(":memory:");
  try {
    const session = store.create("mic", null, "notes"); final(store, session.id);
    let calls = 0;
    const service = new MeetingNoteService(() => store, async () => { calls++; return content(); });
    service.request(session.id); service.request(session.id);
    assert.equal(service.state(session.id).status, "pending"); assert.equal(calls, 0);
    store.append(session.id, { type: "status", status: "stopped" });
    await service.pump(); await idle(service, session.id);
    assert.equal(calls, 1); assert.equal(store.note(session.id)?.revision, 1);
    assert.equal(store.note(session.id)?.watermark_seq, 1);
    service.request(session.id); await idle(service, session.id);
    assert.equal(calls, 1); assert.equal(store.note(session.id)?.revision, 1);
    assert.deepEqual(store.note(session.id)?.content.action_items[0].source_segment_ids, [source]);
  } finally { store.close(); }
});

test("invalid output retains last good note and watermark; another session source is rejected", async () => {
  const store = new MeetingStore(":memory:");
  try {
    const session = store.create("mic", null, "notes"); final(store, session.id);
    store.saveNote(session.id, 1, content());
    final(store, session.id, "00000000-0000-4000-8000-000000000002");
    store.append(session.id, { type: "status", status: "stopped" });
    const bad = content(); bad.decisions = [{ text: "Fake", source_segment_ids: ["other-session-source"] }];
    const service = new MeetingNoteService(() => store, async () => bad);
    service.request(session.id); await idle(service, session.id);
    assert.equal(service.state(session.id).status, "error");
    assert.equal(store.note(session.id)?.revision, 1); assert.equal(store.note(session.id)?.watermark_seq, 1);
    assert.equal(store.finals(session.id).length, 2);
  } finally { store.close(); }
});

test("one generation runs at a time and deletion cannot resurrect a session", async () => {
  const store = new MeetingStore(":memory:");
  try {
    const first = store.create("mic", null, "one"); final(store, first.id); store.append(first.id, { type: "status", status: "stopped" });
    const second = store.create("mic", null, "two"); final(store, second.id); store.append(second.id, { type: "status", status: "stopped" });
    let release!: (value: unknown) => void, calls = 0;
    const service = new MeetingNoteService(() => store, async () => { calls++; if (calls === 1) return new Promise(resolve => { release = resolve; }); return content(); });
    service.request(first.id); service.request(second.id);
    assert.equal(calls, 1); assert.equal(service.state(second.id).status, "pending");
    store.delete(first.id); service.cancel(first.id); release(content());
    await idle(service, second.id);
    assert.equal(store.get(first.id), null); assert.equal(store.note(second.id)?.revision, 1); assert.equal(calls, 2);
  } finally { store.close(); }
});
