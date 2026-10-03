import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { UPLOAD_DIR, MAX_FILE_SIZE_BYTES, MAX_DOC_FILE_SIZE_BYTES } from "../config.js";
import { uploadQueue } from "../services/uploadQueue.js";
import { getStats as getProviderStats } from "../services/rateLimitTracker.js";
import { processFileCoreController } from "../controllers/processFileController.js";

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const suffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + suffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

// Middleware: Backpressure kiểm tra dung lượng đĩa (cần trống ít nhất 5GB)
const checkDiskSpace = async (req: any, res: any, next: any) => {
  try {
    const stats = await fs.promises.statfs(UPLOAD_DIR);
    const availableBytes = stats.bavail * stats.bsize;
    if (availableBytes < 5 * 1024 * 1024 * 1024) { // 5GB
      return res.status(507).json({ error: "Server đang quá tải dung lượng (Disk Full), vui lòng thử lại sau." });
    }
    next();
  } catch (err) {
    console.error("[DiskCheck] Error checking disk space", err);
    next();
  }
};

// ─── GET /api/process-file/status ────────────────────────────────────────────
router.get("/status", (_req, res) => {
  res.json({
    queue: uploadQueue.getStats(),
    queueList: uploadQueue.getQueueList(),
    providers: getProviderStats(),
  });
});

// ─── POST /api/process-file ───────────────────────────────────────────────────
router.post("/", checkDiskSpace, upload.single("file"), async (req, res): Promise<any> => {
  // Xác định priority trước khi đưa vào queue
  const rawMime = req.body?.mimeType || req.file?.mimetype || "";
  const rawName = req.body?.name || req.file?.originalname || "";
  const ext = (rawName.split(".").pop() || "").toLowerCase();
  
  const isAudioVideo =
    rawMime.startsWith("audio/") || rawMime.startsWith("video/") ||
    ["mp3", "wav", "m4a", "ogg", "mp4", "webm", "mov", "avi"].includes(ext);
  const isImage =
    rawMime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif"].includes(ext);

  const fileSize = req.file?.size || (req.body?.base64Data ? (req.body.base64Data.length * 3 / 4) : 0);

  // Xử lý Backpressure (Giai đoạn 1): Loại bỏ file Document > 20MB
  if (!isAudioVideo && !isImage && fileSize > MAX_DOC_FILE_SIZE_BYTES) {
    return res.status(413).json({ error: `Dung lượng tệp tài liệu vượt quá giới hạn 20MB. Hệ thống chỉ hỗ trợ đến 2GB cho tệp tin Âm thanh/Video.` });
  }

  // Priority: 0=vision(ảnh/scan), 1=audio/video, 2=document text
  const priority = isImage ? 0 : isAudioVideo ? 1 : 2;
  const label = `${rawName || "file"} [${isImage ? "vision" : isAudioVideo ? "av" : "doc"}]`;

  return uploadQueue.enqueue(
    () => processFileCoreController(req, res),
    { priority, label }
  );
});

export default router;
