import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { UPLOAD_DIR, MAX_FILE_SIZE_BYTES } from "../config.js";
import { hasSttKey, friendlyGeminiError } from "../services/geminiService.js";
import { normalizeMimeType } from "../services/fileService.js";
import { transcribeTimed } from "../services/audioService.js";

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const suffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "transcribe-" + suffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

// ─── POST /api/transcribe ─────────────────────────────────────────────────────
// Hỗ trợ cả Multipart FormData và JSON { base64Data } (backward compatibility).
router.post("/", upload.single("file"), async (req, res): Promise<any> => {
  let tempFilePath: string | null = null;
  try {
    let name: string;
    let mimeType: string;
    let fileSize = 0;

    if (req.file) {
      tempFilePath = req.file.path;
      name = req.body.name || req.file.originalname;
      mimeType = req.body.mimeType || req.file.mimetype;
      fileSize = req.file.size;
    } else {
      const { base64Data, mimeType: bodyMime, name: bodyName } = req.body || {};
      if (!base64Data || typeof base64Data !== "string") {
        return res.status(400).json({ error: "Thiếu dữ liệu âm thanh/video (yêu cầu multipart 'file' hoặc base64Data)." });
      }
      name = bodyName || "media";
      mimeType = bodyMime || "audio/mpeg";
      const buffer = Buffer.from(base64Data, "base64");
      fileSize = buffer.length;
      const ext = path.extname(name) || ".mp3";
      tempFilePath = path.join(UPLOAD_DIR, `transcribe-b64-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
      await fs.promises.writeFile(tempFilePath, buffer);
    }

    if (!hasSttKey()) {
      return res.status(400).json({
        error: "Cần cấu hình GROQ_API_KEY hoặc GEMINI_API_KEY để phiên âm âm thanh/video bằng AI.",
      });
    }

    const cleanMime = normalizeMimeType(mimeType, name);
    console.log(`[TranscribeRoute] Bắt đầu phiên âm timed cho: ${name} (${Math.round(fileSize / 1024)}KB)`);

    const result = await transcribeTimed(tempFilePath, cleanMime, fileSize, name);

    return res.json({
      success: true,
      lang: result.lang,
      segments: result.segments,
    });
  } catch (error: any) {
    console.error("Error in /api/transcribe:", String(error?.message ?? error).slice(0, 200));
    return res.status(500).json({ error: friendlyGeminiError(error) });
  } finally {
    if (tempFilePath) {
      fs.promises.unlink(tempFilePath).catch(() => {});
    }
  }
});

export default router;
