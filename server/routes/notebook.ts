import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { UPLOAD_DIR, GEMINI_MODEL, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_LABEL } from "../config.js";
import {
  listPages,
  getPage,
  createPage,
  updatePage,
  deletePage,
  listSources,
  getSource,
  getSourcesByIds,
  createSource,
  deleteSource,
  buildNotebookContext,
  validatePageInput,
  validateSourceInput,
  type NotebookSourceType,
} from "../services/notebookService.js";
import { searchSources, searchSourcesSemantic } from "../services/embedService.js";
import {
  getAiClient,
  hasApiKey,
  withGeminiRetry,
  friendlyGeminiError,
} from "../services/geminiService.js";
import {
  getSafeGeminiPayload,
  extractYoutubeId,
  fetchYoutubeCaptions,
} from "../services/fileService.js";

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const suffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "notebook-" + suffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidId(id: string): boolean {
  return typeof id === "string" && ID_PATTERN.test(id);
}

async function extractTextFromFile(
  name: string,
  mimeType: string,
  buffer: Buffer
): Promise<string> {
  const base64 = buffer.toString("base64");
  const payload = await getSafeGeminiPayload(name, mimeType, base64, buffer);

  if (payload.type === "text") {
    return payload.textContent;
  }

  if (!hasApiKey()) {
    return `[Cần GEMINI_API_KEY để trích xuất nội dung từ file ${name}]`;
  }

  const ai = getAiClient();
  const response = await withGeminiRetry(() =>
    ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            payload.filePart,
            { text: "Trích xuất toàn bộ văn bản từ tài liệu này. Chỉ trả về nội dung văn bản, không giải thích." },
          ],
        },
      ],
      config: { temperature: 0.2 },
    })
  );
  return response.text || `[Không trích xuất được nội dung từ ${name}]`;
}

// ─── Pages ────────────────────────────────────────────────────────────────────

router.get("/pages", (_req, res) => {
  res.json({ success: true, pages: listPages() });
});

router.get("/pages/:id", (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid page id" });
  }
  const page = getPage(req.params.id);
  if (!page) return res.status(404).json({ error: "Page not found" });
  res.json({ success: true, page });
});

router.post("/pages", (req, res) => {
  const err = validatePageInput(req.body);
  if (err) return res.status(400).json({ error: err });
  if (!req.body.title?.trim()) {
    return res.status(400).json({ error: "title is required" });
  }
  const page = createPage({
    title: req.body.title,
    content: req.body.content,
    sourceIds: req.body.sourceIds,
  });
  res.status(201).json({ success: true, page });
});

router.put("/pages/:id", (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid page id" });
  }
  const err = validatePageInput(req.body);
  if (err) return res.status(400).json({ error: err });

  const page = updatePage(req.params.id, {
    title: req.body.title,
    content: req.body.content,
    sourceIds: req.body.sourceIds,
    metadata: req.body.metadata,
  });
  if (!page) return res.status(404).json({ error: "Page not found" });
  res.json({ success: true, page });
});

router.delete("/pages/:id", (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid page id" });
  }
  if (!deletePage(req.params.id)) {
    return res.status(404).json({ error: "Page not found" });
  }
  res.json({ success: true });
});

// ─── Sources ──────────────────────────────────────────────────────────────────

router.get("/sources", (_req, res) => {
  res.json({ success: true, sources: listSources() });
});

router.post("/sources", async (req, res): Promise<any> => {
  try {
    const { type, title, content, origin, url } = req.body;

    if (url && typeof url === "string" && url.startsWith("http")) {
      const youtubeId = extractYoutubeId(url);
      if (youtubeId) {
        const captions = await fetchYoutubeCaptions(youtubeId);
        const text = captions?.text || "[Không lấy được phụ đề YouTube]";
        const source = createSource({
          type: "youtube",
          title: title?.trim() || `YouTube ${youtubeId}`,
          content: text,
          origin: url,
        });
        return res.status(201).json({ success: true, source });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      try {
        const resp = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 WorkNote/1.0" },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!resp.ok) {
          return res.status(400).json({ error: `Không tải được URL: HTTP ${resp.status}` });
        }
        const buf = Buffer.from(await resp.arrayBuffer());
        if (buf.length > MAX_FILE_SIZE_BYTES) {
          return res.status(400).json({ error: `File từ URL vượt quá ${MAX_FILE_SIZE_LABEL}` });
        }
        const name = new URL(url).pathname.split("/").pop() || "url_source";
        const text = await extractTextFromFile(name, resp.headers.get("content-type") || "text/plain", buf);
        const source = createSource({
          type: "url",
          title: title?.trim() || name,
          content: text,
          origin: url,
        });
        return res.status(201).json({ success: true, source });
      } catch (e: any) {
        clearTimeout(timeoutId);
        return res.status(400).json({ error: e?.message || "Không tải được URL" });
      }
    }

    const err = validateSourceInput({ type, title, content });
    if (err) return res.status(400).json({ error: err });

    const source = createSource({
      type: type as NotebookSourceType,
      title,
      content,
      origin,
    });
    res.status(201).json({ success: true, source });
  } catch (error: any) {
    console.error("Error creating source:", error);
    res.status(500).json({ error: error?.message || "Failed to create source" });
  }
});

router.post("/sources/upload", upload.single("file"), async (req, res): Promise<any> => {
  let tempPath: string | null = null;
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Missing file" });
    }
    tempPath = req.file.path;
    const buffer = await fs.promises.readFile(tempPath);
    const name = req.body.title?.trim() || req.file.originalname;
    const text = await extractTextFromFile(req.file.originalname, req.file.mimetype, buffer);

    const source = createSource({
      type: "document",
      title: name,
      content: text,
      origin: req.file.originalname,
    });
    res.status(201).json({ success: true, source });
  } catch (error: any) {
    console.error("Error uploading source:", error);
    res.status(500).json({ error: error?.message || "Upload failed" });
  } finally {
    if (tempPath) {
      fs.promises.unlink(tempPath).catch(() => {});
    }
  }
});

router.delete("/sources/:id", (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid source id" });
  }
  if (!deleteSource(req.params.id)) {
    return res.status(404).json({ error: "Source not found" });
  }
  res.json({ success: true });
});

// ─── Search / Retrieval ─────────────────────────────────────────────────────────

router.post("/search", (req, res) => {
  const { query, sourceIds, limit } = req.body;
  if (!query || typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ error: "query is required" });
  }

  let pool = listSources();
  if (Array.isArray(sourceIds) && sourceIds.length > 0) {
    const validIds = sourceIds.filter((id: string) => isValidId(id));
    pool = getSourcesByIds(validIds);
  }

  const snippets = searchSources(pool, query.trim(), limit || 5);
  res.json({ success: true, snippets });
});

// ─── Context-aware Chat ───────────────────────────────────────────────────────

const CHAT_SYSTEM = `Bạn là VietLearn NotebookLM — trợ lý học tập dựa trên ghi chú và nguồn tài liệu của người dùng.
Hãy trả lời bằng Tiếng Việt, ngắn gọn, chính xác, dựa trên ngữ cảnh được cung cấp.
Nếu thông tin không có trong ngữ cảnh, hãy nói rõ và đưa gợi ý hợp lý.

NGỮ CẢNH:
"""
{{CONTEXT}}
"""`;

router.post("/chat", async (req, res): Promise<any> => {
  try {
    const { messages, pageId, query } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required" });
    }
    if (pageId && !isValidId(pageId)) {
      return res.status(400).json({ error: "Invalid pageId" });
    }

    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    const searchQuery = query || lastUserMsg?.content || "";

    let attachedSources = listSources();
    if (pageId) {
      const page = getPage(pageId);
      if (page) attachedSources = getSourcesByIds(page.sourceIds);
    }

    const snippets = searchQuery ? await searchSourcesSemantic(attachedSources, searchQuery, 5) : [];
    const snippetContext = snippets.map((s) => `[${s.title}]: ${s.snippet}`).join("\n");
    const baseContext = buildNotebookContext(pageId, searchQuery);
    const contextText = snippetContext
      ? `${baseContext}\n\n## Đoạn nguồn liên quan\n${snippetContext}`
      : baseContext;

    if (!hasApiKey()) {
      const lastContent = lastUserMsg?.content || "";
      return res.json({
        success: true,
        isDemo: true,
        reply: `(Demo) Bạn hỏi: "${lastContent}". Cấu hình GEMINI_API_KEY để nhận câu trả lời dựa trên ${snippets.length} đoạn nguồn tìm được.`,
        snippets,
      });
    }

    const ai = getAiClient();
    const systemInstruction = CHAT_SYSTEM.replace("{{CONTEXT}}", contextText);
    const contentsPayload = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const response = await withGeminiRetry(() =>
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: contentsPayload,
        config: { systemInstruction, temperature: 0.7 },
      })
    );

    res.json({
      success: true,
      reply: response.text || "Xin lỗi, chưa thể trả lời.",
      snippets,
    });
  } catch (error: any) {
    console.error("Notebook chat error:", error);
    res.status(500).json({ error: friendlyGeminiError(error) });
  }
});

// ─── Summary ──────────────────────────────────────────────────────────────────

router.post("/summary", async (req, res): Promise<any> => {
  try {
    const { pageId } = req.body;
    if (!pageId || !isValidId(pageId)) {
      return res.status(400).json({ error: "Valid pageId is required" });
    }
    const page = getPage(pageId);
    if (!page) return res.status(404).json({ error: "Page not found" });

    const attached = getSourcesByIds(page.sourceIds);
    const context = [
      `Ghi chú: ${page.title}\n${page.content}`,
      ...attached.map((s) => `Nguồn ${s.title}:\n${s.content.slice(0, 3000)}`),
    ].join("\n\n");

    if (!hasApiKey()) {
      return res.json({
        success: true,
        isDemo: true,
        summary: `### Tóm tắt (Demo): ${page.title}\n\nĐây là bản tóm tắt mẫu. Cấu hình GEMINI_API_KEY để AI tóm tắt ${attached.length + 1} nguồn nội dung thực tế.`,
      });
    }

    const ai = getAiClient();
    const response = await withGeminiRetry(() =>
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Tóm tắt nội dung học tập sau bằng Tiếng Việt, dùng Markdown với bullet points rõ ràng:\n\n${context}`,
              },
            ],
          },
        ],
        config: { temperature: 0.5 },
      })
    );

    res.json({ success: true, summary: response.text || "Không tạo được tóm tắt." });
  } catch (error: any) {
    console.error("Notebook summary error:", error);
    res.status(500).json({ error: friendlyGeminiError(error) });
  }
});

// ─── Quiz ─────────────────────────────────────────────────────────────────────

router.post("/quiz", async (req, res): Promise<any> => {
  try {
    const { pageId, count } = req.body;
    if (!pageId || !isValidId(pageId)) {
      return res.status(400).json({ error: "Valid pageId is required" });
    }
    const page = getPage(pageId);
    if (!page) return res.status(404).json({ error: "Page not found" });

    const attached = getSourcesByIds(page.sourceIds);
    const context = [
      `Ghi chú: ${page.title}\n${page.content}`,
      ...attached.map((s) => `Nguồn ${s.title}:\n${s.content.slice(0, 3000)}`),
    ].join("\n\n");
    const numQuestions = Math.min(Math.max(Number(count) || 3, 1), 10);

    if (!hasApiKey()) {
      return res.json({
        success: true,
        isDemo: true,
        quiz: [
          {
            id: "demo-q1",
            question: `Câu hỏi demo về "${page.title}"?`,
            options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
            correctAnswer: "Đáp án A",
            explanation: "Đây là câu hỏi mẫu trong chế độ Demo.",
          },
        ],
      });
    }

    const ai = getAiClient();
    const response = await withGeminiRetry(() =>
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Tạo ${numQuestions} câu hỏi trắc nghiệm từ nội dung sau. Trả về JSON array với các field: id, question, options (4 phần tử), correctAnswer, explanation.\n\n${context}`,
              },
            ],
          },
        ],
        config: {
          temperature: 0.6,
          responseMimeType: "application/json",
        },
      })
    );

    let quiz: Array<{
      id: string;
      question: string;
      options: string[];
      correctAnswer: string;
      explanation: string;
    }> = [];
    try {
      const parsed = JSON.parse(response.text || "[]");
      if (Array.isArray(parsed)) {
        quiz = parsed;
      } else if (parsed && Array.isArray(parsed.quiz)) {
        quiz = parsed.quiz;
      }
    } catch {
      quiz = [];
    }

    res.json({ success: true, quiz });
  } catch (error: any) {
    console.error("Notebook quiz error:", error);
    res.status(500).json({ error: friendlyGeminiError(error) });
  }
});

export default router;
