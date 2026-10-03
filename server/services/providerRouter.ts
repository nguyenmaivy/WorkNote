/**
 * providerRouter.ts
 * ─────────────────────────────────────────────────────────
 * Smart task routing: chọn đúng AI provider cho đúng task,
 * tự động rotate khi quota hết, fallback theo thứ tự ưu tiên.
 *
 * Task → Provider mapping (ưu tiên free/nhanh trước):
 *  - TEXT_SUMMARY  : Local → OpenRouter → Gemini
 *  - CHAT          : Local → OpenRouter → Gemini
 *  - QUIZ          : Local → OpenRouter → Gemini
 *  - TRANSLATION   : Gemini → OpenRouter
 *  - VISION        : Gemini (duy nhất hỗ trợ)
 *  - STT           : Groq (Whisper free) → Gemini
 */

import {
  ALLOW_CLOUD_LLM_FALLBACK,
  GEMINI_MODEL,
  GROQ_API_KEY,
  LOCAL_LLM_API_KEY,
  LOCAL_LLM_BASE_URL,
  LOCAL_LLM_CONNECT_TIMEOUT_MS,
  LOCAL_LLM_ENABLED,
  LOCAL_LLM_MAX_INPUT_CHARS,
  LOCAL_LLM_MODEL,
  LOCAL_LLM_TIMEOUT_MS,
  OPENROUTER_API_KEY,
  OPENROUTER_MODELS,
} from "../config.js";
import {
  hasApiKey,
  geminiLimiter,
  generateContentWithModelFallback,
  GEMINI_FALLBACK_MODELS,
  friendlyGeminiError,
} from "./geminiService.js";
import {
  isAvailable,
  recordCall,
  recordSuccess,
  recordError,
  isRateLimitError,
  type ProviderId,
} from "./rateLimitTracker.js";

// ─── Task types ───────────────────────────────────────────────────────────────

export type TaskType =
  | "TEXT_SUMMARY"   // Tóm tắt tài liệu text
  | "CHAT"           // Chat Q&A từ nguồn tài liệu
  | "QUIZ"           // Tạo câu hỏi trắc nghiệm
  | "TRANSLATION"    // Dịch văn bản
  | "VISION"         // OCR ảnh / PDF scan (chỉ Gemini)
  | "STT";           // Speech-To-Text (Groq Whisper ưu tiên)

export interface RoutedRequest {
  task: TaskType;
  /** Prompt đầy đủ gửi tới LLM (chỉ cho text tasks) */
  prompt?: string;
  /** Payload Gemini-format (cho VISION) */
  geminiPayload?: any;
  /** Yêu cầu JSON output */
  jsonOutput?: boolean;
  /** Schema JSON output của Gemini */
  responseSchema?: any;
}

export interface RoutedResponse {
  text: string;
  provider: ProviderId;
  model: string;
}

// ─── Provider order per task ──────────────────────────────────────────────────

/**
 * Thứ tự provider ưu tiên theo từng task.
 * "local" = OpenAI-compatible local server, các provider còn lại là cloud.
 */
const localFirstTextOrder: ProviderId[] = ALLOW_CLOUD_LLM_FALLBACK
  ? ["local", "openrouter", "gemini"]
  : ["local"];

const TASK_PROVIDER_ORDER: Record<TaskType, ProviderId[]> = {
  TEXT_SUMMARY: localFirstTextOrder,
  CHAT:         localFirstTextOrder,
  QUIZ:         localFirstTextOrder,
  TRANSLATION:  ["gemini", "openrouter"],
  VISION:       ["gemini"],            // bắt buộc Gemini
  STT:          ["groq", "gemini"],    // Groq Whisper nhanh hơn
};

export function getProviderOrder(task: TaskType): ProviderId[] {
  return [...TASK_PROVIDER_ORDER[task]];
}

// ─── Local OpenAI-compatible call ────────────────────────────────────────────

export async function callLocalLlm(prompt: string): Promise<string | null> {
  if (!LOCAL_LLM_ENABLED || !isAvailable("local")) return null;

  if (prompt.length > LOCAL_LLM_MAX_INPUT_CHARS && ALLOW_CLOUD_LLM_FALLBACK) {
    console.log(
      `[ProviderRouter] Prompt ${prompt.length} ký tự vượt ngưỡng local ` +
      `${LOCAL_LLM_MAX_INPUT_CHARS}; chuyển sang cloud fallback.`
    );
    return null;
  }

  const localPrompt = prompt.length > LOCAL_LLM_MAX_INPUT_CHARS
    ? `${prompt.slice(0, 4_000)}\n\n[...ngữ cảnh đã rút gọn...]\n\n${prompt.slice(-(LOCAL_LLM_MAX_INPUT_CHARS - 4_000))}`
    : prompt;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (LOCAL_LLM_API_KEY) headers.Authorization = `Bearer ${LOCAL_LLM_API_KEY}`;

  const probeController = new AbortController();
  const probeTimeout = setTimeout(() => probeController.abort(), LOCAL_LLM_CONNECT_TIMEOUT_MS);
  try {
    const probe = await fetch(`${LOCAL_LLM_BASE_URL}/models`, {
      method: "GET",
      headers,
      signal: probeController.signal,
    });
    if (!probe.ok) throw new Error(`health check HTTP ${probe.status}`);
  } catch (e: any) {
    recordError("local");
    console.warn(`[ProviderRouter] Local LLM chưa sẵn sàng (${e?.message}); thử cloud fallback.`);
    return null;
  } finally {
    clearTimeout(probeTimeout);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOCAL_LLM_TIMEOUT_MS);
  try {
    recordCall("local");
    const res = await fetch(`${LOCAL_LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: LOCAL_LLM_MODEL,
        messages: [{ role: "user", content: localPrompt }],
        temperature: 0.3,
        max_tokens: 2048,
        stream: false,
      }),
    });

    if (!res.ok) {
      recordError("local");
      console.warn(`[ProviderRouter] Local LLM HTTP ${res.status}`);
      return null;
    }

    const data: any = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content === "string" && content.trim().length > 0) {
      recordSuccess("local");
      console.log(`[ProviderRouter] Local LLM ${LOCAL_LLM_MODEL} thành công`);
      return content.trim();
    }

    recordError("local");
    return null;
  } catch (e: any) {
    recordError("local");
    const reason = e?.name === "AbortError" ? `timeout ${LOCAL_LLM_TIMEOUT_MS}ms` : e?.message;
    console.warn(`[ProviderRouter] Local LLM không khả dụng (${reason}); thử cloud fallback.`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── OpenRouter text call ──────────────────────────────────────────────────────

async function callOpenRouter(
  prompt: string,
  jsonOutput: boolean,
  systemPrompt?: string
): Promise<string | null> {
  if (!OPENROUTER_API_KEY || !isAvailable("openrouter")) return null;

  const messages: any[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  for (const modelId of OPENROUTER_MODELS) {
    try {
      recordCall("openrouter");
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
          messages,
          temperature: 0.3,
          max_tokens: jsonOutput ? 4096 : 2048,
        }),
      });

      if (res.status === 429) {
        recordError("openrouter", true);
        continue;
      }
      if (!res.ok) {
        recordError("openrouter");
        console.warn(`[ProviderRouter] OpenRouter ${modelId} HTTP ${res.status}`);
        continue;
      }

      const data: any = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (content && typeof content === "string" && content.trim().length > 10) {
        recordSuccess("openrouter");
        console.log(`[ProviderRouter] ✓ OpenRouter ${modelId} thành công`);
        return content.trim();
      }
    } catch (e: any) {
      const rl = isRateLimitError(e);
      recordError("openrouter", rl);
      console.warn(`[ProviderRouter] OpenRouter ${modelId} lỗi:`, e?.message);
    }
  }

  return null;
}

// ─── Groq LLM text call (Llama) ───────────────────────────────────────────────

async function callGroqLlm(prompt: string): Promise<string | null> {
  if (!GROQ_API_KEY || !isAvailable("groq")) return null;

  try {
    recordCall("groq");
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });

    if (res.status === 429) {
      recordError("groq", true);
      return null;
    }
    if (!res.ok) {
      recordError("groq");
      return null;
    }

    const data: any = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (content && typeof content === "string") {
      recordSuccess("groq");
      return content.trim();
    }
  } catch (e: any) {
    recordError("groq", isRateLimitError(e));
    console.warn("[ProviderRouter] Groq LLM error:", e?.message);
  }
  return null;
}

// ─── Gemini text call ─────────────────────────────────────────────────────────

async function callGemini(req: RoutedRequest): Promise<string | null> {
  if (!hasApiKey() || !isAvailable("gemini")) return null;

  try {
    recordCall("gemini");
    const payload = req.geminiPayload ?? {
      contents: req.prompt,
      config: {
        temperature: 0.3,
        ...(req.jsonOutput ? { responseMimeType: "application/json" } : {}),
        ...(req.responseSchema ? { responseSchema: req.responseSchema } : {}),
      },
    };

    const text = await geminiLimiter.run(async () => {
      const response = await generateContentWithModelFallback(
        GEMINI_MODEL,
        GEMINI_FALLBACK_MODELS,
        payload
      );
      return response.text || "";
    });

    if (text) {
      recordSuccess("gemini");
      return text;
    }
  } catch (e: any) {
    recordError("gemini", isRateLimitError(e));
    console.warn("[ProviderRouter] Gemini error:", e?.message?.slice(0, 150));
  }
  return null;
}

// ─── Main router ──────────────────────────────────────────────────────────────

/**
 * Route một request tới provider phù hợp theo task type.
 * Tự động fallback theo thứ tự ưu tiên khi provider không available.
 */
export async function routeRequest(req: RoutedRequest): Promise<RoutedResponse> {
  const order = TASK_PROVIDER_ORDER[req.task];

  for (const provider of order) {
    if (!isAvailable(provider)) {
      console.log(`[ProviderRouter] Skip "${provider}" (cooling down)`);
      continue;
    }

    let text: string | null = null;

    if (provider === "local" && req.prompt) {
      text = await callLocalLlm(req.prompt);
    } else if (provider === "openrouter" && req.prompt) {
      text = await callOpenRouter(req.prompt, req.jsonOutput ?? false);
    } else if (provider === "groq" && req.prompt) {
      text = await callGroqLlm(req.prompt);
    } else if (provider === "gemini") {
      text = await callGemini(req);
    }

    if (text) {
      return {
        text,
        provider,
        model: provider === "gemini"
          ? GEMINI_MODEL
          : provider === "local"
            ? LOCAL_LLM_MODEL
            : provider,
      };
    }
  }

  throw new Error(
    `[ProviderRouter] Tất cả providers đều không khả dụng cho task "${req.task}". ` +
    `Kiểm tra local LLM, API keys và quota.`
  );
}

/**
 * Wrapper tiện lợi cho text-only tasks (summary, chat, quiz)
 */
export async function routeTextTask(
  task: Exclude<TaskType, "VISION" | "STT">,
  prompt: string,
  opts?: { jsonOutput?: boolean; responseSchema?: any }
): Promise<RoutedResponse> {
  return routeRequest({
    task,
    prompt,
    jsonOutput: opts?.jsonOutput,
    responseSchema: opts?.responseSchema,
  });
}
