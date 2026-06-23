import { Router } from "express";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const router = Router();

// Giọng neural Microsoft Edge theo ngôn ngữ — đọc đúng tên riêng / từ ngoại,
// miễn phí, không cần API key. Trả kèm mốc thời gian từng từ để highlight đồng bộ.
const VOICE_BY_LANG: Record<string, string> = {
  vi: "vi-VN-HoaiMyNeural",
  en: "en-US-AriaNeural",
  ja: "ja-JP-NanamiNeural",
  ko: "ko-KR-SunHiNeural",
  zh: "zh-CN-XiaoxiaoNeural",
  fr: "fr-FR-DeniseNeural",
};

// Danh sách giọng cho phép chọn (chống lạm dụng tham số voice tùy ý).
const ALLOWED_VOICES = new Set([
  "vi-VN-HoaiMyNeural", "vi-VN-NamMinhNeural",
  "en-US-AriaNeural", "en-US-AndrewNeural", "en-US-EmmaNeural", "en-US-BrianNeural",
  "ja-JP-NanamiNeural", "ko-KR-SunHiNeural", "zh-CN-XiaoxiaoNeural", "fr-FR-DeniseNeural",
]);

// Giới hạn độ dài mỗi lần đọc để tránh audio quá lớn / chờ quá lâu.
const MAX_LEN = 8000;

// ─── POST /api/tts-read ─────────────────────────────────────────────────────────
router.post("/", async (req, res): Promise<any> => {
  try {
    let { text, lang, voice: requestedVoice } = req.body as { text?: string; lang?: string; voice?: string };
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Thiếu nội dung cần đọc." });
    }

    const base = String(lang || "vi").slice(0, 2).toLowerCase();
    const voice =
      requestedVoice && ALLOWED_VOICES.has(requestedVoice)
        ? requestedVoice
        : VOICE_BY_LANG[base] || VOICE_BY_LANG.vi;

    let truncated = false;
    if (text.length > MAX_LEN) {
      text = text.slice(0, MAX_LEN);
      truncated = true;
    }

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {
      wordBoundaryEnabled: true,
    });
    const { audioStream, metadataStream } = tts.toStream(text);

    const chunks: Buffer[] = [];
    const words: { text: string; offsetMs: number }[] = [];

    audioStream.on("data", (c: Buffer) => chunks.push(c));
    if (metadataStream) {
      metadataStream.on("data", (d: Buffer) => {
        try {
          const j = JSON.parse(d.toString("utf-8"));
          for (const m of j.Metadata || []) {
            if (m.Type === "WordBoundary" && m.Data?.text?.Text) {
              words.push({ text: m.Data.text.Text, offsetMs: m.Data.Offset / 10000 });
            }
          }
        } catch {
          /* bỏ qua chunk metadata lỗi */
        }
      });
    }

    await new Promise<void>((resolve, reject) => {
      audioStream.on("end", () => resolve());
      audioStream.on("error", reject);
      setTimeout(() => reject(new Error("TTS timeout")), 45000);
    });
    tts.close();

    // Khớp từng từ (theo thứ tự) về vị trí ký tự trong VĂN BẢN GỐC để frontend
    // highlight đúng chữ đang hiển thị, dù giọng đọc phát âm khác đi.
    const marks: { start: number; end: number; timeMs: number }[] = [];
    let cursor = 0;
    for (const w of words) {
      const idx = text.indexOf(w.text, cursor);
      if (idx >= 0) {
        marks.push({ start: idx, end: idx + w.text.length, timeMs: w.offsetMs });
        cursor = idx + w.text.length;
      }
    }

    const audioBase64 = Buffer.concat(chunks).toString("base64");
    if (!audioBase64) throw new Error("No audio returned");

    return res.json({ success: true, voice, mime: "audio/mpeg", audioBase64, marks, truncated });
  } catch (e: any) {
    console.error("Error in /api/tts-read:", String(e?.message ?? e).slice(0, 200));
    return res.status(500).json({
      error: "Không tạo được giọng đọc AI. Hãy thử lại hoặc chuyển sang giọng trình duyệt.",
    });
  }
});

export default router;
