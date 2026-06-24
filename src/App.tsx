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
import AiVideoLab, { isVideoFile } from "./components/AiVideoLab";

import { Button } from "./components/ui/Button";
import { Card } from "./components/ui/Card";
import { CopyButton } from "./components/ui/CopyButton";
import { ReadAloudText } from "./components/ui/ReadAloudText";

import {
  CloudLightning,
  FileCheck,
  Copy,
  Languages,
  RefreshCw,
  Menu,
  Search,
  Bell,
  CircleUserRound,
  Settings,
  HelpCircle,
  Plus,
  X,
} from "lucide-react";

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabId>("upload");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Custom hooks — tách toàn bộ logic phức tạp (KHÔNG đổi)
  const { hasApiKey } = useApiStatus();
  const { files, activeFileId, activeFile, setActiveFileId, handleAddFile, handleUpdateFile, handleRemoveFile } =
    useFileManager();
  const translation = useTranslation(activeFile);

  const activeTab = TABS.find((t) => t.id === currentTab);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] font-sans antialiased overflow-x-hidden">
      {/* ── Demo Banner ─────────────────────────────────────────── */}
      {!hasApiKey && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2.5 text-[13px] font-medium text-center flex items-center justify-center gap-2 shadow-sm border-b border-amber-600/20">
          <span>⚠️ Demo mode active. Set</span>
          <code className="bg-amber-600/30 px-1.5 py-0.5 rounded text-amber-950 font-bold">
            GEMINI_API_KEY
          </code>
          <span>
            in <strong>Settings &gt; Secrets</strong> to enable real Gemini processing.
          </span>
        </div>
      )}

      {/* ── Top App Bar — Stitch-faithful: brand left, search+bell+account right ── */}
      <header className="bg-[var(--color-surface)]/85 backdrop-blur-md fixed top-0 left-0 right-0 z-50 shadow-sm border-b border-[var(--color-border-subtle)]">
        <div className="flex justify-between items-center px-6 mx-auto h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)]"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <span className="text-[24px] md:text-[28px] font-bold text-[var(--color-primary)] tracking-[-0.02em] font-display leading-none">
              VietLearn AI Lab
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative hidden md:block">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
              />
              <input
                className="pl-10 pr-4 py-2 bg-[var(--color-surface-container-low)] rounded-full border-none text-[14px] focus:ring-2 focus:ring-[var(--color-primary)] w-64 outline-none placeholder:text-[var(--color-text-secondary)]"
                placeholder="Search..."
                type="text"
              />
            </div>
            <button
              title={hasApiKey ? "Gemini Active" : "Local Mock — chưa cấu hình API key"}
              className={`p-2 rounded-full hover:bg-[var(--color-surface-container-low)] transition-colors ${
                hasApiKey ? "text-[var(--color-secondary)]" : "text-[var(--color-text-secondary)]"
              }`}
            >
              <CloudLightning size={20} />
            </button>
            <button className="p-2 rounded-full hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">
              <Bell size={20} />
            </button>
            <button className="p-2 rounded-full hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">
              <CircleUserRound size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Layout: Sidebar + Main ─────────────────────────────── */}
      <div className="flex pt-16 min-h-screen">
        {/* Sidebar — desktop persistent, mobile drawer */}
        <aside
          className={`bg-[var(--color-surface)] text-[var(--color-text-primary)] w-64 fixed left-0 top-16 bottom-0 flex flex-col shadow-sm border-r border-[var(--color-border-subtle)] z-40 transition-transform duration-300
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        >
          <div className="p-4 flex flex-col gap-2 h-full overflow-y-auto">
            {/* Mobile close button */}
            <div className="lg:hidden flex justify-end">
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--color-neutral-soft)] text-[var(--color-text-secondary)]"
              >
                <X size={20} />
              </button>
            </div>

            {/* Hub header — avatar + Learning Hub title (Stitch style) */}
            <div className="flex items-center gap-3 mb-6 p-2">
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary-fixed)] flex items-center justify-center text-[var(--color-primary)] shrink-0 overflow-hidden">
                <CircleUserRound size={28} strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <div className="text-[16px] font-semibold text-[var(--color-text-primary)] leading-tight truncate font-display">
                  Learning Hub
                </div>
                <div className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">
                  Academic Level {Math.min(files.length, 9) + 1}
                </div>
              </div>
            </div>

            {/* New Study Session CTA */}
            <button
              onClick={() => {
                setCurrentTab("upload");
                setSidebarOpen(false);
              }}
              className="bg-[var(--color-primary)] text-white text-[14px] font-medium py-2.5 px-4 rounded-full w-full mb-3 hover:bg-[var(--color-primary-hover)] transition-colors flex items-center justify-center gap-1.5 shadow-[var(--shadow-primary-glow)]"
            >
              <Plus size={16} />
              New Study Session
            </button>

            {/* Tab navigation — full-fill active style per Stitch DESIGN.md */}
            <nav className="flex-1 flex flex-col gap-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setCurrentTab(tab.id);
                      setSidebarOpen(false);
                    }}
                    className={`relative rounded-[8px] flex items-center gap-3 px-3 py-2.5 text-[14px] transition-all duration-200 text-left active:scale-[0.98] ${
                      isActive
                        ? "bg-[var(--color-primary)] text-white font-semibold shadow-[var(--shadow-primary-glow)]"
                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-container-low)] hover:text-[var(--color-text-primary)] font-medium"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="nav-active-bg"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        className="absolute inset-0 rounded-[8px] bg-[var(--color-primary)] -z-10"
                      />
                    )}
                    <Icon size={18} className="relative z-10" />
                    <span className="flex-1 relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Footer links */}
            <div className="mt-auto pt-3 border-t border-[var(--color-border-subtle)] flex flex-col gap-1">
              <a
                className="text-[var(--color-text-secondary)] hover:bg-[var(--color-neutral-soft)] rounded-[8px] flex items-center gap-3 px-3 py-2.5 text-[14px] transition-colors"
                href="#"
              >
                <Settings size={18} />
                Settings
              </a>
              <a
                className="text-[var(--color-text-secondary)] hover:bg-[var(--color-neutral-soft)] rounded-[8px] flex items-center gap-3 px-3 py-2.5 text-[14px] transition-colors"
                href="#"
              >
                <HelpCircle size={18} />
                Help
              </a>
            </div>
          </div>
        </aside>

        {/* Mobile overlay backdrop */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-30 top-16"
          />
        )}

        {/* ── Main content area ──────────────────────────────── */}
        <main
          className={`flex-1 lg:ml-64 bg-[var(--color-surface-container-lowest)] ${
            activeTab?.fullBleed
              ? "h-[calc(100vh-64px)] overflow-hidden"
              : "px-4 md:px-6 lg:px-12 py-6 lg:py-10 min-h-[calc(100vh-64px)]"
          }`}
        >
          <div
            className={activeTab?.fullBleed ? "h-full" : "max-w-[1280px] mx-auto space-y-8"}
          >
            {/* Page header (skipped for fullBleed tabs) */}
            {!activeTab?.fullBleed && (
              <div>
                <h1 className="text-[32px] md:text-[40px] lg:text-[48px] font-bold text-[var(--color-text-primary)] leading-[1.1] tracking-[-0.02em] font-display mb-2">
                  {activeTab?.pageTitle ?? activeTab?.label}
                </h1>
                <p className="text-[16px] md:text-[18px] text-[var(--color-text-secondary)] leading-relaxed max-w-2xl">
                  {activeTab?.desc}
                </p>
              </div>
            )}

            {/* Active document info strip (only on non-fullBleed non-upload tabs) */}
            {activeFile && currentTab !== "upload" && !activeTab?.fullBleed && (
              <Card className="px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-fade-in border border-[var(--color-border-subtle)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[8px] bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] flex items-center justify-center">
                    <FileCheck size={18} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="text-[12px] text-[var(--color-text-secondary)] font-medium uppercase tracking-wider">
                      Active Document
                    </p>
                    <p className="text-[15px] font-semibold truncate max-w-[220px] md:max-w-[420px] text-[var(--color-text-primary)]">
                      {activeFile.name}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setCurrentTab("upload")}>
                  Change document
                </Button>
              </Card>
            )}

            {/* Tab content */}
            <motion.div
              key={currentTab}
              initial={{ opacity: 0.6, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={activeTab?.fullBleed ? "h-full" : ""}
            >
              {currentTab === "upload" && (
                <ErrorBoundary label="Document Library">
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
                <ErrorBoundary label="AI Chatbot">
                  <ChatbotSection
                    files={files}
                    activeFile={activeFile}
                    onSelectActiveFile={setActiveFileId}
                  />
                </ErrorBoundary>
              )}

              {currentTab === "mindmap" && (
                <ErrorBoundary label="Mind Maps">
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
                <ErrorBoundary label="RPG Games">
                  <EduGamePlayground quizList={activeFile?.quiz} />
                </ErrorBoundary>
              )}

              {currentTab === "audiolab" && (
                <ErrorBoundary label="Audio Lab">
                  <AudioSpeechLab />
                </ErrorBoundary>
              )}

              {currentTab === "knowledge" && (
                <ErrorBoundary label="Knowledge Hub">
                  <FullstackKnowledgeBase />
                </ErrorBoundary>
              )}

              {currentTab === "budget" && (
                <ErrorBoundary label="Spending Diary">
                  <StudentBudgetTracker />
                </ErrorBoundary>
              )}
            </motion.div>

            {/* AI Video Lab — video / YouTube links open in the dedicated lab */}
            {currentTab === "upload" && activeFile && activeFile.status === "success" && isVideoFile(activeFile) && (
              <div className="space-y-4 animate-fade-in">
                <div className="border-b border-[var(--color-border-subtle)] pb-3">
                  <h3 className="text-[20px] font-semibold text-[var(--color-text-primary)] flex items-center gap-2 font-display">
                    <FileCheck className="text-[var(--color-secondary)]" size={20} />
                    AI Video Lab
                  </h3>
                  <p className="text-[14px] text-[var(--color-text-secondary)] mt-1">
                    Video phát trực tiếp với phụ đề song ngữ thời gian thực và phân tích AI.
                  </p>
                </div>
                <AiVideoLab file={activeFile} />
              </div>
            )}

            {/* Summary & Translation — documents (non-video) with active file */}
            {currentTab === "upload" && activeFile && !isVideoFile(activeFile) && (
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
                {activeFile.objectUrl &&
                  (activeFile.mimeType.includes("audio") || activeFile.mimeType.includes("video")) && (
                    <div className="bg-[var(--color-surface-container-low)] border border-[var(--color-border-subtle)] p-4 rounded-[12px] flex flex-col gap-2">
                      <span className="text-[11px] uppercase tracking-[0.6px] font-medium text-[var(--color-text-secondary)] flex items-center gap-1.5">
                        🎧 Replay original uploaded file
                      </span>
                      {activeFile.mimeType.includes("video") ? (
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
                          {(activeFile.mimeType.includes("audio") ||
                            activeFile.mimeType.includes("mp3") ||
                            activeFile.mimeType.includes("wav")) && (
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
                      <div className="prose max-w-none text-[var(--color-text-primary)] font-sans leading-relaxed whitespace-pre-wrap">
                        {translation.translatedText}
                      </div>
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
                  <Card className="p-5 overflow-y-auto max-h-[350px] border border-[var(--color-border-subtle)] rounded-[8px]">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] uppercase tracking-[0.6px] font-medium text-[var(--color-text-secondary)]">
                        AI Summary (Markdown)
                      </span>
                      <CopyButton text={activeFile.summary} />
                    </div>
                    <div className="prose max-w-none text-[var(--color-text-secondary)] whitespace-pre-wrap select-text">
                      {activeFile.summary}
                    </div>
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
            )}
          </div>

          {/* Footer */}
          <footer className="mt-12 pt-8 pb-4 text-center text-[14px] text-[var(--color-text-secondary)] border-t border-[var(--color-border-subtle)]">
            <p className="font-semibold text-[var(--color-text-primary)] text-[15px]">
              © 2026 VietLearn AI Studio • Built with Artificial Intelligence
            </p>
            <p className="mt-2">
              Powered by Google Gemini and TTS. All data stored locally and securely.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
