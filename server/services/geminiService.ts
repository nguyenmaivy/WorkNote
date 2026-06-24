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

// ─── Retry với exponential backoff ────────────────────────────────────────────

/**
 * Tự động thử lại khi Gemini trả lỗi tạm thời (503 quá tải, 429 rate limit, ...).
 * Các lệnh gọi nặng (xử lý file, audio, dịch) hay gặp 503 "high demand" —
 * retry với backoff giúp request không thất bại ngẫu nhiên.
 */
export async function withGeminiRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
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
      const delay = Math.min(1500 * 2 ** attempt, 10000) + Math.floor(Math.random() * 600);
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

// ─── Helper: check API Key ─────────────────────────────────────────────────────

export function hasApiKey(): boolean {
  return !!process.env.GEMINI_API_KEY;
}
