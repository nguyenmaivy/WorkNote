import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import type { MindMapNodeData } from "./mindMapGenerationService.js";

// ─── JSON file persistence ─────────────────────────────────────────────────────

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
  mindmap?: MindMapNodeData;
  mindmapMeta?: {
    provider: string;
    model: string;
    sourceHash: string;
    generatedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "notebook.json");
const IS_TEST_RUNTIME =
  process.env.NODE_ENV === "test" ||
  !!process.env.NODE_TEST_CONTEXT ||
  process.argv.some((arg) => /server[\\/]tests[\\/]/i.test(arg));

function loadStore(): { pages: Record<string, NotebookPage>; sources: Record<string, NotebookSource> } {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) return { pages: {}, sources: {} };
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      pages: parsed.pages || {},
      sources: parsed.sources || {},
    };
  } catch {
    console.warn("[NotebookStore] Không đọc được notebook.json, khởi động với store rỗng.");
    return { pages: {}, sources: {} };
  }
}

const _initial = loadStore();
const pages = new Map<string, NotebookPage>(Object.entries(_initial.pages));
const sources = new Map<string, NotebookSource>(Object.entries(_initial.sources));

let _saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave(): void {
  if (IS_TEST_RUNTIME) return;
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    const data = {
      pages: Object.fromEntries(pages),
      sources: Object.fromEntries(sources),
    };
    fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8", (err) => {
      if (err) console.error("[NotebookStore] Lưu notebook.json thất bại:", err.message);
    });
  }, 300);
}

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
  if (input.mindmap !== undefined && (!input.mindmap || typeof input.mindmap.label !== "string")) {
    return "mindmap must contain a label";
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
  scheduleSave();
  return page;
}

export function updatePage(
  id: string,
  data: Partial<Pick<NotebookPage, "title" | "content" | "sourceIds" | "metadata" | "mindmap" | "mindmapMeta">>
): NotebookPage | null {
  const existing = pages.get(id);
  if (!existing) return null;

  const updated: NotebookPage = {
    ...existing,
    ...(data.title !== undefined ? { title: data.title.trim() } : {}),
    ...(data.content !== undefined ? { content: data.content } : {}),
    ...(data.sourceIds !== undefined ? { sourceIds: data.sourceIds } : {}),
    ...(data.metadata !== undefined ? { metadata: data.metadata } : {}),
    ...(data.mindmap !== undefined ? { mindmap: data.mindmap } : {}),
    ...(data.mindmapMeta !== undefined ? { mindmapMeta: data.mindmapMeta } : {}),
    updatedAt: nowIso(),
  };
  pages.set(id, updated);
  scheduleSave();
  return updated;
}

export function deletePage(id: string): boolean {
  const deleted = pages.delete(id);
  if (deleted) scheduleSave();
  return deleted;
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
  scheduleSave();
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
    scheduleSave();
  }
  return deleted;
}

// ─── Context assembly ─────────────────────────────────────────────────────────

/**
 * Chia nội dung dài thành các chunk theo đoạn văn, trả về phần liên quan nhất.
 * Mỗi chunk tối đa maxChunkLen ký tự, tổng context tối đa totalLimit ký tự.
 */
export function chunkContent(content: string, totalLimit = 6000, maxChunkLen = 1000): string {
  if (content.length <= totalLimit) return content;

  // Chia theo đoạn văn (2+ newlines) hoặc sentence
  const paragraphs = content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20);

  if (paragraphs.length === 0) return content.slice(0, totalLimit);

  // Lấy đoạn đầu, đoạn giữa, đoạn cuối để có coverage tốt hơn slice(0, N)
  const result: string[] = [];
  let totalLen = 0;

  // Luôn lấy đoạn đầu (intro/context)
  const head = paragraphs.slice(0, 3);
  // Luôn lấy đoạn cuối (conclusion/summary)
  const tail = paragraphs.slice(-2);
  // Phần giữa
  const middle = paragraphs.slice(3, -2);

  for (const p of [...head, ...middle, ...tail]) {
    const chunk = p.length > maxChunkLen ? p.slice(0, maxChunkLen) + "…" : p;
    if (totalLen + chunk.length > totalLimit) break;
    result.push(chunk);
    totalLen += chunk.length;
  }

  return result.join("\n\n");
}

export function buildNotebookContext(pageId?: string, extraQuery?: string): string {
  const parts: string[] = [];

  if (pageId) {
    const page = pages.get(pageId);
    if (page) {
      parts.push(`## Ghi chú notebook: ${page.title}\n${page.content}`);
      const attached = getSourcesByIds(page.sourceIds);
      for (const src of attached) {
        parts.push(`## Nguồn đính kèm: ${src.title}\n${chunkContent(src.content, 4000)}`);
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
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }
  pages.clear();
  sources.clear();
}
