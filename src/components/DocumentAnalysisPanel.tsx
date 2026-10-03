import React from "react";
import { FileCheck, Languages, RefreshCw, Copy } from "lucide-react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { CopyButton } from "./ui/CopyButton";
import { ReadAloudText } from "./ui/ReadAloudText";
import { Markdown } from "./ui/Markdown";
import { SUPPORTED_LANGUAGES, LANGUAGE_NAME_MAP } from "../constants";
import type { UploadedFile } from "../types";

interface DocumentAnalysisPanelProps {
  activeFile: UploadedFile;
  translation: any; // Return type of useTranslation hook
  summaryViewMode: "preview" | "raw";
  onSummaryViewModeChange: (mode: "preview" | "raw") => void;
}

export function DocumentAnalysisPanel({
  activeFile,
  translation,
  summaryViewMode,
  onSummaryViewModeChange,
}: DocumentAnalysisPanelProps) {
  const isAudioOrVideo = activeFile.mimeType.includes("audio") ||
    activeFile.mimeType.includes("video") ||
    /\.(m4a|mp3|wav|ogg|flac|aac|mp4|webm)$/i.test(activeFile.name);

  return (
    <Card className="p-6 md:p-8 flex flex-col gap-4 animate-fade-in border border-[var(--color-border-subtle)] rounded-[12px]">
      <div className="border-b border-[var(--color-border-subtle)] pb-3">
        <h3 className="text-[20px] font-semibold text-[var(--color-text-primary)] flex items-center gap-2 font-display">
          <FileCheck className="text-[var(--color-secondary)]" size={20} />
          AI Summary & Document Analysis
        </h3>
        <p className="text-[14px] text-[var(--color-text-secondary)] mt-1">
          Detailed text extracted and summarized by AI in a study-friendly style.
        </p>
      </div>

      {/* Replay original audio/video */}
      {activeFile.objectUrl && isAudioOrVideo && (
        <div className="bg-[var(--color-surface-container-low)] border border-[var(--color-border-subtle)] p-4 rounded-[12px] flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.6px] font-medium text-[var(--color-text-secondary)] flex items-center gap-1.5">
            🎧 Replay original uploaded file
          </span>
          {activeFile.mimeType.includes("video") || /\.(mp4|webm|mov|avi|mkv)$/i.test(activeFile.name) ? (
            <video
              src={activeFile.objectUrl}
              controls
              className="w-full rounded-[8px] max-h-[260px] bg-black"
            />
          ) : (
            <audio src={activeFile.objectUrl} controls className="w-full" />
          )}
        </div>
      )}

      {/* Multi-language Translation Portal */}
      <div className="bg-[var(--color-surface-container-low)] border border-[var(--color-border-subtle)] p-4 rounded-[12px] flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-[8px] bg-[var(--color-on-primary-container)]/40 text-[var(--color-primary-hover)] flex items-center justify-center flex-shrink-0">
              <Languages size={16} />
            </div>
            <div>
              <h4 className="text-[14px] font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5 flex-wrap">
                Multilingual Translation 🌐
                {isAudioOrVideo && (
                  <span className="px-2 py-0.5 bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] rounded-[4px] text-[11px] font-bold">
                    🎵 AUDIO SUPPORTED
                  </span>
                )}
              </h4>
              <p className="text-[13px] text-[var(--color-text-secondary)]">
                Translate the AI summary or raw transcript into multiple languages.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={translation.translateSourceField}
              onChange={(e) => translation.changeSourceField(e.target.value as any)}
              className="py-[10px] px-[14px] bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-[8px] text-[14px] font-medium text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
            >
              <option value="extractedText">Source: OCR / Transcript</option>
              <option value="summary">Source: AI Summary</option>
            </select>

            <span className="text-[var(--color-text-secondary)] text-[14px]">➜</span>

            <select
              value={translation.translateTargetLang}
              onChange={(e) => translation.changeTargetLang(e.target.value)}
              className="py-[10px] px-[14px] bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-[8px] text-[14px] font-medium text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>

            <Button
              variant="primary"
              size="sm"
              onClick={translation.handleTranslate}
              disabled={translation.isTranslating}
              icon={
                translation.isTranslating ? (
                  <RefreshCw className="animate-spin" />
                ) : undefined
              }
            >
              {translation.isTranslating ? "Translating..." : "Translate"}
            </Button>
          </div>
        </div>

        {/* Translation result */}
        {translation.translatedText && (
          <Card className="p-4 mt-2 border border-[var(--color-on-primary-container)]/50 bg-[var(--color-surface)] animate-fade-in rounded-[8px]">
            <div className="flex justify-between items-center border-b border-[var(--color-border-subtle)] pb-2 mb-2">
              <span className="text-[12px] font-bold text-[var(--color-primary-hover)] uppercase tracking-wider flex items-center gap-1">
                🌎 TRANSLATION:{" "}
                {LANGUAGE_NAME_MAP[translation.translateTargetLang] ||
                  translation.translateTargetLang}
              </span>
              <button
                onClick={() =>
                  navigator.clipboard.writeText(translation.translatedText)
                }
                className="text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] flex items-center gap-1 transition-colors"
              >
                <Copy size={14} /> Copy
              </button>
            </div>
            {/* Interpreter: read the translation aloud */}
            <ReadAloudText
              text={translation.translatedText}
              lang={
                (
                  {
                    vi: "vi-VN", en: "en-US", ja: "ja-JP", ko: "ko-KR", zh: "zh-CN", fr: "fr-FR",
                    de: "de-DE", es: "es-ES", ru: "ru-RU", it: "it-IT", pt: "pt-BR", th: "th-TH",
                    id: "id-ID", ar: "ar-SA", hi: "hi-IN",
                  } as Record<string, string>
                )[translation.translateTargetLang] || "vi-VN"
              }
              forceLang
              textClassName="prose max-w-none text-[var(--color-text-primary)] font-sans leading-relaxed whitespace-pre-wrap select-text"
            />
          </Card>
        )}

        {translation.translationError && (
          <div className="bg-[var(--color-error-soft)] text-[var(--color-error)] border border-[var(--color-error)]/30 p-3 rounded-[8px] text-[14px] font-medium">
            ⚠️ Translation error: {translation.translationError}
          </div>
        )}
      </div>

      {/* OCR + Summary panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[15px] leading-[1.55]">
        <Card className="p-5 overflow-y-auto max-h-[450px] border border-[var(--color-border-subtle)] rounded-[8px]">
          <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-[var(--color-border-subtle)]">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.6px] font-semibold text-[var(--color-text-secondary)]">
                AI Summary (Markdown)
              </span>
              <div className="flex items-center rounded-md bg-[var(--color-neutral-soft)] p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => onSummaryViewModeChange("preview")}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    summaryViewMode === "preview"
                      ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  ✨ Trực quan
                </button>
                <button
                  type="button"
                  onClick={() => onSummaryViewModeChange("raw")}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    summaryViewMode === "raw"
                      ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  📄 Mã gốc
                </button>
              </div>
            </div>
            <CopyButton text={activeFile.summary} />
          </div>

          {summaryViewMode === "preview" ? (
            <Markdown
              text={activeFile.summary}
              className="text-[15px] text-[var(--color-text-primary)] select-text"
            />
          ) : (
            <pre className="text-[12px] font-mono whitespace-pre-wrap p-3 rounded-md bg-[var(--color-neutral-soft)] text-[var(--color-text-secondary)] leading-relaxed select-text overflow-x-auto">
              {activeFile.summary}
            </pre>
          )}
        </Card>

        <Card className="p-5 border border-[var(--color-border-subtle)] rounded-[8px]">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] uppercase tracking-[0.6px] font-medium text-[var(--color-text-secondary)]">
              Extracted Text — OCR / Audio Transcription
            </span>
            <CopyButton text={activeFile.extractedText} />
          </div>
          <ReadAloudText
            text={activeFile.extractedText}
            textClassName="text-[var(--color-text-secondary)] whitespace-pre-wrap font-mono text-[13px] leading-[1.6] select-text"
          />
        </Card>
      </div>
    </Card>
  );
}
