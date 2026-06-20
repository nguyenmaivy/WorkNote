import { useState, useCallback } from "react";
import type { UploadedFile } from "../types";

/**
 * Hook quản lý state files & active file selection.
 * Tách toàn bộ file management logic ra khỏi App.tsx.
 */
export function useFileManager() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  const activeFile = files.find((f) => f.id === activeFileId) || null;

  const handleAddFile = useCallback((newFile: UploadedFile) => {
    setFiles((prev) => {
      // Prevent duplicates
      if (prev.some((f) => f.id === newFile.id)) return prev;
      return [newFile, ...prev];
    });
  }, []);

  const handleUpdateFile = useCallback((id: string, updated: Partial<UploadedFile>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...updated } : f)));
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setActiveFileId((prevActive) => (prevActive === id ? null : prevActive));
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
