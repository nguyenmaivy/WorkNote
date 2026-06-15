import { Router } from "express";
import { GEMINI_MODEL } from "../config.js";
import { getAiClient, hasApiKey } from "../services/geminiService.js";

const router = Router();

const SYSTEM_PROMPT = `Bạn là VietLearn AI - Trợ lý thông thái thấu hiểu tài liệu của người dùng.
Nội dung tài liệu kèm theo đang hoạt động là:
"""
{{CONTEXT}}
"""

HƯỚNG DẪN TRẢ LỜI:
1. Hãy dựa vào tài liệu cung cấp để đưa ra phản hồi chính xác, ngắn gọn và mạch lạc bằng Tiếng Việt.
2. Nếu người dùng chat không có prompt sẵn hoặc chat tự do, hãy linh hoạt tự nhận diện ý định.
3. Khi giải thích các vấn đề ngôn ngữ/vùng miền, hãy kèm theo phân tích ngữ âm phù hợp theo giọng từng miền.
4. Trả lời một cách khiêm tốn, lịch sự và khoa học.`;

// ─── POST /api/chat ───────────────────────────────────────────────────────────
router.post("/", async (req, res): Promise<any> => {
  try {
    const { messages, contextFileText } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    // Health/status probe (empty messages)
    if (messages.length === 0) {
      return res.json({ success: true, isDemo: !hasApiKey() });
    }

    if (!hasApiKey()) {
      const lastMsg = messages[messages.length - 1]?.content || "";
      return res.json({
        success: true,
        reply: `Chào bạn! (Chế độ Demo - Chưa cấu hình API Key)\n\nBạn vừa hỏi: "${lastMsg}".\nVui lòng cấu hình GEMINI_API_KEY trong Secrets để kích hoạt trợ lý thực tế.`,
      });
    }

    const ai = getAiClient();
    const contextText =
      contextFileText ||
      "Không có tệp tài liệu nào được kích hoạt. Bạn sẽ trả lời các thắc mắc chung về học tập, lập trình, hoặc thiết kế hệ thống.";

    const systemInstruction = SYSTEM_PROMPT.replace("{{CONTEXT}}", contextText);

    const contentsPayload = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: contentsPayload,
      config: { systemInstruction, temperature: 0.7 },
    });

    return res.json({ success: true, reply: response.text || "Xin lỗi, tôi chưa thể đưa ra câu trả lời." });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({ error: error.message || "Failed to conduct chat session" });
  }
});

export default router;
