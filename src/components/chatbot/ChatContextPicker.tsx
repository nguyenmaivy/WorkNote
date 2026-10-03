import React from "react";
import { LibraryBig, X, FileText, Image as ImageIcon, Music, Film, Plus } from "lucide-react";
import type { UploadedFile } from "../../types";
import { ACCENT_OPTIONS } from "../../constants";

interface ChatContextPickerProps {
  showContextMobile: boolean;
  setShowContextMobile: (show: boolean) => void;
  contextFiles: UploadedFile[];
  files: UploadedFile[];
  onRemoveFromContext: (id: string) => void;
  onAddToContext: (id: string) => void;
  selectedAccent: "north" | "central" | "south";
  onSelectAccent: (accent: "north" | "central" | "south") => void;
}

function getFileIcon(mime: string) {
  if (mime.includes("pdf")) return FileText;
  if (mime.includes("image") || mime.includes("png") || mime.includes("jpeg") || mime.includes("jpg"))
    return ImageIcon;
  if (mime.includes("audio") || mime.includes("mp3") || mime.includes("wav")) return Music;
  if (mime.includes("video") || mime.includes("mp4")) return Film;
  return FileText;
}

export function ChatContextPicker({
  showContextMobile,
  setShowContextMobile,
  contextFiles,
  files,
  onRemoveFromContext,
  onAddToContext,
  selectedAccent,
  onSelectAccent,
}: ChatContextPickerProps) {
  return (
    <aside
      className={`w-72 border-l border-[var(--color-surface-container-high)] bg-[var(--color-surface)] flex-col overflow-y-auto ${
        showContextMobile ? "fixed inset-y-0 right-0 z-30 flex" : "hidden lg:flex"
      }`}
    >
      <div className="p-4 border-b border-[var(--color-surface-container-high)] sticky top-0 bg-[var(--color-surface)] z-10 flex justify-between items-center">
        <h3 className="text-[18px] font-semibold text-[var(--color-text-primary)] flex items-center gap-2 font-display">
          <LibraryBig size={20} className="text-[var(--color-secondary)]" />
          Active Context
        </h3>
        {showContextMobile && (
          <button
            onClick={() => setShowContextMobile(false)}
            className="lg:hidden p-1 rounded text-[var(--color-text-secondary)]"
          >
            <X size={18} />
          </button>
        )}
      </div>
      
      <div className="p-4 space-y-3 flex-1">
        {contextFiles.length === 0 && (
          <p className="text-[13px] text-[var(--color-text-secondary)] italic">
            No documents in context. Add one below so the AI can reference it.
          </p>
        )}

        {contextFiles.map((f) => {
          const Icon = getFileIcon(f.mimeType);
          return (
            <div
              key={f.id}
              className="p-4 rounded-[12px] border border-[var(--color-outline-variant)] bg-[var(--color-surface)] shadow-sm hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-secondary)]" />
              <div className="flex justify-between items-start mb-2 pl-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon size={18} className="text-[var(--color-text-secondary)] shrink-0" />
                  <h4 className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">
                    {f.name}
                  </h4>
                </div>
                <button
                  onClick={() => onRemoveFromContext(f.id)}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-error)] opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove from context"
                >
                  <X size={14} />
                </button>
              </div>
              {f.summary && (
                <p className="text-[12px] text-[var(--color-text-secondary)] line-clamp-2 pl-2">
                  {f.summary.replace(/[#*`]/g, "").slice(0, 120)}
                </p>
              )}
            </div>
          );
        })}

        <div className="pt-4 mt-4 border-t border-[var(--color-outline-variant)]">
          <h4 className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
            Available Library
          </h4>
          <div className="space-y-1">
            {files
              .filter((f) => !contextFiles.find((c) => c.id === f.id))
              .map((f) => {
                const Icon = getFileIcon(f.mimeType);
                return (
                  <button
                    key={f.id}
                    onClick={() => onAddToContext(f.id)}
                    className="w-full flex items-center justify-between p-2 rounded hover:bg-[var(--color-surface-container-low)] text-left group transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon size={14} className="text-[var(--color-text-secondary)] shrink-0" />
                      <span className="text-[12px] text-[var(--color-text-primary)] truncate">
                        {f.name}
                      </span>
                    </div>
                    <Plus size={14} className="text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100" />
                  </button>
                );
              })}
            {files.length === contextFiles.length && files.length > 0 && (
              <p className="text-[11px] text-[var(--color-text-secondary)]">All files are in context.</p>
            )}
            {files.length === 0 && (
              <p className="text-[11px] text-[var(--color-text-secondary)]">No files uploaded yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]">
        <h4 className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
          Voice Settings
        </h4>
        <select
          value={selectedAccent}
          onChange={(e) => onSelectAccent(e.target.value as any)}
          className="w-full p-2 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-[8px] text-[13px] text-[var(--color-text-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none"
        >
          {ACCENT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </aside>
  );
}
