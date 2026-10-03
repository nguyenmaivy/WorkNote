import React, { useRef, useEffect, useState } from "react";
import type { UploadedFile } from "../types";
import { Bot, History, PanelRight } from "lucide-react";
import { ACCENT_OPTIONS } from "../constants";
import { useChatbot } from "../hooks/useChatbot";
import { ChatRecentSessions } from "./chatbot/ChatRecentSessions";
import { ChatContextPicker } from "./chatbot/ChatContextPicker";
import { ChatComposer } from "./chatbot/ChatComposer";
import { ChatMessageList } from "./chatbot/ChatMessageList";

interface ChatbotSectionProps {
  files: UploadedFile[];
  activeFile: UploadedFile | null;
  onSelectActiveFile: (id: string) => void;
}

export default function ChatbotSection({
  files,
  activeFile,
  onSelectActiveFile,
}: ChatbotSectionProps) {
  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    activeSession,
    contextFiles,
    userInput,
    setUserInput,
    loading,
    selectedAccent,
    setSelectedAccent,
    isPlayingVoice,
    copiedId,
    feedbackMap,
    createNewSession,
    deleteSession,
    addToContext,
    removeFromContext,
    handleSendMessage,
    handleCopy,
    setFeedback,
    handleTTSPlay,
    handleMic,
  } = useChatbot(files, activeFile, onSelectActiveFile);

  const [showRecentMobile, setShowRecentMobile] = useState(false);
  const [showContextMobile, setShowContextMobile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages.length, loading]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 192)}px`;
    }
  }, [userInput]);

  const handleAttachedFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleSendMessage(`📎 (Attached: ${file.name}). For full analysis, please upload via the Library tab first.`);
    e.target.value = "";
  };

  const messages = activeSession?.messages ?? [];

  return (
    <div className="flex h-full bg-[var(--color-surface-bright)]">
      {/* LEFT PANEL */}
      <ChatRecentSessions
        sessions={sessions}
        activeSessionId={activeSessionId}
        showRecentMobile={showRecentMobile}
        onSetActiveSessionId={(id) => {
          setActiveSessionId(id);
          setShowRecentMobile(false);
        }}
        onCreateNewSession={() => {
          createNewSession();
          setShowRecentMobile(false);
        }}
        onDeleteSession={deleteSession}
      />

      {/* CENTER PANEL */}
      <section className="flex-1 flex flex-col relative h-full min-w-0">
        <div className="h-16 border-b border-[var(--color-surface-container-high)] flex items-center justify-between px-6 bg-[var(--color-surface)] z-10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[var(--color-primary-fixed)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
              <Bot size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="text-[18px] font-semibold text-[var(--color-text-primary)] truncate font-display">
                Gemini AI Assistant
              </h1>
              <p className="text-[12px] text-[var(--color-secondary)] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--color-secondary)]" />
                Online
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <select
              value={selectedAccent}
              onChange={(e) => setSelectedAccent(e.target.value as any)}
              title="Voice accent for TTS"
              className="hidden md:block text-[12px] font-medium border border-[var(--color-outline-variant)] bg-[var(--color-surface)] rounded-[8px] px-2 py-1.5 focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
            >
              {ACCENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.emoji} {opt.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowRecentMobile(true)}
              className="p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-container-low)] rounded-full transition-colors xl:hidden"
              title="Recent chats"
            >
              <History size={20} />
            </button>
            <button
              onClick={() => setShowContextMobile(true)}
              className="p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-container-low)] rounded-full transition-colors lg:hidden"
              title="Active context"
            >
              <PanelRight size={20} />
            </button>
          </div>
        </div>

        <ChatMessageList
          messages={messages}
          contextFiles={contextFiles}
          loading={loading}
          copiedId={copiedId}
          feedbackMap={feedbackMap}
          isPlayingVoice={isPlayingVoice}
          messagesEndRef={messagesEndRef}
          onSendMessage={handleSendMessage}
          onCopy={handleCopy}
          onFeedback={setFeedback}
          onTTSPlay={handleTTSPlay}
        />

        <ChatComposer
          userInput={userInput}
          setUserInput={setUserInput}
          loading={loading}
          onSendMessage={() => handleSendMessage()}
          onAttachFile={() => fileInputRef.current?.click()}
          onMicInput={handleMic}
          textareaRef={textareaRef}
          fileInputRef={fileInputRef}
          onAttachedFileChange={handleAttachedFile}
        />
      </section>

      {/* RIGHT PANEL */}
      <ChatContextPicker
        showContextMobile={showContextMobile}
        setShowContextMobile={setShowContextMobile}
        contextFiles={contextFiles}
        files={files}
        onRemoveFromContext={removeFromContext}
        onAddToContext={addToContext}
        selectedAccent={selectedAccent}
        onSelectAccent={setSelectedAccent}
      />
    </div>
  );
}
