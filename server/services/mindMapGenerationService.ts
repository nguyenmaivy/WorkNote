import { routeTextTask, type RoutedResponse } from "./providerRouter.js";
import { looseParseJson } from "./fileService.js";

export interface MindMapNodeData {
  id: string;
  label: string;
  children?: MindMapNodeData[];
  sourceIds?: string[];
}

export interface MindMapDocument {
  id: string;
  title: string;
  content: string;
}

export interface MindMapGenerationResult {
  mindmap: MindMapNodeData;
  provider: RoutedResponse["provider"];
  model: string;
  stats: {
    sourceCount: number;
    totalChunks: number;
    analyzedChunks: number;
    sampled: boolean;
  };
}

type TextGenerator = (
  task: "TEXT_SUMMARY",
  prompt: string,
  opts: { jsonOutput: true }
) => Promise<RoutedResponse>;

const CHUNK_TARGET_CHARS = 9_000;
const MAX_ANALYZED_CHUNKS = 36;
const REDUCE_BATCH_SIZE = 6;

export function splitMindMapContent(content: string, targetChars = CHUNK_TARGET_CHARS): string[] {
  const clean = content.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];

  const blocks = clean
    .split(/(?=^#{1,6}\s)|\n{2,}/m)
    .map((block) => block.trim())
    .filter(Boolean)
    .flatMap((block) => {
      if (block.length <= targetChars) return [block];
      const parts: string[] = [];
      for (let start = 0; start < block.length; start += targetChars) {
        parts.push(block.slice(start, start + targetChars));
      }
      return parts;
    });

  const chunks: string[] = [];
  let current = "";
  for (const block of blocks) {
    if (current && current.length + block.length + 2 > targetChars) {
      chunks.push(current);
      current = block;
    } else {
      current = current ? `${current}\n\n${block}` : block;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function evenlySample<T>(items: T[], limit: number): T[] {
  if (items.length <= limit) return items;
  if (limit <= 1) return [items[0]];
  return Array.from({ length: limit }, (_, index) => {
    const sourceIndex = Math.round((index * (items.length - 1)) / (limit - 1));
    return items[sourceIndex];
  });
}

function normalizeSourceIds(value: unknown, fallback: string[]): string[] {
  const ids = Array.isArray(value)
    ? value.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];
  return Array.from(new Set(ids.length > 0 ? ids : fallback));
}

function sanitizeNode(
  raw: any,
  fallbackLabel: string,
  fallbackSourceIds: string[],
  depth = 0
): MindMapNodeData {
  const label = typeof raw?.label === "string" && raw.label.trim()
    ? raw.label.trim().slice(0, 180)
    : fallbackLabel;
  const children = depth < 3 && Array.isArray(raw?.children)
    ? raw.children
        .slice(0, 10)
        .map((child: any, index: number) =>
          sanitizeNode(child, `Ý ${index + 1}`, fallbackSourceIds, depth + 1)
        )
    : [];

  return {
    id: "pending",
    label,
    sourceIds: normalizeSourceIds(raw?.sourceIds, fallbackSourceIds),
    ...(children.length > 0 ? { children } : {}),
  };
}

function assignStableIds(root: MindMapNodeData): MindMapNodeData {
  const visit = (node: MindMapNodeData, path: number[]): MindMapNodeData => ({
    ...node,
    id: path.length === 0 ? "root" : `node_${path.join("_")}`,
    ...(node.children
      ? { children: node.children.map((child, index) => visit(child, [...path, index + 1])) }
      : {}),
  });
  return visit(root, []);
}

function branchesFromResponse(rawText: string, sourceIds: string[]): MindMapNodeData[] {
  const parsed = looseParseJson(rawText);
  const rawBranches = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.branches)
      ? parsed.branches
      : Array.isArray(parsed?.mindmap?.children)
        ? parsed.mindmap.children
        : [];

  return rawBranches
    .slice(0, 10)
    .map((branch: any, index: number) => sanitizeNode(branch, `Chủ đề ${index + 1}`, sourceIds));
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

export async function generateMindMap(
  title: string,
  documents: MindMapDocument[],
  generateText: TextGenerator = routeTextTask
): Promise<MindMapGenerationResult> {
  const validDocuments = documents.filter((doc) => doc.content.trim().length > 0);
  if (validDocuments.length === 0) throw new Error("Không có nội dung để tạo sơ đồ tư duy.");

  const chunkGroups = validDocuments.map((document) => ({
    document,
    chunks: splitMindMapContent(document.content),
  }));
  const totalChunks = chunkGroups.reduce((sum, group) => sum + group.chunks.length, 0);
  const quotaBase = Math.max(1, Math.floor(MAX_ANALYZED_CHUNKS / chunkGroups.length));
  let quotaRemainder = Math.max(0, MAX_ANALYZED_CHUNKS - quotaBase * chunkGroups.length);
  const workItems = chunkGroups.flatMap(({ document, chunks }) => {
    const quota = quotaBase + (quotaRemainder-- > 0 ? 1 : 0);
    return evenlySample(chunks, quota).map((content, index) => ({ document, content, index }));
  });

  let lastProvider: RoutedResponse["provider"] = "local";
  let lastModel = "local";
  const partialTrees = await mapWithConcurrency(workItems, 2, async ({ document, content, index }) => {
    const prompt = `Bạn đang lập sơ đồ tư duy cho tài liệu "${document.title}".
Hãy phân tích phần ${index + 1} dưới đây và trả về JSON duy nhất:
{"branches":[{"label":"Ý chính","sourceIds":["${document.id}"],"children":[{"label":"Ý phụ","sourceIds":["${document.id}"]}]}]}
Yêu cầu: 2-6 nhánh có ý nghĩa, nhãn ngắn gọn, không sao chép nguyên đoạn, tối đa 3 tầng và giữ sourceIds.

NỘI DUNG:
${content}`;
    const response = await generateText("TEXT_SUMMARY", prompt, { jsonOutput: true });
    lastProvider = response.provider;
    lastModel = response.model;
    const branches = branchesFromResponse(response.text, [document.id]);
    return {
      label: `${document.title} - phần ${index + 1}`,
      sourceIds: [document.id],
      children: branches.length > 0 ? branches : [{
        id: "pending",
        label: content.slice(0, 120),
        sourceIds: [document.id],
      }],
    } satisfies Omit<MindMapNodeData, "id">;
  });

  let level: any[] = partialTrees;
  while (level.length > 1) {
    const batches: any[][] = [];
    for (let index = 0; index < level.length; index += REDUCE_BATCH_SIZE) {
      batches.push(level.slice(index, index + REDUCE_BATCH_SIZE));
    }

    level = await mapWithConcurrency(batches, 2, async (batch) => {
      const sourceIds = Array.from(new Set(batch.flatMap((node) => node.sourceIds || [])));
      const prompt = `Hợp nhất các dàn ý sau thành một sơ đồ tư duy mạch lạc.
Gộp nhánh trùng ý, giữ khác biệt giữa các nguồn và giữ sourceIds ở từng node.
Trả về JSON duy nhất dạng {"branches":[{"label":"...","sourceIds":["..."],"children":[]}]}.
Tối đa 8 nhánh chính, 3 tầng, nhãn ngắn gọn bằng Tiếng Việt.

DÀN Ý:
${JSON.stringify(batch)}`;
      const response = await generateText("TEXT_SUMMARY", prompt, { jsonOutput: true });
      lastProvider = response.provider;
      lastModel = response.model;
      const branches = branchesFromResponse(response.text, sourceIds);
      return {
        label: title,
        sourceIds,
        children: branches.length > 0 ? branches : batch,
      };
    });
  }

  const allSourceIds = validDocuments.map((doc) => doc.id);
  const onlyTree = level[0];
  const root = sanitizeNode(
    { label: title, sourceIds: allSourceIds, children: onlyTree?.children || partialTrees },
    title,
    allSourceIds
  );

  return {
    mindmap: assignStableIds(root),
    provider: lastProvider,
    model: lastModel,
    stats: {
      sourceCount: validDocuments.length,
      totalChunks,
      analyzedChunks: workItems.length,
      sampled: workItems.length < totalChunks,
    },
  };
}
