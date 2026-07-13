import { useState, useCallback, useEffect, useRef } from "react";
import type { UploadedFile } from "../types";
import { idbGetAllFiles, idbPutFile, idbDeleteFile } from "../services/fileStore";

const isPlayable = (mime: string) =>
  mime.startsWith("audio/") || mime.startsWith("video/") ||
  mime.includes("audio") || mime.includes("video");

/** Tạo objectUrl phát lại file gốc từ blob (nếu là audio/video) */
function hydrate(file: UploadedFile): UploadedFile {
  if (file.blob && !file.objectUrl && isPlayable(file.mimeType)) {
    try {
      return { ...file, objectUrl: URL.createObjectURL(file.blob) };
    } catch {
      return file;
    }
  }
  return file;
}

/** Bỏ objectUrl (transient) trước khi lưu vào IndexedDB */
function serialize(file: UploadedFile): UploadedFile {
  const { objectUrl, ...rest } = file;
  return rest as UploadedFile;
}

/**
 * Hook quản lý state files & active file selection.
 * Lưu trữ bền vững bằng IndexedDB (giữ cả file audio gốc) — tự nạp lại khi mở app.
 */
export function useFileManager() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const filesRef = useRef<UploadedFile[]>([]);
  filesRef.current = files;

  // Nạp lại danh sách file đã lưu khi mở app
  useEffect(() => {
    let alive = true;
    idbGetAllFiles()
      .then((stored) => {
        if (!alive) return;
        stored.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        setFiles(stored.map(hydrate));
      })
      .catch(() => { /* IndexedDB không khả dụng — chạy chế độ trong phiên */ });

    return () => {
      alive = false;
      // Thu hồi object URL khi rời trang để tránh rò rỉ bộ nhớ
      filesRef.current.forEach((f) => f.objectUrl && URL.revokeObjectURL(f.objectUrl));
    };
  }, []);

  const activeFile = files.find((f) => f.id === activeFileId) || null;

  const handleAddFile = useCallback((newFile: UploadedFile) => {
    const withMeta: UploadedFile = { ...newFile, createdAt: newFile.createdAt ?? Date.now() };
    setFiles((prev) => {
      if (prev.some((f) => f.id === withMeta.id)) return prev;
      return [hydrate(withMeta), ...prev];
    });
    idbPutFile(serialize(withMeta)).catch(() => {});
  }, []);

  const handleUpdateFile = useCallback((id: string, updated: Partial<UploadedFile>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...updated } : f)));
    const current = filesRef.current.find((f) => f.id === id);
    if (current) idbPutFile(serialize({ ...current, ...updated })).catch(() => {});
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.objectUrl) URL.revokeObjectURL(target.objectUrl);
      return prev.filter((f) => f.id !== id);
    });
    setActiveFileId((prevActive) => (prevActive === id ? null : prevActive));
    idbDeleteFile(id).catch(() => {});
  }, []);

  return {
    files,
    activeFileId,
    activeFile,
    setActiveFileId,
    handleAddFile,
    handleUpdateFile,
    handleRemoveFile,
  };
}
