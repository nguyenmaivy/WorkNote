import { Router } from "express";
import { GEMINI_MODEL, MAX_FILE_SIZE_BYTES } from "../config.js";
import { getAiClient, geminiLimiter, hasApiKey } from "../services/geminiService.js";
import {
  getSafeGeminiPayload,
  buildFileAnalysisPrompt,
  FILE_ANALYSIS_RESPONSE_SCHEMA,
} from "../services/fileService.js";

const router = Router();

// ─── POST /api/process-link ───────────────────────────────────────────────────
router.post("/", async (req, res): Promise<any> => {
  try {
    const { url } = req.body;
    if (!url || !url.startsWith("http")) {
      return res.status(400).json({ error: "Tham số URL không hợp lệ hoặc không bắt đầu bằng http/https" });
    }

    // Auto-convert cloud sharing links to direct download URLs
    let finalUrl = url;
    if (url.includes("drive.google.com")) {
      const match = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/) || url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
      if (match?.[1]) {
        finalUrl = `https://drive.google.com/uc?export=download&id=${match[1]}`;
        console.log(`Auto-resolved Google Drive link: ${finalUrl}`);
      }
    } else if (url.includes("dropbox.com")) {
      finalUrl = url.replace("dl=0", "dl=1").replace("www.dropbox.com", "dl.dropboxusercontent.com");
      console.log(`Auto-resolved Dropbox link: ${finalUrl}`);
    }

    // Extract filename from URL
    let name = "tai_lieu_tu_link";
    try {
      const parsedUrl = new URL(finalUrl);
      const segment = parsedUrl.pathname.substring(parsedUrl.pathname.lastIndexOf("/") + 1);
      name = segment?.includes(".") ? decodeURIComponent(segment) : parsedUrl.hostname + "_doc";
    } catch {
      name = "file_tu_url";
    }

    console.log(`Downloading: ${finalUrl}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let resFetch: Response;
    try {
      resFetch = await fetch(finalUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
          Accept: "*/*",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!resFetch.ok) throw new Error(`HTTP lỗi: ${resFetch.status}`);
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        error: `Không thể tải tệp từ liên kết. Lỗi: ${
          fetchErr.name === "AbortError" ? "Timeout 15s" : fetchErr.message
        }`,
      });
    }

    const contentLength = resFetch.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({ error: "Tệp tin liên kết quá lớn (tối đa 20MB)." });
    }

    const mimeType = resFetch.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await resFetch.arrayBuffer();

    if (arrayBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({ error: "Tệp tin tải về vượt quá giới hạn 20MB." });
    }

    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");
    const fileSize = buffer.length;

    console.log(`Downloaded: ${name} (${fileSize} bytes, ${mimeType})`);

    if (!hasApiKey()) {
      return res.json({
        success: true,
        isDemo: true,
        name,
        mimeType,
        size: fileSize,
        summary: `### Phân tích từ liên kết: ${name}\n\nChế độ Demo. Hãy cấu hình API Key để AI phân tích thực tế.`,
        extractedText: `Văn bản ghi nhận từ URL: ${url}.`,
        quiz: [],
        mindmap: { id: "root", label: name, children: [] },
      });
    }

    const ai = getAiClient();
    const payload = getSafeGeminiPayload(name, mimeType, base64Data, buffer);
    const promptMessage = buildFileAnalysisPrompt(name);

    const contentsPayload =
      payload.type === "multimodal"
        ? [payload.filePart, promptMessage]
        : [promptMessage + `\n\nNội dung văn bản:\n${payload.textContent}`];

    const parsedData = await geminiLimiter.run(async () => {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: contentsPayload,
        config: {
          responseMimeType: "application/json",
          responseSchema: FILE_ANALYSIS_RESPONSE_SCHEMA,
        },
      });
      return JSON.parse(response.text || "{}");
    });

    return res.json({ success: true, name, mimeType, size: fileSize, ...parsedData });
  } catch (error: any) {
    console.error("Error in /api/process-link:", error);
    res.status(500).json({ error: error.message || "Failed to process target link" });
  }
});

export default router;
