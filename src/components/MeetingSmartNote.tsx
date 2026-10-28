import { useEffect, useRef, useState } from "react";
import { meetingApi, type MeetingEvent } from "../services/meetingApi";
import type { MeetingNoteItem, MeetingNoteState } from "../../shared/meeting";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

export default function MeetingSmartNote({ sessionId, events }: { sessionId: string; events: MeetingEvent[] }) {
  const [state, setState] = useState<MeetingNoteState>({ note: null, status: "idle", error: null });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    const current = ++generation.current;
    let timer: ReturnType<typeof setTimeout>;
    setState({ note: null, status: "idle", error: null }); setError(""); setBusy(false);
    const poll = async () => {
      try { const result = await meetingApi.note(sessionId); if (generation.current === current) { setState(result); setError(""); } }
      catch (e) { if (generation.current === current) setError((e as Error).message); }
      finally { if (generation.current === current) timer = setTimeout(poll, 3000); }
    };
    void poll();
    return () => { generation.current++; clearTimeout(timer); };
  }, [sessionId]);
  const request = async () => {
    const current = generation.current;
    setBusy(true); setError("");
    try { const result = await meetingApi.generateNote(sessionId); if (current === generation.current) setState(result); }
    catch (e) { if (current === generation.current) setError((e as Error).message); }
    finally { if (current === generation.current) setBusy(false); }
  };
  const sources = new Map(events.filter(e => e.type === "transcript.final").map(e => { const s = (e.payload || e).segment; return [s?.id, s]; }));
  const items = (title: string, values: MeetingNoteItem[]) => <section><h4 className="font-semibold">{title}</h4><ul className="space-y-2">{values.map((item, index) => <li key={index} className="text-sm">
    <p>{item.text}{"assignee" in item && <> · Phụ trách: {String(item.assignee ?? "chưa rõ")} · Hạn: {String((item as any).deadline ?? "chưa rõ")}</>}</p>
    <details><summary className="cursor-pointer text-xs">Nguồn ({item.source_segment_ids.length})</summary>{item.source_segment_ids.map(id => { const s = sources.get(id); return <p key={id} className="text-xs py-1">{s ? `[${s.start_ms}–${s.end_ms} ms] ${s.text_raw}` : `Segment ${id} — mở lại transcript để xem nguồn`}</p>; })}</details>
  </li>)}</ul></section>;
  return <Card className="p-4 space-y-3"><h3 className="font-semibold">Smart note · local</h3>
    <p className="text-xs">Note dựa trên STT có thể sai/thiếu; hãy kiểm tra nguồn. Khi đang ghi, yêu cầu chờ đến sau Stop để ưu tiên audio.</p>
    <Button size="sm" onClick={() => void request()} disabled={busy || state.status === "pending" || state.status === "running"}>Tạo / cập nhật note</Button>
    <p role="status" className="text-xs">Trạng thái: {state.status}</p>
    {(error || state.error) && <p role="alert" className="text-sm">{error || state.error} · Bản note tốt gần nhất được giữ nguyên.</p>}
    {state.note && <><p className="text-xs">Revision {state.note.revision} · Watermark seq {state.note.watermark_seq}</p><p className="text-sm whitespace-pre-wrap">{state.note.content.summary}</p>
      {items("Ý chính", state.note.content.key_points)}{items("Quyết định", state.note.content.decisions)}{items("Việc cần làm", state.note.content.action_items)}{items("Câu hỏi mở", state.note.content.open_questions)}</>}
  </Card>;
}
