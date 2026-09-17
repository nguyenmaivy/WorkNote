import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import type { NotebookSource } from "./notebookService.js";

export interface SearchSnippet {
  sourceId: string;
  title: string;
  snippet: string;
  score: number;
}

const STOP_WORDS = new Set([
  "và", "của", "là", "có", "được", "trong", "cho", "với", "một", "các", "này", "đó",
  "the", "a", "an", "is", "are", "was", "were", "in", "on", "at", "to", "for", "of", "and",
]);

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/\b[\wàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+\b/gu) || [])
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) || 0) + 1);
  }
  return tf;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [k, v] of a) {
    normA += v * v;
    if (b.has(k)) dot += v * (b.get(k) || 0);
  }
  for (const v of b.values()) normB += v * v;
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function extractSnippet(content: string, queryTokens: string[], maxLen = 280): string {
  const sentences = content.split(/(?<=[.!?。])\s+/);
  let best = content.slice(0, maxLen);
  let bestScore = 0;

  for (const sentence of sentences) {
    const st = new Set(tokenize(sentence));
    const score = queryTokens.filter((t) => st.has(t)).length;
    if (score > bestScore) {
      bestScore = score;
      best = sentence.length > maxLen ? sentence.slice(0, maxLen) + "…" : sentence;
    }
  }

  return best.trim() || content.slice(0, maxLen);
}

/**
 * In-memory retrieval: cosine similarity on bag-of-words vectors.
 * Adequate for prototype per spec (no external vector DB).
 */
export function searchSources(
  sources: NotebookSource[],
  query: string,
  limit = 5
): SearchSnippet[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const queryTf = termFrequency(queryTokens);

  const scored = sources
    .map((src) => {
      const docTf = termFrequency(tokenize(src.content));
      const score = cosineSimilarity(queryTf, docTf);
      return {
        sourceId: src.id,
        title: src.title,
        snippet: extractSnippet(src.content, queryTokens),
        score,
      };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

export function indexSourceMetadata(content: string): { tokenCount: number } {
  return { tokenCount: tokenize(content).length };
}

// ─── Đội 2: Hugging Face Semantic Vector Search (The Librarian) ───────────────

function getPythonExecutable(): string {
  const venvWin = path.join(process.cwd(), ".venv", "Scripts", "python.exe");
  if (fs.existsSync(venvWin)) return venvWin;
  const venvUnix = path.join(process.cwd(), ".venv", "bin", "python");
  if (fs.existsSync(venvUnix)) return venvUnix;
  return "python";
}

/**
 * Tìm kiếm tài liệu ngữ nghĩa bằng mô hình Hugging Face cục bộ (The Librarian).
 * Sử dụng mô hình paraphrase-multilingual-MiniLM-L12-v2 chạy offline 100% trên máy.
 * Nếu script Python chưa sẵn sàng hoặc gặp sự cố, tự động fallback về searchSources (TF-IDF).
 */
export async function searchSourcesSemantic(
  sources: NotebookSource[],
  query: string,
  limit = 5
): Promise<SearchSnippet[]> {
  if (!query.trim() || sources.length === 0) return [];

  const scriptPath = path.join(process.cwd(), "server", "python", "librarian_embed.py");
  if (!fs.existsSync(scriptPath)) {
    return searchSources(sources, query, limit);
  }

  const pythonBin = getPythonExecutable();

  return new Promise((resolve) => {
    let hasResolved = false;
    const timeout = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        console.warn("⚠️ Semantic embedding timed out (10s), falling back to Bag-of-Words.");
        resolve(searchSources(sources, query, limit));
      }
    }, 10000);

    try {
      const child = spawn(pythonBin, [scriptPath], {
        cwd: process.cwd(),
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("error", (err) => {
        if (!hasResolved) {
          hasResolved = true;
          clearTimeout(timeout);
          console.warn("⚠️ Python spawn error, fallback to Bag-of-Words:", err.message);
          resolve(searchSources(sources, query, limit));
        }
      });

      child.on("close", (code) => {
        if (hasResolved) return;
        hasResolved = true;
        clearTimeout(timeout);

        if (code !== 0) {
          console.warn(`⚠️ Python exited with code ${code}, fallback to Bag-of-Words. Stderr: ${stderr.slice(0, 200)}`);
          return resolve(searchSources(sources, query, limit));
        }

        try {
          // Trích xuất dòng JSON kết quả (dòng bắt đầu bằng {"success" hoặc chứa success)
          const jsonLine = stdout
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.startsWith("{") && line.endsWith("}"))
            .pop();

          if (!jsonLine) {
            console.warn("⚠️ No JSON line found in Python output, fallback to Bag-of-Words.");
            return resolve(searchSources(sources, query, limit));
          }

          const parsed = JSON.parse(jsonLine);
          if (parsed.success && Array.isArray(parsed.results) && parsed.results.length > 0) {
            return resolve(parsed.results);
          }

          resolve(searchSources(sources, query, limit));
        } catch (parseErr) {
          console.warn("⚠️ Failed to parse Python embedding output, fallback to Bag-of-Words.");
          resolve(searchSources(sources, query, limit));
        }
      });

      const payload = JSON.stringify({
        query: query.trim(),
        documents: sources.map((s) => ({
          id: s.id,
          title: s.title,
          content: s.content,
        })),
        limit,
      });

      child.stdin.write(payload, "utf-8");
      child.stdin.end();
    } catch (err: any) {
      if (!hasResolved) {
        hasResolved = true;
        clearTimeout(timeout);
        console.warn("⚠️ Unexpected error in searchSourcesSemantic:", err?.message);
        resolve(searchSources(sources, query, limit));
      }
    }
  });
}
