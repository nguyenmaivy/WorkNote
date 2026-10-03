import React, { useState } from "react";
import { motion } from "motion/react";
import type { TabId } from "./types";
import { useApiStatus } from "./hooks/useApiStatus";
import { useFileManager } from "./hooks/useFileManager";
import { useTranslation } from "./hooks/useTranslation";
import { TABS } from "./constants";
import ErrorBoundary from "./components/ErrorBoundary";

import DocUploadSection from "./components/DocUploadSection";
import ChatbotSection from "./components/ChatbotSection";
import MindMapWorkspace from "./components/MindMapWorkspace";
import EduGamePlayground from "./components/EduGamePlayground";
import AudioSpeechLab from "./components/AudioSpeechLab";
import FullstackKnowledgeBase from "./components/FullstackKnowledgeBase";
import StudentBudgetTracker from "./components/StudentBudgetTracker";
import NotebookWorkspace from "./components/NotebookWorkspace";
import AiVideoLab, { isVideoFile } from "./components/AiVideoLab";
import UserProfileSettings, { getUserProfile, type UserProfile } from "./components/UserProfileSettings";
import { DocumentAnalysisPanel } from "./components/DocumentAnalysisPanel";

import { AppHeader } from "./components/layout/AppHeader";
import { AppSidebar } from "./components/layout/AppSidebar";
import { FileCheck } from "lucide-react";

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabId>("upload");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(() => getUserProfile());
  const [summaryViewMode, setSummaryViewMode] = useState<"preview" | "raw">("preview");

  // Custom hooks
  const { hasApiKey } = useApiStatus();
  const { files, activeFileId, activeFile, setActiveFileId, handleAddFile, handleUpdateFile, handleRemoveFile } =
    useFileManager();
  const translation = useTranslation(activeFile);

  const activeTab = TABS.find((t) => t.id === currentTab);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] font-sans antialiased overflow-x-hidden">
      {/* Demo Banner */}
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

      {/* Top App Bar */}
      <AppHeader
        hasApiKey={hasApiKey}
        userProfile={userProfile}
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Layout: Sidebar + Main */}
      <div className="flex pt-16 min-h-screen">
        <AppSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          userProfile={userProfile}
          files={files}
        />

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-4 md:p-8 bg-[var(--color-surface-container-lowest)] overflow-y-auto lg:ml-64 transition-all duration-300 flex flex-col min-h-[calc(100vh-4rem)]">
          <div className="max-w-[1440px] mx-auto w-full flex-1">
            <header className="mb-8 animate-fade-in">
              <h1 className="text-[32px] md:text-[40px] font-bold text-[var(--color-text-primary)] tracking-[-0.03em] leading-[1.1] font-display">
                {activeTab?.pageTitle}
              </h1>
              <p className="text-[15px] text-[var(--color-text-secondary)] mt-3 max-w-2xl leading-relaxed">
                {activeTab?.desc}
              </p>
            </header>

            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
              className="w-full flex flex-col gap-6"
            >
              {currentTab === "upload" && (
                <DocUploadSection
                  files={files}
                  activeFileId={activeFileId}
                  onAddFile={handleAddFile}
                  onUpdateFile={handleUpdateFile}
                  onDeleteFile={handleRemoveFile}
                  onSelectActiveFile={setActiveFileId}
                />
              )}

              {currentTab === "chat" && (
                <ErrorBoundary label="Chatbot AI">
                  <ChatbotSection
                    files={files}
                    activeFile={activeFile}
                    onSelectActiveFile={setActiveFileId}
                  />
                </ErrorBoundary>
              )}

              {currentTab === "mindmap" && (
                <ErrorBoundary label="Mindmap">
                  <MindMapWorkspace
                    files={files}
                    activeFileId={activeFileId}
                    onSelectActiveFile={setActiveFileId}
                    onUpdateFile={handleUpdateFile}
                  />
                </ErrorBoundary>
              )}

              {currentTab === "game" && (
                <ErrorBoundary label="Quiz & Game">
                  <EduGamePlayground quizList={activeFile?.quiz} />
                </ErrorBoundary>
              )}

              {currentTab === "audiolab" && (
                <ErrorBoundary label="Audio Lab">
                  <AudioSpeechLab />
                </ErrorBoundary>
              )}

              {currentTab === "knowledge" && (
                <ErrorBoundary label="Knowledge Base">
                  <FullstackKnowledgeBase />
                </ErrorBoundary>
              )}

              {currentTab === "budget" && (
                <ErrorBoundary label="Student Budget">
                  <StudentBudgetTracker />
                </ErrorBoundary>
              )}

              {currentTab === "notebook" && (
                <ErrorBoundary label="NotebookLM">
                  <NotebookWorkspace />
                </ErrorBoundary>
              )}
            </motion.div>

            {/* AI Video Lab — video / YouTube links open in the dedicated lab */}
            {currentTab === "upload" && activeFile && activeFile.status === "success" && isVideoFile(activeFile) && (
              <div className="space-y-4 animate-fade-in mt-6">
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
              <div className="mt-6">
                <DocumentAnalysisPanel
                  activeFile={activeFile}
                  translation={translation}
                  summaryViewMode={summaryViewMode}
                  onSummaryViewModeChange={setSummaryViewMode}
                />
              </div>
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

      {/* User Profile Settings Modal */}
      <UserProfileSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onProfileUpdate={(p) => setUserProfile(p)}
      />
    </div>
  );
}
