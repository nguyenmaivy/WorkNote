import React, { useState } from "react";
import { Bot, CheckCircle2, RefreshCw, Trash2, MoreVertical, FileText, Image as ImageIcon, Music, Film, Loader2, AlertTriangle } from "lucide-react";
import type { UploadedFile } from "../../types";

interface FileCardListProps {
  files: UploadedFile[];
  activeFileId: string | null;
  onSelectActiveFile: (id: string) => void;
  onDeleteFile: (id: string) => void;
  onRetryFile: (file: UploadedFile) => void;
  fileProgress: Record<string, { percent: number; stage: string }>;
}

function formatRelativeTime(timestamp?: number): string {
  if (!timestamp) return "just now";
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US");
}

function formatSize(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getFileTypeMeta(mime: string, filename = "") {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  const m = (mime || "").toLowerCase();
  if (m.includes("pdf") || ext === "pdf") {
    return { Icon: FileText, bg: "bg-[var(--color-error-soft)]", fg: "text-[var(--color-error)]" };
  }
  if (m.includes("image") || ["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(ext)) {
    return { Icon: ImageIcon, bg: "bg-[var(--color-primary-fixed)]", fg: "text-[var(--color-primary)]" };
  }
  if (m.includes("audio") || ["mp3", "wav", "m4a", "ogg", "flac", "aac", "aiff"].includes(ext)) {
    return { Icon: Music, bg: "bg-[var(--color-secondary-container)]", fg: "text-[var(--color-on-secondary-container)]" };
  }
  if (m.includes("video") || ["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) {
    return { Icon: Film, bg: "bg-[var(--color-tertiary-container)]/30", fg: "text-[var(--color-tertiary)]" };
  }
  return { Icon: FileText, bg: "bg-[var(--color-surface-container)]", fg: "text-[var(--color-text-secondary)]" };
}

export function FileCardList({
  files,
  activeFileId,
  onSelectActiveFile,
  onDeleteFile,
  onRetryFile,
  fileProgress,
}: FileCardListProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const renderStatusPill = (file: UploadedFile) => {
    if (file.status === "success") {
      const isAudioOrVideo = file.mimeType.includes("audio") || file.mimeType.includes("video");
      return (
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[var(--color-secondary)]" />
          <span className="text-[11px] text-[var(--color-secondary)] font-medium">
            {isAudioOrVideo ? "Transcribed" : "OCR Complete"}
          </span>
        </div>
      );
    }
    if (file.status === "processing") {
      const pct = fileProgress[file.id]?.percent ?? 0;
      return (
        <div className="flex items-center gap-1.5">
          <Loader2 size={12} className="text-[var(--color-tertiary)] animate-spin" />
          <span className="text-[11px] text-[var(--color-tertiary)] font-medium">
            Processing... {pct}%
          </span>
        </div>
      );
    }
    if (file.status === "error") {
      return (
        <div className="flex items-center gap-1.5">
          <AlertTriangle size={12} className="text-[var(--color-error)]" />
          <span className="text-[11px] text-[var(--color-error)] font-medium">Error</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-[var(--color-warning)]" />
        <span className="text-[11px] text-[var(--color-warning)] font-medium">Queued</span>
      </div>
    );
  };

  return (
    <section className="lg:col-span-2 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-[22px] font-semibold text-[var(--color-text-primary)] font-display">
          Recent Documents
        </h2>
        {files.length > 0 && (
          <button className="text-[14px] font-medium text-[var(--color-primary)] hover:underline">
            View All
          </button>
        )}
      </div>

      {files.length === 0 ? (
        <div className="border border-dashed border-[var(--color-outline-variant)] rounded-[12px] glass-tint p-10 text-center flex flex-col items-center">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border-subtle)] shadow-sm rounded-2xl rounded-bl-sm px-4 py-2 text-[13px] font-medium text-[var(--color-text-primary)] max-w-[280px] mb-3">
            Hungry for knowledge — drop a file in the zone above! 🍽️
          </div>
          <div className="animate-mascot-float w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-tertiary)] to-[var(--color-tertiary-container)] flex items-center justify-center text-white shadow-[var(--shadow-primary-glow)]">
            <Bot size={32} />
          </div>
          <p className="text-[16px] font-semibold text-[var(--color-text-primary)] mt-4">
            Your library is empty
          </p>
          <p className="text-[14px] text-[var(--color-text-secondary)] max-w-[320px] mt-1">
            Upload a lesson file or try a sample to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {files.map((file) => {
            const isActive = file.id === activeFileId;
            const meta = getFileTypeMeta(file.mimeType, file.name);
            const TypeIcon = meta.Icon;

            return (
              <div
                key={file.id}
                onClick={() => {
                  if (file.status === "success") onSelectActiveFile(file.id);
                }}
                className={`relative border rounded-[12px] p-4 bg-[var(--color-surface)] transition-all cursor-pointer flex flex-col gap-2.5 group overflow-hidden ${isActive
                    ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary-fixed)] shadow-[var(--shadow-primary-glow)]"
                    : "border-[var(--color-outline-variant)] hover:shadow-[var(--shadow-card-hover)] hover:border-[var(--color-outline)]"
                  }`}
              >
                <div className="flex justify-between items-start">
                  <div className={`w-10 h-10 rounded-[8px] ${meta.bg} ${meta.fg} flex items-center justify-center`}>
                    <TypeIcon size={20} />
                  </div>
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === file.id ? null : file.id)}
                      className="p-1 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-container-low)] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {openMenuId === file.id && (
                      <div className="absolute right-0 top-full mt-1 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-[8px] shadow-[var(--shadow-card-hover)] z-20 min-w-[160px] py-1 animate-fade-in">
                        {file.status === "success" && !isActive && (
                          <button
                            onClick={() => {
                              onSelectActiveFile(file.id);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-3 py-2 text-[13px] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-container-low)] flex items-center gap-2"
                          >
                            <CheckCircle2 size={14} /> Set Active
                          </button>
                        )}
                        {file.status === "error" && (
                          <button
                            onClick={() => {
                              onRetryFile(file);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-3 py-2 text-[13px] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-container-low)] flex items-center gap-2"
                          >
                            <RefreshCw size={14} /> Retry
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (window.confirm(`Remove "${file.name}" from your library?`)) {
                              onDeleteFile(file.id);
                              setOpenMenuId(null);
                            }
                          }}
                          className="w-full text-left px-3 py-2 text-[13px] text-[var(--color-error)] hover:bg-[var(--color-error-soft)] flex items-center gap-2"
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-[14px] font-medium text-[var(--color-text-primary)] truncate">
                    {file.name}
                  </h4>
                  <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">
                    {formatSize(file.size)} • {formatRelativeTime(file.createdAt)}
                  </p>
                </div>

                <div className="mt-auto">
                  {file.status === "processing" && fileProgress[file.id] && (
                    <div className="mb-2">
                      <div className="w-full bg-[var(--color-surface-container-low)] h-1 rounded-full overflow-hidden">
                        <div
                          className="bg-[var(--color-tertiary)] h-full rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${fileProgress[file.id].percent}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    {renderStatusPill(file)}
                    {isActive && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)] bg-[var(--color-primary-fixed)] px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  {file.status === "error" && file.errorMsg && (
                    <p className="text-[11px] text-[var(--color-error)] mt-1.5 line-clamp-2">
                      {file.errorMsg}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
