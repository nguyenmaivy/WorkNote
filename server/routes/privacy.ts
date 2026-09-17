import { Router } from "express";
import { maskPII, unmaskPII } from "../services/piiGuardService.js";

const router = Router();

/**
 * Endpoint ẩn danh hóa dữ liệu cá nhân nhạy cảm
 * POST /api/privacy/anonymize
 * Body: { text: string }
 */
router.post("/anonymize", (req, res): any => {
  try {
    const { text } = req.body;
    if (typeof text !== "string") {
      return res.status(400).json({ error: "Trường 'text' phải là chuỗi văn bản." });
    }

    const result = maskPII(text);
    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Lỗi khi ẩn danh hóa dữ liệu cá nhân:", error);
    return res.status(500).json({ error: "Không thể xử lý ẩn danh hóa văn bản." });
  }
});

/**
 * Endpoint khôi phục dữ liệu gốc từ văn bản ẩn danh kèm vault
 * POST /api/privacy/restore
 * Body: { maskedText: string, vault: Record<string, string> }
 */
router.post("/restore", (req, res): any => {
  try {
    const { maskedText, vault } = req.body;
    if (typeof maskedText !== "string" || typeof vault !== "object") {
      return res.status(400).json({ error: "Cần cung cấp 'maskedText' và đối tượng 'vault'." });
    }

    const restoredText = unmaskPII(maskedText, vault);
    return res.json({
      success: true,
      restoredText,
    });
  } catch (error: any) {
    console.error("Lỗi khi phục hồi văn bản ẩn danh:", error);
    return res.status(500).json({ error: "Không thể phục hồi văn bản." });
  }
});

export default router;
