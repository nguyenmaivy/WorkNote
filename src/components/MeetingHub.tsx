import { useCallback, useEffect, useState } from "react";
import MeetingWorkspace from "./MeetingWorkspace";
import AudioSpeechLab from "./AudioSpeechLab";
import { meetingApi } from "../services/meetingApi";

export default function MeetingHub() {
  const [mode, setMode] = useState<"local" | "live" | "text">("local");
  const [localActive, setLocalActive] = useState<boolean | null>(null);
  const [onlineActive, setOnlineActive] = useState(false);
  const checkAudio = useCallback(async () => {
    try {
      const sessions = await meetingApi.sessions();
      const active = sessions.some(s => ["starting", "recording", "stopping"].includes(s.status));
      setLocalActive(active);
      return !active;
    } catch { setLocalActive(null); return false; }
  }, []);
  useEffect(() => {
    void checkAudio();
    const timer = setInterval(() => void checkAudio(), 2000);
    return () => clearInterval(timer);
  }, [checkAudio]);
  return <div className="space-y-4">
    <nav aria-label="Chế độ Meeting" className="flex flex-wrap gap-2">
      {([ ["local", "Ghi họp local"], ["live", "Hội thoại online"], ["text", "Văn bản & TTS"] ] as const).map(([id, label]) =>
        <button key={id} aria-pressed={mode === id} disabled={onlineActive && mode !== id}
          className="rounded-lg border px-4 py-2 disabled:opacity-50 aria-pressed:bg-[var(--color-neutral-soft)]"
          onClick={() => { setMode(id); void checkAudio(); }}>{label}</button>)}
    </nav>
    {localActive !== false && <p role="status" className="text-sm">{localActive ? "Có phiên local đang ghi. Dừng phiên trước khi bật mic online hoặc TTS." : "Chưa xác minh trạng thái phiên local. Mic online và TTS tạm khóa."}</p>}
    {onlineActive && <p role="status" className="text-sm">Dừng mic online trước khi đổi chế độ.</p>}
    {mode === "local" ? <MeetingWorkspace /> : <AudioSpeechLab key={mode} mode={mode} audioBlocked={localActive !== false} checkAudio={checkAudio} onActiveChange={setOnlineActive} />}
  </div>;
}
