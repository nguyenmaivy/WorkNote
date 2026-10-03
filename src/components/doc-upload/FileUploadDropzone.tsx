import React, { useRef } from "react";
import { Upload, Film, FileText, Link as LinkIcon, ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import { SUPPORTED_FILE_TYPES } from "../../constants";

interface FileUploadDropzoneProps {
  isDragging: boolean;
  setIsDragging: (val: boolean) => void;
  onFileDrop: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileUrl: string;
  setFileUrl: (url: string) => void;
  urlError: string | null;
  setUrlError: (err: string | null) => void;
  isFetchingUrl: boolean;
  onImportFromLink: (e: React.FormEvent) => void;
}

export function FileUploadDropzone({
  isDragging,
  setIsDragging,
  onFileDrop,
  onFileSelect,
  fileUrl,
  setFileUrl,
  urlError,
  setUrlError,
  isFetchingUrl,
  onImportFromLink,
}: FileUploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <section
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onFileDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`relative border-2 border-dashed rounded-[12px] p-8 md:p-10 bg-[var(--color-surface)] flex flex-col items-center justify-center cursor-pointer transition-all duration-300 min-h-[280px] group ${isDragging
          ? "border-[var(--color-primary)] bg-[var(--color-primary-fixed)]/30 dropzone-active"
          : "border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container-low)] hover:border-[var(--color-primary)]"
        }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileSelect}
        className="hidden"
        accept={SUPPORTED_FILE_TYPES.accept}
        multiple
      />

      <div
        className={`w-16 h-16 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center mb-4 transition-transform shadow-[var(--shadow-primary-glow)] ${isDragging ? "scale-110 animate-bounce-soft" : "group-hover:scale-110"
          }`}
      >
        <Upload size={28} />
      </div>

      <h3 className="text-[20px] font-semibold text-[var(--color-text-primary)] mb-1 font-display">
        {isDragging ? "Drop to extract! ✨" : "Drag & Drop files here"}
      </h3>
      <p className="text-[15px] text-[var(--color-text-secondary)] mb-5 text-center max-w-md">
        Videos (MP4) or Documents (PDF, PNG, JPG, TXT). Max file size: 200MB.
      </p>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          fileInputRef.current?.click();
        }}
        className="bg-[var(--color-surface)] border border-[var(--color-primary)] text-[var(--color-primary)] text-[14px] font-medium py-2 px-6 rounded-full hover:bg-[var(--color-primary-fixed)]/40 transition-colors"
      >
        Browse Files
      </button>

      {/* Capability chips */}
      <div
        className="flex flex-wrap justify-center gap-4 mt-6 mb-4 border-t border-[var(--color-outline-variant)]/40 pt-6 w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 bg-[var(--color-surface-container-low)] px-4 py-2.5 rounded-[8px] border border-[var(--color-outline-variant)]/50">
          <Film size={20} className="text-[var(--color-primary)]" />
          <div className="text-left">
            <div className="text-[13px] font-medium text-[var(--color-text-primary)] leading-tight">
              MP4 Files
            </div>
            <div className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
              Opens in AI Video Lab
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-[var(--color-surface-container-low)] px-4 py-2.5 rounded-[8px] border border-[var(--color-outline-variant)]/50">
          <FileText size={20} className="text-[var(--color-secondary)]" />
          <div className="text-left">
            <div className="text-[13px] font-medium text-[var(--color-text-primary)] leading-tight">
              PDF / Images / TXT
            </div>
            <div className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
              Opens in Analysis Lab
            </div>
          </div>
        </div>
      </div>

      {/* URL Link input */}
      <form
        onSubmit={onImportFromLink}
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col items-center gap-2 mt-2 w-full max-w-md"
      >
        <span className="text-[12px] text-[var(--color-text-secondary)] font-medium">or</span>
        <div className="relative w-full">
          <LinkIcon
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
          />
          <input
            type="url"
            value={fileUrl}
            onChange={(e) => {
              setFileUrl(e.target.value);
              if (urlError) setUrlError(null);
            }}
            placeholder="Paste a YouTube / PDF / MP3 link here..."
            className="w-full pl-10 pr-12 py-2.5 bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] rounded-[8px] text-[14px] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] outline-none transition-all placeholder:text-[var(--color-text-secondary)]"
          />
          <button
            type="submit"
            disabled={isFetchingUrl || !fileUrl.trim()}
            title="Fetch & analyze link"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[var(--color-primary)] hover:bg-[var(--color-primary-fixed)]/40 rounded-full transition-colors flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isFetchingUrl ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <ArrowRight size={18} />
            )}
          </button>
        </div>
        {urlError && (
          <p className="text-[12px] text-[var(--color-error)] font-medium flex items-center gap-1.5">
            <AlertTriangle size={12} /> {urlError}
          </p>
        )}
      </form>
    </section>
  );
}
