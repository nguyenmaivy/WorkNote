import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Download, Mic, RefreshCw, Square, Trash2 } from "lucide-react";
import { Button } from "./ui/Button";
import MeetingSmartNote from "./MeetingSmartNote";
import { Card } from "./ui/Card";
import { meetingApi, type MeetingDevice, type MeetingEvent, type MeetingSession, type MeetingSource } from "../services/meetingApi";

export default function MeetingWorkspace() {
  const [sessions, setSessions] = useState<MeetingSession[]>([]);
  const [active, setActive] = useState<MeetingSession | null>(null);
  const [events, setEvents] = useState<MeetingEvent[]>([]);
  const [source, setSource] = useState<MeetingSource>("mic");
  const [devices, setDevices] = useState<MeetingDevice[]>([]);
  const [device, setDevice] = useState("");
  const [multilingual, setMultilingual] = useState(false);
  const [vocabulary, setVocabulary] = useState("");
  const [consent, setConsent] = useState(false);
  const [meter, setMeter] = useState(0);
  const [caption, setCaption] = useState<{ start_ms: number; end_ms: number; text_raw: string } | null>(null);
  const finalizedEnd = useRef(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const seq = useRef(0);
  const ws = useRef<WebSocket | null>(null);
  const requestId = useRef(0);
  const generation = useRef(0);
  const activeId = useRef<string | null>(null);

  const loadSessions = useCallback(async () => {
    const id = ++requestId.current;
    try { const result = await meetingApi.sessions(); if (id === requestId.current) setSessions(result); }
    catch (e) { if (id === requestId.current) setError((e as Error).message); }
  }, []);
  useEffect(() => { void loadSessions(); return () => { requestId.current++; generation.current++; activeId.current = null; ws.current?.close(); }; }, [loadSessions]);
  useEffect(() => {
    let alive = true;
    setDevices([]); setDevice("");
    meetingApi.devices(source).then((items) => { if (alive) setDevices(items); }).catch((e) => { if (alive) setError((e as Error).message); });
    return () => { alive = false; };
  }, [source]);

  const merge = useCallback((incoming: MeetingEvent[]) => {
    const sorted = incoming.filter((event) => Number.isFinite(event.seq)).sort((a, b) => a.seq - b.seq);
    seq.current = Math.max(seq.current, ...sorted.map((event) => event.seq), 0);
    setEvents((previous) => {
      const bySeq = new Map(previous.map((event) => [event.seq, event]));
      for (const event of sorted) bySeq.set(event.seq, event);
      return [...bySeq.values()].sort((a, b) => a.seq - b.seq);
    });
  }, []);
  const hydrate = useCallback(async (session: MeetingSession) => {
    const currentGeneration = ++generation.current;
    setCaption(null); finalizedEnd.current = 0;
    activeId.current = session.id; setActive(session); setEvents([]); seq.current = 0; setError(""); ws.current?.close(); ws.current = null;
    try {
      let after = 0;
      const history: MeetingEvent[] = [];
      for (;;) {
        const page = await meetingApi.events(session.id, after);
        if (generation.current !== currentGeneration) return;
        history.push(...page.events);
        if (!page.events.length || page.next_seq <= after) break;
        after = page.next_seq;
        if (page.events.length < 100) break;
      }
      const fresh = await meetingApi.session(session.id);
      if (generation.current !== currentGeneration) return;
      finalizedEnd.current = Math.max(0, ...history.filter(e => e.type === "transcript.final").map(e => ((e as any).payload || e).segment?.end_ms || 0));
      setActive(fresh); setEvents(history); seq.current = Math.max(0, ...history.map((event) => event.seq));
      if (["stopped", "complete", "failed", "error"].includes(fresh.status)) return;
      const socket = await meetingApi.socket();
      if (generation.current !== currentGeneration) { socket.close(); return; }
      ws.current = socket;
      socket.onmessage = (message) => {
        try {
          const frame = JSON.parse(message.data);
          if (generation.current !== currentGeneration) return;
          if (frame.type === "meter" || (frame.type === "event" && frame.event?.type === "meter")) setMeter(Math.max(0, Math.min(1, frame.level ?? frame.event.level ?? 0)));
          else if (frame.type === "transcript.partial" && frame.segment?.start_ms >= finalizedEnd.current) setCaption(frame.segment);
          else if (frame.type === "event" && frame.event) {
            const event = frame.event;
            merge([event]);
            if (event.type === "transcript.final") {
              const segment = (event.payload || event).segment;
              finalizedEnd.current = Math.max(finalizedEnd.current, segment.end_ms || 0);
              setCaption(current => current && current.start_ms >= segment.end_ms ? current : null);
            }
            if (event.type === "gap" || event.type === "error" || event.type === "status" && (event.payload || event).status === "stopped") setCaption(null);
            if (event.type === "status" || event.type === "error") {
              const status = event.type === "error" ? "error" : (event.payload || event).status;
              setActive((current) => current?.id === session.id ? { ...current, status } : current);
              setSessions((items) => items.map((item) => item.id === session.id ? { ...item, status } : item));
            }
          }
        } catch { setError("Invalid meeting stream message"); }
      };
      socket.send(JSON.stringify({ type: "subscribe", session_id: session.id, after_seq: seq.current }));
      socket.onclose = () => { if (generation.current === currentGeneration && activeId.current === session.id) setError("Meeting connection closed. Reconnect to load any missed transcript events."); };
    } catch (e) { if (activeId.current === session.id) setError((e as Error).message); }
  }, [merge]);
  const start = async () => {
    setBusy(true); setError("");
    try { const session = await meetingApi.start({ source, ...(device ? { device } : {}), ...(multilingual ? { final_engine: "whisper" as const, vocabulary } : {}), consent: true }); setSessions((items) => [session, ...items.filter((item) => item.id !== session.id)]); await hydrate(session); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const stop = async () => {
    if (!active) return; setBusy(true);
    try { const stopped = await meetingApi.stop(active.id); ws.current?.close(); await hydrate(stopped); setActive(stopped); setSessions((items) => items.map((s) => s.id === stopped.id ? stopped : s)); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const exportMarkdown = async () => {
    if (!active) return;
    try { const blob = await meetingApi.exportUrl(active.id); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${active.title || "meeting"}.md`; a.click(); URL.revokeObjectURL(url); }
    catch (e) { setError((e as Error).message); }
  };
  const remove = async () => {
    if (!active || !window.confirm("Delete this stopped meeting and its transcript? This cannot be undone.")) return;
    try { await meetingApi.remove(active.id); ws.current?.close(); setActive(null); setEvents([]); await loadSessions(); }
    catch (e) { setError((e as Error).message); }
  };
  const running = active && !["stopped", "complete", "failed", "error"].includes(active.status);

  return <div className="space-y-4">
    <Card className="p-4 space-y-4">
      <div><h2 className="text-lg font-semibold">Local meeting transcription</h2><p className="text-sm text-[var(--color-text-secondary)]">Audio is processed locally. Live Vietnamese captions update as you speak and may be corrected. Final text is saved about every 5 seconds; audio is not stored.</p></div>
      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-sm">Audio source<select value={source} disabled={!!running} onChange={(e) => setSource(e.target.value as MeetingSource)} className="mt-1 block rounded border p-2"><option value="mic">Microphone</option><option value="system">System audio</option></select></label>
        <label className="text-sm">Device<select value={device} disabled={!!running || !devices.length} onChange={(e) => setDevice(e.target.value)} className="mt-1 block rounded border p-2"><option value="">Default device</option>{devices.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        {!running && <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />I have consent to record all participants.</label>}
        {running ? <Button onClick={stop} disabled={busy} icon={<Square size={15} />}>Stop</Button> : <Button onClick={start} disabled={!consent || busy} icon={<Mic size={15} />}>Start transcription</Button>}
      </div>
      <label className="block text-sm">Nhận dạng bản chốt<select value={multilingual ? "whisper" : "sherpa"} disabled={!!running} onChange={e => setMultilingual(e.target.value === "whisper")} className="mt-1 block rounded border p-2"><option value="sherpa">Tiếng Việt · Sherpa</option><option value="whisper">Việt–Anh · Whisper local (thử nghiệm, chậm hơn)</option></select></label>
      {multilingual && <label className="block text-sm">Tên riêng / thuật ngữ cuộc họp<input value={vocabulary} maxLength={1000} disabled={!!running} onChange={e => setVocabulary(e.target.value)} placeholder="Microsoft, OpenAI, Nguyễn Văn An…" className="mt-1 block w-full rounded border p-2" /><span className="text-xs text-[var(--color-text-secondary)]">Gợi ý cho bản chốt, không bảo đảm nhận đúng. Phụ đề tạm vẫn dùng Sherpa tiếng Việt.</span></label>}
      {running && <label className="flex items-center gap-2 text-xs">Audio level <meter aria-label="Audio level" min={0} max={1} value={meter} /></label>}
    </Card>
    {running && <section aria-label="Live captions" className="sticky top-0 z-10 rounded-xl bg-black p-4 text-center text-white shadow-lg">
      <p className="mb-1 text-xs text-gray-300">Phụ đề trực tiếp · chữ tạm có thể thay đổi</p>
      <p role="status" aria-live="polite" className="min-h-8 text-xl leading-relaxed">{caption?.text_raw || "Đang nghe…"}</p>
    </section>}
    <div className="grid gap-4 md:grid-cols-[240px_1fr]">
      <Card className="p-3"><h3 className="font-semibold mb-2">Sessions</h3><div role="region" aria-label="Danh sách sessions" tabIndex={0} className="h-[min(50vh,28rem)] min-h-60 space-y-1 overflow-y-auto overscroll-contain pr-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 [scrollbar-gutter:stable]">{sessions.map((session) => <button key={session.id} onClick={() => void hydrate(session)} className={`block w-full rounded p-2 text-left text-sm hover:bg-[var(--color-neutral-soft)] ${active?.id === session.id ? "bg-[var(--color-neutral-soft)]" : ""}`}><span className="block truncate">{session.title || session.id}</span><span className="text-xs text-[var(--color-text-secondary)]">{session.source} · {session.status}</span></button>)}{!sessions.length && <p className="text-sm text-[var(--color-text-secondary)]">No saved sessions yet.</p>}</div></Card>
      <Card className="p-4 min-w-0"><div className="mb-3 flex flex-wrap gap-3 items-center justify-between"><h3 className="font-semibold">{active?.title || "Transcript"}</h3>{active && <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => void hydrate(active)} icon={<RefreshCw size={14} />}>Reconnect</Button>{!running && <><Button size="sm" variant="secondary" onClick={() => void exportMarkdown()} icon={<Download size={14} />}>Export Markdown</Button><Button size="sm" variant="destructive" onClick={() => void remove()} icon={<Trash2 size={14} />}>Delete</Button></>}</div>}</div>
        {error && <p role="alert" className="mb-3 flex gap-2 text-sm text-[var(--color-error)]"><AlertCircle size={16} />{error}</p>}
        <div role="region" aria-label="Transcript hoàn thiện" tabIndex={0} className="h-[min(50vh,28rem)] min-h-60 overflow-y-auto overscroll-contain rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4 leading-relaxed break-words focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 [scrollbar-gutter:stable]">
        {events.map((event) => {
          const payload = (event as any).payload || event;
          if (event.type === "transcript.final") return <p key={event.seq} className="py-1 text-sm">{payload.segment?.text_raw || payload.text_raw}</p>;
          if (event.type === "gap") return <p key={event.seq} className="py-2 text-xs text-amber-700">Transcript gap: {payload.reason || "audio unavailable"}</p>;
          if (event.type === "error") return <p key={event.seq} role="alert" className="py-2 text-sm text-[var(--color-error)]">{payload.message}</p>;
          if (event.type === "status") return <p key={event.seq} className="py-1 text-xs text-[var(--color-text-secondary)]">Status: {payload.status}</p>;
          return null;
        })}
        {!events.length && <p className="text-sm text-[var(--color-text-secondary)]">Select a session or start transcription. No microphone capture starts until the backend accepts the session.</p>}
        </div>
      </Card>
    </div>
    {active && <MeetingSmartNote sessionId={active.id} events={events} />}
  </div>;
}