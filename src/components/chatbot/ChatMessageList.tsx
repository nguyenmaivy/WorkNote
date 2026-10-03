import React from "react";
import { Bot, Check, Copy, ThumbsDown, ThumbsUp, Volume2, VolumeX } from "lucide-react";
import type { ChatMessage, UploadedFile } from "../../types";
import { QUICK_CHAT_CHIPS } from "../../constants";

interface ChatMessageListProps {
  messages: ChatMessage[];
  contextFiles: UploadedFile[];
  loading: boolean;
  copiedId: string | null;
  feedbackMap: Record<string, "up" | "down">;
  isPlayingVoice: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onSendMessage: (text: string) => void;
  onCopy: (msgId: string, content: string) => void;
  onFeedback: (msgId: string, kind: "up" | "down") => void;
  onTTSPlay: (msgId: string, content: string) => void;
}

export function ChatMessageList({
  messages,
  contextFiles,
  loading,
  copiedId,
  feedbackMap,
  isPlayingVoice,
  messagesEndRef,
  onSendMessage,
  onCopy,
  onFeedback,
  onTTSPlay,
}: ChatMessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pb-32">
      {/* AI welcome */}
      {messages.length === 0 && (
        <div className="flex items-start gap-4 max-w-4xl mx-auto">
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary-fixed)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
            <Bot size={16} />
          </div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-outline-variant)] p-4 rounded-[12px] rounded-tl-none shadow-sm flex-1">
            <p className="text-[15px] text-[var(--color-text-primary)] mb-3 leading-relaxed">
              Hello! I'm ready to help you study.
              {contextFiles.length > 0 ? (
                <>
                  {" "}I see you have{" "}
                  <strong>
                    {contextFiles.map((f) => `"${f.name}"`).join(", ")}
                  </strong>{" "}
                  open. What would you like to discuss today?
                </>
              ) : (
                <>
                  {" "}Upload a document in the Library tab or add one to the context panel on the right to ground our conversation.
                </>
              )}
            </p>
            <div className="flex gap-2 mt-3 flex-wrap">
              {QUICK_CHAT_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(chip.prompt)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-primary-fixed)] text-[var(--color-on-primary-fixed)] text-[12px] font-medium border border-[var(--color-primary-fixed-dim)] cursor-pointer hover:bg-[var(--color-primary-fixed-dim)] transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-secondary)]" />
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Conversation */}
      {messages.map((m) => {
        const isUser = m.role === "user";
        const feedback = feedbackMap[m.id];

        return (
          <div
            key={m.id}
            className={`flex items-start gap-4 max-w-4xl mx-auto animate-fade-in ${
              isUser ? "flex-row-reverse" : ""
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                isUser
                  ? "bg-[var(--color-surface-container-high)] text-[var(--color-text-secondary)]"
                  : "bg-[var(--color-primary-fixed)] text-[var(--color-primary)]"
              }`}
            >
              {isUser ? <span className="text-[12px] font-bold">You</span> : <Bot size={16} />}
            </div>
            <div
              className={`p-4 rounded-[12px] shadow-sm max-w-[calc(100%-3rem)] ${
                isUser
                  ? "bg-[var(--color-primary)] text-white rounded-tr-none"
                  : "bg-[var(--color-surface)] border border-[var(--color-outline-variant)] text-[var(--color-text-primary)] rounded-tl-none flex-1"
              }`}
            >
              <div className="text-[15px] leading-relaxed whitespace-pre-wrap">
                {m.content}
              </div>

              {!isUser && (
                <div className="mt-4 flex gap-1 -ml-1.5 pt-2 border-t border-[var(--color-outline-variant)]/40">
                  <button
                    onClick={() => onCopy(m.id, m.content)}
                    className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-container-low)] rounded transition-colors"
                    title="Copy"
                  >
                    {copiedId === m.id ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                  <button
                    onClick={() => onFeedback(m.id, "up")}
                    className={`p-1.5 hover:bg-[var(--color-surface-container-low)] rounded transition-colors ${
                      feedback === "up"
                        ? "text-[var(--color-secondary)]"
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-secondary)]"
                    }`}
                    title="Good response"
                  >
                    <ThumbsUp size={14} />
                  </button>
                  <button
                    onClick={() => onFeedback(m.id, "down")}
                    className={`p-1.5 hover:bg-[var(--color-surface-container-low)] rounded transition-colors ${
                      feedback === "down"
                        ? "text-[var(--color-error)]"
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-error)]"
                    }`}
                    title="Bad response"
                  >
                    <ThumbsDown size={14} />
                  </button>
                  <button
                    onClick={() => onTTSPlay(m.id, m.content)}
                    className={`p-1.5 hover:bg-[var(--color-surface-container-low)] rounded transition-colors ${
                      isPlayingVoice === m.id
                        ? "text-[var(--color-primary)] bg-[var(--color-primary-fixed)]/30"
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                    }`}
                    title={isPlayingVoice === m.id ? "Stop voice" : "Read aloud"}
                  >
                    {isPlayingVoice === m.id ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-start gap-4 max-w-4xl mx-auto">
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary-fixed)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
            <Bot size={16} />
          </div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-outline-variant)] p-4 rounded-[12px] rounded-tl-none shadow-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-bounce" />
            <span className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-bounce [animation-delay:0.2s]" />
            <span className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-bounce [animation-delay:0.4s]" />
            <span className="text-[13px] text-[var(--color-text-secondary)] font-medium ml-1">
              AI is thinking...
            </span>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
