import type { UploadedFile } from "../types";

/**
 * Lưu trữ file (kèm Blob audio gốc) trên trình duyệt bằng IndexedDB.
 * IndexedDB hỗ trợ lưu Blob trực tiếp (structured clone) nên giữ được file gốc
 * để nghe lại sau khi tải lại trang — không cần backend.
 */

const DB_NAME = "worknote-db";
const STORE = "files";
const VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB không khả dụng trên môi trường này"));
      return;
    }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Lấy toàn bộ file đã lưu */
export async function idbGetAllFiles(): Promise<UploadedFile[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as UploadedFile[]) || []);
    req.onerror = () => reject(req.error);
  });
}

/** Thêm/cập nhật một file (upsert) */
export async function idbPutFile(file: UploadedFile): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(file);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Xóa một file khỏi kho */
export async function idbDeleteFile(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
