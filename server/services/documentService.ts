import fs from "fs";
import mammoth from "mammoth";
import xlsx from "xlsx";
import { PDFParse } from "pdf-parse";

export interface DocumentExtractResult {
  text: string;
  isScannedPdf?: boolean;
}

/**
 * Trích xuất nội dung văn bản từ các định dạng tài liệu Office, PDF, Text.
 * Không gọi mạng, chạy 100% cục bộ trên server.
 */
export async function extractDocumentText(
  filePath: string,
  mimeType: string,
  filename: string,
  fileSize: number
): Promise<DocumentExtractResult> {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  const buffer = await fs.promises.readFile(filePath);

  // 1. Định dạng Word (.docx)
  if (ext === "docx") {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return { text: result.value?.trim() || "[Tệp docx không có nội dung chữ]" };
    } catch (e: any) {
      console.warn(`[DocumentService] Lỗi trích xuất DOCX (${filename}):`, e?.message || e);
      return { text: "[Lỗi giải mã tệp docx]" };
    }
  }

  // 2. Định dạng Excel (.xlsx, .xls)
  if (ext === "xlsx" || ext === "xls") {
    try {
      const workbook = xlsx.read(buffer, { type: "buffer" });
      let allText = "";
      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        allText += `--- Bảng: ${sheetName} ---\n`;
        allText += xlsx.utils.sheet_to_csv(sheet) + "\n\n";
      });
      return { text: allText.trim() || "[Tệp excel không có dữ liệu]" };
    } catch (e: any) {
      console.warn(`[DocumentService] Lỗi trích xuất XLSX (${filename}):`, e?.message || e);
      return { text: "[Lỗi giải mã tệp excel]" };
    }
  }

  // 3. Định dạng PDF
  if (ext === "pdf" || mimeType === "application/pdf") {
    try {
      const parser = new PDFParse({ data: buffer });
      const textResult = await parser.getText();
      const extractedText = (textResult?.text || "").trim();

      // Heuristic phát hiện PDF Scan/Ảnh:
      // Nếu file lớn hơn 50KB nhưng trích xuất được dưới 100 ký tự chữ -> PDF scan cần OCR
      const isScanned = extractedText.length < 100 && fileSize > 50 * 1024;
      if (isScanned) {
        console.log(`[DocumentService] Phát hiện PDF dạng scan/ảnh (text: ${extractedText.length} chars, size: ${Math.round(fileSize / 1024)}KB) -> cần Gemini Vision`);
      }

      return {
        text: extractedText,
        isScannedPdf: isScanned,
      };
    } catch (e: any) {
      console.warn(`[DocumentService] Lỗi đọc PDF cục bộ (${filename}):`, e?.message || e);
      // Nếu lỗi parse PDF, đánh dấu cần multimodal fallback để Gemini xử lý
      return {
        text: "",
        isScannedPdf: true,
      };
    }
  }

  // 4. Các tệp văn bản thuần (txt, md, csv, json, html)
  try {
    let textContent = buffer.toString("utf-8");
    if (mimeType === "text/html" || ext === "html" || textContent.includes("<html") || textContent.includes("<body")) {
      textContent = textContent
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }
    return { text: textContent.trim() || "[Nội dung tệp văn bản trống]" };
  } catch {
    return { text: `[Nội dung tệp ${filename} không thể đọc dạng văn bản UTF-8]` };
  }
}
