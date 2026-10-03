import React from "react";
import { PencilLine, X } from "lucide-react";
import type { ChatSession } from "../../hooks/useChatbot";

interface ChatRecentSessionsProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  showRecentMobile: boolean;
  onSetActiveSessionId: (id: string) => void;
  onCreateNewSession: () => void;
  onDeleteSession: (id: string) => void;
}

function formatChatTimestamp(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return "Today";
  if (diff < 2 * day) return "Yesterday";
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ChatRecentSessions({
  sessions,
  activeSessionId,
  showRecentMobile,
  onSetActiveSessionId,
  onCreateNewSession,
  onDeleteSession,
}: ChatRecentSessionsProps) {
  return (
    <aside
      className={`w-56 border-r border-[var(--color-surface-container-high)] bg-[var(--color-surface)] flex-col overflow-y-auto ${
        showRecentMobile ? "fixed inset-y-0 left-0 z-30 flex" : "hidden xl:flex"
      }`}
    >
      <div className="p-4 border-b border-[var(--color-surface-container-high)] flex justify-between items-center sticky top-0 bg-[var(--color-surface)] z-10">
        <h3 className="text-[18px] font-semibold text-[var(--color-text-primary)] font-display">
          Recent Chats
        </h3>
        <button
          onClick={onCreateNewSession}
          title="New chat"
          className="p-1 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-container-low)] transition-colors"
        >
          <PencilLine size={18} />
        </button>
      </div>
      <div className="p-2 space-y-1 flex-1">
        {sessions.length === 0 ? (
          <p className="text-[12px] text-[var(--color-text-secondary)] px-3 py-4 text-center">
            No conversations yet
          </p>
        ) : (
          sessions.map((s) => {
            const isActive = s.id === activeSessionId;
            return (
              <div
                key={s.id}
                onClick={() => onSetActiveSessionId(s.id)}
                className={`p-3 rounded-[8px] cursor-pointer transition-colors group relative ${
                  isActive
                    ? "bg-[var(--color-surface-container-low)]"
                    : "hover:bg-[var(--color-surface-container-low)]"
                }`}
              >
                <p className="text-[13px] text-[var(--color-text-primary)] truncate font-medium pr-5">
                  {s.title || "Untitled"}
                </p>
                <p className="text-[11px] text-[var(--color-text-secondary)] truncate mt-0.5">
                  {formatChatTimestamp(s.updatedAt)}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm("Delete this chat?")) onDeleteSession(s.id);
                  }}
                  className="absolute right-2 top-2 p-0.5 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-error)] opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete chat"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
