import fs from "fs";
import path from "path";
import { hasApiKey, hasSttKey, hasLlmKey, hasAnyAiKey } from "./geminiService.js";
import { normalizeMimeType } from "./fileService.js";
import { transcribePlain } from "./audioService.js";
import { extractDocumentText } from "./documentService.js";
import { generateAnalysisWithFallback } from "./llmOrchestrator.js";
import { withGeminiFile } from "./geminiFilesService.js";
import { maskPII, unmaskDeep } from "./piiGuardService.js";

// Demo Mock Data
export function buildDemoResponse(name: string) {
  return {
    success: true,
    isDemo: true,
    summary: `### Tóm tắt tài liệu: ${name}\n\nĐây là chế độ Demo vì chưa bật local LLM hoặc cấu hình API fallback.\nTài liệu của bạn chứa thông tin học tập quan trọng. Sau khi cấu hình một AI provider, hệ thống sẽ đọc nội dung và chuyển thể thành các định dạng tương tác.`,
    extractedText: `Văn bản mẫu được giả lập cho tài liệu ${name}. Vui lòng bật local LLM hoặc cấu hình API fallback trong file .env để xử lý thực tế!`,
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

export async function processFileService({
  tempFilePath,
  name,
  mimeType,
  fileSize,
}: {
  tempFilePath: string;
  name: string;
  mimeType: string;
  fileSize: number;
}) {
  const cleanMime = normalizeMimeType(mimeType, name);
  const ext = (name.split(".").pop() || "").toLowerCase();
  const isAudio = cleanMime.startsWith("audio/") || ["mp3", "wav", "m4a", "ogg", "flac", "aac", "aiff"].includes(ext);
  const isVideo = cleanMime.startsWith("video/") || ["mp4", "webm", "mov", "avi", "mkv"].includes(ext);
  const isImage = cleanMime.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);

  if (!hasAnyAiKey()) {
    return buildDemoResponse(name);
  }

  console.log(`[ProcessFileService] ───────────────── DEBUG ─────────────────`);
  console.log(`[ProcessFileService]   name       = ${name}`);
  console.log(`[ProcessFileService]   ext        = ${ext}`);
  console.log(`[ProcessFileService]   rawMime    = ${mimeType}`);
  console.log(`[ProcessFileService]   cleanMime  = ${cleanMime}`);
  console.log(`[ProcessFileService]   isAudio    = ${isAudio}`);
  console.log(`[ProcessFileService]   isVideo    = ${isVideo}`);
  console.log(`[ProcessFileService]   isImage    = ${isImage}`);
  console.log(`[ProcessFileService]   fileSize   = ${Math.round(fileSize / 1024)}KB`);
  console.log(`[ProcessFileService]   tempFile   = ${tempFilePath}`);
  console.log(`[ProcessFileService] ─────────────────────────────────────────`);

  // KÊNH 1: ÂM THANH / VIDEO
  if (isAudio || isVideo) {
    if (!hasSttKey()) {
      throw new Error("Cần cấu hình GROQ_API_KEY hoặc GEMINI_API_KEY để phiên âm âm thanh/video.");
    }

    console.log(`[ProcessFileService] Khởi động phiên âm audio/video: ${name} (${Math.round(fileSize / 1024)}KB)`);
    const transcript = await transcribePlain(tempFilePath, cleanMime, fileSize, name);
    console.log(`[ProcessFileService] Phiên âm hoàn tất: ${transcript.length} ký tự.`);

    if (!hasLlmKey()) {
      return {
        success: true,
        summary: `### Bản phiên âm âm thanh: ${name}\n\n*Đã chuyển đổi giọng nói thành văn bản thành công. Hãy bật local LLM hoặc cấu hình API fallback trong .env để tự động phân tích tóm tắt, tạo câu hỏi và sơ đồ tư duy.*`,
        extractedText: transcript,
        quiz: [],
        mindmap: {
          id: "root",
          label: name,
          children: [{ id: "n1", label: "Nội dung phiên âm", children: [] }],
        },
      };
    }

    const { maskedText, vault } = maskPII(transcript);
    const rawAnalysis = await generateAnalysisWithFallback({
      filename: name,
      textContent: maskedText,
    });

    const finalAnalysis = unmaskDeep(rawAnalysis, vault);
    finalAnalysis.extractedText = transcript;

    return { success: true, ...finalAnalysis };
  }

  // KÊNH 2: TÀI LIỆU VĂN BẢN (DOCX, XLSX, PDF, TXT)
  if (!isImage) {
    const docResult = await extractDocumentText(tempFilePath, cleanMime, name, fileSize);

    if (docResult.isScannedPdf) {
      if (!hasApiKey()) {
        throw new Error("Đây là tệp PDF dạng scan/ảnh (không có lớp chữ). Cần cấu hình GEMINI_API_KEY để dùng công nghệ thị giác đọc chữ.");
      }

      console.log(`[ProcessFileService] PDF Scan: Gửi sang Gemini Multimodal qua Files API...`);
      const analysis = await withGeminiFile(tempFilePath, "application/pdf", async ({ fileUri, mimeType: activeMime }) => {
        return await generateAnalysisWithFallback({
          filename: name,
          fileData: { fileUri, mimeType: activeMime },
        });
      }, name);

      return { success: true, ...analysis };
    }

    if (!hasLlmKey()) {
      throw new Error("Cần bật local LLM hoặc cấu hình GEMINI_API_KEY/OPENROUTER_API_KEY để phân tích tài liệu văn bản.");
    }

    const { maskedText, vault } = maskPII(docResult.text);
    const rawAnalysis = await generateAnalysisWithFallback({
      filename: name,
      textContent: maskedText,
    });

    const finalAnalysis = unmaskDeep(rawAnalysis, vault);
    finalAnalysis.extractedText = docResult.text.length > 50000 
      ? docResult.text.substring(0, 50000) + "\n...[Text Truncated]" 
      : docResult.text;

    return { success: true, ...finalAnalysis };
  }

  // KÊNH 3: ẢNH ĐƠN LẺ (IMAGE)
  if (!hasApiKey()) {
    throw new Error("Cần cấu hình GEMINI_API_KEY để phân tích ảnh (Vision/OCR).");
  }

  console.log(`[ProcessFileService] Xử lý ẢNH bằng Gemini Multimodal...`);
  const analysis = await withGeminiFile(tempFilePath, cleanMime, async ({ fileUri, mimeType: activeMime }) => {
    return await generateAnalysisWithFallback({
      filename: name,
      fileData: { fileUri, mimeType: activeMime },
    });
  }, name);

  return { success: true, ...analysis };
}
