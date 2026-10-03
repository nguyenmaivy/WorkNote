/**
 * rateLimitTracker.ts
 * ─────────────────────────────────────────────────────────
 * Theo dõi rate-limit per provider để tự động tránh 429.
 * Triển khai Giai đoạn 1: Bộ đếm chủ động theo RPM/RPD.
 */
import { QUOTA_LIMITS } from "../config.js";

export type ProviderId = "local" | "gemini" | "openrouter" | "groq";

interface ProviderState {
  cooldownUntil: number;   // epoch ms, 0 = không cooldown
  failCount: number;        // số lần lỗi liên tiếp
  totalCalls: number;
  totalErrors: number;
  minuteCallTimestamps: number[];
  dayCallTimestamps: number[];
  dayAudioSeconds: number; // dùng cho Groq
}

const DEFAULT_COOLDOWN_MS = 60_000;   // 1 phút khi bị 429
const EXTENDED_COOLDOWN_MS = 180_000; // 3 phút sau ≥3 lỗi liên tiếp

const store: Record<ProviderId, ProviderState> = {
  local:       { cooldownUntil: 0, failCount: 0, totalCalls: 0, totalErrors: 0, minuteCallTimestamps: [], dayCallTimestamps: [], dayAudioSeconds: 0 },
  gemini:      { cooldownUntil: 0, failCount: 0, totalCalls: 0, totalErrors: 0, minuteCallTimestamps: [], dayCallTimestamps: [], dayAudioSeconds: 0 },
  openrouter:  { cooldownUntil: 0, failCount: 0, totalCalls: 0, totalErrors: 0, minuteCallTimestamps: [], dayCallTimestamps: [], dayAudioSeconds: 0 },
  groq:        { cooldownUntil: 0, failCount: 0, totalCalls: 0, totalErrors: 0, minuteCallTimestamps: [], dayCallTimestamps: [], dayAudioSeconds: 0 },
};

function cleanupTimestamps(provider: ProviderId) {
  const now = Date.now();
  const s = store[provider];
  s.minuteCallTimestamps = s.minuteCallTimestamps.filter(t => now - t < 60_000);
  s.dayCallTimestamps = s.dayCallTimestamps.filter(t => now - t < 86_400_000);
}

/** Kiểm tra provider có đang sẵn sàng (không cooling down và chưa vượt active quota) không */
export function isAvailable(provider: ProviderId): boolean {
  cleanupTimestamps(provider);
  const s = store[provider];
  
  if (Date.now() < s.cooldownUntil) return false;

  // Kiểm tra Active Quota (Giai đoạn 1)
  if (provider === "gemini") {
    if (s.minuteCallTimestamps.length >= QUOTA_LIMITS.gemini.maxRpm) return false;
    if (s.dayCallTimestamps.length >= QUOTA_LIMITS.gemini.maxRpd) return false;
  } else if (provider === "groq") {
    if (s.minuteCallTimestamps.length >= QUOTA_LIMITS.groq.maxRpm) return false;
    if (s.dayAudioSeconds >= QUOTA_LIMITS.groq.maxAudioSecondsPerDay) return false;
  }
  
  return true;
}

/** Gọi trước mỗi request để đếm tổng calls */
export function recordCall(provider: ProviderId, audioSeconds: number = 0): void {
  const s = store[provider];
  s.totalCalls++;
  const now = Date.now();
  s.minuteCallTimestamps.push(now);
  s.dayCallTimestamps.push(now);
  if (provider === "groq") {
    s.dayAudioSeconds += audioSeconds;
  }
}

/** Gọi khi request thành công — reset fail streak */
export function recordSuccess(provider: ProviderId): void {
  const s = store[provider];
  s.failCount = 0;
}

/** Gọi khi gặp lỗi từ provider */
export function recordError(provider: ProviderId, isRateLimit = false): void {
  const s = store[provider];
  s.failCount++;
  s.totalErrors++;

  if (isRateLimit || s.failCount >= 3) {
    const cooldownMs = s.failCount >= 3 ? EXTENDED_COOLDOWN_MS : DEFAULT_COOLDOWN_MS;
    s.cooldownUntil = Date.now() + cooldownMs;
    console.warn(
      `[RateLimitTracker] Provider "${provider}" đang cooldown ${cooldownMs / 1000}s` +
      ` (failCount=${s.failCount}, isRateLimit=${isRateLimit})`
    );
  }
}

/** Lấy thống kê tất cả providers */
export function getStats(): Record<ProviderId, {
  available: boolean;
  cooldownRemainingMs: number;
  failCount: number;
  totalCalls: number;
  totalErrors: number;
  activeRpm: number;
}> {
  const now = Date.now();
  return (Object.keys(store) as ProviderId[]).reduce((acc, id) => {
    cleanupTimestamps(id);
    const s = store[id];
    acc[id] = {
      available: isAvailable(id),
      cooldownRemainingMs: Math.max(0, s.cooldownUntil - now),
      failCount: s.failCount,
      totalCalls: s.totalCalls,
      totalErrors: s.totalErrors,
      activeRpm: s.minuteCallTimestamps.length,
    };
    return acc;
  }, {} as any);
}

/** Phát hiện 429 / rate-limit từ error message */
export function isRateLimitError(err: unknown): boolean {
  const msg = String((err as any)?.message ?? err);
  return /429|RESOURCE_EXHAUSTED|quota|rate.?limit|too.many.request/i.test(msg);
}

/** Force reset cooldown (dùng để test) */
export function resetProvider(provider: ProviderId): void {
  store[provider] = { cooldownUntil: 0, failCount: 0, totalCalls: 0, totalErrors: 0, minuteCallTimestamps: [], dayCallTimestamps: [], dayAudioSeconds: 0 };
}
