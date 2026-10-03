import type { MindMapGenerationResponse } from "../types";

async function generate(payload: unknown): Promise<MindMapGenerationResponse> {
  const response = await fetch("/api/mindmaps/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || `Lỗi HTTP ${response.status}`);
  }
  return response.json();
}

export const mindMapApi = {
  generateFromLibrary(file: { id: string; name: string; content: string }) {
    return generate({
      scope: "library",
      title: file.name,
      documents: [{ id: file.id, title: file.name, content: file.content }],
    });
  },

  generateFromNotebook(pageId: string) {
    return generate({ scope: "notebook", pageId });
  },
};
