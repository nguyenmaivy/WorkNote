import { useState, useRef, useEffect, useMemo } from "react";
import type { ChatMessage, UploadedFile } from "../types";

export interface ChatSession {
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

export function useChatbot(files: UploadedFile[], activeFile: UploadedFile | null, onSelectActiveFile: (id: string) => void) {
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    const initial = loadSessions();
    return initial.length > 0 ? initial[0].id : null;
  });

  useEffect(() => {
    persistSessions(sessions);
  }, [sessions]);

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
  }, []);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? null,
    [sessions, activeSessionId]
  );

  const contextFiles = useMemo(() => {
    if (!activeSession) return [];
    return activeSession.contextFileIds
      .map((id) => files.find((f) => f.id === id))
      .filter((f): f is UploadedFile => !!f);
  }, [activeSession, files]);

  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedAccent, setSelectedAccent] = useState<"north" | "central" | "south">("north");
  const [isPlayingVoice, setIsPlayingVoice] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, "up" | "down">>({});

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

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
    onSelectActiveFile(fileId);
  };

  const removeFromContext = (fileId: string) => {
    if (!activeSession) return;
    patchSession(activeSession.id, {
      contextFileIds: activeSession.contextFileIds.filter((id) => id !== fileId),
    });
  };

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

  return {
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
  };
}
