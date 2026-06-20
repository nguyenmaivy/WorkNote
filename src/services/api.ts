import type {
  ApiStatusResponse,
  ProcessFileResponse,
  ChatResponse,
  TTSResponse,
  TranslateResponse,
  LiveAudioTranslateResponse,
  AccentRegion,
} from "../types";

// ─── Base Fetch Helper ────────────────────────────────────────────────────────

/**
 * Fetch wrapper thống nhất xử lý lỗi cho tất cả API calls.
 * - Tự động set Content-Type: application/json
 * - Throw error có message rõ ràng nếu server trả lỗi
 */
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.error || `Lỗi HTTP ${res.status}`);
  }

  return res.json();
}

// ─── API Client ───────────────────────────────────────────────────────────────

export const apiClient = {
  /**
   * Kiểm tra trạng thái API key (demo hay live).
   */
  async checkApiStatus(): Promise<ApiStatusResponse> {
    return request<ApiStatusResponse>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [] }),
    });
  },

  /**
   * Xử lý file (PDF, ảnh, audio, video) — gửi dạng base64.
   */
  async processFile(payload: {
    name: string;
    mimeType: string;
    base64Data: string;
  }): Promise<ProcessFileResponse> {
    return request<ProcessFileResponse>("/api/process-file", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Xử lý file qua multipart FormData (multer).
   * Dùng khi muốn gửi file gốc thay vì base64 (tối ưu với file lớn).
   */
  async processFileMultipart(formData: FormData): Promise<ProcessFileResponse> {
    const res = await fetch("/api/process-file", {
      method: "POST",
      body: formData,
      // Không set Content-Type — browser tự thêm boundary
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      throw new Error(errBody?.error || `Lỗi HTTP ${res.status}`);
    }

    return res.json();
  },

  /**
   * Xử lý tài liệu từ URL (Google Drive, Dropbox, ...).
   */
  async processLink(url: string): Promise<ProcessFileResponse> {
    return request<ProcessFileResponse>("/api/process-link", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
  },

  /**
   * Gửi tin nhắn chat đến AI trợ lý.
   */
  async chat(
    messages: { role: string; content: string }[],
    contextFileText?: string
  ): Promise<ChatResponse> {
    return request<ChatResponse>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages, contextFileText }),
    });
  },

  /**
   * Chuyển đổi văn bản thành giọng nói (TTS) theo vùng miền.
   */
  async tts(text: string, region: AccentRegion): Promise<TTSResponse> {
    return request<TTSResponse>("/api/tts", {
      method: "POST",
      body: JSON.stringify({ text, region }),
    });
  },

  /**
   * Dịch văn bản sang ngôn ngữ đích.
   */
  async translate(text: string, targetLang: string): Promise<TranslateResponse> {
    return request<TranslateResponse>("/api/translate", {
      method: "POST",
      body: JSON.stringify({ text, targetLang }),
    });
  },

  /**
   * Dịch trực tiếp audio chunk (live translation).
   */
  async translateLiveAudio(
    base64Audio: string,
    mimeType: string,
    sourceLang: string,
    targetLang: string
  ): Promise<LiveAudioTranslateResponse> {
    return request<LiveAudioTranslateResponse>("/api/translate-live-audio", {
      method: "POST",
      body: JSON.stringify({ base64Audio, mimeType, sourceLang, targetLang }),
    });
  },
};
