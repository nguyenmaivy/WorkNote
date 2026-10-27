export type MeetingSource = "mic" | "system";
export type MeetingStatus = "starting" | "recording" | "stopping" | "stopped" | "error";
export interface MeetingSegment { id: string; revision: 1; start_ms: number; end_ms: number; source: MeetingSource; text_raw: string }
export type MeetingEventInput =
  | { type: "transcript.final"; segment: MeetingSegment }
  | { type: "gap"; start_ms: number; end_ms: number; reason: string }
  | { type: "status"; status: MeetingStatus }
  | { type: "error"; message: string };
export type MeetingEvent = MeetingEventInput & { protocol_version: 1; session_id: string; seq: number };
export interface MeetingSession { id: string; source: MeetingSource; device: string | null; title: string; status: MeetingStatus; created_at: string; updated_at: string; last_seq: number }
export interface MeetingNoteItem { text: string; source_segment_ids: string[] }
export interface MeetingActionItem extends MeetingNoteItem { assignee: string | null; deadline: string | null }
export interface MeetingNoteContent {
  summary: string;
  key_points: MeetingNoteItem[];
  decisions: MeetingNoteItem[];
  action_items: MeetingActionItem[];
  open_questions: MeetingNoteItem[];
}
export interface MeetingNoteRevision { session_id: string; revision: number; watermark_seq: number; created_at: string; content: MeetingNoteContent }
export interface MeetingNoteState { note: MeetingNoteRevision | null; status: "idle" | "pending" | "running" | "error"; error: string | null }
export function validSource(x: unknown): x is MeetingSource { return x === "mic" || x === "system"; }
export function validEvent(x: any): x is MeetingEventInput {
  if (!x || typeof x !== "object") return false;
  if (x.type === "transcript.final") {
    const s = x.segment;
    return !!s && typeof s.id === "string" && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(s.id) && s.revision === 1 && Number.isSafeInteger(s.start_ms) && s.start_ms >= 0 && Number.isSafeInteger(s.end_ms) && s.end_ms >= s.start_ms && validSource(s.source) && typeof s.text_raw === "string" && !!s.text_raw.trim() && s.text_raw.length <= 20000;
  }
  if (x.type === "gap") return Number.isSafeInteger(x.start_ms) && Number.isSafeInteger(x.end_ms) && x.start_ms >= 0 && x.end_ms >= x.start_ms && typeof x.reason === "string" && x.reason.length > 0 && x.reason.length <= 500;
  if (x.type === "status") return ["starting", "recording", "stopping", "stopped", "error"].includes(x.status);
  return x.type === "error" && typeof x.message === "string" && x.message.length > 0 && x.message.length <= 2000;
}
