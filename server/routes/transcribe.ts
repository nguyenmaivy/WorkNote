import { Router } from "express";
import { Type } from "@google/genai";
import { GEMINI_MODEL, MAX_FILE_SIZE_BYTES } from "../config.js";
import { getAiClient, hasApiKey, geminiLimiter, withGeminiRetry, friendlyGeminiError } from "../services/geminiService.js";
import { normalizeMimeType, looseParseJson } from "../services/fileService.js";

const router = Router();

// Timestamped transcription for uploaded audio/video that has no captions.
// Uses Gemini (costs tokens) — the only way to get real spoken content + timing
// when there is no caption track. Returns timed cues like /api/youtube-transcript.
const SCHEMA = {
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

router.post("/", async (req, res): Promise<any> => {
  try {
    const { base64Data, mimeType, name } = req.body || {};
    if (!base64Data || typeof base64Data !== "string") {
      return res.status(400).json({ error: "Thiếu dữ liệu âm thanh/video." });
    }
    if (!hasApiKey()) {
      return res.status(400).json({ error: "Cần cấu hình GEMINI_API_KEY để phiên âm bằng AI." });
    }
    // Inline payload limit (~20MB). Bigger files should be sent as MP3/audio.
    const approxBytes = Math.floor(base64Data.length * 0.75);
    if (approxBytes > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({
        error: "File quá lớn để phiên âm AI (tối đa ~20MB). Hãy thử trích xuất audio (MP3) hoặc cắt ngắn video.",
      });
    }

    const mime = normalizeMimeType(mimeType || "", name || "");
    const ai = getAiClient();
    const prompt = `Hãy NGHE toàn bộ audio/video và PHIÊN ÂM thành phụ đề có mốc thời gian.
Yêu cầu:
- Phiên âm ĐÚNG ngôn ngữ gốc đang nói/hát (KHÔNG dịch).
- Chia thành nhiều segment ngắn, mỗi segment ~1 câu hoặc 1 dòng lời.
- "start" là số GIÂY tính từ đầu (số thực), tăng dần.
- Không bịa nội dung; nếu là bài hát thì ghi đúng lời.
Trả về DUY NHẤT JSON đúng cấu trúc:
{ "lang": "<mã ngôn ngữ gốc vd 'vi','en','ko'>", "segments": [ { "start": 0.0, "text": "..." } ] }`;

    const raw = await geminiLimiter.run(() =>
      withGeminiRetry(async () => {
        const r = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: [{ inlineData: { mimeType: mime, data: base64Data } }, prompt],
          config: {
            responseMimeType: "application/json",
            responseSchema: SCHEMA,
            temperature: 0.2,
            maxOutputTokens: 8192,
          },
        });
        return r.text || "";
      })
    );

    const parsed = looseParseJson(raw);
    if (!parsed || !Array.isArray(parsed.segments) || !parsed.segments.length) {
      return res.status(400).json({ error: "Không phiên âm được nội dung (audio quá dài/khó nghe?)." });
    }

    const sorted = parsed.segments
      .filter((s: any) => s && typeof s.text === "string" && s.text.trim())
      .map((s: any) => ({ start: Math.max(0, Number(s.start) || 0), text: String(s.text).trim() }))
      .sort((a: any, b: any) => a.start - b.start);

    const segments = sorted.map((s: any, i: number) => {
      const next = sorted[i + 1];
      const dur = next ? Math.max(0.5, next.start - s.start) : 3;
      return { start: s.start, dur, text: s.text };
    });

    return res.json({ success: true, lang: String(parsed.lang || "auto").slice(0, 2), segments });
  } catch (error: any) {
    console.error("Error in /api/transcribe:", String(error?.message ?? error).slice(0, 200));
    return res.status(500).json({ error: friendlyGeminiError(error) });
  }
});

export default router;
