import { randomUUID } from "crypto";

// ─── In-memory store (prototype per spec) ─────────────────────────────────────

export type NotebookSourceType = "document" | "url" | "transcript" | "youtube" | "text";

export interface NotebookSource {
  id: string;
  type: NotebookSourceType;
  title: string;
  content: string;
  origin?: string;
  tokenCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotebookPage {
  id: string;
  title: string;
  content: string;
  sourceIds: string[];
  metadata?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

const pages = new Map<string, NotebookPage>();
const sources = new Map<string, NotebookSource>();

function nowIso(): string {
  return new Date().toISOString();
}

function countTokens(text: string): number {
  return (text.toLowerCase().match(/\b\w+\b/g) || []).length;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validatePageInput(input: Partial<NotebookPage>): string | null {
  if (input.title !== undefined && (typeof input.title !== "string" || !input.title.trim())) {
    return "title must be a non-empty string";
  }
  if (input.content !== undefined && typeof input.content !== "string") {
    return "content must be a string";
  }
  if (input.sourceIds !== undefined && !Array.isArray(input.sourceIds)) {
    return "sourceIds must be an array";
  }
  return null;
}

export function validateSourceInput(input: {
  type?: string;
  title?: string;
  content?: string;
}): string | null {
  const validTypes: NotebookSourceType[] = ["document", "url", "transcript", "youtube", "text"];
  if (!input.type || !validTypes.includes(input.type as NotebookSourceType)) {
    return `type must be one of: ${validTypes.join(", ")}`;
  }
  if (!input.title || typeof input.title !== "string" || !input.title.trim()) {
    return "title must be a non-empty string";
  }
  if (!input.content || typeof input.content !== "string" || !input.content.trim()) {
    return "content must be a non-empty string";
  }
  return null;
}

// ─── Pages CRUD ───────────────────────────────────────────────────────────────

export function listPages(): NotebookPage[] {
  return Array.from(pages.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getPage(id: string): NotebookPage | undefined {
  return pages.get(id);
}

export function createPage(data: { title: string; content?: string; sourceIds?: string[] }): NotebookPage {
  const ts = nowIso();
  const page: NotebookPage = {
    id: randomUUID(),
    title: data.title.trim(),
    content: data.content?.trim() || "",
    sourceIds: data.sourceIds || [],
    createdAt: ts,
    updatedAt: ts,
  };
  pages.set(page.id, page);
  return page;
}

export function updatePage(
  id: string,
  data: Partial<Pick<NotebookPage, "title" | "content" | "sourceIds" | "metadata">>
): NotebookPage | null {
  const existing = pages.get(id);
  if (!existing) return null;

  const updated: NotebookPage = {
    ...existing,
    ...(data.title !== undefined ? { title: data.title.trim() } : {}),
    ...(data.content !== undefined ? { content: data.content } : {}),
    ...(data.sourceIds !== undefined ? { sourceIds: data.sourceIds } : {}),
    ...(data.metadata !== undefined ? { metadata: data.metadata } : {}),
    updatedAt: nowIso(),
  };
  pages.set(id, updated);
  return updated;
}

export function deletePage(id: string): boolean {
  return pages.delete(id);
}

// ─── Sources CRUD ─────────────────────────────────────────────────────────────

export function listSources(): NotebookSource[] {
  return Array.from(sources.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getSource(id: string): NotebookSource | undefined {
  return sources.get(id);
}

export function getSourcesByIds(ids: string[]): NotebookSource[] {
  return ids.map((id) => sources.get(id)).filter((s): s is NotebookSource => !!s);
}

export function createSource(data: {
  type: NotebookSourceType;
  title: string;
  content: string;
  origin?: string;
}): NotebookSource {
  const ts = nowIso();
  const source: NotebookSource = {
    id: randomUUID(),
    type: data.type,
    title: data.title.trim(),
    content: data.content.trim(),
    origin: data.origin,
    tokenCount: countTokens(data.content),
    createdAt: ts,
    updatedAt: ts,
  };
  sources.set(source.id, source);
  return source;
}

export function deleteSource(id: string): boolean {
  const deleted = sources.delete(id);
  if (deleted) {
    for (const page of pages.values()) {
      if (page.sourceIds.includes(id)) {
        page.sourceIds = page.sourceIds.filter((sid) => sid !== id);
        page.updatedAt = nowIso();
      }
    }
  }
  return deleted;
}

// ─── Context assembly ─────────────────────────────────────────────────────────

export function buildNotebookContext(pageId?: string, extraQuery?: string): string {
  const parts: string[] = [];

  if (pageId) {
    const page = pages.get(pageId);
    if (page) {
      parts.push(`## Ghi chú notebook: ${page.title}\n${page.content}`);
      const attached = getSourcesByIds(page.sourceIds);
      for (const src of attached) {
        parts.push(`## Nguồn đính kèm: ${src.title}\n${src.content.slice(0, 4000)}`);
      }
    }
  }

  if (extraQuery) {
    parts.push(`## Truy vấn người dùng\n${extraQuery}`);
  }

  return parts.join("\n\n") || "Không có nội dung notebook nào.";
}

/** Reset store — for tests only */
export function _resetStoreForTests(): void {
  pages.clear();
  sources.clear();
}
