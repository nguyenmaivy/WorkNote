import React, { useState, useEffect, useCallback } from "react";
import type { NotebookPage } from "../types";
import { notebookApi } from "../services/notebookService";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Save, FileText } from "lucide-react";

interface NotebookPageEditorProps {
  page: NotebookPage | null;
  onSaved: (page: NotebookPage) => void;
  onCreate: () => void;
}

export default function NotebookPageEditor({ page, onSaved, onCreate }: NotebookPageEditorProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (page) {
      setTitle(page.title);
      setContent(page.content);
    } else {
      setTitle("");
      setContent("");
    }
    setError(null);
  }, [page?.id]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      setError("Tiêu đề không được để trống");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (page) {
        const updated = await notebookApi.updatePage(page.id, { title, content });
        onSaved(updated);
      } else {
        const created = await notebookApi.createPage({ title, content });
        onSaved(created);
      }
    } catch (e: any) {
      setError(e?.message || "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }, [page, title, content, onSaved]);

  if (!page) {
    return (
      <Card className="h-full flex flex-col items-center justify-center p-8 text-center border border-dashed border-[var(--color-border-subtle)]">
        <FileText size={48} className="text-[var(--color-text-secondary)] mb-4 opacity-50" />
        <h3 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-2">
          Chưa có trang notebook
        </h3>
        <p className="text-[14px] text-[var(--color-text-secondary)] mb-6 max-w-sm">
          Tạo trang ghi chú đầu tiên để bắt đầu học tập theo phong cách NotebookLM.
        </p>
        <Button onClick={onCreate} icon={<FileText size={16} />}>
          Tạo trang mới
        </Button>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col border border-[var(--color-border-subtle)]">
      <div className="p-4 border-b border-[var(--color-border-subtle)] flex items-center gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tiêu đề trang..."
          className="flex-1 text-[18px] font-semibold bg-transparent outline-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]"
        />
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          icon={<Save size={14} />}
        >
          {saving ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Viết ghi chú, trích dẫn, hoặc tóm tắt bài học..."
        className="flex-1 p-4 resize-none bg-transparent outline-none text-[15px] leading-relaxed text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] min-h-[300px]"
      />

      {error && (
        <div className="px-4 pb-4 text-[13px] text-[var(--color-error)]">{error}</div>
      )}
    </Card>
  );
}
