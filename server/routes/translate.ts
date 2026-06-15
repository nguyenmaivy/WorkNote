import { Router } from "express";
import { GEMINI_MODEL, SUPPORTED_LANGUAGES } from "../config.js";
import { getAiClient, hasApiKey } from "../services/geminiService.js";

const router = Router();

// ─── POST /api/translate ──────────────────────────────────────────────────────
router.post("/", async (req, res): Promise<any> => {
  try {
    const { text, targetLang } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required for translation" });
    }

    const targetLangName = SUPPORTED_LANGUAGES[targetLang] ?? targetLang;

    if (!hasApiKey()) {
      return res.json({
        success: true,
        isDemo: true,
        translatedText: `[Bản Dịch Giả Lập - ${targetLangName}]\n\n${text}\n\n*Hãy cài đặt API Key để kích hoạt dịch thuật thực tế với Gemini!*`,
      });
    }

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Hãy dịch văn bản học tập sau đây sang ${targetLangName}.
YÊU CẦU QUAN TRỌNG:
- Giữ nguyên hoàn toàn cấu trúc định dạng nguyên bản: markdown (tiêu đề #, chữ đậm **, danh sách -, số hiệu), HTML hoặc ký hiệu toán học.
- Chỉ dịch nội dung chữ hiển thị, KHÔNG dịch các thẻ định dạng hoặc mã code.
- Trả về kết quả dịch thô trực tiếp, không bọc thêm bất cứ lời bình hay dấu nháy nào.

Nội dung dịch:
"""
${text}
"""`,
    });

    return res.json({ success: true, translatedText: response.text || "Bản dịch trống." });
  } catch (error: any) {
    console.error("Error in /api/translate:", error);
    res.status(500).json({ error: error.message || "Translation failed" });
  }
});

export default router;
