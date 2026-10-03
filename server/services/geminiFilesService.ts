import fs from "fs";
import { getAiClient } from "./geminiService.js";

export interface GeminiFileRef {
  fileUri: string;
  mimeType: string;
  name: string; // The resource name (e.g. files/abc123xyz) used for deletion
}

/**
 * Tải file lên Gemini Files API và đợi cho đến khi file chuyển sang trạng thái ACTIVE.
 * Hỗ trợ file lớn (tới 2GB), tránh hoàn toàn giới hạn 20MB của Base64 inlineData.
 */
export async function uploadAndPollGeminiFile(
  filePath: string,
  mimeType: string,
  displayName?: string,
  maxWaitMs = 180000
): Promise<GeminiFileRef> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File không tồn tại trên đĩa: ${filePath}`);
  }

  const fileSizeKB = Math.round(fs.statSync(filePath).size / 1024);
  const ai = getAiClient();
  
  // 1. Upload file
  console.log(`[Gemini Files API] Bắt đầu upload: ${filePath} (${mimeType}, ${fileSizeKB}KB)`);
  const uploadStart = Date.now();
  const uploaded = await ai.files.upload({
    file: filePath,
    config: {
      mimeType,
      displayName: displayName || undefined,
    },
  });
  console.log(`[Gemini Files API] Upload hoàn tất trong ${Math.round((Date.now() - uploadStart) / 1000)}s. State: ${uploaded.state}, Name: ${uploaded.name}`);

  const fileName = uploaded.name;
  if (!fileName) {
    throw new Error("Gemini Files API không trả về file.name hợp lệ.");
  }

  // 2. Poll cho tới khi trạng thái là ACTIVE
  const startTime = Date.now();
  let currentFile = uploaded;

  while (currentFile.state === "PROCESSING") {
    if (Date.now() - startTime > maxWaitMs) {
      // Timeout: cố gắng dọn file trước khi throw
      try {
        await ai.files.delete({ name: fileName });
      } catch {}
      throw new Error(`Quá thời gian chờ xử lý file trên Gemini Files API (${Math.round(maxWaitMs / 1000)}s).`);
    }

    console.log(`[Gemini Files API] Đang xử lý file ${fileName}... chờ 3s (đã chờ ${Math.round((Date.now() - startTime) / 1000)}s)`);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    currentFile = await ai.files.get({ name: fileName });
    console.log(`[Gemini Files API] Poll state: ${currentFile.state}`);
  }

  if (currentFile.state === "FAILED") {
    console.error(`[Gemini Files API] File state=FAILED. mimeType=${mimeType}, fileSizeKB=${fileSizeKB}`);
    try {
      await ai.files.delete({ name: fileName });
    } catch {}
    throw new Error(`Gemini Files API báo lỗi xử lý file (FAILED). MIME: ${mimeType}, Size: ${fileSizeKB}KB`);
  }

  console.log(`[Gemini Files API] File sẵn sàng (ACTIVE): ${currentFile.uri} (mimeType: ${currentFile.mimeType})`);
  return {
    fileUri: currentFile.uri,
    mimeType: currentFile.mimeType || mimeType,
    name: fileName,
  };
}

/**
 * Xóa file trên Gemini Files API để giải phóng quota lưu trữ.
 */
export async function deleteGeminiFile(fileName: string): Promise<void> {
  if (!fileName) return;
  try {
    const ai = getAiClient();
    await ai.files.delete({ name: fileName });
    console.log(`[Gemini Files API] Đã xóa file lưu trữ: ${fileName}`);
  } catch (err: any) {
    console.warn(`[Gemini Files API] Không xóa được file ${fileName}:`, err?.message || err);
  }
}

/**
 * Wrapper thực thi an toàn: Upload -> Poll -> Run Callback -> Luôn xóa file trong finally.
 */
export async function withGeminiFile<T>(
  filePath: string,
  mimeType: string,
  fn: (fileData: { fileUri: string; mimeType: string }) => Promise<T>,
  displayName?: string
): Promise<T> {
  let fileRef: GeminiFileRef | null = null;
  try {
    fileRef = await uploadAndPollGeminiFile(filePath, mimeType, displayName);
    return await fn({ fileUri: fileRef.fileUri, mimeType: fileRef.mimeType });
  } finally {
    if (fileRef?.name) {
      await deleteGeminiFile(fileRef.name);
    }
  }
}
