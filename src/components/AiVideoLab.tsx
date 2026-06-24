import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  FileText,
  Languages,
  ListVideo,
  Tag,
  Quote,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { UploadedFile, QuizQuestion } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Pull a YouTube video id from any common link shape. */
export function youtubeId(url?: string): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return m?.[1] ?? null;
}

/** Whether the active file should open in the Video Lab. */
export function isVideoFile(file?: UploadedFile | null): boolean {
  if (!file) return false;
  return !!youtubeId(file.sourceUrl) || (file.mimeType || "").includes("video");
}

/** Heuristic: does this text already read as Vietnamese? (has VN diacritics) */
function looksVietnamese(s: string): boolean {
  return /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(s);
}

/** Split a transcript into subtitle-sized segments (≈ one spoken line each). */
function toSegments(text: string): string[] {
  if (!text) return [];
  const clean = text.replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim();
  const parts = clean
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
  // merge very short fragments into the previous line for readable chunks
  const merged: string[] = [];
  for (const p of parts) {
    if (merged.length && (merged[merged.length - 1].length < 28 || p.length < 14)) {
      merged[merged.length - 1] += " " + p;
    } else {
      merged.push(p);
    }
  }
  return merged.slice(0, 400);
}

const VN_STOP = new Set(
  "và là của có các một những được trong cho khi này đó với để như cũng đã sẽ thì mà ra vào nên rất thế còn lại nó ta về từ theo bằng hay hoặc nếu vì do trên dưới sau trước giữa".split(
    " "
  )
);
const EN_STOP = new Set(
  "the a an and or of to in is are was were be been for on with as by that this it its from at into your you we they their our".split(
    " "
  )
);

/** Derive key terms by frequency (skips stopwords + short tokens). */
function deriveKeyTerms(text: string, max = 6): string[] {
  const freq = new Map<string, { raw: string; n: number }>();
  const tokens = (text || "").split(/[^A-Za-zÀ-ỹ0-9]+/).filter(Boolean);
  for (const t of tokens) {
    const low = t.toLowerCase();
    if (low.length < 4 || VN_STOP.has(low) || EN_STOP.has(low) || /^\d+$/.test(low)) continue;
    const e = freq.get(low) || { raw: t, n: 0 };
    e.n++;
    if (/^[A-ZÀ-Ỹ]/.test(t)) e.raw = t; // prefer the capitalized surface form
    freq.set(low, e);
  }
  return [...freq.values()]
    .filter((e) => e.n >= 2)
    .sort((a, b) => b.n - a.n)
    .slice(0, max)
    .map((e) => e.raw[0].toUpperCase() + e.raw.slice(1));
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface Chapter {
  start: number;
  title: string;
  index: number; // first segment index of this chapter
}

// ─── Component ──────────────────────────────────────────────────────────────────

interface AiVideoLabProps {
  file: UploadedFile;
}

export default function AiVideoLab({ file }: AiVideoLabProps) {
  const ytId = youtubeId(file.sourceUrl);
  const isYoutube = !!ytId;

  const localSegs = useMemo(() => toSegments(file.extractedText || ""), [file.extractedText]);
  const sourceIsVN = useMemo(
    () => looksVietnamese(file.extractedText || file.summary || ""),
    [file.extractedText, file.summary]
  );
  // If the transcript is already Vietnamese, show an English reference track;
  // otherwise translate the original line into Vietnamese.
  const targetLang = sourceIsVN ? "en" : "vi";

  // Bilingual subtitles via the FREE translate endpoint (no Gemini / no token cost).
  // It returns the original sentence paired with its translation → lines align exactly.
  const [pairs, setPairs] = useState<{ src: string; dst: string }[] | null>(null);
  const [subState, setSubState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    if (!(file.extractedText || "").trim()) {
      setSubState("error");
      return;
    }
    let cancelled = false;
    setSubState("loading");
    setPairs(null);
    (async () => {
      try {
        const res = await fetch("/api/subtitle-translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: file.extractedText || "", targetLang }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (data?.success && Array.isArray(data.segments) && data.segments.length) {
          setPairs(data.segments);
          setSubState("ready");
        } else {
          setSubState("error");
        }
      } catch {
        if (!cancelled) setSubState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file.extractedText, targetLang]);

  // Active subtitle lines: aligned pairs once translated, else the raw transcript split.
  const segments = useMemo(
    () => (subState === "ready" && pairs ? pairs.map((p) => p.src || p.dst) : localSegs),
    [subState, pairs, localSegs]
  );

  const keyTerms = useMemo(
    () => deriveKeyTerms(`${file.summary || ""} ${file.extractedText || ""}`),
    [file.summary, file.extractedText]
  );

  // Estimate a runtime from word count (~2.6 words/sec) so chapters get timestamps.
  const estDuration = useMemo(() => {
    const words = (file.extractedText || "").split(/\s+/).filter(Boolean).length;
    return Math.max(60, Math.round(words / 2.6));
  }, [file.extractedText]);

  const chapters = useMemo<Chapter[]>(() => {
    if (!segments.length) return [];
    const n = Math.min(5, Math.max(2, Math.round(segments.length / 6)));
    const out: Chapter[] = [];
    for (let i = 0; i < n; i++) {
      const segIdx = Math.floor((i / n) * segments.length);
      const words = segments[segIdx].split(/\s+/).slice(0, 5).join(" ");
      out.push({
        start: Math.round((i / n) * estDuration),
        title: words.charAt(0).toUpperCase() + words.slice(1),
        index: segIdx,
      });
    }
    return out;
  }, [segments, estDuration]);

  // ── Subtitle ticker ──
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(true);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  // Auto-advance for the YouTube embed (we can't read its clock, so we pace it);
  // for uploaded <video> we sync to the real currentTime instead (see below).
  useEffect(() => {
    if (!isYoutube || !playing || segments.length === 0) return;
    const id = setInterval(() => setCur((c) => (c + 1) % segments.length), 3800);
    return () => clearInterval(id);
  }, [isYoutube, playing, segments.length]);

  const onVideoTime = () => {
    const v = videoElRef.current;
    if (!v || !v.duration || segments.length === 0) return;
    const idx = Math.min(segments.length - 1, Math.floor((v.currentTime / v.duration) * segments.length));
    setCur(idx);
  };

  const original = segments[cur] || "—";
  const translated = subState === "ready" && pairs ? pairs[cur]?.dst || "" : undefined;

  // ── Interpreter mode: read the translated line aloud, free + instant ──
  // Uses the browser's built-in speechSynthesis (no API key, no quota, no lag),
  // so it can narrate every line in real time — like a live interpreter.
  const [interpret, setInterpret] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
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

  // Narrate each translated line the moment it becomes current.
  useEffect(() => {
    if (!interpret || !translated || !ttsOK) return;
    const u = new SpeechSynthesisUtterance(translated);
    if (voiceRef.current) u.voice = voiceRef.current;
    u.lang = voiceRef.current?.lang || (targetLang === "vi" ? "vi-VN" : "en-US");
    u.rate = 1.05;
    window.speechSynthesis.cancel(); // replace the previous line, never overlap
    window.speechSynthesis.speak(u);
  }, [translated, interpret, targetLang, ttsOK]);

  // Stop talking when interpreter is switched off or the lab unmounts.
  useEffect(() => {
    if (!ttsOK) return;
    if (!interpret) window.speechSynthesis.cancel();
    return () => window.speechSynthesis.cancel();
  }, [interpret, ttsOK]);

  const liveSummary = (file.summary || "")
    .replace(/[#*`>_-]/g, "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(" ")
    .slice(0, 280);

  const [showQuiz, setShowQuiz] = useState(false);
  const quiz = file.quiz || [];

  const origLabel = sourceIsVN ? "Tiếng Việt (gốc)" : "Ngôn ngữ gốc";
  const transLabel = targetLang === "vi" ? "Tiếng Việt (AI dịch)" : "Tiếng Anh (tham chiếu)";

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fade-in">
      {/* ── Left: video + subtitles ── */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Video player with image-subtitle overlay */}
        <div className="bg-black rounded-[16px] overflow-hidden shadow-[var(--shadow-card)] relative aspect-video flex-shrink-0">
          {isYoutube ? (
            <iframe
              title={file.name}
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : file.objectUrl ? (
            <video
              ref={videoElRef}
              src={file.objectUrl}
              controls
              onTimeUpdate={onVideoTime}
              className="w-full h-full object-contain bg-black"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/60 text-[14px]">
              Không có nguồn video để phát.
            </div>
          )}

          {/* Image subtitle overlay (phụ đề hình ảnh) */}
          {segments.length > 0 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 md:p-4 flex flex-col items-center gap-1 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
              <p className="text-white text-center text-[14px] md:text-[17px] font-semibold leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] max-w-3xl">
                {original}
              </p>
              {translated && (
                <p className="text-[#84d5ca] text-center text-[13px] md:text-[15px] font-medium leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] max-w-3xl">
                  {translated}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Real-time translation panel */}
        <div className="bg-[var(--color-surface)] rounded-[16px] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)] p-4 md:p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2.5">
            <h4 className="text-[14px] font-semibold text-[var(--color-text-secondary)] flex items-center gap-1.5">
              <Languages size={18} className="text-[var(--color-primary)]" />
              Dịch thuật thời gian thực
            </h4>
            <div className="flex items-center gap-1.5">
              {ttsOK && (
                <button
                  onClick={() => setInterpret((s) => !s)}
                  title={interpret ? "Tắt phiên dịch viên (đọc bản dịch)" : "Bật phiên dịch viên — đọc bản dịch thành tiếng"}
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
              <button
                onClick={() => setCur((c) => Math.max(0, c - 1))}
                className="p-1 rounded-md hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)]"
                aria-label="Câu trước"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPlaying((p) => !p)}
                className="px-2 py-1 rounded-full bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] text-[11px] font-bold flex items-center gap-1"
              >
                {playing ? <Pause size={12} /> : <Play size={12} />}
                {isYoutube ? "Auto-sync" : "Theo video"}
              </button>
              <button
                onClick={() => setCur((c) => Math.min(segments.length - 1, c + 1))}
                className="p-1 rounded-md hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)]"
                aria-label="Câu sau"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Original */}
          <div className="p-3 bg-[var(--color-surface-container-lowest)] rounded-[10px] border-l-2 border-[var(--color-outline-variant)]">
            <span className="text-[11px] font-bold text-[var(--color-text-secondary)] mb-1 block uppercase tracking-wider">
              {origLabel}
            </span>
            <p className="text-[16px] text-[var(--color-text-primary)] leading-relaxed">{original}</p>
          </div>
          {/* Translation */}
          <div className="p-3 bg-[var(--color-secondary-container)]/15 rounded-[10px] border-l-2 border-[var(--color-secondary)]">
            <span className="text-[11px] font-bold text-[var(--color-secondary)] mb-1 flex items-center justify-between uppercase tracking-wider">
              {transLabel}
              {subState === "ready" && (
                <span className="text-[10px] text-[var(--color-text-secondary)] normal-case">Dịch miễn phí · không tốn token</span>
              )}
            </span>
            {subState === "loading" && (
              <span className="text-[14px] text-[var(--color-text-secondary)] italic">Đang tải phụ đề song ngữ…</span>
            )}
            {subState === "error" && (
              <span className="text-[13px] text-[var(--color-text-secondary)]">
                Chưa tải được phụ đề dịch (chỉ hiển thị bản gốc).
              </span>
            )}
            {subState === "ready" && (
              <p className="text-[16px] text-[var(--color-text-primary)] leading-relaxed">
                {translated || <span className="text-[var(--color-text-secondary)] italic">—</span>}
              </p>
            )}
          </div>

          {segments.length > 0 && (
            <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-secondary)]">
              <div className="flex-1 h-1.5 bg-[var(--color-surface-container)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--color-primary)] rounded-full transition-all"
                  style={{ width: `${((cur + 1) / segments.length) * 100}%` }}
                />
              </div>
              <span className="tabular-nums">
                {cur + 1}/{segments.length}
              </span>
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
            <h3 className="text-[18px] font-semibold text-[var(--color-text-primary)] font-display">
              Video Insights
            </h3>
          </div>

          {/* Live summary */}
          <div className="bg-[var(--color-surface-container-lowest)] rounded-[10px] p-3 border border-[var(--color-border-subtle)] relative z-10">
            <h4 className="text-[13px] font-semibold text-[var(--color-primary)] mb-1 flex items-center gap-1.5">
              <FileText size={15} /> Tóm tắt nhanh
            </h4>
            <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
              {liveSummary || "Chưa có tóm tắt — dán lại link để AI phân tích."}
            </p>
          </div>

          {/* Key terms */}
          {keyTerms.length > 0 && (
            <div className="relative z-10">
              <h4 className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-2 flex items-center gap-1.5">
                <Tag size={14} /> Thuật ngữ chính
              </h4>
              <div className="flex flex-wrap gap-2">
                {keyTerms.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--color-primary)]/5 text-[var(--color-primary)] rounded-full text-[12px] border border-[var(--color-primary)]/20"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-secondary)]" />
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Chapters */}
          {chapters.length > 0 && (
            <div className="relative z-10">
              <h4 className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-2 flex items-center gap-1.5">
                <ListVideo size={14} /> Chương tự động
              </h4>
              <div className="flex flex-col gap-1">
                {chapters.map((ch) => {
                  const active = cur >= ch.index;
                  return (
                    <button
                      key={ch.index}
                      onClick={() => setCur(ch.index)}
                      className={`flex items-start gap-2.5 p-2 rounded-[8px] text-left transition-colors ${
                        active
                          ? "bg-[var(--color-surface-container-low)] border-l-2 border-[var(--color-primary)]"
                          : "hover:bg-[var(--color-surface-container-low)]"
                      }`}
                    >
                      <span className="text-[12px] font-semibold text-[var(--color-primary)] bg-[var(--color-primary-fixed)]/50 px-1.5 py-0.5 rounded tabular-nums">
                        {fmtTime(ch.start)}
                      </span>
                      <span className="text-[13px] text-[var(--color-text-primary)] leading-snug line-clamp-2">
                        {ch.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Generate quiz */}
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
          {answers[q.id] !== undefined && (
            <p className="text-[11px] text-[var(--color-text-secondary)] italic mt-0.5">{q.explanation}</p>
          )}
        </div>
      ))}
    </div>
  );
}
