import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, UploadedFile } from "../types";
import { Send, Sparkles, Volume2, MessageSquare, PlusCircle, VolumeX, HelpCircle } from "lucide-react";

interface ChatbotSectionProps {
  activeFile: UploadedFile | null;
}

export default function ChatbotSection({ activeFile }: ChatbotSectionProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  
  // Voice accent playback inside Chatbot
  const [selectedAccent, setSelectedAccent] = useState<"north" | "central" | "south">("north");
  const [isPlayingVoice, setIsPlayingVoice] = useState<string | null>(null); // messageId
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Set default initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      if (activeFile) {
        setMessages([
          {
            id: "msg_init",
            role: "assistant",
            content: `Chào mừng bạn! Tôi đã nạp toàn bộ dữ liệu từ tệp **"${activeFile.name}"** vào kho lưu trữ ngữ nghĩa.\n\nBây giờ bạn có thể đặt câu hỏi về tệp tin này, chuyển ngữ tự động giữ nguyên format, yêu cầu tóm tắt nhanh hoặc soạn đề trắc nghiệm lập tức!`,
            timestamp: new Date().toLocaleTimeString()
          }
        ]);
      } else {
        setMessages([
          {
            id: "msg_init",
            role: "assistant",
            content: `Chào mừng bạn! Tôi là trợ lý học tập thông minh **VietLearn AI**.\n\nHãy nạp một tài liệu ở mục **"Tài Liệu & OCR"** hoặc hỏi bất kỳ thắc mắc nào về phương pháp lập trình đa nền tảng, thiết kế master QR code, cơ chế Expo Go Tunneling hoặc phiên tính giọng nói vùng miền dưới đây!`,
            timestamp: new Date().toLocaleTimeString()
          }
        ]);
      }
    }
  }, [activeFile, messages.length]);

  // Handle messages submits
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || userInput;
    if (!text.trim() || loading) return;

    // Reset user text input box
    if (!textToSend) setUserInput("");

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages((prev) => [...prev, newMsg]);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, newMsg].map((m) => ({
            role: m.role,
            content: m.content
          })),
          contextFileText: activeFile?.extractedText || "",
          voiceSettings: { region: selectedAccent }
        })
      });

      const data = await response.json();
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_${Date.now() + 1}`,
            role: "assistant",
            content: data.reply,
            timestamp: new Date().toLocaleTimeString()
          }
        ]);
      } else {
        throw new Error(data.error || "Chatbot error");
      }
    } catch (e: any) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now() + 1}`,
          role: "assistant",
          content: `⚠️ Có lỗi hệ thống khi kết nối tới Trợ lý AI. Vui lòng kiểm tra lại cấu hình API Key của bạn trong Secrets.\n\nChi tiết lỗi: ${e.message}`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Quick Action Bubbles (Promptless interaction showcase)
  const quickChips = [
    { label: "📝 Tóm tắt nhanh", prompt: "Hãy làm một tóm tắt bằng các gạch đầu dòng ngắn gọn về bài học này giúp tôi." },
    { label: "🌐 Dịch sang English", prompt: "Hãy dịch tài liệu bài học này sang tiếng Anh và lưu ý giữ nguyên hoàn toàn cấu trúc các gạch đầu dòng, dấu dòng hoặc heading nhé." },
    { label: "🎤 Đọc bằng giọng 3 Miền", prompt: "Hãy phân tích chi tiết sự khác biệt về phát âm và thanh điệu ngữ âm tiếng Việt giữa ba miền Bắc, Trung, Nam." },
    { label: "🧙‍♂️ Tạo đề trắc nghiệm", prompt: "Hãy soạn ra giúp tôi 3 câu hỏi trắc nghiệm ôn tập nhanh có kèm đáp án và lý do giải thích cụ thể dựa trên bài học." }
  ];

  // Play assistant message as synthesized voice
  const handleTTSPlay = async (msgId: string, text: string) => {
    if (isPlayingVoice === msgId) {
      // pause if active
      if (activeAudioRef.current) activeAudioRef.current.pause();
      window.speechSynthesis.cancel();
      setIsPlayingVoice(null);
      return;
    }

    setIsPlayingVoice(msgId);
    
    // Clean text from markdown notations to prevent phonetic spelling of '**' or '#'
    const cleanText = text.replace(/[*#`_\-]/g, " ").trim();

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanText, region: selectedAccent })
      });

      const data = await response.json();

      if (data.success && data.base64Audio) {
        // Play backend audio stream
        const audioUrl = `data:audio/wav;base64,${data.base64Audio}`;
        const audio = new Audio(audioUrl);
        activeAudioRef.current = audio;

        audio.onended = () => {
          setIsPlayingVoice(null);
        };

        await audio.play();
      } else {
        // Fallback to local browser Web Speech synthesized read
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = "vi-VN";
        utterance.onend = () => {
          setIsPlayingVoice(null);
        };
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      // fallback
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "vi-VN";
      utterance.onend = () => {
        setIsPlayingVoice(null);
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-5 mt-1 shadow-sm flex flex-col h-[650px]" id="chatbot-workspace">
      
      {/* Voice Dialect settings bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-105 pb-3 mb-4 gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="text-indigo-600" size={18} />
          <div>
            <h3 className="text-xs font-bold text-slate-800">Trợ Lý Thông Thái VietLearn AI</h3>
            <p className="text-[10px] text-slate-400">Đang đồng bộ ngữ liệu: <span className="font-semibold text-indigo-600">{activeFile ? activeFile.name : "Toàn bộ tài liệu mặc định"}</span></p>
          </div>
        </div>

        {/* Audio Dialect choice */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Đọc phát âm bằng giọng:</span>
          <select
            value={selectedAccent}
            onChange={(e) => setSelectedAccent(e.target.value as any)}
            className="text-xs border border-slate-200 bg-white rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-400"
          >
            <option value="north">🎤 Miền Bắc (Hà Nội)</option>
            <option value="central">🎙️ Miền Trung (Huế)</option>
            <option value="south">📣 Miền Nam (Sài Gòn)</option>
          </select>
        </div>
      </div>

      {/* Messages Feed panel */}
      <div className="flex-1 overflow-y-auto space-y-4 px-1.5 py-2 messages-board bg-slate-50 rounded-2xl border border-slate-100 p-4 mb-4">
        {messages.map((m) => {
          const isUser = m.role === "user";

          return (
            <div
              key={m.id}
              className={`flex flex-col max-w-[85%] ${isUser ? "ml-auto items-end" : "mr-auto items-start"} animate-fade-in`}
            >
              <div
                className={`p-3.5 rounded-2xl text-xs leading-normal whitespace-pre-wrap shadow-sm border ${
                  isUser
                    ? "bg-indigo-600 border-indigo-600 text-white rounded-tr-none"
                    : "bg-white border-slate-150 text-slate-700 rounded-tl-none"
                }`}
              >
                {/* Render markdown bolding/title blocks simply */}
                {m.content}
              </div>

              {/* Message sub info (Timestamp + TTS reader trigger button only for assistant) */}
              <div className="flex items-center gap-2 mt-1.5 text-[9px] text-slate-450 font-mono">
                <span>{m.timestamp}</span>
                {!isUser && (
                  <button
                    onClick={() => handleTTSPlay(m.id, m.content)}
                    className={`flex items-center gap-0.5 hover:text-indigo-600 transition-all px-1 py-0.5 rounded ${
                      isPlayingVoice === m.id ? "text-indigo-600 font-bold bg-indigo-50" : "text-slate-400"
                    }`}
                    title="Đọc văn bản bài trả lời này"
                  >
                    {isPlayingVoice === m.id ? <VolumeX size={11} /> : <Volume2 size={11} />}
                    {isPlayingVoice === m.id ? "Dừng Phát" : "Đọc Giọng Vùng Miền"}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex flex-col max-w-[80%] mr-auto items-start animate-pulse">
            <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-tl-none text-xs text-slate-500 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]" />
              <span>VietLearn AI đang phân tích dữ liệu...</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggestion Quick Chips */}
      <div className="mb-3">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Gợi ý truy vấn nhanh (Promptless AI):</span>
        <div className="flex flex-wrap gap-1.5">
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip.prompt)}
              className="text-[10px] font-medium bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 border border-indigo-100/40 rounded-full py-1 px-3 transition"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input panel row */}
      <div className="flex gap-2.5 items-center">
        <input
          type="text"
          value={userInput}
          disabled={loading}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && userInput.trim()) {
              handleSendMessage();
            }
          }}
          className="flex-1 text-xs border border-slate-200 hover:border-slate-350 focus:border-indigo-400 focus:outline-none rounded-xl py-3 px-4 bg-slate-50 text-slate-700 leading-normal"
          placeholder={activeFile ? "Đặt câu hỏi về nội dung tài liệu..." : "Chat tự do hỏi đáp về Kỹ thuật, Lập trình di động, OCR..."}
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={loading || !userInput.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 py-3 px-4 rounded-xl shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <Send size={15} />
        </button>
      </div>

    </div>
  );
}
