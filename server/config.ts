import path from "path";
import dotenv from "dotenv";

dotenv.config();

// ─── Server ───────────────────────────────────────────────────────────────────
export const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// ─── AI Model Names ───────────────────────────────────────────────────────────
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
export const GEMINI_TTS_MODEL = "gemini-3.1-flash-tts-preview";

// Local OpenAI-compatible server (Ollama, LM Studio, llama.cpp server).
// Local is enabled by default; a missing server fails fast and falls back to cloud.
export const LOCAL_LLM_ENABLED = process.env.LOCAL_LLM_ENABLED !== "false";
export const LOCAL_LLM_BASE_URL = (process.env.LOCAL_LLM_BASE_URL || "http://127.0.0.1:11434/v1").replace(/\/$/, "");
export const LOCAL_LLM_MODEL = process.env.LOCAL_LLM_MODEL || "worknote-qwen2.5-1.5b";
export const LOCAL_LLM_API_KEY = process.env.LOCAL_LLM_API_KEY || "";
export const LOCAL_LLM_AUTOSTART = process.env.LOCAL_LLM_AUTOSTART !== "false";
export const LOCAL_LLM_MODEL_PATH = path.resolve(
  process.env.LOCAL_LLM_MODEL_PATH || path.join(process.cwd(), "models", "qwen2.5-1.5b-instruct-q4_k_m.gguf")
);
const parsedLocalContextSize = Number(process.env.LOCAL_LLM_CONTEXT_SIZE);
export const LOCAL_LLM_CONTEXT_SIZE =
  Number.isFinite(parsedLocalContextSize) && parsedLocalContextSize >= 2048
    ? parsedLocalContextSize
    : 8192;
const parsedLocalThreads = Number(process.env.LOCAL_LLM_THREADS);
export const LOCAL_LLM_THREADS =
  Number.isFinite(parsedLocalThreads) && parsedLocalThreads > 0
    ? parsedLocalThreads
    : 8;
const parsedLocalGpuLayers = Number(process.env.LOCAL_LLM_GPU_LAYERS);
export const LOCAL_LLM_GPU_LAYERS = Number.isFinite(parsedLocalGpuLayers) ? parsedLocalGpuLayers : 0;
const parsedLocalConnectTimeoutMs = Number(process.env.LOCAL_LLM_CONNECT_TIMEOUT_MS);
export const LOCAL_LLM_CONNECT_TIMEOUT_MS =
  Number.isFinite(parsedLocalConnectTimeoutMs) && parsedLocalConnectTimeoutMs > 0
    ? parsedLocalConnectTimeoutMs
    : 1_500;
const parsedLocalTimeoutMs = Number(process.env.LOCAL_LLM_TIMEOUT_MS);
export const LOCAL_LLM_TIMEOUT_MS =
  Number.isFinite(parsedLocalTimeoutMs) && parsedLocalTimeoutMs > 0
    ? parsedLocalTimeoutMs
    : 45_000;
const parsedLocalMaxInputChars = Number(process.env.LOCAL_LLM_MAX_INPUT_CHARS);
export const LOCAL_LLM_MAX_INPUT_CHARS =
  Number.isFinite(parsedLocalMaxInputChars) && parsedLocalMaxInputChars > 4_000
    ? parsedLocalMaxInputChars
    : 24_000;
export const ALLOW_CLOUD_LLM_FALLBACK = process.env.ALLOW_CLOUD_LLM_FALLBACK !== "false";

// ─── Multi-Provider AI Keys & Config ──────────────────────────────────────────
export const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
export const OPENROUTER_MODELS: string[] = process.env.OPENROUTER_MODELS
  ? process.env.OPENROUTER_MODELS.split(",").map((s) => s.trim()).filter(Boolean)
  : [
      "openrouter/free",
      "qwen/qwen3.8-27b:free",
      "google/gemma-4-31b-it:free",
      "z-ai/glm-5.2:free",
    ];

export function getAvailableProviders() {
  const local = LOCAL_LLM_ENABLED;
  const gemini = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MOCK_KEY");
  const groq = !!process.env.GROQ_API_KEY;
  const openrouter = !!process.env.OPENROUTER_API_KEY;
  return {
    local,
    gemini,
    groq,
    openrouter,
    hasStt: groq || gemini,
    hasLlm: local || gemini || openrouter,
    hasVision: gemini,
    hasAny: local || gemini || groq || openrouter,
  };
}

// ─── File Upload ──────────────────────────────────────────────────────────────
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// Giới hạn chung
const parsedMaxFileSizeMb = Number(process.env.MAX_FILE_SIZE_MB);
export const MAX_FILE_SIZE_MB =
  Number.isFinite(parsedMaxFileSizeMb) && parsedMaxFileSizeMb > 0
    ? parsedMaxFileSizeMb
    : 200; // Dự phòng fallback

// Phân tách giới hạn theo Giai đoạn 1:
export const MAX_MEDIA_FILE_SIZE_BYTES = 2048 * 1024 * 1024; // 2GB cho Audio/Video
export const MAX_DOC_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB cho PDF, DOCX, Hình ảnh

export const MAX_FILE_SIZE_BYTES = MAX_MEDIA_FILE_SIZE_BYTES; // Để Multer không block sớm
export const MAX_FILE_SIZE_LABEL = `2GB (Media) / 20MB (Tài liệu)`;

// ─── Concurrency & Quota Tracker (Phase 1) ────────────────────────────────────
export const MAX_GEMINI_CONCURRENT = 3;

export const QUOTA_LIMITS = {
  gemini: { maxRpm: 15, maxRpd: 1500 },
  groq: { maxRpm: 30, maxAudioSecondsPerDay: 14400 },
};

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
