import type {
  NotebookPage,
  NotebookSource,
  NotebookPagesResponse,
  NotebookPageResponse,
  NotebookSourcesResponse,
  NotebookSourceResponse,
  NotebookChatResponse,
  NotebookSummaryResponse,
  NotebookQuizResponse,
  NotebookSearchResponse,
  ChatMessage,
} from "../types";

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

export const notebookApi = {
  async listPages(): Promise<NotebookPage[]> {
    const data = await request<NotebookPagesResponse>("/api/notebook/pages");
    return data.pages;
  },

  async getPage(id: string): Promise<NotebookPage> {
    const data = await request<NotebookPageResponse>(`/api/notebook/pages/${id}`);
    return data.page;
  },

  async createPage(payload: { title: string; content?: string; sourceIds?: string[] }): Promise<NotebookPage> {
    const data = await request<NotebookPageResponse>("/api/notebook/pages", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return data.page;
  },

  async updatePage(
    id: string,
    payload: Partial<Pick<NotebookPage, "title" | "content" | "sourceIds" | "metadata">>
  ): Promise<NotebookPage> {
    const data = await request<NotebookPageResponse>(`/api/notebook/pages/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return data.page;
  },

  async deletePage(id: string): Promise<void> {
    await request(`/api/notebook/pages/${id}`, { method: "DELETE" });
  },

  async listSources(): Promise<NotebookSource[]> {
    const data = await request<NotebookSourcesResponse>("/api/notebook/sources");
    return data.sources;
  },

  async createSource(payload: {
    type: NotebookSource["type"];
    title: string;
    content: string;
    origin?: string;
  }): Promise<NotebookSource> {
    const data = await request<NotebookSourceResponse>("/api/notebook/sources", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return data.source;
  },

  async addSourceFromUrl(url: string, title?: string): Promise<NotebookSource> {
    const data = await request<NotebookSourceResponse>("/api/notebook/sources", {
      method: "POST",
      body: JSON.stringify({ url, title }),
    });
    return data.source;
  },

  async uploadSource(file: File, title?: string): Promise<NotebookSource> {
    const form = new FormData();
    form.append("file", file);
    if (title) form.append("title", title);

    const res = await fetch("/api/notebook/sources/upload", {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      throw new Error(errBody?.error || `Lỗi HTTP ${res.status}`);
    }
    const data: NotebookSourceResponse = await res.json();
    return data.source;
  },

  async deleteSource(id: string): Promise<void> {
    await request(`/api/notebook/sources/${id}`, { method: "DELETE" });
  },

  async search(query: string, sourceIds?: string[]): Promise<NotebookSearchResponse["snippets"]> {
    const data = await request<NotebookSearchResponse>("/api/notebook/search", {
      method: "POST",
      body: JSON.stringify({ query, sourceIds }),
    });
    return data.snippets;
  },

  async chat(
    messages: Pick<ChatMessage, "role" | "content">[],
    pageId?: string
  ): Promise<NotebookChatResponse> {
    return request<NotebookChatResponse>("/api/notebook/chat", {
      method: "POST",
      body: JSON.stringify({ messages, pageId }),
    });
  },

  async generateSummary(pageId: string): Promise<string> {
    const data = await request<NotebookSummaryResponse>("/api/notebook/summary", {
      method: "POST",
      body: JSON.stringify({ pageId }),
    });
    return data.summary;
  },

  async generateQuiz(pageId: string, count = 3): Promise<NotebookQuizResponse["quiz"]> {
    const data = await request<NotebookQuizResponse>("/api/notebook/quiz", {
      method: "POST",
      body: JSON.stringify({ pageId, count }),
    });
    return data.quiz;
  },
};
