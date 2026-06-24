import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChatMessage, UploadedFile } from "../types";
import {
  Send,
  Bot,
  PencilLine,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  VolumeX,
  Paperclip,
  Mic,
  Plus,
  LibraryBig,
  FileText,
  Image as ImageIcon,
  Music,
  Film,
  ExternalLink,
  X,
  History,
  PanelRight,
} from "lucide-react";
import { QUICK_CHAT_CHIPS, ACCENT_OPTIONS } from "../constants";

interface ChatbotSectionProps {
  files: UploadedFile[];
  activeFile: UploadedFile | null;
  onSelectActiveFile: (id: string) => void;
}

// ─── Persisted chat session model ───────────────────────────────────
interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  contextFileIds: string[];
  createdAt: number;
  updatedAt: number;
}

const SESSIONS_STORAGE_KEY = "vietlearn_chat_sessions_v1";

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistSessions(sessions: ChatSession[]) {
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    /* quota exceeded — silently ignore */
  }
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

function getFileIcon(mime: string) {
  if (mime.includes("pdf")) return FileText;
  if (mime.includes("image") || mime.includes("png") || mime.includes("jpeg") || mime.includes("jpg"))
    return ImageIcon;
  if (mime.includes("audio") || mime.includes("mp3") || mime.includes("wav")) return Music;
  if (mime.includes("video") || mime.includes("mp4")) return Film;
  return FileText;
}

export default function ChatbotSection({
  files,
  activeFile,
  onSelectActiveFile,
}: ChatbotSectionProps) {
  // ─── Sessions state ────────────────────────────────────────────
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    const initial = loadSessions();
    return initial.length > 0 ? initial[0].id : null;
  });

  // Persist sessions whenever they change
  useEffect(() => {
    persistSessions(sessions);
  }, [sessions]);

  // Bootstrap: create first session if none, or ensure active session exists
  useEffect(() => {
    if (sessions.length === 0) {
      const initialSession: ChatSession = {
        id: `session_${Date.now()}`,
        title: "New conversation",
        messages: [],
        contextFileIds: activeFile ? [activeFile.id] : [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setSessions([initialSession]);
      setActiveSessionId(initialSession.id);
    } else if (!activeSessionId || !sessions.find((s) => s.id === activeSessionId)) {
      setActiveSessionId(sessions[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derive current session
  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? null,
    [sessions, activeSessionId]
  );

  // ─── Other state ───────────────────────────────────────────────
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedAccent, setSelectedAccent] = useState<"north" | "central" | "south">("north");
  const [isPlayingVoice, setIsPlayingVoice] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, "up" | "down">>({});
  const [showContextPicker, setShowContextPicker] = useState(false);
  const [showRecentMobile, setShowRecentMobile] = useState(false);
  const [showContextMobile, setShowContextMobile] = useState(false);

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages.length, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 192)}px`;
    }
  }, [userInput]);

  // ─── Derived: context files for the active session ─────────────
  const contextFiles = useMemo(() => {
    if (!activeSession) return [];
    return activeSession.contextFileIds
      .map((id) => files.find((f) => f.id === id))
      .filter((f): f is UploadedFile => !!f);
  }, [activeSession, files]);

  // ─── Session helpers ───────────────────────────────────────────
  const patchSession = (id: string, patch: Partial<ChatSession>) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s))
    );
  };

  const createNewSession = () => {
    const session: ChatSession = {
      id: `session_${Date.now()}`,
      title: "New conversation",
      messages: [],
      contextFileIds: activeFile ? [activeFile.id] : [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    setUserInput("");
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (id === activeSessionId) {
        setActiveSessionId(next[0]?.id ?? null);
      }
      return next;
    });
  };

  const addToContext = (fileId: string) => {
    if (!activeSession) return;
    if (activeSession.contextFileIds.includes(fileId)) return;
    patchSession(activeSession.id, {
      contextFileIds: [...activeSession.contextFileIds, fileId],
    });
    // Also set as active in the file manager so other tabs sync
    onSelectActiveFile(fileId);
  };

  const removeFromContext = (fileId: string) => {
    if (!activeSession) return;
    patchSession(activeSession.id, {
      contextFileIds: activeSession.contextFileIds.filter((id) => id !== fileId),
    });
  };

  // ─── Send message ──────────────────────────────────────────────
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend ?? userInput;
    if (!text.trim() || loading || !activeSession) return;

    if (!textToSend) setUserInput("");

    const newUserMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString(),
    };

    const isFirstMessage = activeSession.messages.length === 0;

    const optimisticMessages = [...activeSession.messages, newUserMsg];
    patchSession(activeSession.id, {
      messages: optimisticMessages,
      ...(isFirstMessage && { title: text.slice(0, 50) }),
    });

    setLoading(true);

    try {
      // Concatenate context from all selected files
      const contextText = contextFiles
        .map((f) => `[${f.name}]\n${f.extractedText || ""}`)
        .join("\n\n");

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: optimisticMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          contextFileText: contextText,
          voiceSettings: { region: selectedAccent },
        }),
      });

      const data = await response.json();

      if (data.success) {
        const aiMsg: ChatMessage = {
          id: `msg_${Date.now() + 1}`,
          role: "assistant",
          content: data.reply,
          timestamp: new Date().toLocaleTimeString(),
        };
        patchSession(activeSession.id, {
          messages: [...optimisticMessages, aiMsg],
        });
      } else {
        throw new Error(data.error || "Chatbot error");
      }
    } catch (e: any) {
      console.error(e);
      const errorMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: "assistant",
        content: `⚠️ AI service error. Check your API key in Settings > Secrets.\n\nDetails: ${e.message}`,
        timestamp: new Date().toLocaleTimeString(),
      };
      patchSession(activeSession.id, {
        messages: [...optimisticMessages, errorMsg],
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── Action handlers ───────────────────────────────────────────
  const handleCopy = async (msgId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(msgId);
      setTimeout(() => setCopiedId((cur) => (cur === msgId ? null : cur)), 1500);
    } catch {
      /* clipboard denied */
    }
  };

  const setFeedback = (msgId: string, kind: "up" | "down") => {
    setFeedbackMap((prev) => ({
      ...prev,
      [msgId]: prev[msgId] === kind ? (undefined as any) : kind,
    }));
  };

  const handleTTSPlay = async (msgId: string, text: string) => {
    if (isPlayingVoice === msgId) {
      if (activeAudioRef.current) activeAudioRef.current.pause();
      window.speechSynthesis.cancel();
      setIsPlayingVoice(null);
      return;
    }
    setIsPlayingVoice(msgId);
    const cleanText = text.replace(/[*#`_\-]/g, " ").trim();
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanText, region: selectedAccent }),
      });
      const data = await response.json();
      if (data.success && data.base64Audio) {
        const audioUrl = `data:audio/wav;base64,${data.base64Audio}`;
        const audio = new Audio(audioUrl);
        activeAudioRef.current = audio;
        audio.onended = () => setIsPlayingVoice(null);
        await audio.play();
      } else {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = "vi-VN";
        utterance.onend = () => setIsPlayingVoice(null);
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "vi-VN";
      utterance.onend = () => setIsPlayingVoice(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleAttach = () => {
    fileInputRef.current?.click();
  };

  const handleAttachedFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Inject as a user message describing the attachment.
    // Full pipeline upload should be done in the Library tab; here we
    // just acknowledge so the user knows attachments need to go through Library.
    handleSendMessage(`📎 (Attached: ${file.name}). For full analysis, please upload via the Library tab first.`);
    e.target.value = "";
  };

  const handleMic = () => {
    const Recognition: any =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!Recognition) {
      handleSendMessage("🎙️ Voice input is not supported in this browser. Try Chrome/Edge for speech recognition.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setUserInput((cur) => (cur ? cur + " " + transcript : transcript));
    };
    recognition.onerror = () => {
      /* swallow */
    };
    recognition.start();
  };

  const messages = activeSession?.messages ?? [];

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div className="flex h-full bg-[var(--color-surface-bright)]">
      {/* ═══════════════════════════════════════════════════════
           LEFT PANEL — Recent Chats (xl+)
         ═══════════════════════════════════════════════════════ */}
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
            onClick={createNewSession}
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
                  onClick={() => setActiveSessionId(s.id)}
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
                      if (window.confirm("Delete this chat?")) deleteSession(s.id);
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

      {/* ═══════════════════════════════════════════════════════
           CENTER PANEL — Chat Interface
         ═══════════════════════════════════════════════════════ */}
      <section className="flex-1 flex flex-col relative h-full min-w-0">
        {/* Chat top bar */}
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

        {/* Messages */}
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
                        {contextFiles
                          .map((f) => `"${f.name}"`)
                          .join(", ")}
                      </strong>{" "}
                      open. What would you like to discuss today?
                    </>
                  ) : (
                    <>
                      {" "}Upload a document in the Library tab or add one to the context panel on
                      the right to ground our conversation.
                    </>
                  )}
                </p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {QUICK_CHAT_CHIPS.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(chip.prompt)}
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

                  {/* Action toolbar (AI only) */}
                  {!isUser && (
                    <div className="mt-4 flex gap-1 -ml-1.5 pt-2 border-t border-[var(--color-outline-variant)]/40">
                      <button
                        onClick={() => handleCopy(m.id, m.content)}
                        className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-container-low)] rounded transition-colors"
                        title="Copy"
                      >
                        {copiedId === m.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                      <button
                        onClick={() => setFeedback(m.id, "up")}
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
                        onClick={() => setFeedback(m.id, "down")}
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
                        onClick={() => handleTTSPlay(m.id, m.content)}
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

        {/* Input area */}
        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[var(--color-surface-bright)] via-[var(--color-surface-bright)] to-transparent pt-6 pb-4 px-4 md:px-6 z-20">
          <div className="max-w-4xl mx-auto">
            <div className="relative bg-[var(--color-surface)] rounded-[16px] border border-[var(--color-outline-variant)] shadow-sm focus-within:border-[var(--color-primary)] focus-within:ring-1 focus-within:ring-[var(--color-primary)] transition-all duration-200">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleAttachedFile}
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
                    handleSendMessage();
                  }
                }}
                rows={1}
                className="w-full bg-transparent border-none focus:ring-0 resize-none text-[15px] text-[var(--color-text-primary)] p-4 pr-36 min-h-[56px] max-h-48 rounded-[16px] placeholder:text-[var(--color-text-secondary)] outline-none"
                placeholder="Ask Gemini about your materials..."
              />
              <div className="absolute bottom-2 right-2 flex items-center gap-1">
                <button
                  onClick={handleAttach}
                  className="p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-container-low)] rounded-full transition-colors group"
                  title="Attach file"
                >
                  <Paperclip size={18} className="group-hover:text-[var(--color-primary)] transition-colors" />
                </button>
                <button
                  onClick={handleMic}
                  className="p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-container-low)] rounded-full transition-colors group"
                  title="Voice input"
                >
                  <Mic size={18} className="group-hover:text-[var(--color-primary)] transition-colors" />
                </button>
                <button
                  onClick={() => handleSendMessage()}
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
      </section>

      {/* ═══════════════════════════════════════════════════════
           RIGHT PANEL — Active Context
         ═══════════════════════════════════════════════════════ */}
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
          {(showContextMobile) && (
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
                    onClick={() => removeFromContext(f.id)}
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
                <div className="mt-3 flex items-center gap-2 pl-2">
                  <span className="px-2 py-0.5 rounded bg-[var(--color-surface-container-high)] text-[var(--color-text-primary)] text-[10px] font-medium uppercase">
                    {f.mimeType.split("/")[1]?.split(";")[0] ?? "file"}
                  </span>
                  {f.size > 0 && (
                    <span className="px-2 py-0.5 rounded bg-[var(--color-surface-container-high)] text-[var(--color-text-primary)] text-[10px] font-medium">
                      {(f.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  )}
                  {f.sourceUrl && (
                    <a
                      href={f.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                      title="Open source"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add to context picker */}
          <div className="relative">
            <button
              onClick={() => setShowContextPicker((v) => !v)}
              className="w-full py-3 border-2 border-dashed border-[var(--color-outline-variant)] rounded-[12px] text-[var(--color-text-secondary)] text-[14px] font-medium flex items-center justify-center gap-2 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-fixed)]/30 transition-all"
            >
              <Plus size={16} />
              Add Material to Context
            </button>
            {showContextPicker && (
              <div className="absolute bottom-full mb-2 left-0 right-0 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-[12px] shadow-[var(--shadow-card-hover)] z-20 max-h-64 overflow-y-auto animate-fade-in">
                {files.length === 0 ? (
                  <p className="p-4 text-[12px] text-[var(--color-text-secondary)] text-center">
                    No files in the library. Upload one in the Library tab first.
                  </p>
                ) : (
                  files.map((f) => {
                    const isInContext = activeSession?.contextFileIds.includes(f.id);
                    const Icon = getFileIcon(f.mimeType);
                    return (
                      <button
                        key={f.id}
                        onClick={() => {
                          if (!isInContext) addToContext(f.id);
                          setShowContextPicker(false);
                        }}
                        disabled={isInContext}
                        className={`w-full text-left px-3 py-2.5 flex items-center gap-2 text-[13px] transition-colors ${
                          isInContext
                            ? "bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)] cursor-not-allowed"
                            : "hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-primary)]"
                        }`}
                      >
                        <Icon size={14} className="shrink-0" />
                        <span className="truncate flex-1">{f.name}</span>
                        {isInContext && (
                          <Check size={14} className="text-[var(--color-secondary)] shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile backdrop for drawers */}
      {(showRecentMobile || showContextMobile) && (
        <div
          onClick={() => {
            setShowRecentMobile(false);
            setShowContextMobile(false);
          }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-20 xl:hidden"
        />
      )}
    </div>
  );
}
