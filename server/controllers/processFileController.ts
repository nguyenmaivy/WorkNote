import fs from "fs";
import path from "path";
import { UPLOAD_DIR } from "../config.js";
import { processFileService } from "../services/processFileService.js";

export async function processFileCoreController(req: any, res: any): Promise<any> {
  let tempFilePath: string | null = null;
  let isCreatedFromBase64 = false;

  try {
    let name: string;
    let mimeType: string;
    let fileSize = 0;

    // Chuẩn hóa input: Multipart file hoặc Buffer-to-disk nếu client gửi Base64
    if (req.file) {
      tempFilePath = req.file.path;
      name = req.body.name || req.file.originalname;
      mimeType = req.body.mimeType || req.file.mimetype;
      fileSize = req.file.size;
    } else {
      const { name: bodyName, mimeType: bodyMime, base64Data } = req.body || {};
      if (!base64Data) {
        return res.status(400).json({ error: "Thiếu dữ liệu tệp (yêu cầu multipart 'file' hoặc chuỗi base64Data)." });
      }
      name = bodyName || "document";
      mimeType = bodyMime || "application/octet-stream";
      
      const buffer = Buffer.from(base64Data, "base64");
      fileSize = buffer.length;
      const ext = path.extname(name) || "";
      tempFilePath = path.join(UPLOAD_DIR, `b64-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
      await fs.promises.writeFile(tempFilePath, buffer);
      isCreatedFromBase64 = true;
    }

    const result = await processFileService({
      tempFilePath,
      name,
      mimeType,
      fileSize
    });

    return res.json(result);
  } catch (err: any) {
    console.error("[ProcessFileController] Exception:", err);
    return res.status(500).json({ 
      error: "Hệ thống AI hiện đang bận hoặc quá tải, vui lòng thử lại sau.", 
      details: err.message 
    });
  } finally {
    // Dọn dẹp tệp base64 hoặc tệp multer
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        await fs.promises.unlink(tempFilePath);
        console.log(`[ProcessFileController] Đã dọn dẹp tệp tạm: ${tempFilePath}`);
      } catch (cleanupErr) {
        console.error("[ProcessFileController] Không thể xóa tệp tạm:", cleanupErr);
      }
    }
  }
}
