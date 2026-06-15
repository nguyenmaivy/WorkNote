import path from "path";

// ─── Server ───────────────────────────────────────────────────────────────────
export const PORT = 3000;

// ─── AI Model Names ───────────────────────────────────────────────────────────
export const GEMINI_MODEL = "gemini-3.5-flash";
export const GEMINI_TTS_MODEL = "gemini-3.1-flash-tts-preview";

// ─── File Upload ──────────────────────────────────────────────────────────────
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

// ─── Concurrency ──────────────────────────────────────────────────────────────
export const MAX_GEMINI_CONCURRENT = 3;

// ─── Rate Limiting ────────────────────────────────────────────────────────────
export const RATE_LIMIT_GENERAL = {
  windowMs: 1 * 60 * 1000, // 1 phút
  max: 150,
};

export const RATE_LIMIT_HEAVY_AI = {
  windowMs: 5 * 60 * 1000, // 5 phút
  max: 10,
};

// ─── Supported Languages ──────────────────────────────────────────────────────
export const SUPPORTED_LANGUAGES: Record<string, string> = {
  vi: "Tiếng Việt",
  en: "Tiếng Anh",
  ja: "Tiếng Nhật",
  ko: "Tiếng Hàn",
  zh: "Tiếng Trung",
  fr: "Tiếng Pháp",
};

// ─── TTS Voice Mapping ────────────────────────────────────────────────────────
export const TTS_VOICE_MAP: Record<string, string> = {
  north: "Kore",    // crisp/sharp
  central: "Fenrir", // deep/solid
  south: "Zephyr",  // smooth/breezy
};
