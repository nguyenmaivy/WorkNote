import React, { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Square, Volume2, Gauge, ArrowDownToLine, Loader2, Sparkles, Monitor } from "lucide-react";
import { buildSpokenSegments, findSegment } from "../../utils/speechPronunciation";

interface ReadAloudTextProps {
  /** Văn bản cần đọc + highlight */
  text?: string;
  /** Ngôn ngữ giọng đọc fallback khi không tự nhận diện được (mặc định tiếng Việt) */
  lang?: string;
  /** Class cho khung chứa văn bản */
  textClassName?: string;
}

type Engine = "ai" | "browser";
type Mark = { start: number; end: number; timeMs: number };
type ResumePoint = { sig: string; posSec: number; posChar: number };

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5];

// Giọng AI (Edge neural) cho từng ngôn ngữ — khớp danh sách cho phép ở server.
const VOICE_OPTIONS: Record<string, { id: string; label: string }[]> = {
  vi: [
    { id: "vi-VN-HoaiMyNeural", label: "Hoài My (Nữ)" },
    { id: "vi-VN-NamMinhNeural", label: "Nam Minh (Nam)" },
  ],
  en: [
    { id: "en-US-AriaNeural", label: "Aria (Nữ)" },
    { id: "en-US-AndrewNeural", label: "Andrew (Nam)" },
    { id: "en-US-EmmaNeural", label: "Emma (Nữ)" },
    { id: "en-US-BrianNeural", label: "Brian (Nam)" },
  ],
};

const VIET_CHARS =
  /[àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/gi;

/** Đoán ngôn ngữ chủ đạo của văn bản để chọn giọng đọc phù hợp */
function detectLang(text: string, fallback: string): string {
  const vietCount = (text.match(VIET_CHARS) || []).length;
  if (vietCount >= 2) return "vi-VN";
  if (/[a-z]/i.test(text)) return "en-US";
  return fallback;
}

/** Tìm mark có timeMs lớn nhất ≤ tMs (ứng với từ đang được đọc trong audio AI) */
function findMarkByTime(marks: Mark[], tMs: number): Mark | null {
  let lo = 0, hi = marks.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (marks[mid].timeMs <= tMs) { ans = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  return ans >= 0 ? marks[ans] : null;
}

/**
 * Đọc to văn bản + highlight từ đang đọc theo thời gian thực (kiểu Google Translate).
 *
 * 2 chế độ giọng:
 *  - "Giọng AI" (mặc định): TTS neural Microsoft Edge qua /api/tts-read — đọc ĐÚNG tên
 *    riêng / từ tiếng Anh, có chọn giọng (nam/nữ), kèm mốc thời gian từng từ.
 *  - "Giọng máy": Web Speech API offline (dự phòng), có phiên âm tên riêng sang âm Việt.
 *
 * Bấm "Dừng" sẽ nhớ vị trí đang đọc; bấm "Nghe đọc" lần sau sẽ đọc TIẾP từ đó.
 */
export function ReadAloudText({
  text = "",
  lang = "vi-VN",
  textClassName = "",
}: ReadAloudTextProps) {
  const browserSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const [engine, setEngine] = useState<Engine>("ai");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const [highlight, setHighlight] = useState<{ start: number; end: number } | null>(null);
  const [follow, setFollow] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [notice, setNotice] = useState<string>("");
  const [voice, setVoice] = useState<string>("");
  const [canResume, setCanResume] = useState(false);

  const markRef = useRef<HTMLElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const resumeRef = useRef<ResumePoint | null>(null);
  const aiCacheRef = useRef<Map<string, { audioBase64: string; marks: Mark[]; truncated: boolean }>>(new Map());

  const effectiveLang = useMemo(() => detectLang(text, lang), [text, lang]);
  const langKey = effectiveLang.slice(0, 2);
  const voiceOptions = VOICE_OPTIONS[langKey] || [];

  // Chữ ký nhận dạng "cùng một lần đọc" — đổi 1 trong các yếu tố này thì không resume nữa
  const sig = `${engine}|${voice}|${effectiveLang}|${text}`;

  // Chọn giọng AI mặc định khi ngôn ngữ thay đổi
  useEffect(() => {
    setVoice(voiceOptions[0]?.id || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [langKey]);

  // Cuộn theo từ đang đọc (chỉ khi đang đọc, không tạm dừng, và đang bật chế độ bám)
  useEffect(() => {
    if (follow && isPlaying && !isPaused) {
      markRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [highlight, follow, isPlaying, isPaused]);

  const clearKeepAlive = () => {
    if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
  };

  // Gỡ mọi nguồn phát đang chạy (không đụng tới resumeRef / highlight)
  const teardownPlayback = () => {
    if (browserSupported) window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.ontimeupdate = null;
      audioRef.current = null;
    }
    clearKeepAlive();
    setIsPlaying(false);
    setIsPaused(false);
  };

  // Dừng nhưng NHỚ vị trí để lần sau đọc tiếp; giữ highlight để thấy chỗ dừng.
  const stopAndRemember = () => {
    if (engine === "ai" && audioRef.current) {
      resumeRef.current = { sig, posSec: audioRef.current.currentTime, posChar: 0 };
    } else if (engine === "browser") {
      resumeRef.current = { sig, posSec: 0, posChar: highlight?.start ?? 0 };
    }
    setCanResume(!!resumeRef.current);
    teardownPlayback();
  };

  // Hủy đang-tạo-giọng AI (giữ nguyên vị trí resume cũ nếu có)
  const cancelLoading = () => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setAiLoading(false);
  };

  // Reset hoàn toàn về đầu (đổi văn bản / đổi giọng / đổi engine / unmount)
  const hardStop = () => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    teardownPlayback();
    setAiLoading(false);
    resumeRef.current = null;
    setCanResume(false);
    setHighlight(null);
  };

  // Khi bài đọc kết thúc tự nhiên → quay về đầu
  const finishNaturally = () => {
    resumeRef.current = null;
    setCanResume(false);
    teardownPlayback();
    setHighlight(null);
  };

  // Đổi văn bản (chuyển file) → reset hẳn
  useEffect(() => {
    hardStop();
    setFollow(true);
    setNotice("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useEffect(() => {
    if (browserSupported) window.speechSynthesis.getVoices();
    return () => { hardStop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Engine: Giọng máy (Web Speech API) ──────────────────────────────────────
  const pickBrowserVoice = (targetLang: string) => {
    const voices = window.speechSynthesis.getVoices();
    const baseLang = targetLang.slice(0, 2).toLowerCase();
    return (
      voices.find((v) => v.lang?.toLowerCase() === targetLang.toLowerCase()) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith(baseLang)) ||
      null
    );
  };

  // fromChar: đọc tiếp từ vị trí ký tự này (đổi tốc độ giữa chừng hoặc resume sau khi dừng)
  const speakBrowser = (speakRate = rate, fromChar = 0) => {
    if (!browserSupported || !text.trim()) return;
    window.speechSynthesis.cancel();

    const sub = text.slice(fromChar);
    const { spoken, segments } = buildSpokenSegments(sub, effectiveLang === "vi-VN");
    const utter = new SpeechSynthesisUtterance(spoken);
    utter.lang = effectiveLang;
    utter.rate = speakRate;
    const v = pickBrowserVoice(effectiveLang);
    if (v) utter.voice = v;

    utter.onboundary = (e) => {
      const seg = findSegment(segments, e.charIndex ?? 0);
      if (seg) setHighlight({ start: seg.o0 + fromChar, end: seg.o1 + fromChar });
    };
    utter.onend = finishNaturally;
    utter.onerror = finishNaturally;

    window.speechSynthesis.speak(utter);
    setIsPlaying(true);
    setIsPaused(false);
    setFollow(true);

    clearKeepAlive();
    keepAliveRef.current = setInterval(() => {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
  };

  // ─── Engine: Giọng AI (Edge neural qua server) ───────────────────────────────
  const playAudioFromData = (audioBase64: string, marks: Mark[], startSec = 0) => {
    const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
    audio.playbackRate = rate;

    audio.ontimeupdate = () => {
      const mark = findMarkByTime(marks, audio.currentTime * 1000);
      if (mark) setHighlight({ start: mark.start, end: mark.end });
    };
    audio.onended = finishNaturally;
    audio.onerror = finishNaturally;

    if (startSec > 0) {
      audio.addEventListener("loadedmetadata", () => {
        try { audio.currentTime = startSec; } catch { /* bỏ qua */ }
      }, { once: true });
    }

    audioRef.current = audio;
    audio.play();
    setIsPlaying(true);
    setIsPaused(false);
    setFollow(true);
  };

  const playAi = async (startSec = 0) => {
    if (!text.trim()) return;
    const key = `${voice || langKey}|${text}`;
    const cached = aiCacheRef.current.get(key);
    if (cached) {
      if (cached.truncated) setNotice("Văn bản dài — giọng AI đọc phần đầu (~8000 ký tự).");
      playAudioFromData(cached.audioBase64, cached.marks, startSec);
      return;
    }

    setAiLoading(true);
    setNotice("");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/tts-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang: effectiveLang, voice }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!data.success || !data.audioBase64) throw new Error(data.error || "TTS lỗi");

      aiCacheRef.current.set(key, { audioBase64: data.audioBase64, marks: data.marks || [], truncated: !!data.truncated });
      if (data.truncated) setNotice("Văn bản dài — giọng AI đọc phần đầu (~8000 ký tự).");
      playAudioFromData(data.audioBase64, data.marks || [], startSec);
    } catch (e: any) {
      if (e?.name === "AbortError") return; // người dùng tự hủy → không báo lỗi
      console.warn("AI TTS failed, fallback to browser voice:", e?.message);
      setNotice("Không tạo được giọng AI — đã chuyển sang giọng máy.");
      setEngine("browser");
      speakBrowser();
    } finally {
      setAiLoading(false);
      abortRef.current = null;
    }
  };

  // ─── Điều khiển chung ─────────────────────────────────────────────────────────
  const startPlay = () => {
    // Nếu có điểm dừng khớp đúng lần đọc hiện tại → đọc tiếp từ đó
    const r = resumeRef.current && resumeRef.current.sig === sig ? resumeRef.current : null;
    if (engine === "ai") playAi(r?.posSec ?? 0);
    else speakBrowser(rate, r?.posChar ?? 0);
  };

  const togglePlay = () => {
    if (!isPlaying) { startPlay(); return; }

    if (engine === "ai" && audioRef.current) {
      if (isPaused) { audioRef.current.play(); setIsPaused(false); }
      else { audioRef.current.pause(); setIsPaused(true); }
      return;
    }
    if (isPaused) { window.speechSynthesis.resume(); setIsPaused(false); }
    else { window.speechSynthesis.pause(); setIsPaused(true); }
  };

  const changeRate = (r: number) => {
    setRate(r);
    if (!isPlaying) return;
    if (engine === "ai" && audioRef.current) {
      audioRef.current.playbackRate = r; // đổi tốc độ tức thì, KHÔNG đọc lại
    } else if (engine === "browser") {
      speakBrowser(r, highlight?.start ?? 0); // đọc tiếp từ chỗ đang đọc với tốc độ mới
    }
  };

  const switchEngine = (next: Engine) => {
    if (next === engine) return;
    hardStop();
    setNotice("");
    setEngine(next);
  };

  const changeVoice = (v: string) => {
    hardStop(); // giọng khác cần tạo audio mới → reset, người dùng bấm Nghe đọc lại
    setVoice(v);
  };

  const handleUserScroll = () => { if (isPlaying && follow) setFollow(false); };
  const resumeFollow = () => {
    setFollow(true);
    markRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const aiOnly = !browserSupported;
  const busy = isPlaying || aiLoading;
  // Còn điểm dừng đã nhớ và khớp lần đọc hiện tại?
  const hasResume = canResume && resumeRef.current?.sig === sig;

  return (
    <div className="flex flex-col gap-3">
      {/* Thanh điều khiển phát âm thanh */}
      <div className="flex items-center gap-2 flex-wrap bg-[var(--color-neutral-soft)] border border-[var(--color-border-subtle)] rounded-[8px] px-2.5 py-1.5">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!text.trim() || aiLoading}
          className="flex items-center gap-1.5 text-[12px] font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-40 rounded-[6px] px-2.5 py-1.5 transition-colors"
          title={isPlaying ? (isPaused ? "Tiếp tục" : "Tạm dừng") : hasResume ? "Đọc tiếp chỗ đang dở" : "Đọc to văn bản"}
        >
          {aiLoading ? (
            <>
              <Loader2 size={13} className="animate-spin" /> Đang tạo giọng...
            </>
          ) : !isPlaying ? (
            <>
              {hasResume ? <Play size={13} fill="white" /> : <Volume2 size={13} />}
              {hasResume ? "Đọc tiếp" : "Nghe đọc"}
            </>
          ) : isPaused ? (
            <>
              <Play size={13} fill="white" /> Tiếp tục
            </>
          ) : (
            <>
              <Pause size={13} fill="white" /> Tạm dừng
            </>
          )}
        </button>

        {/* Nút dừng — hiện khi đang đọc (nhớ vị trí) hoặc đang tạo giọng (để hủy) */}
        {busy && (
          <button
            type="button"
            onClick={() => (aiLoading ? cancelLoading() : stopAndRemember())}
            className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-error)] hover:opacity-80 rounded-[6px] px-2 py-1.5 transition"
            title={aiLoading ? "Hủy tạo giọng" : "Dừng (sẽ nhớ vị trí để đọc tiếp)"}
          >
            <Square size={12} fill="currentColor" /> {aiLoading ? "Hủy" : "Dừng"}
          </button>
        )}

        {/* Bấm về đầu khi đang ở trạng thái có thể đọc tiếp */}
        {!busy && hasResume && (
          <button
            type="button"
            onClick={hardStop}
            className="text-[12px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] rounded-[6px] px-2 py-1.5 transition"
            title="Đọc lại từ đầu"
          >
            ↺ Từ đầu
          </button>
        )}

        {/* Chọn engine giọng đọc */}
        {!aiOnly && (
          <div className="flex items-center gap-0.5 bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-[6px] p-0.5">
            <button
              type="button"
              onClick={() => switchEngine("ai")}
              className={`flex items-center gap-1 text-[11px] font-bold rounded-[5px] px-2 py-1 transition-colors ${
                engine === "ai" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
              title="Giọng AI neural — đọc đúng tên riêng / từ tiếng Anh"
            >
              <Sparkles size={11} /> Giọng AI
            </button>
            <button
              type="button"
              onClick={() => switchEngine("browser")}
              className={`flex items-center gap-1 text-[11px] font-bold rounded-[5px] px-2 py-1 transition-colors ${
                engine === "browser" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
              title="Giọng máy tính (offline)"
            >
              <Monitor size={11} /> Giọng máy
            </button>
          </div>
        )}

        {/* Chọn giọng AI (nam/nữ...) */}
        {engine === "ai" && voiceOptions.length > 1 && (
          <select
            value={voice}
            onChange={(e) => changeVoice(e.target.value)}
            className="text-[11px] font-semibold bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-[6px] px-1.5 py-1 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
            title="Chọn giọng đọc"
          >
            {voiceOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-1 ml-auto">
          <Gauge size={12} className="text-[var(--color-neutral)]" />
          {SPEED_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => changeRate(r)}
              className={`text-[11px] font-bold rounded-[5px] px-1.5 py-1 transition-colors ${
                rate === r
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"
              }`}
            >
              {r}x
            </button>
          ))}
        </div>

        {isPlaying && (
          <span className="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-wider flex items-center gap-1 w-full sm:w-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-ping" />
            {isPaused ? "Đang tạm dừng" : "Đang đọc..."}
          </span>
        )}
      </div>

      {notice && (
        <p className="text-[11px] text-[var(--color-text-secondary)] bg-[var(--color-neutral-soft)] border border-[var(--color-border-subtle)] rounded-[6px] px-2.5 py-1.5">
          ℹ️ {notice}
        </p>
      )}

      {/* Văn bản với highlight từ đang đọc — có khung cuộn riêng */}
      <div className="relative">
        <div
          ref={scrollRef}
          onWheel={handleUserScroll}
          onTouchMove={handleUserScroll}
          className="overflow-y-auto max-h-[300px] pr-1"
        >
          <p className={textClassName}>
            {highlight ? (
              <>
                {text.slice(0, highlight.start)}
                <mark
                  ref={markRef}
                  className="bg-[var(--color-primary)] text-white rounded-[3px] px-0.5 py-px"
                >
                  {text.slice(highlight.start, highlight.end)}
                </mark>
                {text.slice(highlight.end)}
              </>
            ) : (
              text
            )}
          </p>
        </div>

        {isPlaying && !follow && (
          <button
            type="button"
            onClick={resumeFollow}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[11px] font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] shadow-md rounded-full px-3 py-1.5 transition-colors animate-fade-in"
            title="Cuộn về từ đang đọc và bám theo trở lại"
          >
            <ArrowDownToLine size={12} /> Cuộn theo lời đọc
          </button>
        )}
      </div>
    </div>
  );
}
