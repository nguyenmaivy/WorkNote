import { Router } from "express";
import { Type } from "@google/genai";
import { GEMINI_MODEL } from "../config.js";
import { getAiClient, geminiLimiter, hasApiKey, withGeminiRetry, friendlyGeminiError } from "../services/geminiService.js";

const router = Router();

// ─── Demo phrases cho mode không có API Key ───────────────────────────────────
const DEMO_PHRASES: Record<string, { trans: string; transViet: string }[]> = {
  en: [
    {
      trans: "Hello everyone, welcome back to this video tutorial on advanced coding.",
      transViet: "Xin chào mọi người, chào mừng các bạn quay lại với video hướng dẫn lập trình nâng cao.",
    },
    {
      trans: "Today we will analyze modern reactive components and architectural paradigms.",
      transViet: "Hôm nay chúng ta sẽ phân tích các thành phần phản ứng hiện đại và các mô hình kiến trúc.",
    },
    {
      trans: "It is crucial to understand state synchronization and client-server channels.",
      transViet: "Việc hiểu rõ về đồng bộ hóa trạng thái và kênh truyền giữa máy khách & máy chủ là tối quan trọng.",
    },
  ],
  ja: [
    {
      trans: "皆さん、こんにちは。今回のビデオチュートリアルへようこそ。",
      transViet: "Xin chào mọi người. Chào mừng đến với video hướng dẫn lần này.",
    },
    {
      trans: "今日は、システム設計における非同期通信について学んでいきましょう。",
      transViet: "Hôm nay, chúng ta cùng nhau tìm hiểu về truyền thông bất đồng bộ trong thiết kế hệ thống.",
    },
  ],
  zh: [
    {
      trans: "大家好，欢迎来到今天的视频教程。今天我们来探讨全栈开发。",
      transViet: "Chào mọi người, chào mừng đến với video bài giảng hôm nay. Hôm nay chúng ta thảo luận về full-stack.",
    },
  ],
};

// ─── POST /api/translate-live-audio ──────────────────────────────────────────
router.post("/", async (req, res): Promise<any> => {
  try {
    const { base64Audio, mimeType, sourceLang, targetLang } = req.body;
    if (!base64Audio) {
      return res.status(400).json({ error: "Missing sound chunk data (base64Audio)" });
    }

    if (!hasApiKey()) {
      const langKey = sourceLang === "auto" ? "en" : (sourceLang as string);
      const phrases = DEMO_PHRASES[langKey] ?? DEMO_PHRASES.en;
      const chosen = phrases[Math.floor(Math.random() * phrases.length)];
      return res.json({
        success: true,
        isDemo: true,
        transcription: chosen.trans,
        translation: targetLang === "vi" ? chosen.transViet : `[Demo] Translation of: ${chosen.trans}`,
      });
    }

    const ai = getAiClient();
    const cleanMime = (mimeType || "audio/webm").split(";")[0].trim().toLowerCase();

    const parsedData = await geminiLimiter.run(() =>
      withGeminiRetry(async () => {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          { inlineData: { mimeType: cleanMime, data: base64Audio } },
          `You are a real-time speech translation system.
Listen to this short audio chunk.
1. Transcribe the audio in its original language (${sourceLang === "auto" ? "detect the language" : sourceLang}).
2. Translate the transcribed text to: ${targetLang}.
Return strictly in JSON format:
{
  "transcription": "Original transcript",
  "translation": "Translated text"
}
If there is only silence or noise, return empty string fields.
Do not add any markdown wrappers or extra text.`,
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              transcription: { type: Type.STRING },
              translation: { type: Type.STRING },
            },
            required: ["transcription", "translation"],
          },
        },
      });
      return JSON.parse(response.text || "{}");
      })
    );

    return res.json({
      success: true,
      transcription: parsedData.transcription || "",
      translation: parsedData.translation || "",
    });
  } catch (error: any) {
    console.error("Error in /api/translate-live-audio:", error);
    res.status(500).json({ error: friendlyGeminiError(error) });
  }
});

export default router;
