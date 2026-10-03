import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Cloud, FileText, HardDrive, Loader2, Network, Sparkles } from "lucide-react";
import type { MindMapNode, NotebookPage, UploadedFile } from "../types";
import { mindMapApi } from "../services/mindMapService";
import { notebookApi } from "../services/notebookService";
import MindMapViewer from "./MindMapViewer";
import { Button } from "./ui/Button";

interface MindMapWorkspaceProps {
  files: UploadedFile[];
  activeFileId: string | null;
  onSelectActiveFile: (id: string) => void;
  onUpdateFile: (id: string, update: Partial<UploadedFile>) => void;
}

type Scope = "library" | "notebook";

export default function MindMapWorkspace({
  files,
  activeFileId,
  onSelectActiveFile,
  onUpdateFile,
}: MindMapWorkspaceProps) {
  const libraryFiles = useMemo(
    () => files.filter((file) => file.status === "success" && (file.extractedText || file.summary)),
    [files]
  );
  const [scope, setScope] = useState<Scope>("library");
  const [selectedFileId, setSelectedFileId] = useState(activeFileId || "");
  const [pages, setPages] = useState<NotebookPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [loadingPages, setLoadingPages] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedFile = libraryFiles.find((file) => file.id === selectedFileId) || libraryFiles[0] || null;
  const selectedPage = pages.find((page) => page.id === selectedPageId) || pages[0] || null;
  const selectedMindMap = scope === "library" ? selectedFile?.mindmap : selectedPage?.mindmap;
  const selectedMeta = scope === "library" ? selectedFile?.mindmapMeta : selectedPage?.mindmapMeta;

  useEffect(() => {
    if (activeFileId && libraryFiles.some((file) => file.id === activeFileId)) {
      setSelectedFileId(activeFileId);
    } else if (!selectedFileId && libraryFiles[0]) {
      setSelectedFileId(libraryFiles[0].id);
    }
  }, [activeFileId, libraryFiles, selectedFileId]);

  const refreshPages = useCallback(async () => {
    try {
      const nextPages = await notebookApi.listPages();
      setPages(nextPages);
      setSelectedPageId((current) => current || nextPages[0]?.id || "");
    } catch (e: any) {
      setError(e?.message || "Không tải được danh sách notebook.");
    } finally {
      setLoadingPages(false);
    }
  }, []);

  useEffect(() => {
    refreshPages();
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [refreshPages]);

  const handleGenerate = async () => {
    setError(null);
    setGenerating(true);
    try {
      if (scope === "library") {
        if (!selectedFile) throw new Error("Hãy chọn một file đã phân tích trong Library.");
        const content = selectedFile.extractedText?.trim() || selectedFile.summary?.trim() || "";
        if (!content) throw new Error("File chưa có văn bản đã trích xuất.");
        const result = await mindMapApi.generateFromLibrary({
          id: selectedFile.id,
          name: selectedFile.name,
          content,
        });
        onUpdateFile(selectedFile.id, {
          mindmap: result.mindmap,
          mindmapMeta: {
            provider: result.provider,
            model: result.model,
            sourceHash: result.sourceHash,
            generatedAt: new Date().toISOString(),
          },
        });
      } else {
        if (!selectedPage) throw new Error("Hãy chọn một notebook có nguồn tài liệu.");
        const result = await mindMapApi.generateFromNotebook(selectedPage.id);
        setPages((current) => current.map((page) => page.id === selectedPage.id
          ? {
              ...page,
              mindmap: result.mindmap,
              mindmapMeta: {
                provider: result.provider,
                model: result.model,
                sourceHash: result.sourceHash,
                generatedAt: new Date().toISOString(),
              },
            }
          : page));
      }
    } catch (e: any) {
      setError(e?.message || "Không tạo được sơ đồ tư duy.");
    } finally {
      setGenerating(false);
    }
  };

  const handleMindMapUpdate = (mindmap: MindMapNode) => {
    if (scope === "library" && selectedFile) {
      onUpdateFile(selectedFile.id, { mindmap });
      return;
    }
    if (!selectedPage) return;
    setPages((current) => current.map((page) => page.id === selectedPage.id ? { ...page, mindmap } : page));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      notebookApi.updatePage(selectedPage.id, { mindmap }).catch((e: any) => {
        setError(e?.message || "Không lưu được thay đổi sơ đồ.");
      });
    }, 600);
  };

  const hasSelection = scope === "library" ? !!selectedFile : !!selectedPage;
  const sourceCount = scope === "library" ? (selectedFile ? 1 : 0) : selectedPage?.sourceIds.length || 0;

  return (
    <div className="space-y-4">
      <div className="border border-[var(--color-border-subtle)] bg-[var(--color-surface)] rounded-[8px] p-3 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center p-1 bg-[var(--color-surface-container-low)] rounded-[6px] shrink-0">
          <button
            onClick={() => setScope("library")}
            className={`h-8 px-3 rounded-[5px] text-[13px] font-medium flex items-center gap-1.5 ${scope === "library" ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm" : "text-[var(--color-text-secondary)]"}`}
          >
            <FileText size={14} /> Library
          </button>
          <button
            onClick={() => setScope("notebook")}
            className={`h-8 px-3 rounded-[5px] text-[13px] font-medium flex items-center gap-1.5 ${scope === "notebook" ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm" : "text-[var(--color-text-secondary)]"}`}
          >
            <BookOpen size={14} /> NotebookLM
          </button>
        </div>

        <div className="min-w-0 flex-1">
          {scope === "library" ? (
            <select
              value={selectedFile?.id || ""}
              onChange={(event) => {
                setSelectedFileId(event.target.value);
                onSelectActiveFile(event.target.value);
              }}
              className="w-full h-10 px-3 rounded-[6px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-[13px] outline-none focus:border-[var(--color-primary)]"
            >
              {libraryFiles.length === 0 && <option value="">Chưa có file đã phân tích</option>}
              {libraryFiles.map((file) => <option key={file.id} value={file.id}>{file.name}</option>)}
            </select>
          ) : (
            <select
              value={selectedPage?.id || ""}
              disabled={loadingPages}
              onChange={(event) => setSelectedPageId(event.target.value)}
              className="w-full h-10 px-3 rounded-[6px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-[13px] outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
            >
              {pages.length === 0 && <option value="">Chưa có notebook</option>}
              {pages.map((page) => (
                <option key={page.id} value={page.id}>{page.title} ({page.sourceIds.length} nguồn)</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {selectedMeta && (
            <span className="text-[11px] text-[var(--color-text-secondary)] flex items-center gap-1.5">
              {selectedMeta.provider === "local" ? <HardDrive size={13} /> : <Cloud size={13} />}
              {selectedMeta.provider === "local" ? "Local" : "Cloud"} · {selectedMeta.model}
            </span>
          )}
          <span className="text-[12px] text-[var(--color-text-secondary)] whitespace-nowrap">
            {sourceCount} nguồn
          </span>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={!hasSelection || generating}
            icon={generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          >
            {selectedMindMap ? "Tạo lại" : "Tạo sơ đồ"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-[6px] border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 px-3 py-2 text-[13px] text-[var(--color-error)]">
          {error}
        </div>
      )}

      {!hasSelection ? (
        <div className="min-h-[520px] border border-dashed border-[var(--color-border-subtle)] rounded-[8px] flex flex-col items-center justify-center text-center px-6">
          <Network size={36} className="text-[var(--color-text-secondary)] opacity-50 mb-3" />
          <p className="text-[14px] font-medium text-[var(--color-text-primary)]">Chưa có nguồn để tạo sơ đồ</p>
          <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
            Phân tích một file trong Library hoặc đính kèm nguồn vào NotebookLM trước.
          </p>
        </div>
      ) : (
        <div className="relative">
          {generating && (
            <div className="absolute inset-0 z-20 bg-[var(--color-surface)]/80 backdrop-blur-[1px] flex items-center justify-center rounded-[8px]">
              <div className="flex items-center gap-2 text-[14px] text-[var(--color-text-secondary)]">
                <Loader2 size={18} className="animate-spin" />
                Đang phân tích và hợp nhất các phần tài liệu...
              </div>
            </div>
          )}
          <MindMapViewer initialData={selectedMindMap} onUpdate={handleMindMapUpdate} />
        </div>
      )}
    </div>
  );
}
