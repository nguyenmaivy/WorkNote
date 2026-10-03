import fs from "fs";
import path from "path";
import { Type } from "@google/genai";
import { GROQ_API_KEY, GEMINI_MODEL } from "../config.js";
import {
  hasApiKey,
  geminiLimiter,
  generateContentWithModelFallback,
  GEMINI_TRANSCRIBE_MODELS,
} from "./geminiService.js";
import { withGeminiFile } from "./geminiFilesService.js";
import { looseParseJson } from "./fileService.js";
import { isAvailable, recordCall, recordSuccess, recordError, isRateLimitError } from "./rateLimitTracker.js";

export interface TimedSegment {
  start: number;
  dur: number;
  text: string;
}

export interface TranscribeResult {
  lang: string;
  segments: TimedSegment[];
}

const TIMED_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    lang: { type: Type.STRING },
    segments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          start: { type: Type.NUMBER },
          text: { type: Type.STRING },
        },
        required: ["start", "text"],
      },
    },
  },
  required: ["lang", "segments"],
};

/**
 * Phiên âm âm thanh thành văn bản thuần túy (dành cho /api/process-file).
 * Thứ tự: Groq Whisper (nếu <= 24MB và có key) -> Gemini Files API.
 */
export async function transcribePlain(
  filePath: string,
  mimeType: string,
  fileSize: number,
  filename = ""
): Promise<string> {
  const isVideo = mimeType.startsWith("video/") || /\.(mp4|webm|mov|mkv|avi)$/i.test(filename || filePath);
  const canUseGroq = !!GROQ_API_KEY && fileSize <= 24 * 1024 * 1024 && !isVideo && isAvailable("groq");

  console.log(`[AudioService] ───── transcribePlain DEBUG ─────`);
  console.log(`[AudioService]   filePath  = ${filePath}`);
  console.log(`[AudioService]   mimeType  = ${mimeType}`);
  console.log(`[AudioService]   fileSize  = ${Math.round(fileSize / 1024)}KB`);
  console.log(`[AudioService]   filename  = ${filename}`);
  console.log(`[AudioService]   isVideo   = ${isVideo}`);
  console.log(`[AudioService]   hasGroq   = ${!!GROQ_API_KEY}`);
  console.log(`[AudioService]   canGroq   = ${canUseGroq}`);
  console.log(`[AudioService] ────────────────────────────────`);

  if (canUseGroq) {
    try {
      console.log(`[AudioService] Đang phiên âm văn bản bằng Groq Whisper: ${filename || path.basename(filePath)}`);
      const fileBlob = await fs.openAsBlob(filePath, { type: mimeType });
      const formData = new FormData();
      const ext = path.extname(filename || filePath) || (mimeType === "audio/mp4" ? ".m4a" : ".mp3");
      const baseName = path.basename(filename || filePath, path.extname(filename || filePath));
      const safeUploadName = `${baseName || "audio"}${ext}`;
      formData.append("file", fileBlob, safeUploadName);
      formData.append("model", "whisper-large-v3");
      formData.append("response_format", "json");

      const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data: any = await response.json();
        if (data && typeof data.text === "string" && data.text.trim()) {
          console.log(`[AudioService] Groq Whisper thành công (${data.text.length} ký tự)`);
          recordSuccess("groq");
          recordCall("groq", 60); // giả định 60s
          return data.text.trim();
        }
      } else {
        const errText = await response.text();
        console.warn(`[AudioService] Groq Whisper trả lỗi HTTP ${response.status}:`, errText.slice(0, 200));
        recordError("groq", response.status === 429);
      }
    } catch (err: any) {
      console.warn(`[AudioService] Lỗi gọi Groq Whisper:`, err?.message || err);
      recordError("groq", isRateLimitError(err));
    }
  }

  // Fallback sang Gemini Files API (hỗ trợ cả video và file lớn tới 2GB)
  if (!hasApiKey()) {
    throw new Error("Không có GROQ_API_KEY khả dụng và chưa cấu hình GEMINI_API_KEY để phiên âm audio/video.");
  }

  console.log(`[AudioService] Chuyển tiếp sang Gemini Files API để phiên âm: ${filename || path.basename(filePath)}`);
  return await withGeminiFile(filePath, mimeType, async ({ fileUri, mimeType: activeMime }) => {
    const prompt = `Hãy NGHE toàn bộ audio/video này và PHIÊN ÂM lại toàn bộ nội dung lời nói/hát thành văn bản đầy đủ và chính xác nhất.
Không được tóm tắt, không lược bớt. Trả về toàn bộ lời thoại nguyên văn.`;

    const raw = await geminiLimiter.run(async () => {
      const r = await generateContentWithModelFallback(
        GEMINI_MODEL,
        GEMINI_TRANSCRIBE_MODELS,
        {
          contents: [
            { fileData: { fileUri, mimeType: activeMime } },
            prompt,
          ],
        }
      );
      return r.text || "";
    });

    return raw.trim() || "[Không nhận diện được lời nói trong tệp]";
  }, filename);
}

/**
 * Phiên âm âm thanh có mốc thời gian (dành cho Video Lab /api/transcribe).
 * Thứ tự: Groq Whisper verbose_json -> Gemini Files API.
 */
export async function transcribeTimed(
  filePath: string,
  mimeType: string,
  fileSize: number,
  filename = ""
): Promise<TranscribeResult> {
  const isVideo = mimeType.startsWith("video/") || /\.(mp4|webm|mov|mkv|avi)$/i.test(filename || filePath);
  const canUseGroq = !!GROQ_API_KEY && fileSize <= 24 * 1024 * 1024 && !isVideo && isAvailable("groq");

  if (canUseGroq) {
    try {
      console.log(`[AudioService] Đang phiên âm có timestamp bằng Groq Whisper: ${filename || path.basename(filePath)}`);
      const fileBlob = await fs.openAsBlob(filePath, { type: mimeType });
      const formData = new FormData();
      const ext = path.extname(filename || filePath) || (mimeType === "audio/mp4" ? ".m4a" : ".mp3");
      const baseName = path.basename(filename || filePath, path.extname(filename || filePath));
      const safeUploadName = `${baseName || "audio"}${ext}`;
      formData.append("file", fileBlob, safeUploadName);
      formData.append("model", "whisper-large-v3");
      formData.append("response_format", "verbose_json");

      const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data: any = await response.json();
        if (data && Array.isArray(data.segments) && data.segments.length > 0) {
          const segments: TimedSegment[] = data.segments
            .filter((s: any) => s && typeof s.text === "string" && s.text.trim())
            .map((s: any) => {
              const start = Math.max(0, Number(s.start) || 0);
              const end = Math.max(start, Number(s.end) || start);
              const dur = Math.max(0.5, Number((end - start).toFixed(2)));
              return {
                start,
                dur,
                text: String(s.text).trim(),
              };
            });

          console.log(`[AudioService] Groq Whisper verbose_json thành công (${segments.length} segments)`);
          
          const totalDur = segments.reduce((sum, s) => sum + s.dur, 0);
          recordSuccess("groq");
          recordCall("groq", totalDur);
          
          return {
            lang: String(data.language || "auto").slice(0, 2),
            segments,
          };
        }
      } else {
        const errText = await response.text();
        console.warn(`[AudioService] Groq Whisper timed trả lỗi HTTP ${response.status}:`, errText.slice(0, 200));
        recordError("groq", response.status === 429);
      }
    } catch (err: any) {
      console.warn(`[AudioService] Lỗi gọi Groq Whisper timed:`, err?.message || err);
      recordError("groq", isRateLimitError(err));
    }
  }

  // Fallback sang Gemini Files API
  if (!hasApiKey()) {
    throw new Error("Cần cấu hình GROQ_API_KEY hoặc GEMINI_API_KEY để phiên âm phụ đề có mốc thời gian.");
  }

  console.log(`[AudioService] Chuyển tiếp sang Gemini Files API để phiên âm timed: ${filename || path.basename(filePath)}`);
  return await withGeminiFile(filePath, mimeType, async ({ fileUri, mimeType: activeMime }) => {
    const prompt = `Hãy NGHE toàn bộ audio/video và PHIÊN ÂM thành phụ đề có mốc thời gian.
Yêu cầu:
- Phiên âm ĐÚNG ngôn ngữ gốc đang nói/hát (KHÔNG dịch).
- Chia thành nhiều segment ngắn, mỗi segment ~1 câu hoặc 1 dòng lời.
- "start" là số GIÂY tính từ đầu (số thực), tăng dần.
- Không bịa nội dung.
Trả về DUY NHẤT JSON đúng cấu trúc:
{ "lang": "<mã ngôn ngữ vd 'vi','en'>", "segments": [ { "start": 0.0, "text": "..." } ] }`;

    const raw = await geminiLimiter.run(async () => {
      const r = await generateContentWithModelFallback(
        GEMINI_MODEL,
        GEMINI_TRANSCRIBE_MODELS,
        {
          contents: [
            { fileData: { fileUri, mimeType: activeMime } },
            prompt,
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: TIMED_RESPONSE_SCHEMA,
            temperature: 0.2,
            maxOutputTokens: 8192,
          },
        }
      );
      return r.text || "";
    });

    const parsed = looseParseJson(raw);
    if (!parsed || !Array.isArray(parsed.segments) || !parsed.segments.length) {
      throw new Error("Không phiên âm được nội dung có mốc thời gian từ tệp.");
    }

    const sorted = parsed.segments
      .filter((s: any) => s && typeof s.text === "string" && s.text.trim())
      .map((s: any) => ({ start: Math.max(0, Number(s.start) || 0), text: String(s.text).trim() }))
      .sort((a: any, b: any) => a.start - b.start);

    const segments: TimedSegment[] = sorted.map((s: any, i: number) => {
      const next = sorted[i + 1];
      const dur = next ? Math.max(0.5, Number((next.start - s.start).toFixed(2))) : 3;
      return { start: s.start, dur, text: s.text };
    });

    return {
      lang: String(parsed.lang || "auto").slice(0, 2),
      segments,
    };
  }, filename);
}
