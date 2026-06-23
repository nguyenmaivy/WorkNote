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

  // Extension takes priority — most reliable source
  if (ext === "pdf") return "application/pdf";
  if (["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(ext)) {
    return ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
  }
  if (["mp3", "wav", "m4a", "ogg", "flac", "aac", "aiff"].includes(ext)) {
    const audioMap: Record<string, string> = {
      mp3: "audio/mp3", wav: "audio/wav", m4a: "audio/aac",
      ogg: "audio/ogg", flac: "audio/flac", aac: "audio/aac", aiff: "audio/aiff",
    };
    return audioMap[ext] ?? `audio/${ext}`;
  }
  if (["mp4", "webm", "avi", "mov", "mkv"].includes(ext)) {
    return ext === "mp4" ? "video/mp4" : `video/${ext}`;
  }
  if (["html", "htm"].includes(ext)) return "text/html";
  if (ext === "csv") return "text/csv";
  if (["txt", "md", "json", "xml"].includes(ext)) return "text/plain";

  // Mime-type fallbacks — normalize common variants Gemini doesn't accept
  if (mime === "audio/mpeg" || mime === "audio/x-mp3" || mime === "audio/x-mpeg") return "audio/mp3";
  if (mime === "audio/x-wav" || mime === "audio/wave" || mime === "audio/vnd.wave") return "audio/wav";
  if (mime === "audio/x-m4a" || mime === "audio/mp4" || mime === "audio/x-aac") return "audio/aac";
  if (mime === "audio/x-ogg" || mime === "application/ogg") return "audio/ogg";
  if (mime === "video/x-msvideo" || mime === "video/avi") return "video/mp4";

  return mime;
}

import mammoth from "mammoth";
import * as xlsx from "xlsx";
import { YoutubeTranscript } from "youtube-transcript";

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
/**
 * Schema cây mindmap lồng tới `depth` tầng tường minh.
 * responseSchema của Gemini không hỗ trợ đệ quy ($ref), nên phải khai báo
 * cứng từng tầng — nếu để children.items là OBJECT rỗng thì output trả {} rỗng.
 */
function buildMindmapSchema(depth: number): any {
  const node: any = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      label: { type: Type.STRING },
    },
    required: ["id", "label"],
  };
  if (depth > 0) {
    node.properties.children = { type: Type.ARRAY, items: buildMindmapSchema(depth - 1) };
  }
  return node;
}

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
    mindmap: buildMindmapSchema(3),
  },
  required: ["summary", "extractedText", "quiz", "mindmap"],
};

// ─── Tolerant JSON Parsing ──────────────────────────────────────────────────────

/**
 * Vá JSON bị cắt cụt khi output Gemini chạm trần maxOutputTokens.
 * Đóng lại chuỗi/ngoặc đang mở dở để JSON.parse có thể đọc được phần đã sinh ra.
 */
export function repairTruncatedJson(input: string): string {
  let str = input.trim().replace(/^```(?:json)?/i, "").replace(/```\s*$/, "").trim();

  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }

  let out = str;
  if (inString) {
    if (escaped) out = out.slice(0, -1); // bỏ dấu '\' lửng cuối chuỗi
    out += '"';
  }
  out = out.replace(/\s+$/, "");
  out = out.replace(/,\s*$/, "");       // bỏ dấu phẩy thừa
  if (/:\s*$/.test(out)) out += "null"; // "key": lửng → gán null
  out = out.replace(/,\s*$/, "");
  while (stack.length) out += stack.pop();
  return out;
}

/**
 * Parse khoan dung: thử parse thẳng → nếu lỗi thì vá rồi thử lại.
 * Trả null nếu vẫn không cứu được.
 */
export function looseParseJson(raw: string): any | null {
  if (!raw || !raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    /* thử vá bên dưới */
  }
  try {
    return JSON.parse(repairTruncatedJson(raw));
  } catch {
    return null;
  }
}

/**
 * Đảm bảo object phân tích luôn đủ 4 field để frontend render an toàn,
 * kể cả khi output bị cắt cụt làm thiếu quiz / mindmap.
 */
export function normalizeAnalysis(data: any, fallbackLabel: string): any {
  const out: any = data && typeof data === "object" ? { ...data } : {};
  if (typeof out.summary !== "string") out.summary = "";
  if (typeof out.extractedText !== "string") out.extractedText = "";
  if (!Array.isArray(out.quiz)) out.quiz = [];
  if (!out.mindmap || typeof out.mindmap !== "object" || Array.isArray(out.mindmap)) {
    out.mindmap = { id: "root", label: fallbackLabel, children: [] };
  }
  return out;
}

// ─── Prompt Builder ───────────────────────────────────────────────────────────

/**
 * Tạo prompt phân tích tài liệu nhất quán cho cả 2 loại input (file & link).
 */
export function buildFileAnalysisPrompt(filename: string): string {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  const isAudio = ["mp3", "wav", "m4a", "ogg", "flac", "aac", "aiff"].includes(ext);
  const isVideo = ["mp4", "webm", "mov", "avi", "mkv"].includes(ext);

  const mediaNote = isAudio
    ? `\n\n⚠️ ĐÂY LÀ FILE ÂM THANH: Hãy PHIÊN ÂM toàn bộ lời nói trong file thành văn bản chữ viết (speech-to-text) rồi điền đầy đủ vào trường "extractedText". Không được để trường này trống.`
    : isVideo
    ? `\n\n⚠️ ĐÂY LÀ FILE VIDEO: Hãy PHIÊN ÂM toàn bộ lời nói / phụ đề thành văn bản chữ viết rồi điền đầy đủ vào trường "extractedText". Không được để trường này trống.`
    : "";

  return `Hãy phân tích nội dung tệp tin "${filename}".${mediaNote}
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

// ─── YouTube Helpers ──────────────────────────────────────────────────────────

/**
 * Trích xuất video ID từ mọi dạng link YouTube phổ biến
 * (watch?v=, youtu.be/, /embed/, /shorts/). Trả null nếu không phải YouTube.
 */
export function extractYoutubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return m?.[1] ?? null;
}

/**
 * Fallback: lấy phụ đề (caption) qua thư viện youtube-transcript khi Gemini
 * không truy cập được video (403 với video unlisted/hạn chế). Trả null nếu không có.
 */
export async function fetchYoutubeCaptions(
  videoId: string
): Promise<{ lang: string; text: string } | null> {
  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId);
    if (!segments?.length) return null;

    const text = segments
      .map((s) => s.text)
      .join(" ")
      .replace(/&amp;#39;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&amp;quot;/g, '"')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();

    if (!text) return null;
    const lang = (segments[0] as any)?.lang || "auto";
    return { lang, text };
  } catch (e) {
    console.warn("fetchYoutubeCaptions failed:", String((e as any)?.message ?? e).slice(0, 160));
    return null;
  }
}

/**
 * Prompt cho fallback dựa trên transcript text (phụ đề) thay vì video.
 * "extractedText" sẽ được hệ thống ghi đè bằng transcript gốc đầy đủ.
 */
export function buildCaptionAnalysisPrompt(title: string, transcript: string): string {
  return `Đây là transcript (phụ đề) của video YouTube "${title}".
Dựa HOÀN TOÀN vào transcript bên dưới, hãy:
1. TÓM TẮT nội dung học tập bằng markdown Tiếng Việt, sinh động và dễ học.
2. Tạo câu hỏi trắc nghiệm ôn tập bằng Tiếng Việt.
3. Tạo sơ đồ tư duy bằng Tiếng Việt.

Trả về JSON đúng cấu trúc (trường "extractedText" chỉ cần ghi ngắn gọn "Xem transcript gốc"):
{ "summary": "...", "extractedText": "Xem transcript gốc", "quiz": [ { "id":"q1","question":"...","options":["A","B","C","D"],"correctAnswer":"A","explanation":"..." } ], "mindmap": { "id":"root","label":"Chủ đề chính","children":[ { "id":"n1","label":"Nhánh 1","children":[ { "id":"n1_1","label":"Ý phụ 1.1" } ] } ] } }
Sơ đồ tư duy cần có nhiều nhánh chính, mỗi nhánh có vài ý phụ.

TRANSCRIPT:
"""
${transcript}
"""
Chỉ trả JSON hợp lệ, không thêm chữ nào khác.`;
}

/**
 * Prompt cho pipeline YouTube: phiên âm transcript → dịch Tiếng Việt → tóm tắt.
 * Tái sử dụng FILE_ANALYSIS_RESPONSE_SCHEMA để trả về cùng cấu trúc note.
 */
export function buildYoutubeAnalysisPrompt(title: string): string {
  return `Đây là một video YouTube có tiêu đề "${title}".

Nhiệm vụ (thực hiện đầy đủ):
1. NGHE & XEM toàn bộ video, PHIÊN ÂM lời nói thành transcript.
2. DỊCH transcript sang Tiếng Việt tự nhiên, dễ hiểu (nếu video vốn đã là Tiếng Việt thì giữ nguyên).
3. TÓM TẮT nội dung học tập bằng Tiếng Việt.
4. Tạo câu hỏi trắc nghiệm ôn tập và sơ đồ tư duy bằng Tiếng Việt.

QUY TẮC QUAN TRỌNG:
- KHÔNG lặp lại câu hay đoạn văn. Mỗi ý/câu chỉ viết MỘT lần (kể cả video nhạc có điệp khúc lặp — chỉ ghi lời một lần).
- "extractedText" chỉ chứa transcript ĐÃ DỊCH sang Tiếng Việt (không kèm bản gốc), trình bày theo đoạn gọn gàng.
- Giữ tổng độ dài hợp lý, tập trung nội dung chính.

Trả về JSON nghiêm ngặt đúng cấu trúc:
{
  "summary": "Tóm tắt chi tiết nội dung bằng markdown Tiếng Việt, sinh động và dễ học",
  "extractedText": "Transcript Tiếng Việt của video, chia đoạn rõ ràng",
  "quiz": [
    { "id": "q1", "question": "Câu hỏi ôn tập?", "options": ["A","B","C","D"], "correctAnswer": "A", "explanation": "Giải thích" }
  ],
  "mindmap": {
    "id": "root",
    "label": "Chủ đề chính của video",
    "children": [ { "id": "child1", "label": "Nhánh 1", "children": [ { "id": "child1_1", "label": "Ý phụ 1.1" } ] } ]
  }
}
Không trả về bất cứ văn bản nào ngoài JSON hợp lệ.`;
}
