import { WebSocket } from "ws";
import { Type } from "@google/genai";
import { GEMINI_MODEL } from "../config.js";
import { getAiClient, geminiLimiter, hasApiKey } from "../services/geminiService.js";

// Demo phrases cho mode không có API Key
const DEMO_PHRASES: Record<string, { trans: string; transViet: string }[]> = {
  en: [
    { trans: "Hello everyone, welcome back to this live stream.", transViet: "Xin chào mọi người, chào mừng các bạn quay lại với buổi phát trực tiếp này." },
    { trans: "Today we will analyze modern reactive components.", transViet: "Hôm nay chúng ta sẽ phân tích các thành phần phản ứng hiện đại." },
    { trans: "It is crucial to understand state synchronization.", transViet: "Việc hiểu rõ về đồng bộ hóa trạng thái là tối quan trọng." },
  ],
  ja: [
    { trans: "皆さん、こんにちは。今回のライブへようこそ。", transViet: "Xin chào mọi người. Chào mừng đến với buổi live lần này." },
  ],
  zh: [
    { trans: "大家好，欢迎来到今天的直播。今天我们来探讨全栈开发。", transViet: "Chào mọi người, chào mừng đến với buổi live hôm nay. Hôm nay chúng ta thảo luận về full-stack." },
  ],
};

export function setupLiveAudioTranslateHandler(ws: WebSocket) {
  let sourceLang = "auto";
  let targetLang = "vi";

  ws.on("message", async (message: Buffer | string) => {
    try {
      const dataStr = message.toString();
      const payload = JSON.parse(dataStr);

      if (payload.type === "config") {
        sourceLang = payload.sourceLang || "auto";
        targetLang = payload.targetLang || "vi";
        return;
      }

      if (payload.type === "audio") {
        const { base64Audio, mimeType } = payload;
        
        if (!base64Audio) return;

        // Xử lý Demo mode nếu không có API Key
        if (!hasApiKey()) {
          const langKey = sourceLang === "auto" ? "en" : sourceLang;
          const phrases = DEMO_PHRASES[langKey] ?? DEMO_PHRASES.en;
          const chosen = phrases[Math.floor(Math.random() * phrases.length)];
          
          ws.send(JSON.stringify({
            success: true,
            isDemo: true,
            transcription: chosen.trans,
            translation: targetLang === "vi" ? chosen.transViet : `[Demo] Translation of: ${chosen.trans}`,
          }));
          return;
        }

        // Gọi Gemini API xử lý dịch trực tiếp
        const ai = getAiClient();
        const cleanMime = (mimeType || "audio/webm").split(";")[0].trim().toLowerCase();

        const parsedData = await geminiLimiter.run(async () => {
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
        });

        if (parsedData.transcription || parsedData.translation) {
          ws.send(JSON.stringify({
            success: true,
            transcription: parsedData.transcription || "",
            translation: parsedData.translation || "",
          }));
        }
      }
    } catch (error: any) {
      console.error("WS Live Audio Error:", error.message);
      ws.send(JSON.stringify({ error: "Failed to translate audio chunk" }));
    }
  });

  ws.on("close", () => {
    // Cleanup nếu cần
  });
}
