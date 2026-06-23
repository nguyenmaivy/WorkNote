import React, { useState } from "react";
import { motion } from "motion/react";
import type { TabId } from "./types";
import { useApiStatus } from "./hooks/useApiStatus";
import { useFileManager } from "./hooks/useFileManager";
import { useTranslation } from "./hooks/useTranslation";
import { TABS, SUPPORTED_LANGUAGES, LANGUAGE_NAME_MAP } from "./constants";
import ErrorBoundary from "./components/ErrorBoundary";

import DocUploadSection from "./components/DocUploadSection";
import ChatbotSection from "./components/ChatbotSection";
import MindMapViewer from "./components/MindMapViewer";
import EduGamePlayground from "./components/EduGamePlayground";
import AudioSpeechLab from "./components/AudioSpeechLab";
import FullstackKnowledgeBase from "./components/FullstackKnowledgeBase";
import StudentBudgetTracker from "./components/StudentBudgetTracker";

import { Button } from "./components/ui/Button";
import { Card } from "./components/ui/Card";
import { LevelBar } from "./components/ui/LevelBar";
import { CopyButton } from "./components/ui/CopyButton";
import { ReadAloudText } from "./components/ui/ReadAloudText";

import {
  Sparkles,
  CloudLightning,
  FileCheck,
  FolderOpen,
  Copy,
  Languages,
  RefreshCw,
} from "lucide-react";

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabId>("upload");

  // Custom hooks — tách toàn bộ logic phức tạp
  const { hasApiKey } = useApiStatus();
  const { files, activeFileId, activeFile, setActiveFileId, handleAddFile, handleUpdateFile, handleRemoveFile } =
    useFileManager();
  const translation = useTranslation(activeFile);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] font-sans flex flex-col antialiased overflow-x-hidden">
      {/* Demo Banner */}
      {!hasApiKey && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2.5 text-[13px] font-bold text-center flex items-center justify-center gap-2 shadow-sm border-b border-amber-600/20">
          <span>⚠️ Chế độ Demo Trực Quan sẵn sàng! Hãy cấu hình</span>
          <code className="bg-amber-600/30 px-1.5 py-0.5 rounded text-amber-950 font-black">
            GEMINI_API_KEY
          </code>
          <span>
            trong <strong>Settings &gt; Secrets</strong> trên thanh công cụ để kích hoạt xử lý tệp
            tin và giọng nói thực tế thông qua mô hình Gemini-3.5-flash siêu tốc.
          </span>
        </div>
      )}

      {/* Main Header — 72px brand bar */}
      <header className="bg-[var(--color-surface)]/90 backdrop-blur-md border-b border-[var(--color-border-subtle)] sticky top-0 z-40">
        <div className="max-w-[1280px] mx-auto px-6 h-[72px] flex items-center justify-between gap-6">
          {/* Brand mark */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[var(--color-primary)] to-[#a855f7] flex items-center justify-center text-white shadow-[var(--shadow-primary-glow)]">
              <Sparkles size={20} />
            </div>
            <span className="text-[20px] font-bold text-[var(--color-text-primary)] tracking-[-0.03em] font-display">
              VietLearn AI Lab
            </span>
            <span className="hidden sm:inline text-[11px] font-bold text-[var(--color-primary-hover)] bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
              v3.5
            </span>
          </div>

          {/* Status pills */}
          <div className="flex items-center gap-2">
            <LevelBar files={files} />
            <div className="hidden md:flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-text-secondary)] bg-[var(--color-neutral-soft)] rounded-full py-1 px-3">
              <FolderOpen size={12} />
              <span>{files.length} tài liệu</span>
            </div>
            <div className={`flex items-center gap-1.5 text-[12px] font-medium rounded-full py-1 px-3 ${hasApiKey ? "text-[var(--color-success)] bg-[var(--color-success-soft)]" : "text-[var(--color-neutral)] bg-[var(--color-neutral-soft)]"}`}>
              <CloudLightning size={12} />
              <span>{hasApiKey ? "Gemini-Active" : "Local Mock"}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tab navigation — sticky below header */}
      <nav className="bg-[var(--color-surface)]/90 backdrop-blur-md border-b border-[var(--color-border-subtle)] sticky top-[72px] z-30">
        <div className="max-w-[1280px] mx-auto px-6 overflow-x-auto scrollbar-hide flex h-14 gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`relative h-full px-4 rounded-t-[8px] font-semibold text-[15px] transition-colors flex items-center gap-2 shrink-0 ${
                  isActive
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-neutral-soft)]"
                }`}
              >
                <Icon size={17} />
                <span>{tab.label}</span>
                {isActive && (
                  <motion.span
                    layoutId="nav-underline"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                    className="absolute left-3 right-3 -bottom-px h-[3px] rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[#a855f7]"
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Workspace */}
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-6 py-8 md:py-12">

        {/* ── Editorial page heading ── */}
        <div className="mb-8 md:mb-10">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--color-neutral)] mb-3">
            {TABS.find(t => t.id === currentTab)?.desc}
          </p>
          <h1 className="text-[36px] md:text-[48px] lg:text-[56px] font-bold text-[var(--color-text-primary)] leading-[1.05] tracking-[-0.04em]">
            {TABS.find(t => t.id === currentTab)?.label}
          </h1>
        </div>

        {/* Active document info strip */}
        {activeFile && currentTab !== "upload" && (
          <Card className="mb-8 px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[6px] bg-[var(--color-neutral-soft)] flex items-center justify-center text-[var(--color-text-secondary)]">
                <FileCheck size={17} />
              </div>
              <div className="flex flex-col min-w-0">
                <p className="text-[12px] text-[var(--color-neutral)] font-medium uppercase tracking-wider">Tài liệu đang hoạt động</p>
                <p className="text-[15px] font-bold truncate max-w-[220px] md:max-w-[420px] text-[var(--color-text-primary)]">
                  {activeFile.name}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentTab("upload")}
            >
              Đổi tài liệu
            </Button>
          </Card>
        )}

        {/* Tab Content */}
        <motion.div
          key={currentTab}
          initial={{ opacity: 0.6, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {currentTab === "upload" && (
            <ErrorBoundary label="Tài Liệu & OCR">
              <DocUploadSection
                files={files}
                onAddFile={handleAddFile}
                onUpdateFile={handleUpdateFile}
                onDeleteFile={handleRemoveFile}
                activeFileId={activeFileId}
                onSelectActiveFile={setActiveFileId}
              />
            </ErrorBoundary>
          )}

          {currentTab === "chat" && (
            <ErrorBoundary label="Trợ Lý AI">
              <ChatbotSection activeFile={activeFile} />
            </ErrorBoundary>
          )}

          {currentTab === "mindmap" && (
            <ErrorBoundary label="Sơ Đồ Tư Duy">
              <MindMapViewer
                initialData={activeFile?.mindmap}
                onUpdate={(updatedTree) => {
                  if (activeFileId) {
                    handleUpdateFile(activeFileId, { mindmap: updatedTree });
                  }
                }}
              />
            </ErrorBoundary>
          )}

          {currentTab === "game" && (
            <ErrorBoundary label="Trò Chơi 2D & Quiz">
              <EduGamePlayground quizList={activeFile?.quiz} />
            </ErrorBoundary>
          )}

          {currentTab === "audiolab" && (
            <ErrorBoundary label="Lab Âm Thanh">
              <AudioSpeechLab />
            </ErrorBoundary>
          )}

          {currentTab === "knowledge" && (
            <ErrorBoundary label="Thư Viện Kỹ Thuật">
              <FullstackKnowledgeBase />
            </ErrorBoundary>
          )}

          {currentTab === "budget" && (
            <ErrorBoundary label="Sổ Chi Tiêu">
              <StudentBudgetTracker />
            </ErrorBoundary>
          )}
        </motion.div>

        {/* Summary & Translation section (upload tab + active file) */}
        {currentTab === "upload" && activeFile && (
          <Card className="mt-[48px] p-6 md:p-8 flex flex-col gap-4 animate-fade-in">
            <div className="border-b border-[var(--color-border-subtle)] pb-3">
              <h3 className="text-[20px] font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <FileCheck className="text-[var(--color-success)]" size={20} />
                Phần Tóm Tắt & Nội Dung Tài Liệu Phân Tích
              </h3>
              <p className="text-[14px] text-[var(--color-neutral)] mt-0.5">
                Văn bản chi tiết được AI trích xuất và tóm tắt theo phong cách dễ học.
              </p>
            </div>

            {/* Nghe lại file gốc — đối chiếu xem AI bóc tách có đúng không */}
            {activeFile.objectUrl &&
              (activeFile.mimeType.includes("audio") || activeFile.mimeType.includes("video")) && (
                <div className="bg-[var(--color-surface)] border border-[var(--color-border-subtle)] p-4 rounded-[12px] flex flex-col gap-2">
                  <span className="text-[11px] uppercase tracking-[0.6px] font-medium text-[var(--color-neutral)] flex items-center gap-1.5">
                    🎧 Nghe lại file gốc đã tải lên
                  </span>
                  {activeFile.mimeType.includes("video") ? (
                    <video src={activeFile.objectUrl} controls className="w-full rounded-[8px] max-h-[260px] bg-black" />
                  ) : (
                    <audio src={activeFile.objectUrl} controls className="w-full" />
                  )}
                </div>
              )}

            {/* Multi-language Translation Portal */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border-subtle)] p-4 rounded-[12px] flex flex-col gap-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[8px] bg-indigo-100 text-[var(--color-primary-hover)] flex items-center justify-center flex-shrink-0">
                    <Languages size={15} />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-[var(--color-text-primary)] flex items-center gap-1.5 flex-wrap">
                      Dịch Thuật Đa Ngôn Ngữ (Hỗ trợ Audio & Tài liệu) 🌐
                      {(activeFile.mimeType.includes("audio") ||
                        activeFile.mimeType.includes("mp3") ||
                        activeFile.mimeType.includes("wav")) && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-[4px] text-[11px] font-bold">
                          🎵 HỖ TRỢ FILE ÂM THANH
                        </span>
                      )}
                    </h4>
                    <p className="text-[13px] text-[var(--color-text-secondary)]">
                      Dịch thuật bài tóm tắt tổng quan hoặc nội dung ghi âm chính xác sang nhiều
                      ngôn ngữ khác nhau.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={translation.translateSourceField}
                    onChange={(e) => translation.changeSourceField(e.target.value as any)}
                    className="py-[10px] px-[14px] bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-[6px] text-[14px] font-medium text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="extractedText">Dịch: Bản Ghi Âm / OCR</option>
                    <option value="summary">Dịch: Bản Tóm Tắt AI</option>
                  </select>

                  <span className="text-[var(--color-neutral)] text-[14px]">➜</span>

                  <select
                    value={translation.translateTargetLang}
                    onChange={(e) => translation.changeTargetLang(e.target.value)}
                    className="py-[10px] px-[14px] bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-[6px] text-[14px] font-medium text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
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
                    icon={translation.isTranslating ? <RefreshCw className="animate-spin" /> : undefined}
                  >
                    {translation.isTranslating ? "Đang dịch..." : "Dịch Ngay"}
                  </Button>
                </div>
              </div>

              {/* Translation Result */}
              {translation.translatedText && (
                <Card className="p-4 mt-2 border-indigo-100 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-indigo-50 pb-2 mb-2">
                    <span className="text-[12px] font-bold text-[var(--color-primary-hover)] uppercase tracking-wider flex items-center gap-1">
                      🌎 KẾT QUẢ DỊCH SANG:{" "}
                      {LANGUAGE_NAME_MAP[translation.translateTargetLang] ||
                        translation.translateTargetLang}
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText(translation.translatedText)}
                      className="text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] flex items-center gap-1 transition-colors"
                    >
                      <Copy size={14} /> Sao chép bản dịch
                    </button>
                  </div>
                  <div className="prose prose-indigo max-w-none text-[var(--color-text-primary)] font-sans leading-relaxed whitespace-pre-wrap">
                    {translation.translatedText}
                  </div>
                </Card>
              )}

              {translation.translationError && (
                <div className="bg-[var(--color-error-soft)] text-[var(--color-error)] border border-[var(--color-error)]/30 p-3 rounded-[8px] text-[14px] font-medium">
                  ⚠️ Có lỗi xảy ra trong quá trình dịch thuật: {translation.translationError}
                </div>
              )}
            </div>

            {/* OCR + Summary panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[32px] text-[15px] leading-[1.55]">
              <Card className="p-5 overflow-y-auto max-h-[350px]">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] uppercase tracking-[0.6px] font-medium text-[var(--color-neutral)]">
                    TÓM TẮT AI (Markdown)
                  </span>
                  <CopyButton text={activeFile.summary} />
                </div>
                <div className="prose max-w-none text-[var(--color-text-secondary)] whitespace-pre-wrap select-text">
                  {activeFile.summary}
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] uppercase tracking-[0.6px] font-medium text-[var(--color-neutral)]">
                    VĂN BẢN TRÍCH XUẤT OCR / AUDIO TRANSCRIPTION
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
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[var(--color-surface)] border-t border-[var(--color-border-subtle)] py-[48px] text-center text-[15px] text-[var(--color-text-secondary)]">
        <p className="font-bold text-[var(--color-text-primary)] text-[16px]">© 2026 VietLearn AI Studio • Xây dựng bởi Trí Tuệ Nhân Tạo</p>
        <p className="mt-[8px]">
          Sử dụng Google Gemini-3.5-flash và TTS Model. Dữ liệu lưu trữ cục bộ bảo mật.
        </p>
      </footer>
    </div>
  );
}
