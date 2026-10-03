import { GEMINI_MODEL, OPENROUTER_API_KEY, OPENROUTER_MODELS } from "../config.js";
import {
  hasApiKey,
  geminiLimiter,
  friendlyGeminiError,
  generateContentWithModelFallback,
  GEMINI_FALLBACK_MODELS,
} from "./geminiService.js";
import {
  FILE_ANALYSIS_RESPONSE_SCHEMA,
  looseParseJson,
  normalizeAnalysis,
  buildFileAnalysisPrompt,
} from "./fileService.js";
import { routeTextTask, routeRequest } from "./providerRouter.js";
import { isAvailable, recordError, isRateLimitError } from "./rateLimitTracker.js";


export interface AnalysisInput {
  filename: string;
  textContent?: string;
  fileData?: { fileUri: string; mimeType: string };
  inlineData?: { mimeType: string; data: string };
}

export interface AnalysisOutput {
  summary: string;
  extractedText: string;
  quiz: Array<{
    id: string;
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }>;
  mindmap: {
    id: string;
    label: string;
    children?: any[];
  };
}

/**
 * Gọi OpenRouter với danh sách OPENROUTER_MODELS (dùng làm fallback khi Gemini chạm trần 429 hoặc quá tải).
 */
async function callOpenRouterFallback(prompt: string, filename: string): Promise<AnalysisOutput | null> {
  if (!OPENROUTER_API_KEY) {
    return null;
  }

  const systemPrompt = `Bạn là trợ lý học tập AI chuyên phân tích tài liệu.
Nhiệm vụ của bạn là đọc nội dung và trả về DUY NHẤT một chuỗi JSON hợp lệ (không kèm markdown ngoài JSON, không kèm lời dẫn) theo cấu trúc chính xác:
{
  "summary": "Tóm tắt chi tiết bằng markdown tiếng Việt sinh động",
  "extractedText": "Nội dung văn bản chính đã trích xuất",
  "quiz": [
    {
      "id": "q1",
      "question": "Câu hỏi trắc nghiệm?",
      "options": ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],
      "correctAnswer": "Lựa chọn A",
      "explanation": "Giải thích tại sao đúng"
    }
  ],
  "mindmap": {
    "id": "root",
    "label": "Chủ đề chính",
    "children": [
      {
        "id": "c1",
        "label": "Nhánh 1",
        "children": [
          { "id": "c1_1", "label": "Ý chi tiết 1.1" }
        ]
      }
    ]
  }
}`;

  for (const modelId of OPENROUTER_MODELS) {
    try {
      console.log(`[LLMOrchestrator] Thử fallback OpenRouter model: ${modelId}`);
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "WorkNote AI",
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 4096,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[LLMOrchestrator] OpenRouter ${modelId} trả lỗi ${res.status}:`, errText.slice(0, 150));
        continue;
      }

      const data: any = await res.json();
      const msg = data?.choices?.[0]?.message;
      const content = (typeof msg?.content === "string" && msg.content.trim())
        ? msg.content.trim()
        : (typeof msg?.reasoning === "string" ? msg.reasoning.trim() : "");
      const parsed = looseParseJson(content);

      if (parsed && typeof parsed.summary === "string" && parsed.summary.trim()) {
        console.log(`[LLMOrchestrator] OpenRouter ${modelId} thành công sinh JSON analysis!`);
        return normalizeAnalysis(parsed, filename);
      }

      // Nếu model trả về văn bản tóm tắt markdown thay vì JSON, tự động bao bọc an toàn:
      if (content.length > 40) {
        console.log(`[LLMOrchestrator] OpenRouter ${modelId} trả về văn bản tóm tắt markdown, tự động chuẩn hóa cấu trúc.`);
        return {
          summary: content,
          extractedText: filename,
          quiz: [],
          mindmap: { id: "root", label: filename, children: [] },
        };
      }

      console.warn(`[LLMOrchestrator] OpenRouter ${modelId} trả về phản hồi quá ngắn hoặc không hợp lệ.`);
    } catch (e: any) {
      console.warn(`[LLMOrchestrator] Lỗi kết nối OpenRouter (${modelId}):`, e?.message || e);
    }
  }

  return null;
}

/**
 * Điều phối sinh phân tích tài liệu qua ProviderRouter:
 * - TEXT-ONLY: Local → OpenRouter → Gemini
 * - VISION (fileData/inlineData): Gemini bắt buộc
 */
export async function generateAnalysisWithFallback(input: AnalysisInput): Promise<AnalysisOutput> {
  const { filename, textContent, fileData, inlineData } = input;
  const promptMessage = buildFileAnalysisPrompt(filename, !!textContent);

  // ── VISION path: bắt buộc Gemini vì chỉ nó có multimodal ────────────────
  if (fileData || inlineData) {
    if (!hasApiKey()) {
      throw new Error("Cần GEMINI_API_KEY để xử lý ảnh/PDF scan.");
    }

    let contentsPayload: any[];
    if (fileData) {
      contentsPayload = [{ fileData }, promptMessage];
    } else {
      contentsPayload = [{ inlineData }, promptMessage];
    }

    try {
      const text = await geminiLimiter.run(async () => {
        const response = await generateContentWithModelFallback(
          GEMINI_MODEL,
          GEMINI_FALLBACK_MODELS,
          {
            contents: contentsPayload,
            config: {
              responseMimeType: "application/json",
              responseSchema: FILE_ANALYSIS_RESPONSE_SCHEMA,
              temperature: 0.3,
            },
          }
        );
        return response.text || "";
      });

      const parsed = looseParseJson(text);
      if (parsed) return normalizeAnalysis(parsed, filename);
    } catch (err: any) {
      const rl = isRateLimitError(err);
      recordError("gemini", rl);
      throw new Error(friendlyGeminiError(err));
    }

    throw new Error("Gemini không trả về kết quả hợp lệ cho tài liệu vision.");
  }

  // ── TEXT-ONLY path: ưu tiên local → fallback cloud ───────────────────────
  const fullPrompt = `${promptMessage}\n\nNội dung văn bản:\n${textContent || ""}`;

  try {
    const result = await routeTextTask("TEXT_SUMMARY", fullPrompt, { jsonOutput: true });
    const parsed = looseParseJson(result.text);

    if (parsed && typeof parsed.summary === "string" && parsed.summary.trim()) {
      console.log(`[LLMOrchestrator] ✓ Analysis via ${result.provider} (${result.model})`);
      return normalizeAnalysis(parsed, filename);
    }

    // Model trả về text tóm tắt thay vì JSON
    if (result.text.length > 40) {
      console.log(`[LLMOrchestrator] ${result.provider} trả văn bản, tự chuẩn hóa.`);
      return {
        summary: result.text,
        extractedText: textContent || filename,
        quiz: [],
        mindmap: { id: "root", label: filename, children: [] },
      };
    }
  } catch (err: any) {
    console.error("[LLMOrchestrator] routeTextTask failed:", err?.message);
    throw new Error(
      "Không thể phân tích tài liệu: local LLM không khả dụng và không có API fallback hợp lệ."
    );
  }

  throw new Error("Không nhận được phản hồi hợp lệ từ bất kỳ AI provider nào.");
}


const LANG_NAME_MAP: Record<string, string> = {
  vi: "Vietnamese",
  en: "English",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  fr: "French",
  de: "German",
  es: "Spanish",
  ru: "Russian",
  it: "Italian",
  pt: "Portuguese",
  th: "Thai",
  id: "Indonesian",
  ar: "Arabic",
  hi: "Hindi",
};

/**
 * Dịch văn bản thông minh bằng LLM (Gemini -> OpenRouter).
 * Tự động sửa lỗi nhận diện sai ngữ âm từ OCR / Speech-to-Text dựa trên ngữ cảnh,
 * bảo toàn 100% cấu trúc Markdown.
 */
export async function translateTextWithLlm(text: string, targetLang: string): Promise<string | null> {
  const cleanLang = targetLang.split("-")[0].toLowerCase();
  const targetLangName = LANG_NAME_MAP[cleanLang] || targetLang;

  const prompt = `You are a professional context-aware translator.
Translate the following text into ${targetLangName}.

CRITICAL INSTRUCTIONS:
1. Contextual Error Correction: The input text originates from Speech-to-Text (STT) audio transcripts or OCR and frequently contains phonetic mishearings, acoustic errors, or typos. Intelligently infer the speaker's true intended words from the overall context and translate smoothly and accurately into ${targetLangName}.
2. Structural Integrity: Strictly preserve all Markdown formatting, headers (#, ##), numbered lists, bullet points, and paragraph breaks.
3. Clean Output: Return ONLY the translated Markdown. Do not include markdown code block backticks (\`\`\`markdown) or any conversational preamble/notes.

Text to translate:
${text}`;

  // 1. Thử Gemini trước
  if (hasApiKey()) {
    try {
      const res = await geminiLimiter.run(async () => {
        const response = await generateContentWithModelFallback(
          GEMINI_MODEL,
          GEMINI_FALLBACK_MODELS,
          { contents: prompt }
        );
        return response.text || "";
      });

      const clean = res.replace(/^```(?:markdown)?\s*/i, "").replace(/\s*```$/, "").trim();
      if (clean) return clean;
    } catch (err: any) {
      console.warn(`[LLMOrchestrator] Gemini translation failed, attempting OpenRouter:`, err?.message);
    }
  }

  // 2. Thử OpenRouter Fallback
  if (OPENROUTER_API_KEY) {
    for (const model of OPENROUTER_MODELS) {
      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "WorkNote App",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
          }),
        });

        if (!res.ok) continue;
        const data: any = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content && typeof content === "string") {
          const clean = content.replace(/^```(?:markdown)?\s*/i, "").replace(/\s*```$/, "").trim();
          if (clean) return clean;
        }
      } catch (e: any) {
        console.warn(`[LLMOrchestrator] OpenRouter ${model} translation failed:`, e?.message);
      }
    }
  }

  return null;
}

