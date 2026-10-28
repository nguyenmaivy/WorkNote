import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { SUPPORTED_LANGUAGES } from "../constants";

interface Props {
  mode: "live" | "text";
  audioBlocked: boolean;
  checkAudio: () => Promise<boolean>;
  onActiveChange: (active: boolean) => void;
}
const LOCALES: Record<string, string> = { vi: "vi-VN", en: "en-US", ja: "ja-JP", zh: "zh-CN", ko: "ko-KR", fr: "fr-FR", de: "de-DE", es: "es-ES", ru: "ru-RU", it: "it-IT", pt: "pt-BR", th: "th-TH", id: "id-ID", ar: "ar-SA", hi: "hi-IN" };

export default function AudioSpeechLab({ mode, audioBlocked, checkAudio, onActiveChange }: Props) {
  const [source, setSource] = useState(mode === "live" ? "en" : "vi");
  const [target, setTarget] = useState(mode === "live" ? "vi" : "en");
  const [text, setText] = useState("");
  const [translated, setTranslated] = useState("");
  const [region, setRegion] = useState("north");
  const [speed, setSpeed] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [consent, setConsent] = useState(false);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [lines, setLines] = useState<{ id: number; time: string; original: string; translated: string }[]>([]);
  const recognition = useRef<any>(null);
  const running = useRef(false);
  const generation = useRef(0);
  const mounted = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const audioUrl = useRef<string | null>(null);
  const pending = useRef(false);

  function stopPlayback() {
    audio.current?.pause();
    audio.current = null;
    window.speechSynthesis?.cancel();
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = null;
    if (mounted.current) setPlaying(false);
  }
  function stop() {
    generation.current++;
    running.current = false;
    if (recognition.current) {
      recognition.current.onend = null;
      recognition.current.onresult = null;
      recognition.current.onerror = null;
      try { recognition.current.abort(); } catch {}
      recognition.current = null;
    }
    controller.current?.abort();
    pending.current = false;
    stopPlayback();
    onActiveChange(false);
    if (mounted.current) { setActive(false); setBusy(false); setStatus("Đã dừng."); }
  }
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; stop(); };
  // Cleanup owns the mounted instance, not each render's handlers.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (audioBlocked) stop(); }, [audioBlocked]);

  async function translate(value: string, signal: AbortSignal) {
    if (!value.trim() || value.length > 5000) throw new Error("Văn bản phải từ 1 đến 5.000 ký tự.");
    const url = `https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(value)}`;
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`Dịch online thất bại (${response.status}).`);
    const data = await response.json();
    if (!Array.isArray(data?.[0]) || !data[0].every((item: any) => typeof item?.[0] === "string")) throw new Error("Dịch vụ trả dữ liệu không hợp lệ.");
    return data[0].map((item: any) => item[0]).join("");
  }
  async function startLiveTranslation() {
    if (busy || running.current || !consent) return;
    setBusy(true); setError("");
    const turn = ++generation.current;
    if (!(await checkAudio())) { if (mounted.current) { setError("Không thể bật mic khi có phiên local hoặc chưa xác minh trạng thái."); setBusy(false); } return; }
    if (!mounted.current || turn !== generation.current) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setError("Dùng Chrome/Edge hỗ trợ nhận dạng giọng nói trình duyệt."); setBusy(false); return; }
    const instance = new SpeechRecognition();
    recognition.current = instance;
    instance.continuous = true;
    instance.interimResults = true;
    instance.lang = LOCALES[source] || source;
    running.current = true;
    instance.onstart = () => { if (turn === generation.current) { setActive(true); setBusy(false); setStatus("Đang nghe mic…"); } };
    instance.onresult = async (event: any) => {
      if (turn !== generation.current || !running.current) return;
      let final = "", interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      if (interim) setStatus(`Đang nghe: ${interim}`);
      if (!final.trim()) return;
      // shortcut: one translation in flight; stop visibly instead of dropping speech under overload.
      if (pending.current) { stop(); setError("Dịch không theo kịp lời nói. Đã dừng mic; hãy bắt đầu lại và nói chậm hơn."); return; }
      pending.current = true;
      const request = new AbortController(); controller.current = request;
      try {
        const result = await translate(final, request.signal);
        if (turn === generation.current && running.current) {
          setLines(previous => [...previous, { id: event.timeStamp || Date.now(), time: new Date().toLocaleTimeString("vi-VN"), original: final, translated: result }]);
          setStatus("Đang nghe mic…");
        }
      } catch (e) {
        if (turn === generation.current) { stop(); setError((e as Error).message); }
      } finally { if (turn === generation.current) pending.current = false; }
    };
    instance.onerror = (event: any) => { if (turn === generation.current) { stop(); setError(`Lỗi nhận dạng: ${event.error || "không xác định"}`); } };
    instance.onend = () => {
      if (running.current && turn === generation.current) {
        try { instance.start(); } catch { stop(); setError("Không thể tiếp tục mic. Hãy bắt đầu lại."); }
      }
    };
    try { onActiveChange(true); instance.start(); }
    catch (e) { stop(); setError((e as Error).message); }
  }
  async function translateText() {
    if (busy) return;
    const turn = ++generation.current;
    controller.current?.abort(); controller.current = new AbortController();
    setBusy(true); setError(""); setTranslated("");
    try { const result = await translate(text, controller.current.signal); if (turn === generation.current && mounted.current) setTranslated(result); }
    catch (e) { if (turn === generation.current && mounted.current) setError((e as Error).message); }
    finally { if (turn === generation.current && mounted.current) setBusy(false); }
  }
  async function play(value: string, language: string, cloud: boolean) {
    if (!value.trim() || value.length > 5000 || busy || audioBlocked) return;
    const turn = ++generation.current;
    setBusy(true); setError("");
    try {
      if (!(await checkAudio())) throw new Error("Dừng phiên local trước khi phát giọng nói.");
      if (!mounted.current || turn !== generation.current) return;
      stopPlayback(); onActiveChange(true); setPlaying(true);
      const done = () => { if (turn === generation.current && mounted.current) { stopPlayback(); onActiveChange(false); } };
      if (cloud) {
        controller.current = new AbortController();
        const response = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: value, region }), signal: controller.current.signal });
        if (!response.ok) throw new Error(`TTS thất bại (${response.status}).`);
        const data = await response.json();
        if (!mounted.current || turn !== generation.current) return;
        if (!data.base64Audio) throw new Error("Gemini TTS chưa khả dụng. Có thể dùng giọng trình duyệt.");
        const bytes = Uint8Array.from(atob(data.base64Audio), c => c.charCodeAt(0));
        if (data.mimeType !== "audio/pcm;rate=24000" || bytes.length % 2) throw new Error("Định dạng TTS không được hỗ trợ.");
        const header = new ArrayBuffer(44); const view = new DataView(header);
        function label(offset: number, value: string) { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); }
        label(0, "RIFF"); view.setUint32(4, 36 + bytes.length, true); label(8, "WAVEfmt ");
        view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
        view.setUint32(24, 24000, true); view.setUint32(28, 48000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
        label(36, "data"); view.setUint32(40, bytes.length, true);
        audioUrl.current = URL.createObjectURL(new Blob([header, bytes], { type: "audio/wav" }));
        audio.current = new Audio(audioUrl.current); audio.current.playbackRate = speed;
        audio.current.onended = done;
        audio.current.onerror = () => { done(); setError("Không phát được audio TTS."); };
        await audio.current.play();
      } else {
        if (!window.speechSynthesis) throw new Error("Trình duyệt không hỗ trợ TTS.");
        const utterance = new SpeechSynthesisUtterance(value);
        utterance.lang = LOCALES[language] || language; utterance.rate = speed; utterance.pitch = pitch;
        utterance.onend = done;
        utterance.onerror = () => { done(); setError("Giọng trình duyệt không khả dụng."); };
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) { if (mounted.current && turn === generation.current) { stopPlayback(); onActiveChange(false); setError((e as Error).message); } }
    finally { if (mounted.current && turn === generation.current) setBusy(false); }
  }
  function exportSubtitlesTxt() {
    const content = lines.map(line => `[${line.time}]\nGốc: ${line.original}\nDịch: ${line.translated}`).join("\n\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "meeting-online-subtitles.txt"; link.click(); URL.revokeObjectURL(url);
  }
  return <Card className="p-4 space-y-4">
    <h2 className="text-lg font-semibold">{mode === "live" ? "Hội thoại online — mic trình duyệt" : "Văn bản & TTS"}</h2>
    <p className="text-sm">Dịch gửi văn bản tới Google; nhận dạng trình duyệt có thể dùng dịch vụ mạng. Gemini TTS gửi văn bản lên cloud. Giọng trình duyệt tùy thiết bị, không bảo đảm offline. Không tự gửi transcript local; phụ đề online không lưu thành phiên Meeting.</p>
    <div className="flex flex-wrap gap-4">
      <label>Ngôn ngữ gốc<select aria-label="Ngôn ngữ gốc" disabled={active || busy || playing} value={source} onChange={e => { setSource(e.target.value); setTranslated(""); }}>{SUPPORTED_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}</select></label>
      <label>Ngôn ngữ đích<select aria-label="Ngôn ngữ đích" disabled={active || busy || playing} value={target} onChange={e => { setTarget(e.target.value); setTranslated(""); }}>{SUPPORTED_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}</select></label>
    </div>
    {mode === "live" ? <>
      <label className="flex gap-2"><input type="checkbox" checked={consent} disabled={active || busy} onChange={e => setConsent(e.target.checked)} />Tôi có sự đồng ý của người tham gia và chấp nhận xử lý online.</label>
      {active || busy ? <Button onClick={stop}>Dừng mic online</Button> : <Button disabled={!consent || audioBlocked} onClick={() => void startLiveTranslation()}>Bắt đầu dịch live</Button>}
      <p role="status">{status}</p>
      <div className="flex gap-2"><Button disabled={!lines.length} onClick={exportSubtitlesTxt}>Xuất phụ đề TXT</Button><Button disabled={active || busy} onClick={() => setLines([])}>Xóa bảng</Button></div>
      {lines.map((line, i) => <div key={`${line.id}-${i}`} className="border-t py-2"><small>{line.time}</small><p>{line.original}</p><p>{line.translated}</p></div>)}
    </> : <>
      <label className="block">Văn bản<textarea aria-label="Văn bản" maxLength={5000} value={text} onChange={e => { setText(e.target.value); setTranslated(""); }} className="block w-full min-h-32 rounded border p-2" /></label>
      <Button disabled={busy || playing || !text.trim()} onClick={() => void translateText()}>Dịch văn bản online</Button>
      {translated && <div><p className="whitespace-pre-wrap">{translated}</p><Button disabled={audioBlocked || busy || playing} onClick={() => void play(translated, target, false)}>Đọc bản dịch</Button></div>}
      <div className="flex flex-wrap gap-4"><label>Vùng giọng Gemini<select value={region} onChange={e => setRegion(e.target.value)}><option value="north">Bắc</option><option value="central">Trung</option><option value="south">Nam</option></select></label><label>Tốc độ {speed}x<input aria-label="Tốc độ" type="range" min="0.5" max="1.5" step="0.1" value={speed} onChange={e => setSpeed(Number(e.target.value))} /></label></div>
      <label className="block">Cao độ giọng trình duyệt {pitch}x<input aria-label="Cao độ" type="range" min="0.5" max="1.5" step="0.1" value={pitch} onChange={e => setPitch(Number(e.target.value))} /></label>
      <div className="flex flex-wrap gap-2"><Button disabled={audioBlocked || busy || playing || !text.trim()} onClick={() => void play(text, source, true)}>Đọc bằng Gemini online</Button><Button disabled={audioBlocked || busy || playing || !text.trim()} onClick={() => void play(text, source, false)}>Đọc bằng trình duyệt</Button><Button disabled={!playing && !busy} onClick={stop}>Dừng phát / hủy</Button></div>
    </>}
    {error && <p role="alert">{error}</p>}
  </Card>;
}
