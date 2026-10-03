import { createHash } from "crypto";
import { Router } from "express";
import { generateMindMap, type MindMapDocument } from "../services/mindMapGenerationService.js";
import { getPage, getSourcesByIds, updatePage } from "../services/notebookService.js";

const router = Router();
const MAX_CONTEXT_CHARS = 10_000_000;

function sourceHash(documents: MindMapDocument[]): string {
  const hash = createHash("sha256");
  for (const document of documents) {
    hash.update(document.id);
    hash.update(document.title);
    hash.update(document.content);
  }
  return hash.digest("hex").slice(0, 20);
}

router.post("/generate", async (req, res): Promise<any> => {
  try {
    const { scope } = req.body;
    let title = "Sơ đồ tư duy";
    let documents: MindMapDocument[] = [];
    let notebookPageId: string | null = null;

    if (scope === "library") {
      const incoming = Array.isArray(req.body.documents) ? req.body.documents : [];
      documents = incoming
        .filter((doc: any) => doc && typeof doc.content === "string" && doc.content.trim())
        .map((doc: any, index: number) => ({
          id: String(doc.id || `library-${index + 1}`).slice(0, 200),
          title: String(doc.title || `Tài liệu ${index + 1}`).slice(0, 300),
          content: doc.content,
        }));
      title = String(req.body.title || documents[0]?.title || title).slice(0, 300);
    } else if (scope === "notebook") {
      const pageId = typeof req.body.pageId === "string" ? req.body.pageId : "";
      const page = getPage(pageId);
      if (!page) return res.status(404).json({ error: "Không tìm thấy notebook." });

      notebookPageId = page.id;
      title = page.title;
      documents = getSourcesByIds(page.sourceIds).map((source) => ({
        id: source.id,
        title: source.title,
        content: source.content,
      }));
      if (page.content.trim()) {
        documents.unshift({ id: page.id, title: `${page.title} - ghi chú`, content: page.content });
      }
    } else {
      return res.status(400).json({ error: "scope phải là library hoặc notebook." });
    }

    if (documents.length === 0) {
      return res.status(400).json({ error: "Nguồn đã chọn chưa có nội dung văn bản." });
    }
    const totalChars = documents.reduce((sum, document) => sum + document.content.length, 0);
    if (totalChars > MAX_CONTEXT_CHARS) {
      return res.status(413).json({
        error: "Tổng nội dung vượt quá 10 triệu ký tự. Hãy chia thành nhiều notebook nhỏ hơn.",
      });
    }

    const hash = sourceHash(documents);
    const result = await generateMindMap(title, documents);

    if (notebookPageId) {
      updatePage(notebookPageId, {
        mindmap: result.mindmap,
        mindmapMeta: {
          provider: result.provider,
          model: result.model,
          sourceHash: hash,
          generatedAt: new Date().toISOString(),
        },
      });
    }

    res.json({ success: true, sourceHash: hash, ...result });
  } catch (error: any) {
    console.error("Mindmap generation error:", error);
    res.status(500).json({ error: error?.message || "Không tạo được sơ đồ tư duy." });
  }
});

export default router;
