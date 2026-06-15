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

// ─── Helper: check API Key ─────────────────────────────────────────────────────

export function hasApiKey(): boolean {
  return !!process.env.GEMINI_API_KEY;
}
