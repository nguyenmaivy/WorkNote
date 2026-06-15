import { Router } from "express";
import { GEMINI_TTS_MODEL, TTS_VOICE_MAP } from "../config.js";
import { getAiClient, hasApiKey } from "../services/geminiService.js";

const router = Router();

// ─── POST /api/tts ────────────────────────────────────────────────────────────
router.post("/", async (req, res): Promise<any> => {
  try {
    const { text, region } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required for Speech Synthesis" });
    }

    if (!hasApiKey()) {
      return res.json({
        success: true,
        isDemo: true,
        region,
        message: "Demo mode — configure GEMINI_API_KEY to enable real audio synthesis.",
      });
    }

    const voiceName = TTS_VOICE_MAP[region] ?? TTS_VOICE_MAP.north;
    const regionLabel =
      region === "north" ? "Bắc" : region === "central" ? "Trung" : "Nam";

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_TTS_MODEL,
      contents: [
        {
          parts: [
            {
              text: `Đọc văn bản sau bằng giọng tương tự phong thái tiếng Việt miền ${regionLabel}, diễn cảm tự nhiên: ${text}`,
            },
          ],
        },
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName } },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio returned from Gemini Speech API");

    return res.json({ success: true, region, base64Audio, mimeType: "audio/pcm;rate=24000" });
  } catch (error: any) {
    console.error("Error in /api/tts:", error);
    res.status(500).json({ error: error.message || "Speech synthesis failed" });
  }
});

export default router;
