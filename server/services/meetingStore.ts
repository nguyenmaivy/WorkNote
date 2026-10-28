import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { validEvent, type MeetingEvent, type MeetingEventInput, type MeetingSession, type MeetingSource, type MeetingNoteContent, type MeetingNoteRevision } from "../../shared/meeting.js";

export class MeetingStore {
  private db: DatabaseSync;
  constructor(file = process.env.MEETING_DB_PATH || path.join(process.cwd(), "data", "meeting.sqlite")) {
    if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS schema_version(version INTEGER NOT NULL);
      INSERT INTO schema_version SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM schema_version);
      CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,source TEXT NOT NULL,device TEXT,title TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,last_seq INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS events(session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,seq INTEGER NOT NULL,type TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(session_id,seq));
      CREATE TABLE IF NOT EXISTS segments(session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,id TEXT NOT NULL,revision INTEGER NOT NULL,seq INTEGER NOT NULL,PRIMARY KEY(session_id,id));`);
    const version = this.db.prepare("SELECT version FROM schema_version").get()!;
    if (version.version !== 1 && version.version !== 2) { this.db.close(); throw new Error("Unsupported meeting database version"); }
    this.db.exec(`BEGIN IMMEDIATE;
      CREATE TABLE IF NOT EXISTS notes(session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE, revision INTEGER NOT NULL, watermark_seq INTEGER NOT NULL, created_at TEXT NOT NULL, content TEXT NOT NULL, PRIMARY KEY(session_id,revision), UNIQUE(session_id,watermark_seq));
      CREATE INDEX IF NOT EXISTS events_session_type_seq ON events(session_id,type,seq);
      UPDATE schema_version SET version=2;
      COMMIT;`);
    for (const session of this.list()) {
      if (["starting", "recording", "stopping"].includes(session.status)) {
        this.append(session.id, { type: "gap", start_ms: 0, end_ms: 0, reason: "Backend restarted; interruption duration unknown" });
        this.append(session.id, { type: "error", message: "Backend restarted during capture" });
      }
    }
  }
  create(source: MeetingSource, device: string | null, title: string): MeetingSession {
    if (this.db.prepare("SELECT 1 FROM sessions WHERE status IN ('starting','recording','stopping') LIMIT 1").get()) throw new Error("A meeting session is already active");
    const id = randomUUID(), now = new Date().toISOString();
    this.db.prepare("INSERT INTO sessions VALUES(?,?,?,?,?,?,?,0)").run(id, source, device, title, "starting", now, now);
    return this.get(id)!;
  }
  get(id: string): MeetingSession | null { return this.db.prepare("SELECT * FROM sessions WHERE id=?").get(id) as unknown as MeetingSession || null; }
  list(): MeetingSession[] { return this.db.prepare("SELECT * FROM sessions ORDER BY created_at DESC").all() as unknown as MeetingSession[]; }
  append(id: string, item: MeetingEventInput): MeetingEvent {
    if (!validEvent(item)) throw new Error("Invalid meeting event");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const s = this.get(id); if (!s) throw new Error("Session not found");
      if (item.type === "transcript.final") {
        if (item.segment.source !== s.source) throw new Error("Segment source mismatch");
        const prior = this.db.prepare("SELECT seq FROM segments WHERE session_id=? AND id=?").get(id, item.segment.id);
        if (prior) {
          const row = this.db.prepare("SELECT payload FROM events WHERE session_id=? AND seq=?").get(id, prior.seq)!;
          const event = JSON.parse(String(row.payload)) as MeetingEvent;
          if (event.type !== "transcript.final" || JSON.stringify(event.segment) !== JSON.stringify(item.segment)) throw new Error("Conflicting final segment");
          this.db.exec("COMMIT"); return event;
        }
      }
      if (["stopped", "error"].includes(s.status)) throw new Error("Session is terminal");
      const seq = s.last_seq + 1;
      const event = { ...item, protocol_version: 1 as const, session_id: id, seq };
      if (item.type === "transcript.final") this.db.prepare("INSERT INTO segments VALUES(?,?,?,?)").run(id, item.segment.id, item.segment.revision, seq);
      this.db.prepare("INSERT INTO events VALUES(?,?,?,?)").run(id, seq, item.type, JSON.stringify(event));
      const status = item.type === "status" ? item.status : item.type === "error" ? "error" : s.status;
      this.db.prepare("UPDATE sessions SET last_seq=?,status=?,updated_at=? WHERE id=?").run(seq, status, new Date().toISOString(), id);
      this.db.exec("COMMIT"); return event;
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  events(id: string, after = 0, limit = 500): MeetingEvent[] {
    if (!this.get(id)) throw new Error("Session not found");
    return this.db.prepare("SELECT payload FROM events WHERE session_id=? AND seq>? ORDER BY seq LIMIT ?").all(id, after, limit).map(row => JSON.parse(String(row.payload)));
  }
  finals(id: string, after = 0, limit = 30): Extract<MeetingEvent, { type: "transcript.final" }>[] {
    if (!this.get(id)) throw new Error("Session not found");
    return this.db.prepare("SELECT payload FROM events WHERE session_id=? AND type='transcript.final' AND seq>? ORDER BY seq LIMIT ?").all(id, after, limit).map(row => JSON.parse(String(row.payload)));
  }
  note(id: string): MeetingNoteRevision | null {
    if (!this.get(id)) throw new Error("Session not found");
    const row = this.db.prepare("SELECT * FROM notes WHERE session_id=? ORDER BY revision DESC LIMIT 1").get(id);
    return row ? { session_id: id, revision: Number(row.revision), watermark_seq: Number(row.watermark_seq), created_at: String(row.created_at), content: JSON.parse(String(row.content)) } : null;
  }
  saveNote(id: string, watermark: number, content: MeetingNoteContent): MeetingNoteRevision {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const prior = this.note(id);
      if (prior && prior.watermark_seq >= watermark) { this.db.exec("COMMIT"); return prior; }
      const final = this.db.prepare("SELECT 1 FROM events WHERE session_id=? AND seq=? AND type='transcript.final'").get(id, watermark);
      if (!final) throw new Error("Invalid note watermark");
      this.db.prepare("INSERT INTO notes VALUES(?,?,?,?,?)").run(id, (prior?.revision || 0) + 1, watermark, new Date().toISOString(), JSON.stringify(content));
      this.db.exec("COMMIT");
      return this.note(id)!;
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  delete(id: string): boolean {
    const s = this.get(id); if (!s) return false;
    if (!["stopped", "error"].includes(s.status)) throw new Error("Stop the session before deleting it");
    return Number(this.db.prepare("DELETE FROM sessions WHERE id=?").run(id).changes) > 0;
  }
  close(): void { this.db.close(); }
}
let singleton: MeetingStore | undefined;
export function getMeetingStore(): MeetingStore { return singleton ||= new MeetingStore(); }
export function _setMeetingStoreForTests(store?: MeetingStore): void { singleton?.close(); singleton = store; }
