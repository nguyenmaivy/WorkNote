import { Router } from "express";
import {
  chatWithTutor,
  summarizeWithTutor,
  generateQuizRpgWithTutor,
  type TutorChatMessage,
} from "../services/tutorService.js";

const router = Router();

/**
 * POST /api/tutor/chat
 * Trò chuyện với Qwen2.5-1.5B local
 */
router.post("/chat", async (req, res) => {
  try {
    const { messages, message, system, maxTokens, temperature } = req.body;

    let chatMessages: TutorChatMessage[] = [];
    if (Array.isArray(messages) && messages.length > 0) {
      chatMessages = messages;
    } else if (typeof message === "string" && message.trim()) {
      chatMessages = [
        {
          role: "system",
          content:
            typeof system === "string" && system.trim()
              ? system
              : "Bạn là Gia sư AI thông minh của WorkNote. Hãy trả lời ngắn gọn, chuẩn xác, thân thiện.",
        },
        { role: "user", content: message.trim() },
      ];
    } else {
      return res.status(400).json({ error: "Yêu cầu cung cấp 'messages' hoặc 'message'" });
    }

    const reply = await chatWithTutor(chatMessages, {
      maxTokens: typeof maxTokens === "number" ? maxTokens : 256,
      temperature: typeof temperature === "number" ? temperature : 0.7,
    });

    res.json({ success: true, reply });
  } catch (error: any) {
    console.error("Lỗi Tutor Chat:", error);
    res.status(500).json({ success: false, error: error.message || "Lỗi xử lý Local LLM" });
  }
});

/**
 * POST /api/tutor/summarize
 * Tóm tắt tài liệu văn bản thành các gạch đầu dòng
 */
router.post("/summarize", async (req, res) => {
  try {
    const { text, bullets } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Yêu cầu cung cấp trường 'text' cần tóm tắt" });
    }

    const bulletCount = typeof bullets === "number" && bullets > 0 ? bullets : 3;
    const summary = await summarizeWithTutor(text.trim(), bulletCount);

    res.json({ success: true, summary });
  } catch (error: any) {
    console.error("Lỗi Tutor Summarize:", error);
    res.status(500).json({ success: false, error: error.message || "Lỗi tóm tắt tài liệu" });
  }
});

/**
 * POST /api/tutor/quiz-rpg
 * Sinh câu hỏi trắc nghiệm RPG tương tác kèm EXP
 */
router.post("/quiz-rpg", async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "Yêu cầu cung cấp trường 'content' nội dung ôn tập" });
    }

    const quiz = await generateQuizRpgWithTutor(content.trim());

    res.json({ success: true, quiz });
  } catch (error: any) {
    console.error("Lỗi Tutor Quiz RPG:", error);
    res.status(500).json({ success: false, error: error.message || "Lỗi tạo câu hỏi RPG" });
  }
});

export default router;
