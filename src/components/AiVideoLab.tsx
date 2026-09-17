import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  FileText,
  Languages,
  ListVideo,
  Tag,
  Quote,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
  Gauge,
  Monitor,
  Loader2,
  Send,
  Bot,
  MessageSquareText,
  X,
} from "lucide-react";
import type { UploadedFile, QuizQuestion } from "../types";
import { Markdown } from "./ui/Markdown";
import { apiClient } from "../services/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function youtubeId(url?: string): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return m?.[1] ?? null;
}

export function isVideoFile(file?: UploadedFile | null): boolean {
  if (!file) return false;
  return !!youtubeId(file.sourceUrl) || (file.mimeType || "").includes("video");
}

function looksVietnamese(s: string): boolean {
  return /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(s);
}

export const SUBTITLE_LANGS: { code: string; label: string }[] = [
  { code: "vi", label: "Tiếng Việt" },
  { code: "en", label: "Tiếng Anh" },
  { code: "ja", label: "Tiếng Nhật" },
  { code: "zh", label: "Tiếng Trung" },
  { code: "ko", label: "Tiếng Hàn" },
  { code: "fr", label: "Tiếng Pháp" },
  { code: "de", label: "Tiếng Đức" },
  { code: "es", label: "Tiếng Tây Ban Nha" },
  { code: "ru", label: "Tiếng Nga" },
  { code: "it", label: "Tiếng Ý" },
  { code: "pt", label: "Tiếng Bồ Đào Nha" },
  { code: "th", label: "Tiếng Thái" },
  { code: "id", label: "Tiếng Indonesia" },
  { code: "ar", label: "Tiếng Ả Rập" },
  { code: "hi", label: "Tiếng Hindi" },
];
const langLabelOf = (code: string) => SUBTITLE_LANGS.find((l) => l.code === code)?.label || code.toUpperCase();

interface Cue {
  start: number;
  dur: number;
  text: string;
}

/** Split a plain transcript into subtitle-sized lines (fallback for uploaded video). */
function toSegments(text: string): string[] {
  if (!text) return [];
  const clean = text.replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim();
  const parts = clean.split(/(?<=[.!?…])\s+/).map((s) => s.trim()).filter((s) => s.length > 1);
  const merged: string[] = [];
  for (const p of parts) {
    if (merged.length && merged[merged.length - 1].length < 40) merged[merged.length - 1] += " " + p;
    else merged.push(p);
  }
  return merged.slice(0, 600);
}

const STOP = new Set(
  ("the a an and or of to in is are was were be been being for on with as by that this it its from at into your you we they their our he she his her i me my " +
    "but not have has had do does did so if then than there here what which who when where why how all can could would should will just about over under up down out off " +
    "more most some any much many very really maybe well actually pretty quite also even still going gonna okay like kind sort thing things something someone way ways lot lots " +
    "now one two them these those got get make made take see say said know think want need use used using also each other into onto than because " +
    "này của và là các một những được trong cho khi đó với để như cũng đã sẽ thì mà ra vào nên rất thế còn lại nó ta về từ theo bằng hay hoặc nếu vì do trên dưới sau trước giữa")
    .split(/\s+/)
);

/** Key terms = the most frequent CONTENT words; drop always-capitalised fillers
 *  (sentence-starters / stray names) so the chips reflect the real topic. */
function deriveKeyTerms(text: string, max = 6): string[] {
  const freq = new Map<string, { raw: string; n: number; cap: number; lower: number }>();
  for (const t of (text || "").split(/[^A-Za-zÀ-ỹ]+/)) {
    const low = t.toLowerCase();
    if (low.length < 5 || STOP.has(low)) continue;
    const e = freq.get(low) || { raw: t, n: 0, cap: 0, lower: 0 };
    e.n++;
    if (/^[A-ZÀ-Ỹ]/.test(t)) e.cap++;
    else {
      e.lower++;
      e.raw = t; // prefer a real lowercase occurrence as the surface form
    }
    freq.set(low, e);
  }
  return [...freq.values()]
    .filter((e) => e.n >= 3)
    // keep words that occur lowercase somewhere (real content words), unless they
    // recur a lot (a genuine proper noun like a product/person name)
    .filter((e) => e.lower > 0 || e.n >= 6)
    .sort((a, b) => b.n - a.n)
    .slice(0, max)
    .map((e) => e.raw[0].toUpperCase() + e.raw.slice(1));
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Index of the last cue whose start <= t (binary search). */
function activeIndex(cues: Cue[] | null, t: number): number {
  if (!cues?.length) return -1;
  let lo = 0;
  let hi = cues.length - 1;
  let ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].start <= t) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

// ─── YouTube IFrame API (singleton loader) ──────────────────────────────────────
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}
let ytApiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject();
  if (window.YT?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.getElementById("yt-iframe-api")) {
      const s = document.createElement("script");
      s.id = "yt-iframe-api";
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  });
  return ytApiPromise;
}

/** Read an uploaded file's bytes as base64 (for sending to the transcribe API). */
async function fileToBase64(file: UploadedFile): Promise<string | null> {
  if (file.base64Data) return file.base64Data;
  let blob = file.blob;
  if (!blob && file.objectUrl) {
    try {
      blob = await (await fetch(file.objectUrl)).blob();
    } catch {
      /* ignore */
    }
  }
  if (!blob) return null;
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      const comma = s.indexOf(",");
      resolve(comma >= 0 ? s.slice(comma + 1) : s);
    };
    r.onerror = () => resolve(null);
    r.readAsDataURL(blob!);
  });
}

// ─── Component ──────────────────────────────────────────────────────────────────

interface AiVideoLabProps {
  file: UploadedFile;
}

export default function AiVideoLab({ file }: AiVideoLabProps) {
  const ytId = youtubeId(file.sourceUrl);
  const isYoutube = !!ytId;

  // ── Original captions (real, timed, original language) ──
  const [origCues, setOrigCues] = useState<Cue[] | null>(null);
  const [origLang, setOrigLang] = useState<string>("");
  const [capState, setCapState] = useState<"loading" | "ready" | "none">("loading");
  const [videoDur, setVideoDur] = useState<number>(0);

  useEffect(() => {
    if (!isYoutube) {
      setCapState("none"); // uploaded video → synthesize below
      return;
    }
    let cancelled = false;
    setCapState("loading");
    setOrigCues(null);
    fetch("/api/youtube-transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: file.sourceUrl }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d?.success && Array.isArray(d.segments) && d.segments.length) {
          setOrigCues(d.segments);
          setOrigLang((d.lang || "en").slice(0, 2));
          setCapState("ready");
        } else setCapState("none");
      })
      .catch(() => {
        if (!cancelled) setCapState("none");
      });
    return () => {
      cancelled = true;
    };
  }, [isYoutube, file.sourceUrl]);

  // Fallback cues for uploaded video / no-caption: synthesize from the AI transcript.
  const fallbackCues = useMemo<Cue[]>(() => {
    const segs = toSegments(file.extractedText || "");
    if (!segs.length) return [];
    const dur = videoDur || Math.max(60, Math.round((file.extractedText || "").split(/\s+/).length / 2.6));
    const step = dur / segs.length;
    return segs.map((t, i) => ({ start: i * step, dur: step, text: t }));
  }, [file.extractedText, videoDur]);

  // AI transcription (Gemini) for uploaded media with no captions — opt-in (cách A).
  const [aiCues, setAiCues] = useState<Cue[] | null>(null);
  const [aiLang, setAiLang] = useState<string>("");
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeErr, setTranscribeErr] = useState<string | null>(null);
  useEffect(() => {
    // reset AI captions when the file changes
    setAiCues(null);
    setAiLang("");
    setTranscribeErr(null);
  }, [file.id]);

  const hasRealCaptions = capState === "ready" && !!origCues;
  const hasAiCaptions = !hasRealCaptions && !!aiCues;
  const effectiveOrig: Cue[] = hasRealCaptions ? origCues! : aiCues ?? fallbackCues;
  const sourceLang = hasRealCaptions
    ? origLang
    : hasAiCaptions
    ? aiLang || "auto"
    : looksVietnamese(file.extractedText || "")
    ? "vi"
    : "en";

  const runTranscribe = async () => {
    if (transcribing) return;
    setTranscribing(true);
    setTranscribeErr(null);
    try {
      const b64 = await fileToBase64(file);
      if (!b64) throw new Error("Không đọc được dữ liệu file. Hãy tải lại file.");
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Data: b64, mimeType: file.mimeType, name: file.name }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success || !data.segments?.length) {
        throw new Error(data?.error || "Phiên âm thất bại.");
      }
      setAiCues(data.segments);
      setAiLang((data.lang || "auto").slice(0, 2));
    } catch (e: any) {
      setTranscribeErr(e?.message || "Lỗi phiên âm AI.");
    } finally {
      setTranscribing(false);
    }
  };

  // ── Target language (user-selectable) ──
  const [targetLang, setTargetLang] = useState<string>("vi");
  const defaultedRef = useRef(false);
  useEffect(() => {
    if (defaultedRef.current || !sourceLang) return;
    defaultedRef.current = true;
    setTargetLang(sourceLang === "vi" ? "en" : "vi");
  }, [sourceLang]);

  // ── Translated cues (YouTube's own track first, else free MT aligned to original) ──
  const [transCues, setTransCues] = useState<Cue[] | null>(null);
  const [transState, setTransState] = useState<"loading" | "yt" | "free" | "same" | "error">("loading");

  useEffect(() => {
    if (capState === "loading") return;
    if (!effectiveOrig.length) {
      setTransState("error");
      setTransCues(null);
      return;
    }
    if (targetLang === sourceLang) {
      setTransCues(effectiveOrig);
      setTransState("same");
      return;
    }
    let cancelled = false;
    setTransState("loading");
    setTransCues(null);
    (async () => {
      // 1) YouTube's own translated caption track (real timing, best quality)
      if (isYoutube) {
        try {
          const r = await fetch("/api/youtube-transcript", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: file.sourceUrl, lang: targetLang }),
          });
          if (r.ok) {
            const d = await r.json();
            if (!cancelled && d?.success && d.segments?.length) {
              setTransCues(d.segments);
              setTransState("yt");
              return;
            }
          }
        } catch {
          /* fall through to free MT */
        }
      }
      // 2) free MT of the original cues (aligned 1:1 by line)
      try {
        const texts = effectiveOrig.map((c) => c.text.replace(/\n/g, " "));
        const r2 = await fetch("/api/subtitle-translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: texts.join("\n"), targetLang, granularity: "line", maxChars: 30000 }),
        });
        const d2 = await r2.json();
        if (cancelled) return;
        if (d2?.success && typeof d2.translatedText === "string") {
          const arr = d2.translatedText.split("\n");
          setTransCues(effectiveOrig.map((c, i) => ({ ...c, text: arr[i] ?? c.text })));
          setTransState("free");
        } else setTransState("error");
      } catch {
        if (!cancelled) setTransState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetLang, sourceLang, capState, effectiveOrig, isYoutube, file.sourceUrl]);

  // ── Playback time sync ──
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<any>(null);
  const [curTime, setCurTime] = useState(0);

  // YouTube: bind YT.Player to the existing iframe and poll currentTime.
  useEffect(() => {
    if (!isYoutube) return;
    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | null = null;
    loadYouTubeApi().then(() => {
      if (cancelled || !iframeRef.current || !window.YT?.Player) return;
      try {
        playerRef.current = new window.YT.Player(iframeRef.current, { events: {} });
      } catch {
        /* ignore */
      }
      poll = setInterval(() => {
        const p = playerRef.current;
        if (p?.getCurrentTime) {
          try {
            setCurTime(p.getCurrentTime() || 0);
          } catch {
            /* ignore */
          }
        }
      }, 250);
    });
    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [isYoutube, ytId]);

  const onVideoTime = () => {
    if (videoElRef.current) setCurTime(videoElRef.current.currentTime || 0);
  };

  const origIdx = activeIndex(effectiveOrig, curTime);
  const transIdx = activeIndex(transCues, curTime);
  const original = effectiveOrig[origIdx]?.text || (capState === "loading" ? "Đang tải phụ đề…" : "—");
  const translated = transState === "loading" ? undefined : transCues?.[transIdx]?.text ?? "";

  const seekTo = (sec: number) => {
    if (isYoutube && playerRef.current?.seekTo) {
      try {
        playerRef.current.seekTo(sec, true);
        playerRef.current.playVideo?.();
      } catch {
        /* ignore */
      }
    } else if (videoElRef.current) {
      videoElRef.current.currentTime = sec;
      videoElRef.current.play?.();
    }
    setCurTime(sec);
  };
  const stepCue = (dir: -1 | 1) => {
    const next = effectiveOrig[Math.max(0, Math.min(effectiveOrig.length - 1, origIdx + dir))];
    if (next) seekTo(next.start + 0.05);
  };

  // ── Chapters from REAL caption timestamps ──
  const chapters = useMemo(() => {
    if (!effectiveOrig.length) return [] as { start: number; title: string }[];
    const total = effectiveOrig[effectiveOrig.length - 1].start + effectiveOrig[effectiveOrig.length - 1].dur;
    const n = Math.min(8, Math.max(3, Math.round(total / 120)));
    const out: { start: number; title: string }[] = [];
    for (let i = 0; i < n; i++) {
      const t = (i / n) * total;
      const idx = activeIndex(effectiveOrig, t);
      const words = effectiveOrig[idx].text.split(/\s+/).slice(0, 6).join(" ");
      out.push({ start: effectiveOrig[idx].start, title: words.charAt(0).toUpperCase() + words.slice(1) });
    }
    return out;
  }, [effectiveOrig]);

  const keyTerms = useMemo(() => {
    const src = hasRealCaptions ? effectiveOrig.map((c) => c.text).join(" ") : file.extractedText || "";
    return deriveKeyTerms(src);
  }, [hasRealCaptions, effectiveOrig, file.extractedText]);

  // ── Interpreter (TTS reads the translated line as it appears) ──
  const [interpret, setInterpret] = useState(false);
  const [voiceMode, setVoiceMode] = useState<"browser" | "edge">("browser");
  const [rate, setRate] = useState(1);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const edgeCacheRef = useRef<Map<number, string>>(new Map());
  const ttsOK = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!ttsOK) return;
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      voiceRef.current =
        voices.find((v) => v.lang.toLowerCase().startsWith(targetLang)) ||
        voices.find((v) => v.lang.toLowerCase().includes(targetLang)) ||
        null;
    };
    pick();
    window.speechSynthesis.onvoiceschanged = pick;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [targetLang, ttsOK]);

  useEffect(() => {
    edgeCacheRef.current.clear();
  }, [transCues, targetLang]);

  const stopSpeaking = () => {
    if (ttsOK) window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current = null;
    }
  };

  const fetchEdgeLine = async (idx: number): Promise<string | null> => {
    const line = transCues?.[idx]?.text;
    if (!line) return null;
    const cached = edgeCacheRef.current.get(idx);
    if (cached) return cached;
    try {
      const res = await fetch("/api/tts-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: line, lang: targetLang }),
      });
      const data = await res.json();
      if (data?.audioBase64) {
        edgeCacheRef.current.set(idx, data.audioBase64);
        return data.audioBase64;
      }
    } catch {
      /* ignore */
    }
    return null;
  };

  const speakBrowserLine = (line: string) => {
    if (!ttsOK || !line) return;
    const u = new SpeechSynthesisUtterance(line);
    if (voiceRef.current) u.voice = voiceRef.current;
    u.lang = voiceRef.current?.lang || `${targetLang}`;
    u.rate = rate;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  // Narrate when the active translated cue changes.
  useEffect(() => {
    if (!interpret || transIdx < 0 || !transCues?.[transIdx]) return;
    let cancelled = false;
    const line = transCues[transIdx].text;
    stopSpeaking();
    if (voiceMode === "edge") {
      (async () => {
        const b64 = await fetchEdgeLine(transIdx);
        if (cancelled) return;
        if (b64) {
          const audio = new Audio(`data:audio/mpeg;base64,${b64}`);
          audio.playbackRate = rate;
          audioRef.current = audio;
          audio.play().catch(() => {});
        } else speakBrowserLine(line);
        fetchEdgeLine(transIdx + 1);
      })();
    } else speakBrowserLine(line);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transIdx, interpret, voiceMode, transCues]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  useEffect(() => {
    if (!interpret) stopSpeaking();
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interpret]);

  // Duck the video volume while interpreting.
  useEffect(() => {
    const vol = interpret ? 0.12 : 1;
    if (isYoutube) {
      try {
        playerRef.current?.setVolume?.(Math.round(vol * 100));
      } catch {
        /* ignore */
      }
    } else if (videoElRef.current) {
      try {
        videoElRef.current.volume = vol;
      } catch {
        /* ignore */
      }
    }
  }, [interpret, isYoutube, curTime]);

  const quiz = file.quiz || [];
  const [showQuiz, setShowQuiz] = useState(false);

  const haveProperCaptions = hasRealCaptions || hasAiCaptions;
  // Only claim "Ngôn ngữ gốc · <lang>" when we truly have the source (real CC or AI
  // transcription). The fallback transcript may already be a translation → label honestly.
  const origLabel = haveProperCaptions
    ? `Ngôn ngữ gốc · ${langLabelOf(sourceLang)}${hasAiCaptions ? " (AI)" : ""}`
    : "Phiên âm tạm (chưa chắc ngôn ngữ gốc)";
  const transLabel = `Bản dịch · ${langLabelOf(targetLang)}`;
  const transBadge =
    transState === "yt" ? "Phụ đề YouTube" : transState === "free" ? "Dịch miễn phí" : transState === "same" ? "Cùng ngôn ngữ" : "";

  // Honest status for caption availability (so caption-less videos don't look broken).
  const canTranscribe = !isYoutube && !!(file.objectUrl || file.blob || file.base64Data);
  const captionNotice =
    capState === "loading" || haveProperCaptions
      ? null
      : effectiveOrig.length === 0
      ? "no-content"
      : isYoutube
      ? "yt-none"
      : "uploaded";

  // Context for the "ask about this video" chat: summary + the real transcript.
  const chatContext = useMemo(() => {
    const transcript = effectiveOrig.map((c) => c.text).join(" ").slice(0, 14000);
    const sum = file.summary?.trim() ? `TÓM TẮT:\n${file.summary}\n\n` : "";
    return `${sum}TRANSCRIPT VIDEO "${file.name}":\n${transcript || "(chưa lấy được phụ đề)"}`;
  }, [effectiveOrig, file.summary, file.name]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
    <div className="flex flex-col lg:flex-row gap-6">
      {/* ── Left: video + subtitles ── */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="bg-black rounded-[16px] overflow-hidden shadow-[var(--shadow-card)] relative aspect-video flex-shrink-0">
          {isYoutube ? (
            <iframe
              ref={iframeRef}
              title={file.name}
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&enablejsapi=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : file.objectUrl ? (
            <video
              ref={videoElRef}
              src={file.objectUrl}
              controls
              onTimeUpdate={onVideoTime}
              onLoadedMetadata={(e) => setVideoDur((e.target as HTMLVideoElement).duration || 0)}
              className="w-full h-full object-contain bg-black"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/60 text-[14px]">
              Không có nguồn video để phát.
            </div>
          )}

          {/* Image subtitle overlay (phụ đề hình ảnh) — synced to playback */}
          {effectiveOrig.length > 0 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 md:p-4 flex flex-col items-center gap-1 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
              <p className="text-white text-center text-[14px] md:text-[17px] font-semibold leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] max-w-3xl">
                {original}
              </p>
              {translated ? (
                <p className="text-[#84d5ca] text-center text-[13px] md:text-[15px] font-medium leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] max-w-3xl">
                  {translated}
                </p>
              ) : null}
            </div>
          )}
        </div>

        {/* Real-time translation panel */}
        <div className="bg-[var(--color-surface)] rounded-[16px] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)] p-4 md:p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border-subtle)] pb-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 min-w-0">
              <h4 className="text-[14px] font-semibold text-[var(--color-text-secondary)] flex items-center gap-1.5 shrink-0">
                <Languages size={18} className="text-[var(--color-primary)]" />
                <span className="hidden sm:inline">Dịch sang</span>
              </h4>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="text-[12px] font-semibold bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-[6px] px-2 py-1 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] cursor-pointer"
                title="Chọn ngôn ngữ dịch phụ đề"
              >
                {SUBTITLE_LANGS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              {ttsOK && (
                <button
                  onClick={() => setInterpret((s) => !s)}
                  title={interpret ? "Tắt phiên dịch viên" : "Bật phiên dịch viên — đọc bản dịch thành tiếng"}
                  className={`px-2 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition-colors ${
                    interpret
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                  }`}
                >
                  {interpret ? <Volume2 size={12} /> : <VolumeX size={12} />}
                  Phiên dịch
                </button>
              )}
              <button onClick={() => stepCue(-1)} className="p-1 rounded-md hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)]" aria-label="Câu trước">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => stepCue(1)} className="p-1 rounded-md hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)]" aria-label="Câu sau">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {interpret && ttsOK && (
            <div className="flex items-center gap-2 flex-wrap text-[11px] bg-[var(--color-neutral-soft)] border border-[var(--color-border-subtle)] rounded-[8px] px-2.5 py-1.5">
              <span className="font-semibold text-[var(--color-text-secondary)]">Giọng đọc:</span>
              <div className="flex items-center gap-0.5 bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-[6px] p-0.5">
                <button onClick={() => setVoiceMode("browser")} className={`flex items-center gap-1 rounded-[5px] px-2 py-1 font-bold ${voiceMode === "browser" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-secondary)]"}`}>
                  <Monitor size={11} /> Máy
                </button>
                <button onClick={() => setVoiceMode("edge")} className={`flex items-center gap-1 rounded-[5px] px-2 py-1 font-bold ${voiceMode === "edge" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-secondary)]"}`}>
                  <Sparkles size={11} /> Neural
                </button>
              </div>
              <span className="text-[var(--color-text-secondary)] flex items-center gap-1">
                <Volume2 size={11} /> đã hạ tiếng video
              </span>
              <div className="flex items-center gap-1 ml-auto">
                <Gauge size={12} className="text-[var(--color-text-secondary)]" />
                {[0.75, 1, 1.25, 1.5, 2].map((r) => (
                  <button key={r} onClick={() => setRate(r)} className={`rounded-[5px] px-1.5 py-1 font-bold ${rate === r ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"}`}>
                    {r}x
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Honest notice about caption source (+ AI-transcribe option for uploads) */}
          {captionNotice && (
            <div className="text-[12px] text-[var(--color-text-secondary)] bg-[var(--color-error-soft,#fff4ed)] border border-[var(--color-border-subtle)] rounded-[8px] px-3 py-2 flex flex-col gap-2 leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="shrink-0">⚠️</span>
                <span>
                  {captionNotice === "no-content"
                    ? "Video này không có phụ đề (CC) công khai và chưa có bản phiên âm AI."
                    : captionNotice === "yt-none"
                    ? "Video YouTube này không có phụ đề (CC) công khai. Phần “ngôn ngữ gốc” đang là bản phiên âm/dịch AI cũ — CÓ THỂ KHÔNG đúng ngôn ngữ gốc thật. Muốn lấy đúng lời gốc (vd tiếng Hàn): tải video về rồi upload file để dùng “Tạo phụ đề bằng AI”."
                    : "Phần “ngôn ngữ gốc” hiện là bản phiên âm tạm (có thể đã bị dịch, chưa chắc đúng ngôn ngữ gốc). Bấm nút dưới để AI nghe & tạo phụ đề ĐÚNG ngôn ngữ gốc, có mốc thời gian thật."}
                </span>
              </div>
              {canTranscribe && (
                <div className="flex items-center gap-2 flex-wrap pl-6">
                  <button
                    onClick={runTranscribe}
                    disabled={transcribing}
                    className="inline-flex items-center gap-1.5 text-[12px] font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 rounded-[6px] px-2.5 py-1.5 transition-colors"
                  >
                    {transcribing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    {transcribing ? "Đang phiên âm…" : "🎙️ Tạo phụ đề bằng AI"}
                  </button>
                  <span className="text-[11px] text-[var(--color-text-secondary)]">dùng Gemini (tốn token) · tối đa ~50MB</span>
                </div>
              )}
              {transcribeErr && <span className="text-[11px] text-[var(--color-error)] pl-6">{transcribeErr}</span>}
            </div>
          )}

          {/* Original */}
          <div className="p-3 bg-[var(--color-surface-container-lowest)] rounded-[10px] border-l-2 border-[var(--color-outline-variant)]">
            <span className="text-[11px] font-bold text-[var(--color-text-secondary)] mb-1 block uppercase tracking-wider">{origLabel}</span>
            <p className="text-[16px] text-[var(--color-text-primary)] leading-relaxed">{original}</p>
          </div>
          {/* Translation */}
          <div className="p-3 bg-[var(--color-secondary-container)]/15 rounded-[10px] border-l-2 border-[var(--color-secondary)]">
            <span className="text-[11px] font-bold text-[var(--color-secondary)] mb-1 flex items-center justify-between uppercase tracking-wider">
              {transLabel}
              {transBadge && <span className="text-[10px] text-[var(--color-text-secondary)] normal-case">{transBadge}</span>}
            </span>
            {transState === "loading" ? (
              <span className="text-[14px] text-[var(--color-text-secondary)] italic flex items-center gap-1.5">
                <Loader2 size={13} className="animate-spin" /> Đang tải bản dịch…
              </span>
            ) : transState === "error" ? (
              <span className="text-[13px] text-[var(--color-text-secondary)]">Chưa lấy được bản dịch (chỉ hiển thị bản gốc).</span>
            ) : (
              <p className="text-[16px] text-[var(--color-text-primary)] leading-relaxed">
                {translated || <span className="text-[var(--color-text-secondary)] italic">—</span>}
              </p>
            )}
          </div>

          {effectiveOrig.length > 0 && (
            <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-secondary)]">
              <span className="tabular-nums">{fmtTime(curTime)}</span>
              <div className="flex-1 h-1.5 bg-[var(--color-surface-container)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--color-primary)] rounded-full transition-all" style={{ width: `${Math.min(100, ((origIdx + 1) / effectiveOrig.length) * 100)}%` }} />
              </div>
              <span className="tabular-nums">{origIdx + 1}/{effectiveOrig.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Video Insights ── */}
      <aside className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4">
        <div className="bg-[var(--color-surface)] rounded-[16px] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)] p-4 md:p-5 flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-[var(--color-secondary-container)]/30 rounded-full blur-3xl -z-0" />
          <div className="flex items-center gap-2.5 relative z-10">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-tertiary)] flex items-center justify-center text-white shadow">
              <Sparkles size={16} />
            </div>
            <h3 className="text-[18px] font-semibold text-[var(--color-text-primary)] font-display">Video Insights</h3>
          </div>

          {/* Full summary (markdown) */}
          <div className="bg-[var(--color-surface-container-lowest)] rounded-[10px] p-3 border border-[var(--color-border-subtle)] relative z-10 max-h-[260px] overflow-y-auto">
            <h4 className="text-[13px] font-semibold text-[var(--color-primary)] mb-1 flex items-center gap-1.5">
              <FileText size={15} /> Tóm tắt
            </h4>
            {file.summary?.trim() ? (
              <Markdown text={file.summary} className="text-[13px] text-[var(--color-text-secondary)]" />
            ) : (
              <p className="text-[13px] text-[var(--color-text-secondary)]">
                Chưa có tóm tắt AI (có thể đã hết hạn mức Gemini). Phụ đề & dịch vẫn hoạt động bình thường.
              </p>
            )}
          </div>

          {keyTerms.length > 0 && (
            <div className="relative z-10">
              <h4 className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-2 flex items-center gap-1.5">
                <Tag size={14} /> Thuật ngữ chính
              </h4>
              <div className="flex flex-wrap gap-2">
                {keyTerms.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--color-primary)]/5 text-[var(--color-primary)] rounded-full text-[12px] border border-[var(--color-primary)]/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-secondary)]" />
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {chapters.length > 0 && (
            <div className="relative z-10">
              <h4 className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-2 flex items-center gap-1.5">
                <ListVideo size={14} /> Chương (theo phụ đề thật)
              </h4>
              <div className="flex flex-col gap-1">
                {chapters.map((ch) => {
                  const active = curTime >= ch.start;
                  return (
                    <button
                      key={ch.start}
                      onClick={() => seekTo(ch.start)}
                      className={`flex items-start gap-2.5 p-2 rounded-[8px] text-left transition-colors ${active ? "bg-[var(--color-surface-container-low)] border-l-2 border-[var(--color-primary)]" : "hover:bg-[var(--color-surface-container-low)]"}`}
                    >
                      <span className="text-[12px] font-semibold text-[var(--color-primary)] bg-[var(--color-primary-fixed)]/50 px-1.5 py-0.5 rounded tabular-nums">{fmtTime(ch.start)}</span>
                      <span className="text-[13px] text-[var(--color-text-primary)] leading-snug line-clamp-2">{ch.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {quiz.length > 0 && (
            <div className="relative z-10 pt-1 border-t border-[var(--color-border-subtle)]">
              <button
                onClick={() => setShowQuiz((s) => !s)}
                className="w-full mt-3 py-2.5 bg-[var(--color-surface)] border border-[var(--color-primary)] text-[var(--color-primary)] text-[14px] font-medium rounded-[8px] hover:bg-[var(--color-primary-fixed)]/40 transition-colors flex items-center justify-center gap-2"
              >
                <HelpCircle size={16} />
                {showQuiz ? "Ẩn câu hỏi" : `Quiz từ video (${quiz.length})`}
              </button>
            </div>
          )}
        </div>

        {showQuiz && quiz.length > 0 && <QuizPanel quiz={quiz} />}
      </aside>
    </div>

    {/* Ask-about-this-video chat (Gemini, grounded in the real transcript) */}
    <VideoChat context={chatContext} ready={effectiveOrig.length > 0} />
    </div>
  );
}

// ─── Ask-about-this-video chat ──────────────────────────────────────────────
type ChatMsg = { role: "user" | "assistant"; content: string };
const SUGGESTED = [
  "Tóm tắt ý chính của video?",
  "Giải thích thuật ngữ khó trong video",
  "Cho ví dụ thực tế dễ hiểu",
  "Những điểm quan trọng nhất là gì?",
];

function VideoChat({ context, ready }: { context: string; ready: boolean }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading, open]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    const next = [...msgs, { role: "user" as const, content: q }];
    setMsgs(next);
    setInput("");
    setLoading(true);
    try {
      const data = await apiClient.chat(next, context);
      setMsgs((m) => [...m, { role: "assistant", content: data.reply || "Xin lỗi, mình chưa trả lời được." }]);
    } catch (err: any) {
      setMsgs((m) => [...m, { role: "assistant", content: `⚠️ ${err?.message || "Không gọi được trợ lý lúc này."}` }]);
    } finally {
      setLoading(false);
      if (!open) setUnread(true);
    }
  };

  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      {/* Floating panel — fixed to the viewport, stays put while scrolling */}
      {open && (
        <div className="fixed bottom-24 right-4 md:right-6 z-50 w-[min(384px,calc(100vw-2rem))] h-[min(560px,calc(100vh-9rem))] bg-[var(--color-surface)] rounded-[16px] border border-[var(--color-border-subtle)] shadow-[0_16px_48px_rgba(0,0,0,0.22)] flex flex-col overflow-hidden animate-fade-in">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-container-low)]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-tertiary)] flex items-center justify-center text-white shadow shrink-0">
              <MessageSquareText size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)] font-display leading-tight">Hỏi về video</h3>
              <p className="text-[11px] text-[var(--color-text-secondary)] truncate">AI trả lời dựa trên nội dung video.</p>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-[var(--color-surface-container-high)] text-[var(--color-text-secondary)]" aria-label="Đóng">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 flex flex-col gap-3 overflow-y-auto p-4">
            {msgs.length === 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[12px] text-[var(--color-text-secondary)]">Gợi ý câu hỏi:</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      disabled={loading}
                      className="text-[12px] px-3 py-1.5 rounded-full border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors disabled:opacity-40 text-left"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="self-end max-w-[85%] bg-[var(--color-primary)] text-white rounded-[12px] rounded-br-sm px-3 py-2 text-[14px] leading-relaxed">
                  {m.content}
                </div>
              ) : (
                <div key={i} className="self-start max-w-[90%] flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-[var(--color-primary-fixed)] text-[var(--color-primary)] flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={14} />
                  </div>
                  <div className="bg-[var(--color-surface-container-low)] rounded-[12px] rounded-bl-sm px-3 py-2 min-w-0">
                    <Markdown text={m.content} className="text-[14px] text-[var(--color-text-primary)]" />
                  </div>
                </div>
              )
            )}
            {loading && (
              <div className="self-start flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)] pl-8">
                <Loader2 size={14} className="animate-spin" /> Đang suy nghĩ…
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 p-3 border-t border-[var(--color-border-subtle)]"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={ready ? "Hỏi bất cứ điều gì về video…" : "Đang tải nội dung video…"}
              className="flex-1 px-3 py-2.5 bg-[var(--color-surface-container-low)] border border-[var(--color-border-subtle)] rounded-[10px] text-[14px] outline-none focus:border-[var(--color-primary)] placeholder:text-[var(--color-text-secondary)]"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-[10px] bg-[var(--color-primary)] text-white flex items-center justify-center hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-40 shrink-0"
              aria-label="Gửi"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </form>
        </div>
      )}

      {/* Floating toggle button — pinned bottom-right, survives scrolling */}
      <button
        onClick={() => {
          setOpen((o) => !o);
          setUnread(false);
        }}
        title="Hỏi về video"
        className="fixed bottom-6 right-4 md:right-6 z-50 w-14 h-14 rounded-full bg-[var(--color-primary)] text-white shadow-[0_8px_24px_rgba(0,0,0,0.28)] flex items-center justify-center hover:bg-[var(--color-primary-hover)] hover:scale-105 active:scale-95 transition-all"
      >
        {open ? <X size={24} /> : <MessageSquareText size={24} />}
        {unread && !open && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[var(--color-secondary)] border-2 border-[var(--color-surface)]" />
        )}
      </button>
    </>,
    document.body
  );
}

// ─── Inline quiz preview ──────────────────────────────────────────────────────
function QuizPanel({ quiz }: { quiz: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  return (
    <div className="bg-[var(--color-surface)] rounded-[16px] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)] p-4 flex flex-col gap-4 animate-fade-in">
      <h4 className="text-[14px] font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
        <Quote size={16} className="text-[var(--color-secondary)]" /> Ôn tập nhanh
      </h4>
      {quiz.slice(0, 5).map((q, qi) => (
        <div key={q.id} className="flex flex-col gap-1.5">
          <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
            {qi + 1}. {q.question}
          </p>
          <div className="flex flex-col gap-1">
            {q.options.map((opt) => {
              const picked = answers[q.id];
              const isPicked = picked === opt;
              const isCorrect = opt === q.correctAnswer;
              const show = picked !== undefined;
              return (
                <button
                  key={opt}
                  disabled={show}
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                  className={`text-left text-[12px] px-2.5 py-1.5 rounded-[6px] border flex items-center gap-1.5 transition-colors ${
                    show && isCorrect
                      ? "border-[var(--color-secondary)] bg-[var(--color-secondary-container)]/30 text-[var(--color-on-secondary-container)]"
                      : show && isPicked
                      ? "border-[var(--color-error)] bg-[var(--color-error-container)] text-[var(--color-on-error-container)]"
                      : "border-[var(--color-border-subtle)] hover:border-[var(--color-primary)] text-[var(--color-text-primary)]"
                  }`}
                >
                  {show && isCorrect && <CheckCircle2 size={13} />}
                  {show && isPicked && !isCorrect && <XCircle size={13} />}
                  {opt}
                </button>
              );
            })}
          </div>
          {answers[q.id] !== undefined && <p className="text-[11px] text-[var(--color-text-secondary)] italic mt-0.5">{q.explanation}</p>}
        </div>
      ))}
    </div>
  );
}
