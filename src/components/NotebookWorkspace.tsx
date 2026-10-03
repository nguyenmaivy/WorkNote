import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { ChatMessage, NotebookPage, NotebookSource } from "../types";
import { notebookApi } from "../services/notebookService";
import NotebookSourcePanel from "./NotebookSourcePanel";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Markdown } from "./ui/Markdown";
import {
  BookOpen,
  Cloud,
  FileText,
  HardDrive,
  Loader2,
  MessageSquare,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";

const CHAT_STORAGE_KEY = (pageId: string) => `worknote_chat_${pageId}`;

function loadChatHistory(pageId: string | null): ChatMessage[] {
  if (!pageId) return [];
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY(pageId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveChatHistory(pageId: string, messages: ChatMessage[]): void {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY(pageId), JSON.stringify(messages.slice(-50)));
  } catch {
    // Ignore storage quota/private-mode failures.
  }
}

function SourceSummary({ sources }: { sources: NotebookSource[] }) {
  if (sources.length === 0) {
    return (
      <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center px-6 py-10">
        <FileText size={36} className="text-[var(--color-text-secondary)] opacity-50 mb-3" />
        <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)] mb-2">
          Chưa có nguồn trong trang này
        </h3>
        <p className="text-[13px] text-[var(--color-text-secondary)] max-w-sm">
          Tải tài liệu lên ở khung bên phải rồi đính kèm vào trang để AI trả lời dựa trên nguồn đó.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {sources.map((source) => (
        <div
          key={source.id}
          className="rounded-[8px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-low)] p-3"
        >
          <div className="flex items-start gap-2">
            <FileText size={15} className="mt-0.5 shrink-0 text-[var(--color-primary)]" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">
                {source.title}
              </p>
              <p className="text-[11px] text-[var(--color-text-secondary)] uppercase">
                {source.type}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-[var(--color-text-secondary)] line-clamp-3">
            {source.content.slice(0, 180)}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function NotebookWorkspace() {
  const [pages, setPages] = useState<NotebookPage[]>([]);
  const [sources, setSources] = useState<NotebookSource[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingTitle, setSavingTitle] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePage = pages.find((p) => p.id === activePageId) || null;
  const attachedSources = useMemo(() => {
    if (!activePage) return [];
    const attached = new Set(activePage.sourceIds);
    return sources.filter((source) => attached.has(source.id));
  }, [activePage, sources]);

  const refresh = useCallback(async () => {
    try {
      const [nextPages, nextSources] = await Promise.all([
        notebookApi.listPages(),
        notebookApi.listSources(),
      ]);
      setPages(nextPages);
      setSources(nextSources);
      setActivePageId((current) => current || nextPages[0]?.id || null);
    } catch (e: any) {
      setError(e?.message || "Không tải được dữ liệu notebook");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    setPageTitle(activePage?.title || "");
    setChatMessages(loadChatHistory(activePage?.id || null));
    setChatInput("");
  }, [activePage?.id, activePage?.title]);

  const handleCreatePage = async () => {
    setError(null);
    try {
      const page = await notebookApi.createPage({
        title: `Notebook ${pages.length + 1}`,
        content: "",
      });
      setPages((prev) => [page, ...prev]);
      setActivePageId(page.id);
    } catch (e: any) {
      setError(e?.message || "Không tạo được notebook");
    }
  };

  const handleDeletePage = async (id: string) => {
    setError(null);
    try {
      await notebookApi.deletePage(id);
      setPages((prev) => prev.filter((p) => p.id !== id));
      if (activePageId === id) {
        setActivePageId(pages.find((p) => p.id !== id)?.id || null);
      }
    } catch (e: any) {
      setError(e?.message || "Không xóa được notebook");
    }
  };

  const handleSaveTitle = async () => {
    if (!activePage || !pageTitle.trim()) return;
    setSavingTitle(true);
    setError(null);
    try {
      const updated = await notebookApi.updatePage(activePage.id, { title: pageTitle.trim() });
      setPages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (e: any) {
      setError(e?.message || "Không lưu được tiêu đề");
    } finally {
      setSavingTitle(false);
    }
  };

  const handleSendChat = async (preset?: string) => {
    if (!activePage || chatLoading) return;
    const content = (preset ?? chatInput).trim();
    if (!content) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    const nextMessages = [...chatMessages, userMsg];

    setChatMessages(nextMessages);
    saveChatHistory(activePage.id, nextMessages);
    setChatInput("");
    setChatLoading(true);
    setError(null);

    try {
      const res = await notebookApi.chat(
        nextMessages.map((message) => ({ role: message.role, content: message.content })),
        activePage.id
      );
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: res.reply,
        timestamp: new Date().toISOString(),
        provider: res.provider,
        model: res.model,
      };
      setChatMessages((prev) => {
        const updated = [...prev, assistantMsg];
        saveChatHistory(activePage.id, updated);
        return updated;
      });
    } catch (e: any) {
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Lỗi: ${e?.message || "Không gửi được tin nhắn"}`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => {
        const updated = [...prev, assistantMsg];
        saveChatHistory(activePage.id, updated);
        return updated;
      });
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--color-text-secondary)]">
        <Loader2 className="animate-spin mr-2" size={20} />
        Đang tải NotebookLM...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)_360px] gap-4 min-h-[680px]">
      <Card className="border border-[var(--color-border-subtle)] overflow-hidden h-fit xl:h-full">
        <div className="p-3 border-b border-[var(--color-border-subtle)] flex items-center justify-between gap-2">
          <span className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase">
            Notebook
          </span>
          <button
            onClick={handleCreatePage}
            className="p-1.5 rounded-[6px] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-container-low)]"
            title="Tạo notebook"
          >
            <Plus size={15} />
          </button>
        </div>

        <div className="max-h-[560px] overflow-y-auto">
          {pages.length === 0 ? (
            <div className="p-5 text-center text-[13px] text-[var(--color-text-secondary)]">
              <BookOpen size={28} className="mx-auto mb-2 opacity-40" />
              Chưa có notebook nào
            </div>
          ) : (
            pages.map((page) => (
              <div
                key={page.id}
                className={`border-b border-[var(--color-border-subtle)] ${
                  activePageId === page.id
                    ? "bg-[var(--color-primary-fixed)] text-[var(--color-primary)]"
                    : "hover:bg-[var(--color-surface-container-low)]"
                }`}
              >
                <button
                  onClick={() => setActivePageId(page.id)}
                  className="w-full text-left px-3 py-2.5"
                >
                  <span className="block text-[13px] font-medium truncate">{page.title}</span>
                  <span className="block text-[11px] text-[var(--color-text-secondary)]">
                    {page.sourceIds.length} nguồn
                  </span>
                </button>
              </div>
            ))
          )}
        </div>
      </Card>

      <div className="min-w-0 flex flex-col gap-4">
        <Card className="border border-[var(--color-border-subtle)] p-4">
          {!activePage ? (
            <div className="text-center py-10">
              <BookOpen size={42} className="mx-auto mb-3 text-[var(--color-text-secondary)] opacity-50" />
              <h3 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-2">
                Tạo notebook để bắt đầu
              </h3>
              <p className="text-[14px] text-[var(--color-text-secondary)] mb-5">
                Mỗi notebook là một không gian gồm nguồn tài liệu và cuộc trò chuyện dựa trên nguồn đó.
              </p>
              <Button onClick={handleCreatePage} icon={<Plus size={16} />}>
                Tạo notebook
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <input
                  value={pageTitle}
                  onChange={(event) => setPageTitle(event.target.value)}
                  onBlur={handleSaveTitle}
                  className="min-w-0 flex-1 text-[24px] font-semibold bg-transparent outline-none text-[var(--color-text-primary)]"
                  placeholder="Tên notebook..."
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleSaveTitle}
                    disabled={savingTitle || !pageTitle.trim()}
                    icon={savingTitle ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  >
                    Lưu tên
                  </Button>
                  <button
                    onClick={() => handleDeletePage(activePage.id)}
                    className="p-2 rounded-[6px] text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-surface-container-low)]"
                    title="Xóa notebook"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-[13px] text-[var(--color-error)]">{error}</p>
              )}

              <SourceSummary sources={attachedSources} />
            </div>
          )}
        </Card>

        <Card className="border border-[var(--color-border-subtle)] flex-1 flex flex-col min-h-[420px] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquare size={16} className="text-[var(--color-primary)] shrink-0" />
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                  Hỏi theo nguồn tài liệu
                </h3>
                <p className="text-[12px] text-[var(--color-text-secondary)] truncate">
                  {attachedSources.length > 0
                    ? `${attachedSources.length} nguồn đang được dùng làm ngữ cảnh`
                    : "Đính kèm nguồn để câu trả lời bám tài liệu hơn"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!activePage ? (
              <p className="text-[13px] text-[var(--color-text-secondary)] text-center py-10">
                Chọn hoặc tạo notebook để bắt đầu hỏi đáp.
              </p>
            ) : chatMessages.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[14px] text-[var(--color-text-secondary)] mb-4">
                  Đặt câu hỏi trực tiếp về tài liệu trong notebook này.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    "Tóm tắt các ý chính trong nguồn tài liệu",
                    "Tạo 5 câu hỏi ôn tập kèm đáp án",
                    "Giải thích phần khó hiểu nhất bằng ví dụ ngắn",
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSendChat(prompt)}
                      disabled={chatLoading}
                      className="px-3 py-2 rounded-[6px] border border-[var(--color-border-subtle)] text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[88%] text-[14px] p-3 rounded-[8px] ${
                    message.role === "user"
                      ? "ml-auto bg-[var(--color-primary)] text-white"
                      : "mr-auto bg-[var(--color-surface-container-low)] text-[var(--color-text-primary)]"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <>
                      <Markdown text={message.content} className="text-[14px]" />
                      {message.provider && (
                        <div className="mt-2 pt-2 border-t border-[var(--color-border-subtle)] flex items-center gap-1.5 text-[11px] text-[var(--color-text-secondary)]">
                          {message.provider === "local" ? <HardDrive size={12} /> : <Cloud size={12} />}
                          <span>
                            {message.provider === "local" ? "Local" : "Cloud"}
                            {message.model ? ` · ${message.model}` : ` · ${message.provider}`}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    message.content
                  )}
                </div>
              ))
            )}

            {chatLoading && (
              <div className="flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)]">
                <Loader2 size={14} className="animate-spin" />
                Đang đọc nguồn và trả lời...
              </div>
            )}
          </div>

          {activePage && (
            <div className="p-3 border-t border-[var(--color-border-subtle)] flex gap-2">
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSendChat();
                  }
                }}
                placeholder="Hỏi về nội dung trong nguồn tài liệu..."
                className="flex-1 text-[14px] px-3 py-2 rounded-[6px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] outline-none focus:border-[var(--color-primary)]"
              />
              <Button
                size="sm"
                onClick={() => handleSendChat()}
                disabled={chatLoading || !chatInput.trim()}
                icon={chatLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              >
                Gửi
              </Button>
            </div>
          )}
        </Card>
      </div>

      <NotebookSourcePanel
        sources={sources}
        activePage={activePage}
        onSourcesChange={refresh}
        onPageUpdate={(page) => {
          setPages((prev) => prev.map((item) => (item.id === page.id ? page : item)));
        }}
      />
    </div>
  );
}
