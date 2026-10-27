import assert from "node:assert/strict";
import { MeetingStore } from "../server/services/meetingStore.js";
import { MeetingNoteService } from "../server/services/meetingNotes.js";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
const isolated = process.argv.includes("--isolated-server");
const child = isolated ? spawn(resolve(".venv/Scripts/python.exe"), ["-I", resolve("server/python/local_llm_server.py")], { env: { ...process.env, LOCAL_LLM_PORT: "11435", LOCAL_LLM_HOST: "127.0.0.1", LOCAL_LLM_PARENT_WATCH: "1" }, stdio: ["pipe", "ignore", "pipe"], windowsHide: true }) : null;
child?.stderr?.on("data", chunk => process.stderr.write(chunk));
const store = new MeetingStore(":memory:");
try {
  if (child) {
    for (let attempt = 0; attempt < 120; attempt++) {
      try { const r = await fetch("http://127.0.0.1:11435/v1/models"); if (r.ok) break; } catch {}
      if (attempt === 119) throw new Error("Isolated local server not ready");
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  const session = store.create("mic", null, "Synthetic M2 smoke — no recording");
  store.append(session.id, { type: "transcript.final", segment: { id: "00000000-0000-4000-8000-000000000001", revision: 1, start_ms: 0, end_ms: 5000, source: "mic", text_raw: "Nhóm thống nhất kiểm tra bản thử nghiệm trước khi phát hành. Chưa phân công người phụ trách và chưa chốt thời hạn." } });
  store.append(session.id, { type: "status", status: "stopped" });
  const service = new MeetingNoteService(() => store);
  service.request(session.id);
  while (["running", "pending"].includes(service.state(session.id).status)) await new Promise(resolve => setTimeout(resolve, 100));
  const state = service.state(session.id);
  console.log(JSON.stringify(state, null, 2));
  assert.equal(state.status, "idle", state.error || "Note failed");
  assert.equal(state.note?.watermark_seq, 1);
  assert.equal(state.note?.revision, 1);
} finally { store.close(); child?.stdin?.end(); child?.kill(); }
