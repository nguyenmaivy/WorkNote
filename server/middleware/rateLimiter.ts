import { rateLimit } from "express-rate-limit";
import { RATE_LIMIT_GENERAL, RATE_LIMIT_HEAVY_AI } from "../config.js";

/**
 * Áp dụng cho tất cả /api/* — giới hạn 150 req/phút
 */
export const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT_GENERAL.windowMs,
  max: RATE_LIMIT_GENERAL.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút." },
});

/**
 * Áp dụng riêng cho các endpoint AI nặng — giới hạn 10 req / 5 phút
 */
export const heavyAiLimiter = rateLimit({
  windowMs: RATE_LIMIT_HEAVY_AI.windowMs,
  max: RATE_LIMIT_HEAVY_AI.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Bạn đã gửi quá nhiều yêu cầu phân tích tài liệu/giọng nói. Vui lòng thử lại sau 5 phút.",
  },
});
