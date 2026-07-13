import { Router } from "express";

const router = Router();

/**
 * Phụ đề real-time KHÔNG dùng Gemini (tốn token + đụng giới hạn 5 lượt/phút).
 * Dùng endpoint dịch miễn phí của Google (translate_a/single) — nhanh, free,
 * không cần API key. Trả về cặp {src, dst} căn theo từng câu để phụ đề song
 * ngữ khớp dòng chính xác.
 */

// Chia transcript thành đoạn nhỏ để mỗi request GET không vượt giới hạn độ dài URL.
function chunkText(text: string, max = 1000): string[] {
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

async function gtxTranslate(text: string, target: string): Promise<{ src: string; dst: string }[]> {
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(target)}` +
    `&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    },
  });
  if (!res.ok) throw new Error(`translate ${res.status}`);
  const data: any = await res.json();
  const pairs: { src: string; dst: string }[] = [];
  for (const seg of data?.[0] || []) {
    const dst = String(seg?.[0] ?? "").trim();
    const src = String(seg?.[1] ?? "").trim();
    if (src || dst) pairs.push({ src, dst });
  }
  return pairs;
}

// Dịch theo DÒNG, giữ nguyên cấu trúc (heading/bullet/đoạn) cho tài liệu.
// Dòng trống được giữ nguyên; dòng có chữ được dịch song song (giới hạn đồng thời).
async function translateLinesPreserving(lines: string[], target: string): Promise<string[]> {
  const out = new Array<string>(lines.length);
  const todo: number[] = [];
  lines.forEach((l, i) => {
    if (!l.trim()) out[i] = l;
    else todo.push(i);
  });
  let p = 0;
  const worker = async () => {
    while (p < todo.length) {
      const i = todo[p++];
      try {
        const pairs = await gtxTranslate(lines[i], target);
        out[i] = pairs.map((x) => x.dst).join(" ") || lines[i];
      } catch {
        out[i] = lines[i]; // giữ bản gốc nếu dịch lỗi
      }
    }
  };
  await Promise.all(Array.from({ length: 5 }, worker));
  return out;
}

router.post("/", async (req, res): Promise<any> => {
  try {
    const { text, targetLang, maxChars, granularity } = req.body || {};
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Thiếu nội dung cần dịch." });
    }
    const target = targetLang || "vi";
    // Phụ đề mặc định ~8k ký tự; tài liệu có thể yêu cầu nhiều hơn (tối đa 30k).
    const cap = Math.min(Number(maxChars) || 8000, 30000);
    const src = text.slice(0, cap);

    // Chế độ "line": dịch tài liệu giữ nguyên xuống dòng → trả translatedText.
    if (granularity === "line") {
      const translated = await translateLinesPreserving(src.split("\n"), target);
      const translatedText = translated.join("\n").trim();
      if (!translatedText) {
        return res.status(502).json({ error: "Không dịch được nội dung lúc này. Thử lại sau." });
      }
      return res.json({ success: true, translatedText });
    }

    // Mặc định: chế độ "sentence" cho phụ đề — trả cặp {src,dst} căn theo câu.
    const chunks = chunkText(src);
    const segments: { src: string; dst: string }[] = [];
    for (const c of chunks) {
      try {
        const pairs = await gtxTranslate(c, target);
        segments.push(...pairs);
      } catch {
        // bỏ qua đoạn lỗi, vẫn trả những đoạn đã dịch được
      }
    }
    if (!segments.length) {
      return res.status(502).json({ error: "Không dịch được phụ đề lúc này. Thử lại sau." });
    }
    return res.json({ success: true, segments });
  } catch {
    return res.status(502).json({ error: "Không dịch được nội dung lúc này. Thử lại sau." });
  }
});

export default router;
