import { Router } from "express";
import { GEMINI_MODEL, MAX_FILE_SIZE_BYTES } from "../config.js";
import { getAiClient, geminiLimiter, hasApiKey, withGeminiRetry, friendlyGeminiError } from "../services/geminiService.js";
import {
  getSafeGeminiPayload,
  buildFileAnalysisPrompt,
  buildYoutubeAnalysisPrompt,
  buildCaptionAnalysisPrompt,
  fetchYoutubeCaptions,
  extractYoutubeId,
  FILE_ANALYSIS_RESPONSE_SCHEMA,
  looseParseJson,
  normalizeAnalysis,
} from "../services/fileService.js";

const router = Router();

// ─── POST /api/process-link ───────────────────────────────────────────────────
router.post("/", async (req, res): Promise<any> => {
  try {
    const { url } = req.body;
    if (!url || !url.startsWith("http")) {
      return res.status(400).json({ error: "Tham số URL không hợp lệ hoặc không bắt đầu bằng http/https" });
    }

    // ── YouTube pipeline: dán link → transcript → dịch Tiếng Việt → tóm tắt → note ──
    const youtubeId = extractYoutubeId(url);
    if (youtubeId) {
      return await handleYoutubeLink(youtubeId, res);
    }

    // Block các nền tảng streaming khác (chưa hỗ trợ lấy nội dung trực tiếp)
    const streamingDomains = ["soundcloud.com", "spotify.com", "tiktok.com", "facebook.com", "instagram.com", "twitter.com", "x.com"];
    if (streamingDomains.some(d => url.includes(d))) {
      return res.status(400).json({
        error: "Hiện chỉ hỗ trợ YouTube và link file trực tiếp. Với SoundCloud/Spotify/TikTok... hãy tải file về máy (MP3/MP4) rồi upload, hoặc dùng link Google Drive/Dropbox công khai.",
      });
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
          Referer: new URL(finalUrl).origin,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!resFetch.ok) {
        const hints: Record<number, string> = {
          403: "Server từ chối truy cập (403). Hãy thử link Google Drive/Dropbox công khai hoặc tải file lên trực tiếp.",
          404: "Không tìm thấy tệp tại đường dẫn này (404). Kiểm tra lại link.",
          401: "Link yêu cầu đăng nhập (401). Dùng link công khai không cần xác thực.",
          429: "Quá nhiều yêu cầu đến server (429). Thử lại sau vài giây.",
        };
        throw new Error(hints[resFetch.status] || `Server trả về lỗi ${resFetch.status}.`);
      }
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        error: fetchErr.name === "AbortError"
          ? "Hết thời gian tải (15 giây). Thử file nhỏ hơn hoặc đường dẫn khác."
          : fetchErr.message,
      });
    }

    const contentLength = resFetch.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({ error: "Tệp tin liên kết quá lớn (tối đa 20MB)." });
    }

    const mimeType = resFetch.headers.get("content-type") || "application/octet-stream";

    // Detect HTML pages (streaming sites, login walls, etc.)
    if (mimeType.includes("text/html")) {
      return res.status(400).json({
        error: "Link này trỏ đến trang web, không phải file trực tiếp. Cần link tải file .mp3/.pdf/.docx/... trực tiếp (Google Drive: nút 'Tải xuống', Dropbox: đổi ?dl=0 → ?dl=1).",
      });
    }

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
    const payload = await getSafeGeminiPayload(name, resFetch.headers.get("content-type") || "application/octet-stream", base64Data, buffer);
    const promptMessage = buildFileAnalysisPrompt(name);

    const contentsPayload =
      payload.type === "multimodal"
        ? [payload.filePart, promptMessage]
        : [promptMessage + `\n\nNội dung văn bản:\n${payload.textContent}`];

    const rawText = await geminiLimiter.run(() =>
      withGeminiRetry(async () => {
        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: contentsPayload,
          config: {
            responseMimeType: "application/json",
            responseSchema: FILE_ANALYSIS_RESPONSE_SCHEMA,
          },
        });
        return response.text || "";
      })
    );

    const parsedData = looseParseJson(rawText);
    if (!parsedData) {
      return res.status(400).json({
        error: "Nội dung tệp quá dài hoặc phức tạp để phân tích trọn vẹn. Hãy thử tệp ngắn gọn hơn.",
      });
    }

    return res.json({ success: true, name, mimeType, size: fileSize, ...normalizeAnalysis(parsedData, name) });
  } catch (error: any) {
    console.error("Error in /api/process-link:", error);
    res.status(500).json({ error: friendlyGeminiError(error) });
  }
});

// ─── YouTube link handler ──────────────────────────────────────────────────────
async function handleYoutubeLink(videoId: string, res: any): Promise<any> {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Lấy tiêu đề thật của video qua oEmbed (không cần API key)
  let title = `Video YouTube ${videoId}`;
  try {
    const oembed = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`
    );
    if (oembed.ok) {
      const data: any = await oembed.json();
      if (data?.title) title = data.title;
    }
  } catch {
    /* bỏ qua — dùng tên mặc định nếu oEmbed lỗi */
  }

  // Demo mode khi chưa cấu hình API key
  if (!hasApiKey()) {
    return res.json({
      success: true,
      isDemo: true,
      name: title,
      mimeType: "video/mp4",
      size: 0,
      summary: `### 🎬 ${title}\n\nChế độ Demo trực quan. Hãy cấu hình **GEMINI_API_KEY** để AI tự lấy transcript, dịch sang Tiếng Việt và tóm tắt video thực tế.`,
      extractedText: `Đây là transcript mẫu (demo) cho video YouTube: ${watchUrl}`,
      quiz: [],
      mindmap: { id: "root", label: title, children: [] },
    });
  }

  try {
    const ai = getAiClient();
    const prompt = buildYoutubeAnalysisPrompt(title);

    const rawText = await geminiLimiter.run(() =>
      withGeminiRetry(async () => {
        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: [{ fileData: { fileUri: watchUrl } }, prompt],
          config: {
            responseMimeType: "application/json",
            responseSchema: FILE_ANALYSIS_RESPONSE_SCHEMA,
            maxOutputTokens: 8192,
            temperature: 0.4,
          },
        });
        return response.text || "";
      })
    );

    // Parse thẳng. Nếu lỗi → output đã bị cắt cụt (video quá dài, transcript nhồi
    // hết vào extractedText làm chạm trần token).
    let parsedData: any;
    try {
      parsedData = JSON.parse(rawText || "{}");
    } catch {
      console.warn(`YouTube JSON parse failed (len=${rawText.length}) for "${title}" — chuyển sang pipeline phụ đề`);

      // Ưu tiên pipeline phụ đề: extractedText chỉ là placeholder nên output gọn,
      // gần như không bị cắt cụt; transcript gốc được ghi đè đầy đủ sau đó.
      const fallback = await processYoutubeViaCaptions(videoId, title);
      if (fallback) return res.json(fallback);

      // Không có phụ đề công khai → cố vá phần JSON đã sinh để cứu tối thiểu
      // (thường vẫn còn summary + một phần transcript).
      const salvaged = looseParseJson(rawText);
      if (salvaged && (salvaged.summary || salvaged.extractedText)) {
        return res.json({
          success: true,
          name: title,
          mimeType: "video/mp4",
          size: 0,
          truncated: true,
          ...normalizeAnalysis(salvaged, title),
        });
      }

      return res.status(400).json({
        error: "Video này quá dài để xử lý trọn vẹn và không có phụ đề công khai để bóc tách. Hãy thử một video ngắn hơn (khuyến nghị dưới ~20 phút).",
      });
    }

    return res.json({ success: true, name: title, mimeType: "video/mp4", size: 0, ...normalizeAnalysis(parsedData, title) });
  } catch (error: any) {
    const msg = String(error?.message ?? error);
    console.error("YouTube native processing failed:", msg.slice(0, 200));

    // Gemini không truy cập được video (video unlisted/hạn chế → 403) hoặc không hỗ trợ:
    // thử fallback lấy phụ đề trực tiếp rồi phân tích từ text.
    const accessIssue = /403|permission|unsupported|not.*support|private|unavailable|FAILED_PRECONDITION/i.test(msg);
    if (accessIssue) {
      const fallback = await processYoutubeViaCaptions(videoId, title);
      if (fallback) return res.json(fallback);
    }

    return res.status(500).json({ error: friendlyGeminiError(error) });
  }
}

// ─── Fallback: phân tích YouTube từ phụ đề (khi video dài hoặc Gemini không xem được) ──
// Trả về payload sẵn sàng res.json(), hoặc null nếu không lấy/parse được (caller tự quyết định).
async function processYoutubeViaCaptions(
  videoId: string,
  title: string
): Promise<any | null> {
  const cap = await fetchYoutubeCaptions(videoId);
  if (!cap) return null;

  console.log(`Fallback caption pipeline: "${title}" (${cap.lang}, ${cap.text.length} ký tự)`);
  const transcript = cap.text.slice(0, 120000); // giới hạn input phòng video quá dài

  try {
    const ai = getAiClient();
    const rawText = await geminiLimiter.run(() =>
      withGeminiRetry(async () => {
        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: [buildCaptionAnalysisPrompt(title, transcript)],
          config: {
            responseMimeType: "application/json",
            responseSchema: FILE_ANALYSIS_RESPONSE_SCHEMA,
            maxOutputTokens: 8192,
            temperature: 0.4,
          },
        });
        return response.text || "";
      })
    );

    const parsedData = looseParseJson(rawText);
    if (!parsedData) return null;

    const normalized = normalizeAnalysis(parsedData, title);
    // Ghi đè extractedText bằng transcript gốc đầy đủ (đã có sẵn, không cần AI tái tạo)
    normalized.extractedText = `[Nguồn: phụ đề tự động — ${cap.lang}]\n\n${cap.text}`;

    return { success: true, name: title, mimeType: "video/mp4", size: 0, ...normalized };
  } catch (err: any) {
    console.error("Caption fallback failed:", String(err?.message ?? err).slice(0, 200));
    return null;
  }
}

export default router;
