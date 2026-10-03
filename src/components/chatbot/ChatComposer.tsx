import React from "react";
import { Paperclip, Mic, Send } from "lucide-react";

interface ChatComposerProps {
  userInput: string;
  setUserInput: (val: string) => void;
  loading: boolean;
  onSendMessage: () => void;
  onAttachFile: () => void;
  onMicInput: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onAttachedFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ChatComposer({
  userInput,
  setUserInput,
  loading,
  onSendMessage,
  onAttachFile,
  onMicInput,
  textareaRef,
  fileInputRef,
  onAttachedFileChange,
}: ChatComposerProps) {
  return (
    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[var(--color-surface-bright)] via-[var(--color-surface-bright)] to-transparent pt-6 pb-4 px-4 md:px-6 z-20">
      <div className="max-w-4xl mx-auto">
        <div className="relative bg-[var(--color-surface)] rounded-[16px] border border-[var(--color-outline-variant)] shadow-sm focus-within:border-[var(--color-primary)] focus-within:ring-1 focus-within:ring-[var(--color-primary)] transition-all duration-200">
          <input
            ref={fileInputRef}
            type="file"
            onChange={onAttachedFileChange}
            className="hidden"
          />
          <textarea
            ref={textareaRef}
            value={userInput}
            disabled={loading}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSendMessage();
              }
            }}
            rows={1}
            className="w-full bg-transparent border-none focus:ring-0 resize-none text-[15px] text-[var(--color-text-primary)] p-4 pr-36 min-h-[56px] max-h-48 rounded-[16px] placeholder:text-[var(--color-text-secondary)] outline-none"
            placeholder="Ask Gemini about your materials..."
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <button
              onClick={onAttachFile}
              className="p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-container-low)] rounded-full transition-colors group"
              title="Attach file"
            >
              <Paperclip size={18} className="group-hover:text-[var(--color-primary)] transition-colors" />
            </button>
            <button
              onClick={onMicInput}
              className="p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-container-low)] rounded-full transition-colors group"
              title="Voice input"
            >
              <Mic size={18} className="group-hover:text-[var(--color-primary)] transition-colors" />
            </button>
            <button
              onClick={onSendMessage}
              disabled={loading || !userInput.trim()}
              className="p-2 bg-[var(--color-primary)] text-white rounded-full hover:bg-[var(--color-primary-hover)] transition-colors ml-1 shadow-sm flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              title="Send"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
        <p className="text-center text-[11px] text-[var(--color-text-secondary)] mt-2">
          AI can make mistakes. Consider verifying important information.
        </p>
      </div>
    </div>
  );
}
