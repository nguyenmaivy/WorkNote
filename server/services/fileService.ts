import { Type } from "@google/genai";

// ─── Types ────────────────────────────────────────────────────────────────────

type MultimodalPayload = {
  type: "multimodal";
  filePart: { inlineData: { mimeType: string; data: string } };
};

type TextPayload = {
  type: "text";
  textContent: string;
};

export type GeminiPayload = MultimodalPayload | TextPayload;

// ─── MIME Normalizer ──────────────────────────────────────────────────────────

/**
 * Chuẩn hóa MIME type dựa trên extension để tránh lỗi 400 từ Gemini API.
 */
export function normalizeMimeType(originalMime: string, filename: string): string {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  let mime = (originalMime || "application/octet-stream").split(";")[0].trim().toLowerCase();

  if (ext === "pdf") return "application/pdf";
  if (["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(ext)) {
    return ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
  }
  if (["mp3", "wav", "m4a", "ogg", "flac"].includes(ext)) {
    return ext === "mp3" ? "audio/mp3" : `audio/${ext}`;
  }
  if (["mp4", "webm", "avi", "mov"].includes(ext)) {
    return ext === "mp4" ? "video/mp4" : `video/${ext}`;
  }
  if (["html", "htm"].includes(ext)) return "text/html";
  if (ext === "csv") return "text/csv";
  if (["txt", "md", "json", "xml"].includes(ext)) return "text/plain";

  return mime;
}

import mammoth from "mammoth";
import * as xlsx from "xlsx";

// ─── Safe Gemini Payload Builder ──────────────────────────────────────────────

/**
 * Xây dựng payload phù hợp với Gemini API:
 * - Multimodal (PDF, ảnh, audio, video): gửi inline binary
 * - Text (HTML, txt, csv, json, md): gửi decoded UTF-8 string
 * - Trích xuất text cho docx và xlsx bằng mammoth và xlsx.
 */
export async function getSafeGeminiPayload(
  name: string,
  originalMime: string,
  base64Data: string,
  buffer: Buffer
): Promise<GeminiPayload> {
  const ext = (name.split(".").pop() || "").toLowerCase();
  
  // 1. Xử lý các định dạng Office (docx, xlsx) bằng cách parse text
  if (ext === "docx") {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return { type: "text", textContent: result.value || "[Nội dung docx trống]" };
    } catch (e) {
      console.warn("Mammoth extraction failed for docx:", e);
      return { type: "text", textContent: "[Lỗi giải mã tệp docx]" };
    }
  }

  if (ext === "xlsx" || ext === "xls") {
    try {
      const workbook = xlsx.read(buffer, { type: "buffer" });
      let allText = "";
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        allText += `--- Bảng: ${sheetName} ---\n`;
        allText += xlsx.utils.sheet_to_csv(sheet) + "\n\n";
      });
      return { type: "text", textContent: allText || "[Nội dung xlsx trống]" };
    } catch (e) {
      console.warn("XLSX extraction failed for xlsx:", e);
      return { type: "text", textContent: "[Lỗi giải mã tệp excel]" };
    }
  }

  const cleanMime = normalizeMimeType(originalMime, name);

  const isMultimodal =
    cleanMime === "application/pdf" ||
    cleanMime.startsWith("image/") ||
    cleanMime.startsWith("audio/") ||
    cleanMime.startsWith("video/");

  if (isMultimodal) {
    return {
      type: "multimodal",
      filePart: { inlineData: { mimeType: cleanMime, data: base64Data } },
    };
  }

  // 2. Text: decode as UTF-8 and strip HTML tags if needed
  let textContent = "";
  try {
    textContent = buffer.toString("utf-8");
    if (cleanMime === "text/html" || textContent.includes("<html") || textContent.includes("<body")) {
      textContent = textContent
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }
  } catch {
    textContent = `[Nội dung tệp ${name} không giải mã được dạng văn bản]`;
  }

  return { type: "text", textContent: textContent || "[Nội dung tệp trống]" };
}

// ─── Shared Gemini Response Schema ────────────────────────────────────────────

/**
 * Schema dùng chung cho cả process-file và process-link.
 * Tránh duplicate định nghĩa schema tại 2 route riêng biệt.
 */
export const FILE_ANALYSIS_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    extractedText: { type: Type.STRING },
    quiz: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctAnswer: { type: Type.STRING },
          explanation: { type: Type.STRING },
        },
        required: ["id", "question", "options", "correctAnswer", "explanation"],
      },
    },
    mindmap: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        label: { type: Type.STRING },
        children: { type: Type.ARRAY, items: { type: Type.OBJECT } },
      },
      required: ["id", "label"],
    },
  },
  required: ["summary", "extractedText", "quiz", "mindmap"],
};

// ─── Prompt Builder ───────────────────────────────────────────────────────────

/**
 * Tạo prompt phân tích tài liệu nhất quán cho cả 2 loại input (file & link).
 */
export function buildFileAnalysisPrompt(filename: string): string {
  return `Hãy phân tích nội dung tệp tin "${filename}".
Dựa vào nội dung đó, hãy trích xuất và cung cấp thông tin theo cấu trúc JSON nghiêm ngặt có định dạng:
{
  "summary": "Tóm tắt chi tiết nội dung học tập bằng markdown Tiếng Việt rất sinh động và thực tế",
  "extractedText": "Văn bản thô đầy đủ được trích xuất từ tệp",
  "quiz": [
    {
      "id": "q1",
      "question": "Câu hỏi ôn tập trắc nghiệm số 1 thấu đáo?",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "Giải thích chi tiết tại sao đúng"
    }
  ],
  "mindmap": {
    "id": "root",
    "label": "Tên chủ đề chính của tệp",
    "children": [
      {
        "id": "child1",
        "label": "Tên nhánh chính 1",
        "children": [
          { "id": "child1_1", "label": "Nhánh phụ chi tiết 1.1" }
        ]
      }
    ]
  }
}
Lưu ý: Hãy tự động phân tích định dạng cấu trúc cây (I, II, III, A, B, 1, 2) có trong nội dung để tạo ra cây sơ đồ tư duy chính xác nhất. Không trả về bất cứ văn bản nào ngoài JSON hợp lệ.`;
}
