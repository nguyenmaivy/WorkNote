import { Router } from "express";
import { translateTextWithLlm } from "../services/llmOrchestrator.js";

const router = Router();

/**
 * Dịch thuật đa ngôn ngữ miễn phí, nhanh, không bắt buộc Gemini token/quota.
 * Sử dụng Google Translate API (client dict-chrome-ex) với cơ chế chunking thông minh
 * và fallback sang MyMemory API, bảo toàn cấu trúc dòng/markdown.
 */

// Chia transcript thành đoạn nhỏ theo câu cho phụ đề song ngữ
function chunkText(text: string, max = 1200): string[] {
  const out: string[] = [];
  let cur = "";
  for (const sentence of text.split(/(?<=[.!?…])\s+|\n+/)) {
    const piece = sentence.trim();
    if (!piece) continue;
    if ((cur + " " + piece).length > max) {
      if (cur) out.push(cur);
      cur = piece;
    } else {
      cur = cur ? cur + " " + piece : piece;
    }
  }
  if (cur) out.push(cur);
  return out;
}

// Chia tài liệu / tóm tắt theo đoạn văn bản (paragraph) để giữ nguyên format markdown
function splitIntoParagraphChunks(text: string, maxChunkLen = 1800): string[] {
  const paragraphs = text.split("\n\n");
  const chunks: string[] = [];
  let cur = "";

  for (const p of paragraphs) {
    if (!p.trim()) continue;
    if ((cur + "\n\n" + p).length <= maxChunkLen) {
      cur = cur ? cur + "\n\n" + p : p;
    } else {
      if (cur) chunks.push(cur);
      if (p.length > maxChunkLen) {
        // Đoạn văn quá dài -> bẻ theo dòng đơn
        const lines = p.split("\n");
        let lineCur = "";
        for (const line of lines) {
          if ((lineCur + "\n" + line).length <= maxChunkLen) {
            lineCur = lineCur ? lineCur + "\n" + line : line;
          } else {
            if (lineCur) chunks.push(lineCur);
            lineCur = line;
          }
        }
        cur = lineCur;
      } else {
        cur = p;
      }
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

// ─── Core Google Translate ──────────────────────────────────────────────────
async function fetchGoogleTranslate(text: string, target: string): Promise<{ fullDst: string; pairs: { src: string; dst: string }[] }> {
  const targetClean = target.split("-")[0].toLowerCase();
  
  // Endpoint 1: Google Translate (dict-chrome-ex)
  const url =
    `https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=auto&tl=${encodeURIComponent(targetClean)}` +
    `&dt=t&q=${encodeURIComponent(text)}`;
  
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "*/*",
    },
  });

  if (!res.ok) throw new Error(`Google translate status ${res.status}`);
  const data: any = await res.json();
  const pairs: { src: string; dst: string }[] = [];
  let fullDst = "";

  for (const seg of data?.[0] || []) {
    const dst = String(seg?.[0] ?? "");
    const src = String(seg?.[1] ?? "");
    fullDst += dst;
    if (src.trim() || dst.trim()) {
      pairs.push({ src: src.trim(), dst: dst.trim() });
    }
  }

  if (!fullDst.trim()) throw new Error("Empty translation returned from Google");
  return { fullDst, pairs };
}

// ─── Fallback: MyMemory API ─────────────────────────────────────────────────
async function fetchMyMemoryTranslate(text: string, target: string): Promise<string> {
  const targetClean = target.split("-")[0].toLowerCase();
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 500))}&langpair=auto|${encodeURIComponent(targetClean)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MyMemory status ${res.status}`);
  const data: any = await res.json();
  const translated = data?.responseData?.translatedText;
  if (!translated || typeof translated !== "string") throw new Error("MyMemory translation failed");
  return translated;
}

// Dịch một đoạn văn bản (với fallback)
async function translateChunkWithFallback(chunk: string, target: string): Promise<string> {
  try {
    const res = await fetchGoogleTranslate(chunk, target);
    return res.fullDst;
  } catch (err: any) {
    console.warn("Google translate failed for chunk, trying MyMemory fallback:", err?.message);
    try {
      return await fetchMyMemoryTranslate(chunk, target);
    } catch {
      throw new Error(`Không thể dịch đoạn văn bản sang ngôn ngữ '${target}'.`);
    }
  }
}

// ─── POST /api/subtitle-translate ─────────────────────────────────────────────
router.post("/", async (req, res): Promise<any> => {
  try {
    const { text, targetLang, maxChars, granularity } = req.body || {};
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Thiếu nội dung cần dịch." });
    }

    const target = targetLang || "en";
    const cap = Math.min(Number(maxChars) || 20000, 30000);
    const src = text.slice(0, cap);

    // Chế độ "line" (tài liệu / tóm tắt): bảo toàn format markdown, đoạn văn, bullet
    if (granularity === "line") {
      // 1. Ưu tiên dịch thông minh bằng LLM (tự sửa lỗi sai âm STT/OCR theo ngữ cảnh)
      try {
        const llmResult = await translateTextWithLlm(src, target);
        if (llmResult) {
          return res.json({ success: true, translatedText: llmResult, engine: "llm" });
        }
      } catch (err: any) {
        console.warn("[SubtitleTranslate] LLM translation failed, fallback to Google Translate:", err?.message);
      }

      // 2. Fallback sang Google Translate theo chunks đoạn văn (nhanh, miễn phí)
      const chunks = splitIntoParagraphChunks(src, 1800);
      const translatedChunks: string[] = [];

      for (const chunk of chunks) {
        if (!chunk.trim()) continue;
        const translated = await translateChunkWithFallback(chunk, target);
        translatedChunks.push(translated);
      }

      const translatedText = translatedChunks.join("\n\n").trim();
      if (!translatedText) {
        return res.status(502).json({ error: "Không dịch được nội dung lúc này. Thử lại sau." });
      }

      return res.json({ success: true, translatedText, engine: "fast" });
    }

    // Mặc định: chế độ "sentence" cho phụ đề — trả cặp {src, dst} căn theo câu
    const chunks = chunkText(src, 1200);
    const segments: { src: string; dst: string }[] = [];

    for (const c of chunks) {
      if (!c.trim()) continue;
      try {
        const { pairs } = await fetchGoogleTranslate(c, target);
        segments.push(...pairs);
      } catch (e: any) {
        console.warn("Subtitle translate error for chunk:", e?.message);
      }
    }

    if (!segments.length) {
      return res.status(502).json({ error: "Không dịch được phụ đề lúc này. Thử lại sau." });
    }

    return res.json({ success: true, segments });
  } catch (err: any) {
    console.error("Error in /api/subtitle-translate:", err);
    return res.status(502).json({ error: err?.message || "Không dịch được nội dung lúc này. Thử lại sau." });
  }
});

export default router;
