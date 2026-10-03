/**
 * Semaphore - giới hạn số lượng async operations chạy đồng thời.
 * Dùng để bảo vệ Gemini API khỏi bị quá tải.
 */
export class Semaphore {
  private permits: number;
  private readonly queue: Array<() => void> = [];

  constructor(maxConcurrent: number) {
    this.permits = maxConcurrent;
  }

  /** Acquire một permit. Returns release function. */
  acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const tryAcquire = () => {
        if (this.permits > 0) {
          this.permits--;
          resolve(() => this.release());
        } else {
          this.queue.push(tryAcquire);
        }
      };
      tryAcquire();
    });
  }

  private release(): void {
    this.permits++;
    const next = this.queue.shift();
    if (next) next();
  }

  get waiting(): number {
    return this.queue.length;
  }
}

/** Singleton cho Gemini AI calls */
import { MAX_GEMINI_CONCURRENT } from "../config.js";
export const geminiSemaphore = new Semaphore(MAX_GEMINI_CONCURRENT);
