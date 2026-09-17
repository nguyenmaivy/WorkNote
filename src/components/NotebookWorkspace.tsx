import React, { useState, useEffect, useCallback } from "react";
import type { NotebookPage, NotebookSource, ChatMessage } from "../types";
import { notebookApi } from "../services/notebookService";
import NotebookPageEditor from "./NotebookPageEditor";
import NotebookSourcePanel from "./NotebookSourcePanel";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Markdown } from "./ui/Markdown";
import {
  Plus,
  Trash2,
  MessageSquare,
  Sparkles,
  HelpCircle,
  Send,
  Loader2,
  BookOpen,
} from "lucide-react";

export default function NotebookWorkspace() {
  const [pages, setPages] = useState<NotebookPage[]>([]);
  const [sources, setSources] = useState<NotebookSource[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [quiz, setQuiz] = useState<any[] | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [panel, setPanel] = useState<"sources" | "chat" | "ai">("sources");

  const activePage = pages.find((p) => p.id === activePageId) || null;

  const refresh = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([notebookApi.listPages(), notebookApi.listSources()]);
      setPages(p);
      setSources(s);
      if (p.length > 0 && !activePageId) {
        setActivePageId(p[0].id);
      }
    } catch (e) {
      console.error("Failed to load notebook data:", e);
    } finally {
      setLoading(false);
    }
  }, [activePageId]);

  useEffect(() => {
    refresh();
  }, []);

  const handleCreatePage = async () => {
    try {
      const page = await notebookApi.createPage({
        title: `Trang mới ${pages.length + 1}`,
        content: "",
      });
      setPages((prev) => [page, ...prev]);
      setActivePageId(page.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePage = async (id: string) => {
    try {
      await notebookApi.deletePage(id);
      setPages((prev) => prev.filter((p) => p.id !== id));
      if (activePageId === id) {
        setActivePageId(pages.find((p) => p.id !== id)?.id || null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !activePage) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: chatInput.trim(),
      timestamp: new Date().toISOString(),
    };
    const nextMessages = [...chatMessages, userMsg];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);
    setPanel("chat");

    try {
      const res = await notebookApi.chat(
        nextMessages.map((m) => ({ role: m.role, content: m.content })),
        activePage.id
      );
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: res.reply,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Lỗi: ${e?.message || "Không gửi được tin nhắn"}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSummary = async () => {
    if (!activePage) return;
    setSummaryLoading(true);
    setPanel("ai");
    try {
      const text = await notebookApi.generateSummary(activePage.id);
      setSummary(text);
    } catch (e: any) {
      setSummary(`Lỗi: ${e?.message}`);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleQuiz = async () => {
    if (!activePage) return;
    setQuizLoading(true);
    setPanel("ai");
    try {
      const questions = await notebookApi.generateQuiz(activePage.id, 3);
      setQuiz(questions);
    } catch (e: any) {
      setQuiz(null);
    } finally {
      setQuizLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--color-text-secondary)]">
        <Loader2 className="animate-spin mr-2" size={20} />
        Đang tải notebook...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={handleCreatePage} icon={<Plus size={14} />}>
          Trang mới
        </Button>
        {activePage && (
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSummary}
              disabled={summaryLoading}
              icon={summaryLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            >
              Tóm tắt AI
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleQuiz}
              disabled={quizLoading}
              icon={quizLoading ? <Loader2 size={14} className="animate-spin" /> : <HelpCircle size={14} />}
            >
              Tạo Quiz
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPanel("chat")}
              icon={<MessageSquare size={14} />}
            >
              Chat ngữ cảnh
            </Button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[560px]">
        {/* Pages sidebar */}
        <div className="lg:col-span-2">
          <Card className="border border-[var(--color-border-subtle)] overflow-hidden">
            <div className="p-3 border-b border-[var(--color-border-subtle)] text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Trang ({pages.length})
            </div>
            <div className="max-h-[480px] overflow-y-auto">
              {pages.length === 0 ? (
                <div className="p-4 text-center text-[13px] text-[var(--color-text-secondary)]">
                  <BookOpen size={24} className="mx-auto mb-2 opacity-40" />
                  Chưa có trang nào
                </div>
              ) : (
                pages.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActivePageId(p.id);
                      setChatMessages([]);
                      setSummary(null);
                      setQuiz(null);
                    }}
                    className={`w-full text-left px-3 py-2.5 text-[13px] border-b border-[var(--color-border-subtle)] flex items-center justify-between group transition-colors ${
                      activePageId === p.id
                        ? "bg-[var(--color-primary-fixed)] text-[var(--color-primary)] font-medium"
                        : "hover:bg-[var(--color-surface-container-low)]"
                    }`}
                  >
                    <span className="truncate flex-1">{p.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePage(p.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-[var(--color-error)]"
                    >
                      <Trash2 size={12} />
                    </button>
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Editor */}
        <div className="lg:col-span-5">
          <NotebookPageEditor
            page={activePage}
            onSaved={(p) => {
              setPages((prev) => {
                const exists = prev.some((x) => x.id === p.id);
                return exists ? prev.map((x) => (x.id === p.id ? p : x)) : [p, ...prev];
              });
              setActivePageId(p.id);
            }}
            onCreate={handleCreatePage}
          />
        </div>

        {/* Right panel */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="flex gap-1 p-1 bg-[var(--color-surface-container-low)] rounded-[8px]">
            {(["sources", "chat", "ai"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setPanel(tab)}
                className={`flex-1 text-[12px] py-1.5 rounded-[6px] font-medium transition-colors ${
                  panel === tab
                    ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm"
                    : "text-[var(--color-text-secondary)]"
                }`}
              >
                {tab === "sources" ? "Nguồn" : tab === "chat" ? "Chat" : "AI"}
              </button>
            ))}
          </div>

          {panel === "sources" && (
            <NotebookSourcePanel
              sources={sources}
              activePage={activePage}
              onSourcesChange={refresh}
              onPageUpdate={(p) => {
                setPages((prev) => prev.map((x) => (x.id === p.id ? p : x)));
              }}
            />
          )}

          {panel === "chat" && (
            <Card className="flex-1 flex flex-col border border-[var(--color-border-subtle)] min-h-[400px]">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {!activePage ? (
                  <p className="text-[13px] text-[var(--color-text-secondary)] text-center py-8">
                    Chọn hoặc tạo trang để chat với ngữ cảnh notebook.
                  </p>
                ) : chatMessages.length === 0 ? (
                  <p className="text-[13px] text-[var(--color-text-secondary)] text-center py-8">
                    Hỏi AI về nội dung ghi chú và nguồn đính kèm của trang này.
                  </p>
                ) : (
                  chatMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`text-[14px] p-3 rounded-[8px] ${
                        m.role === "user"
                          ? "bg-[var(--color-primary)] text-white ml-8"
                          : "bg-[var(--color-surface-container-low)] mr-8"
                      }`}
                    >
                      {m.content}
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)]">
                    <Loader2 size={14} className="animate-spin" /> Đang suy nghĩ...
                  </div>
                )}
              </div>
              {activePage && (
                <div className="p-3 border-t border-[var(--color-border-subtle)] flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendChat()}
                    placeholder="Hỏi về nội dung notebook..."
                    className="flex-1 text-[14px] px-3 py-2 rounded-[6px] border border-[var(--color-border-subtle)] outline-none focus:border-[var(--color-primary)]"
                  />
                  <Button size="sm" onClick={handleSendChat} disabled={chatLoading} icon={<Send size={14} />}>
                    Gửi
                  </Button>
                </div>
              )}
            </Card>
          )}

          {panel === "ai" && (
            <Card className="flex-1 overflow-y-auto p-4 border border-[var(--color-border-subtle)] min-h-[400px]">
              {summary && (
                <div className="mb-6">
                  <h4 className="text-[14px] font-semibold mb-2 flex items-center gap-1">
                    <Sparkles size={14} /> Tóm tắt AI
                  </h4>
                  <Markdown text={summary} className="text-[14px] text-[var(--color-text-secondary)]" />
                </div>
              )}
              {quiz && quiz.length > 0 && (
                <div>
                  <h4 className="text-[14px] font-semibold mb-3 flex items-center gap-1">
                    <HelpCircle size={14} /> Quiz ôn tập
                  </h4>
                  <div className="space-y-4">
                    {quiz.map((q, i) => (
                      <div key={q.id || i} className="p-3 rounded-[8px] bg-[var(--color-surface-container-low)]">
                        <p className="text-[14px] font-medium mb-2">{i + 1}. {q.question}</p>
                        <ul className="text-[13px] text-[var(--color-text-secondary)] space-y-1 ml-4 list-disc">
                          {q.options?.map((opt: string, j: number) => (
                            <li key={j} className={opt === q.correctAnswer ? "text-[var(--color-primary)] font-medium" : ""}>
                              {opt}
                            </li>
                          ))}
                        </ul>
                        {q.explanation && (
                          <p className="text-[12px] text-[var(--color-text-secondary)] mt-2 italic">
                            💡 {q.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!summary && !quiz && (
                <p className="text-[13px] text-[var(--color-text-secondary)] text-center py-8">
                  Nhấn &quot;Tóm tắt AI&quot; hoặc &quot;Tạo Quiz&quot; để tạo nội dung từ trang hiện tại.
                </p>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
