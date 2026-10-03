import { GoogleGenAI } from "@google/genai";
import { MAX_GEMINI_CONCURRENT } from "../config.js";

// ─── Singleton AI Client ───────────────────────────────────────────────────────

let _aiClient: GoogleGenAI | null = null;

/**
 * Trả về singleton GoogleGenAI instance.
 * Khởi tạo lazy — chỉ tạo một lần khi lần đầu được gọi.
 */
export function getAiClient(): GoogleGenAI {
  if (!_aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn(
        "⚠️  Warning: GEMINI_API_KEY is not defined. AI features will require you to set it up in Settings > Secrets."
      );
    }
    _aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: { "User-Agent": "aistudio-build" },
      },
    });
  }
  return _aiClient;
}

// ─── Concurrency Limiter ──────────────────────────────────────────────────────

/**
 * Kiểm soát số lượng cuộc gọi Gemini API chạy đồng thời.
 * Nếu vượt giới hạn, các request sẽ được xếp hàng chờ (queue).
 */
export class ConcurrencyLimiter {
  private activeCount = 0;
  private queue: (() => void)[] = [];

  constructor(private readonly limit: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeCount >= this.limit) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.activeCount++;
    try {
      return await fn();
    } finally {
      this.activeCount--;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

/**
 * Instance dùng chung toàn server — tối đa MAX_GEMINI_CONCURRENT cuộc gọi đồng thời
 */
export const geminiLimiter = new ConcurrencyLimiter(MAX_GEMINI_CONCURRENT);

// ─── Gemini Model Failover Pools ──────────────────────────────────────────────
export const GEMINI_FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-latest",
  "gemini-3.8-flash",
];

export const GEMINI_TRANSCRIBE_MODELS = [
  "gemini-3.5-transcribe",
  "gemini-2.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-latest",
];

/**
 * Thực thi gọi Gemini với cơ chế tự động chuyển model (Model Failover)
 * khi gặp lỗi 503 (Overloaded / High demand), 429 (Resource exhausted) hoặc 404 (Model deprecated).
 */
export async function generateContentWithModelFallback(
  preferredModel: string,
  modelPool: string[],
  requestPayload: any
): Promise<any> {
  const ai = getAiClient();
  const models = Array.from(new Set([preferredModel, ...modelPool].filter(Boolean)));
  let lastError: any = null;

  for (const model of models) {
    try {
      return await ai.models.generateContent({
        ...requestPayload,
        model,
      });
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message ?? err);
      const isTransient =
        /\b(503|429|404|UNAVAILABLE|high demand|overloaded|RESOURCE_EXHAUSTED|not found|no longer available)\b/i.test(msg);

      if (isTransient) {
        console.warn(`[GeminiService] Model ${model} gặp sự cố (503/429/overloaded). Tự động chuyển model tiếp theo trong pool...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

/**
 * Tự động thử lại khi Gemini trả lỗi tạm thời (503 quá tải, 429 rate limit, ...).
 */
export async function withGeminiRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const msg = String(err?.message ?? err);
      const retryable =
        /\b(503|429|500)\b|UNAVAILABLE|high demand|overloaded|RESOURCE_EXHAUSTED|INTERNAL|deadline/i.test(msg);
      if (!retryable || attempt === maxRetries) throw err;
      const delay = Math.min(1000 * 2 ** attempt, 4000) + Math.floor(Math.random() * 400);
      console.warn(
        `Gemini lỗi tạm thời (lần ${attempt + 1}/${maxRetries}), thử lại sau ${Math.round(delay)}ms: ${msg.slice(0, 140)}`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

/**
 * Chuyển lỗi Gemini thô (thường là JSON) thành thông báo tiếng Việt thân thiện.
 */
export function friendlyGeminiError(err: any): string {
  const msg = String(err?.message ?? err);
  if (/503|UNAVAILABLE|high demand|overloaded/i.test(msg))
    return "Máy chủ AI đang quá tải tạm thời. Vui lòng thử lại sau ít giây.";
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg))
    return "Đã đạt giới hạn lượt gọi AI miễn phí của Gemini (gói free chỉ ~5 lượt/phút). Hãy chờ khoảng 1 phút rồi thử lại, hoặc nâng cấp gói API để xử lý video/link mượt hơn.";
  if (/400|INVALID_ARGUMENT/i.test(msg))
    return "Định dạng tệp không được AI hỗ trợ hoặc tệp bị lỗi.";
  if (/API key|PERMISSION_DENIED|401|403/i.test(msg))
    return "Khóa API Gemini không hợp lệ hoặc thiếu quyền. Kiểm tra lại GEMINI_API_KEY.";
  return msg.length > 200 ? msg.slice(0, 200) + "..." : msg;
}

// ─── Helper: check API Keys & Capabilities ─────────────────────────────────────
import { getAvailableProviders } from "../config.js";

export function hasApiKey(): boolean {
  return !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MOCK_KEY");
}

export function hasSttKey(): boolean {
  return getAvailableProviders().hasStt;
}

export function hasLlmKey(): boolean {
  return getAvailableProviders().hasLlm;
}

export function hasVisionKey(): boolean {
  return getAvailableProviders().hasVision;
}

export function hasAnyAiKey(): boolean {
  return getAvailableProviders().hasAny;
}
