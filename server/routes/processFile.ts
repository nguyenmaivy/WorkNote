import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { UPLOAD_DIR, GEMINI_MODEL } from "../config.js";
import { getAiClient, geminiLimiter, hasApiKey } from "../services/geminiService.js";
import {
  getSafeGeminiPayload,
  buildFileAnalysisPrompt,
  FILE_ANALYSIS_RESPONSE_SCHEMA,
} from "../services/fileService.js";

const router = Router();

// Multer với disk storage để tránh nghẽn RAM
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const suffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + suffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// ─── Demo Mock Data ───────────────────────────────────────────────────────────
function buildDemoResponse(name: string) {
  return {
    success: true,
    isDemo: true,
    summary: `### Tóm tắt tài liệu: ${name}\n\nĐây là chế độ Demo (Chưa cấu hình GEMINI_API_KEY trong Secrets).\nTài liệu của bạn chứa thông tin học tập quan trọng. Sau khi cấu hình API Key, AI sẽ đọc chính xác từng dòng và chuyển thể thành các định dạng tương tác dưới đây.`,
    extractedText: `Văn bản mẫu được giả lập cho tài liệu ${name}. Xin hãy cấu hình API Key của bạn trong Secrets để sử dụng sức mạnh xử lý thực tế của gemini-3.5-flash!`,
    quiz: [
      {
        id: "q1",
        question: "Làm thế nào để chuyển đổi Web App thông thường sang ứng dụng Mobile?",
        options: [
          "Chỉ có thể viết lại toàn bộ từ đầu bằng ngôn ngữ khác",
          "Sử dụng Hybrid Framework như React Native, Expo, Flutter hoặc Capacitor",
          "Dùng trình duyệt Safari trên điện thoại để mở thủ công",
          "Cài đặt trực tiếp file .exe lên điện thoại Android",
        ],
        correctAnswer: "Sử dụng Hybrid Framework như React Native, Expo, Flutter hoặc Capacitor",
        explanation: "Các Hybrid Framework cho phép biên dịch một cơ sở mã nguồn ra cả Android, iOS và Web.",
      },
    ],
    mindmap: {
      id: "root",
      label: name,
      children: [
        {
          id: "node_1",
          label: "1. Kiến Trúc Đa Nền Tảng",
          children: [
            { id: "node_1_1", label: "Frontend: React / React Native" },
            { id: "node_1_2", label: "Backend: Express / Node.js" },
          ],
        },
      ],
    },
  };
}

// ─── POST /api/process-file ───────────────────────────────────────────────────
router.post("/", upload.single("file"), async (req, res): Promise<any> => {
  let tempFilePath: string | null = null;
  try {
    let name: string;
    let mimeType: string;
    let base64Data: string;
    let buffer: Buffer;

    if (req.file) {
      tempFilePath = req.file.path;
      name = req.body.name || req.file.originalname;
      mimeType = req.body.mimeType || req.file.mimetype;
      buffer = await fs.promises.readFile(tempFilePath);
      base64Data = buffer.toString("base64");
    } else {
      const { name: bodyName, mimeType: bodyMime, base64Data: bodyBase64 } = req.body;
      if (!bodyBase64) {
        return res.status(400).json({ error: "Missing file payload (multipart or base64)" });
      }
      name = bodyName;
      mimeType = bodyMime;
      base64Data = bodyBase64;
      buffer = Buffer.from(base64Data, "base64");
    }

    if (!hasApiKey()) {
      return res.json(buildDemoResponse(name));
    }

    const ai = getAiClient();
    const payload = getSafeGeminiPayload(name, mimeType || "application/octet-stream", base64Data, buffer);
    const promptMessage = buildFileAnalysisPrompt(name);

    const contentsPayload =
      payload.type === "multimodal"
        ? [payload.filePart, promptMessage]
        : [promptMessage + `\n\nNội dung văn bản:\n${payload.textContent}`];

    const parsedData = await geminiLimiter.run(async () => {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: contentsPayload,
        config: {
          responseMimeType: "application/json",
          responseSchema: FILE_ANALYSIS_RESPONSE_SCHEMA,
        },
      });
      return JSON.parse(response.text || "{}");
    });

    return res.json({ success: true, ...parsedData });
  } catch (error: any) {
    console.error("Error in /api/process-file:", error);
    res.status(500).json({ error: error.message || "Failed to process file" });
  } finally {
    if (tempFilePath) {
      fs.promises.unlink(tempFilePath).catch((e) =>
        console.warn("Failed to delete temp file:", tempFilePath, e)
      );
    }
  }
});

export default router;
