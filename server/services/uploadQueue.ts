/**
 * uploadQueue.ts
 * ─────────────────────────────────────────────────────────
 * Priority queue cho file upload — đảm bảo không bao giờ
 * bắn quá nhiều Gemini calls cùng lúc khi upload hàng loạt.
 *
 * Ưu tiên (thấp hơn số = ưu tiên cao hơn):
 *   0 = VISION (ảnh/PDF scan - bắt buộc Gemini, hạn hẹp nhất)
 *   1 = AUDIO/VIDEO (STT rồi LLM)
 *   2 = DOCUMENT (text extraction, có thể dùng OR)
 */

import { EventEmitter } from "events";

export type UploadPriority = 0 | 1 | 2;

export interface QueuedJob<T = any> {
  id: string;
  priority: UploadPriority;
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (err: unknown) => void;
  enqueuedAt: number;
  label: string;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

const CONCURRENCY = 3; // max 3 jobs đồng thời (khớp với MAX_GEMINI_CONCURRENT)

class UploadQueueManager extends EventEmitter {
  private queue: QueuedJob[] = [];
  private active = 0;
  private completed = 0;
  private failed = 0;

  /** Thêm job vào queue và trả về Promise kết quả */
  enqueue<T>(
    fn: () => Promise<T>,
    opts: { priority?: UploadPriority; label?: string } = {}
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const job: QueuedJob<T> = {
        id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        priority: opts.priority ?? 2,
        fn,
        resolve,
        reject,
        enqueuedAt: Date.now(),
        label: opts.label ?? "unknown",
      };

      // Chèn đúng vị trí theo priority (ổn định, FIFO trong cùng priority)
      const insertAt = this.queue.findIndex((j) => j.priority > job.priority);
      if (insertAt === -1) {
        this.queue.push(job);
      } else {
        this.queue.splice(insertAt, 0, job);
      }

      console.log(
        `[UploadQueue] Enqueued "${job.label}" (priority=${job.priority}, queue=${this.queue.length})`
      );
      this.emit("enqueue", job);
      this.drain();
    });
  }

  private drain(): void {
    while (this.active < CONCURRENCY && this.queue.length > 0) {
      const job = this.queue.shift()!;
      this.active++;
      this.emit("start", job);

      const waitMs = Date.now() - job.enqueuedAt;
      console.log(
        `[UploadQueue] Starting "${job.label}" after ${waitMs}ms wait (active=${this.active})`
      );

      job
        .fn()
        .then((result) => {
          job.resolve(result);
          this.completed++;
          this.emit("done", job);
          console.log(`[UploadQueue] ✓ "${job.label}" completed`);
        })
        .catch((err) => {
          job.reject(err);
          this.failed++;
          this.emit("error", { job, err });
          console.error(`[UploadQueue] ✗ "${job.label}" failed:`, (err as any)?.message);
        })
        .finally(() => {
          this.active--;
          this.drain();
        });
    }
  }

  getStats(): QueueStats {
    return {
      waiting: this.queue.length,
      active: this.active,
      completed: this.completed,
      failed: this.failed,
    };
  }

  /** Trả về thứ tự job trong queue theo label */
  getQueueList(): Array<{ id: string; label: string; priority: UploadPriority; waitMs: number }> {
    const now = Date.now();
    return this.queue.map((j) => ({
      id: j.id,
      label: j.label,
      priority: j.priority,
      waitMs: now - j.enqueuedAt,
    }));
  }
}

export const uploadQueue = new UploadQueueManager();
