import React, { useRef, useState } from "react";
import type { NotebookSource, NotebookPage } from "../types";
import { notebookApi } from "../services/notebookService";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Upload, Link2, Trash2, FileText, Loader2 } from "lucide-react";

interface NotebookSourcePanelProps {
  sources: NotebookSource[];
  activePage: NotebookPage | null;
  onSourcesChange: () => void;
  onPageUpdate: (page: NotebookPage) => void;
}

export default function NotebookSourcePanel({
  sources,
  activePage,
  onSourcesChange,
  onPageUpdate,
}: NotebookSourcePanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      await notebookApi.uploadSource(file);
      onSourcesChange();
    } catch (err: any) {
      setError(err?.message || "Upload thất bại");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleAddUrl = async () => {
    if (!url.trim().startsWith("http")) {
      setError("URL phải bắt đầu bằng http/https");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await notebookApi.addSourceFromUrl(url.trim());
      setUrl("");
      onSourcesChange();
    } catch (err: any) {
      setError(err?.message || "Không thêm được link");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notebookApi.deleteSource(id);
      onSourcesChange();
    } catch (err: any) {
      setError(err?.message || "Xóa thất bại");
    }
  };

  const toggleAttach = async (sourceId: string) => {
    if (!activePage) return;
    const ids = activePage.sourceIds.includes(sourceId)
      ? activePage.sourceIds.filter((id) => id !== sourceId)
      : [...activePage.sourceIds, sourceId];
    try {
      const updated = await notebookApi.updatePage(activePage.id, { sourceIds: ids });
      onPageUpdate(updated);
    } catch (err: any) {
      setError(err?.message || "Cập nhật đính kèm thất bại");
    }
  };

  return (
    <Card className="h-full flex flex-col border border-[var(--color-border-subtle)]">
      <div className="p-4 border-b border-[var(--color-border-subtle)]">
        <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)] mb-3">
          Nguồn tài liệu
        </h3>

        <div className="flex flex-col gap-2">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.txt,.md,.docx,.xlsx,.png,.jpg,.jpeg"
            onChange={handleUpload}
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            icon={loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            className="w-full"
          >
            Tải tài liệu lên
          </Button>

          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 text-[13px] px-3 py-2 rounded-[6px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] outline-none focus:border-[var(--color-primary)]"
            />
            <Button size="sm" onClick={handleAddUrl} disabled={loading} icon={<Link2 size={14} />}>
              Thêm
            </Button>
          </div>
        </div>

        {error && (
          <p className="mt-2 text-[12px] text-[var(--color-error)]">{error}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sources.length === 0 ? (
          <p className="text-[13px] text-[var(--color-text-secondary)] text-center py-6">
            Chưa có nguồn nào. Upload tài liệu hoặc dán link YouTube/Drive.
          </p>
        ) : (
          sources.map((src) => {
            const attached = activePage?.sourceIds.includes(src.id);
            return (
              <div
                key={src.id}
                className={`p-3 rounded-[8px] border text-[13px] transition-colors ${
                  attached
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-fixed)]/30"
                    : "border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)]"
                }`}
              >
                <div className="flex items-start gap-2">
                  <FileText size={14} className="mt-0.5 shrink-0 text-[var(--color-text-secondary)]" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-[var(--color-text-primary)]">{src.title}</p>
                    <p className="text-[11px] text-[var(--color-text-secondary)] capitalize">{src.type}</p>
                    <p className="text-[12px] text-[var(--color-text-secondary)] line-clamp-2 mt-1">
                      {src.content.slice(0, 120)}…
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(src.id)}
                    className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-error)]"
                    title="Xóa nguồn"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {activePage && (
                  <button
                    onClick={() => toggleAttach(src.id)}
                    className={`mt-2 text-[12px] font-medium ${
                      attached ? "text-[var(--color-primary)]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                    }`}
                  >
                    {attached ? "✓ Đã đính kèm" : "+ Đính kèm vào trang"}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
