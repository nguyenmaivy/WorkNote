import React, { useState } from "react";
import { techTopics } from "../data/techTopics";
import {
  BookOpen,
  Code,
  Layers,
  MessageSquare,
  ShieldAlert,
  Cpu,
  Heart,
  Share2,
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Server,
  Globe,
  Database,
  Smartphone,
  Search,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";

export default function FullstackKnowledgeBase() {
  const [knowledgeTab, setKnowledgeTab] = useState<"diagram" | "topics">("diagram");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("multiplatform_compile");
  const activeTopic = techTopics.find((t) => t.id === selectedTopicId) || techTopics[0];

  // Simulator state for QR Scanning
  const [appInstalled, setAppInstalled] = useState<boolean>(true);
  const [qrScanned, setQrScanned] = useState<boolean>(false);

  // Simulator state for Expo Tunnels
  const [tunnelActive, setTunnelActive] = useState<boolean>(false);
  const [tunnelLog, setTunnelLog] = useState<string[]>([]);

  // Simulator state for Dialect
  const [selectedDialectWord, setSelectedDialectWord] = useState<string>("Sữa bò");

  // State for interactive architecture plant
  const [activeNodeId, setActiveNodeId] = useState<string>("frontend");

  const startTunnelSimulator = () => {
    setTunnelActive(true);
    setTunnelLog(["[SYS] Đang khởi chạy Metro bunder trên cổng 3000...", "[SYS] Đang bắt đầu thỏa thuận bắt tay với ngrok gateway..."]);
    
    setTimeout(() => {
      setTunnelLog(prev => [...prev, "[OK] Đường hầm bảo mật được tạo thành công!"]);
    }, 800);
    setTimeout(() => {
      setTunnelLog(prev => [...prev, "🔗 URL công khai: https://vietlearn-tunnel-4a81.ngrok-free.app"]);
    }, 1500);
    setTimeout(() => {
      setTunnelLog(prev => [...prev, "[OK] Metro đã sẵn sàng phát các phân mảnh JS dãn nở vĩnh viễn!"]);
    }, 2200);
  };

  const stopTunnelSimulator = () => {
    setTunnelActive(false);
    setTunnelLog([]);
  };

  // Systems Architecture Details mapping
  const systemNodes = [
    {
      id: "frontend",
      title: "1. Web Client (Vite SPA)",
      category: "GIAO DIỆN (FRONTEND)",
      icon: Smartphone,
      color: "border-blue-400 bg-blue-50/70 text-blue-700",
      accentColor: "bg-blue-600",
      summary: "Giao diện đơn trang hỗ trợ tải tệp, hiển thị sơ đồ tư duy SVG và 2D RPG Game Playground.",
      tech: "React 18, Vite Engine, Tailwind CSS, Lucide icons, HTML5 Canvas",
      files: "src/App.tsx, src/components/DocUploadSection.tsx, src/components/MindMapViewer.tsx",
      details: "Đóng vai trò máy khách (Client state machine), quản lý trạng thái tải lên tệp tin và bóc tách link URL. Hiển thị thông minh luồng sơ đồ tư duy dạng SVG tương tác và định tuyến phản hồi từ người học về phòng Lab.",
      payload: `// Frontend gửi yêu cầu tải & quét link URL trực tuyến
const processLinkUrl = async (fileUrl) => {
  const res = await fetch("/api/process-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: fileUrl })
  });
  return await res.json();
}`
    },
    {
      id: "backend",
      title: "2. API Server Engine (Express)",
      category: "MÁY CHỦ TRUNG CHUYỂN",
      icon: Server,
      color: "border-[var(--color-primary)] bg-indigo-50/70 text-[var(--color-primary-hover)]",
      accentColor: "bg-[var(--color-primary)]",
      summary: "Cơ sở điều phối Node.js trung chuyển tệp tin công nhận, xử lý cô lập và API đệm.",
      tech: "NodeJS, Express Framework, User-Agent Spoofing, Multer Buffer Stream",
      files: "server.ts, package.json",
      details: "Bảo mật tệp bằng cách nạp trực tiếp qua Buffer cô lập. Hỗ trợ bóc tách liên kết URL thông minh, giả lập nhân trình duyệt nhằm tải tệp từ các tệp công khai (Drive, Dropbox, v.v.). Ngăn chặn toàn diện virus nặc danh thực thi.",
      payload: `// Express API Endpoint: Tải file từ liên kết không đồng bộ an toàn
app.post("/api/process-link", async (req, res) => {
  const { url } = req.body;
  const resFetch = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0..." } });
  const arrayBuffer = await resFetch.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString("base64");
  // Chuyển tiếp payload an toàn cho Gemini...
});`
    },
    {
      id: "gemini_ai",
      title: "3. Cognitive AI (Gemini 3.5)",
      category: "TRÍ TUỆ NHÂN TẠO (AI)",
      icon: Cpu,
      color: "border-purple-400 bg-purple-50/70 text-purple-700",
      accentColor: "bg-purple-600",
      summary: "Động cơ đằng sau bóc dữ liệu OCR, lập sơ đồ tư duy JSON tự động và mô hình hỏi đáp.",
      tech: "@google/genai SDK, Structured JSON Schemas, Text/Audio Multi-modal Ingestion",
      files: "server.ts (getAiClient helper)",
      details: "Lõi tư duy chính của hệ thống. Nhận base64 dữ liệu đa phương tiện hoặc mảng văn bản thô, thiết lập mô hình phản hồi nghiêm ngặt bằng kiểu Schema JSON để xuất ra câu hỏi Quiz và cấu trúc sơ đồ phân cấp dạng cây hoàn hảo.",
      payload: `// Định cấu trúc Schema của Sơ đồ tư duy truyền tới Gemini API
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    mindmap: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        label: { type: Type.STRING },
        children: { type: Type.ARRAY, items: { type: Type.OBJECT } }
      }
    }
  }
};`
    },
    {
      id: "audio_lab",
      title: "4. Audio Speech Lab Engine",
      category: "PHÒNG LAB ÂM THANH",
      icon: Globe,
      color: "border-teal-400 bg-teal-50/70 text-teal-700",
      accentColor: "bg-teal-600",
      summary: "Môi trường ghi âm micro thời gian thực và tự động phát âm đa quốc gia TTS.",
      tech: "HTML5 MediaRecorder API, Web Audio API, Web SpeechSynthesis API",
      files: "src/components/AudioSpeechLab.tsx",
      details: "Phân tách âm tiết bằng trình duyệt, bóc ghi âm cục bộ rồi truyền lên AI bóc băng văn bản, hỗ trợ người học nghe hướng dẫn phát âm chính xác tiếng Anh, Nhật, Hàn dưới dạng hàng đợi giọng nói thông suốt.",
      payload: `// Điều phối hàng đợi âm thanh tổng hợp đa ngôn ngữ (TTS)
const speakOut = (text, lang) => {
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang; // en-US, ja-JP...
  synth.speak(utterance);
};`
    },
    {
      id: "game",
      title: "5. 2D RPG Educational Loop",
      category: "TRÒ CHƠI & QUIZ",
      icon: Zap,
      color: "border-emerald-400 bg-emerald-50/70 text-emerald-700",
      accentColor: "bg-emerald-600",
      summary: "Trình duyệt ôn bài 2D RPG cho phép điều khiển nhân vật di dời và thách đấu bài thi.",
      tech: "React state managers, SVG Canvas, Keyboard listners, local Quiz collections",
      files: "src/components/EduGamePlayground.tsx, src/components/ChatbotSection.tsx",
      details: "Nhận ngân hàng câu hỏi Quiz được trích xuất tự động từ văn bản/tài link của người dùng. Tạo ra thế giới mê cung ảo có quái vật canh gác. Trả lời đúng để vượt màn, cộng điểm thành tích học tập trực quan.",
      payload: `// Đồng bộ ngân hàng Quiz để khởi chạy Game đấu quái vật
interface GameQuiz {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}`
    },
    {
      id: "cache_vault",
      title: "6. Secure Cache Vault",
      category: "LƯU TRỮ VÀ BẢO MẬT",
      icon: ShieldCheck,
      color: "border-amber-400 bg-amber-50/70 text-amber-700",
      accentColor: "bg-amber-600",
      summary: "Thành phần lưu trữ bảo mật cục bộ và cache dịch thuật 0ms cho các cụm từ đệm.",
      tech: "HTML5 LocalStorage API, In-memory Node translations dictionary",
      files: "src/types.ts, server.ts (translate endpoints)",
      details: "Cache lại toàn bộ nội dung dịch thuật giúp người dùng không phải gọi lại tài nguyên AI cho các cụm từ trùng lặp. Lưu trữ an toàn danh sách tệp PDF đã xử lý cục bộ, bảo vệ quyền riêng tư tuyệt đối cho học sinh.",
      payload: `// Lưu trữ cục bộ bảo mật danh sách tài liệu
const persistFiles = (files) => {
  localStorage.setItem("vietlearn_files", JSON.stringify(files));
};`
    }
  ];

  const activeNode = systemNodes.find(n => n.id === activeNodeId) || systemNodes[0];

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in" id="knowledgebase-section">
      {/* ── Hero Search Section — Stitch Knowledge Hub ─────────── */}
      <section className="relative overflow-hidden rounded-[16px] px-6 py-8 md:py-10 text-center bg-gradient-to-br from-[var(--color-primary)]/5 via-white to-[var(--color-secondary)]/5 border border-[var(--color-border-subtle)]">
        <div
          aria-hidden
          className="absolute inset-0 z-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 0% 0%, var(--color-primary) 0%, transparent 35%), radial-gradient(circle at 100% 100%, var(--color-secondary) 0%, transparent 35%)",
          }}
        />
        <div className="relative z-10 max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)] text-[12px] font-medium text-[var(--color-secondary)]">
            <Sparkles size={13} /> AI-curated technical mastery paths
          </div>
          <h2 className="text-[28px] md:text-[34px] font-bold text-[var(--color-text-primary)] tracking-tight font-display leading-tight">
            Knowledge Hub
          </h2>
          <p className="text-[14px] md:text-[16px] text-[var(--color-text-secondary)] leading-relaxed">
            Welcome back, Scholar. Explore deep learning resources and start your next
            technical mastery path or document analysis.
          </p>
          <div className="mt-6 flex items-center bg-white shadow-[0_8px_28px_rgba(26,28,28,0.08)] rounded-full p-1.5 border border-[var(--color-border-subtle)] focus-within:border-[var(--color-primary)] focus-within:shadow-[var(--shadow-primary-glow)] transition-all">
            <Search size={18} className="mx-3 text-[var(--color-primary)] shrink-0" />
            <input
              className="w-full py-2.5 pr-3 bg-transparent border-none focus:ring-0 focus:outline-none text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]"
              placeholder="Search documentation, courses, or analysis files…"
              type="text"
            />
            <button
              onClick={() => setKnowledgeTab("topics")}
              className="bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-full text-[13px] font-medium hover:bg-[var(--color-primary-hover)] active:scale-95 transition-all whitespace-nowrap"
            >
              Explore
            </button>
          </div>
        </div>
      </section>

      {/* Tab Switcher at the top of Technical Area */}
      <div className="flex bg-[var(--color-neutral-soft)] p-1.5 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)]/40 max-w-md self-center md:self-start">
        <button
          onClick={() => setKnowledgeTab("diagram")}
          className={`flex-1 py-2 px-5 rounded-[var(--radius-card)] text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
            knowledgeTab === "diagram"
              ? "bg-white text-[var(--color-primary-hover)] shadow-sm"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <Layers size={13} />
          Sơ đồ Hệ Thống (System Plant)
        </button>
        <button
          onClick={() => setKnowledgeTab("topics")}
          className={`flex-1 py-2 px-5 rounded-[var(--radius-card)] text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
            knowledgeTab === "topics"
              ? "bg-white text-[var(--color-primary-hover)] shadow-sm"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <BookOpen size={13} />
          8 Chuyên Đề Hỏi & Đáp
        </button>
      </div>

      {knowledgeTab === "diagram" ? (
        /* ==================== SYSTEM ARCHITECTURE DIAGRAM (PLANT) ==================== */
        <Card className="p-6 md:p-8 flex flex-col gap-6 animate-fade-in w-full">
          
          <div className="border-b-2 border-[var(--color-border-subtle)] pb-4">
            <h3 className="text-[18px] font-black text-[var(--color-text-primary)] flex items-center gap-2">
              <Layers className="text-[var(--color-primary)] animate-pulse" size={24} />
              Sơ đồ Kiến Trúc Kiến Tạo Hệ Thống Fullstack - VietLearn AI Studio 
            </h3>
            <p className="text-[14px] text-[var(--color-text-secondary)] font-bold mt-1">
              Bấm chọn trực tiếp vào từng phân hệ quy trình phía dưới để khám phá file mã nguồn chính, thông số hoạt động và cấu trúc truyền tin trực quan.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
            
            {/* Visual Blueprint Grid Layout */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              
              <div className="border border-indigo-100 bg-[var(--color-neutral-soft)]/50 rounded-[var(--radius-card)] p-6 relative overflow-hidden flex flex-col gap-6 min-h-[420px] justify-center">
                
                {/* Visual grid gridlines representing blueprint */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:20px_20px] opacity-25" />
                
                {/* Connection paths overlay */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none hidden md:block">
                  <path d="M 160 110 L 320 110" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="3 3" />
                  <path d="M 390 140 L 390 220" fill="none" stroke="#e2e8f0" strokeWidth="2" />
                  <path d="M 320 250 L 160 250" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="3 3" />
                  <path d="M 120 140 L 120 220" fill="none" stroke="#e2e8f0" strokeWidth="2" />
                </svg>

                {/* Row 1 */}
                <div className="grid grid-cols-2 gap-4 relative z-10 w-full">
                  {/* NODE 1: Front-end CLIENT */}
                  <div 
                    onClick={() => setActiveNodeId("frontend")}
                    className={`border-2 p-3.5 rounded-[var(--radius-card)] cursor-pointer transition-all flex flex-col gap-1.5 shadow-xs ${
                      activeNodeId === "frontend" 
                        ? `${systemNodes[0].color} border-indigo-600 ring-2 ring-brand-soft` 
                        : "border-[var(--color-border-subtle)] bg-white hover:border-blue-400 text-[var(--color-text-primary)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded flex items-center justify-center text-white ${activeNodeId === "frontend" ? "bg-blue-600 animate-pulse" : "bg-blue-500"}`}>
                        <Smartphone size={11} />
                      </div>
                      <h4 className="text-[11px] font-bold">1. Frontend Client</h4>
                    </div>
                    <p className="text-[10px] text-[var(--color-text-secondary)] leading-normal block">Vite, React SPA Giao diện & Động cơ game</p>
                  </div>

                  {/* NODE 2: Express Server */}
                  <div 
                    onClick={() => setActiveNodeId("backend")}
                    className={`border-2 p-3.5 rounded-[var(--radius-card)] cursor-pointer transition-all flex flex-col gap-1.5 shadow-xs ${
                      activeNodeId === "backend" 
                        ? `${systemNodes[1].color} border-indigo-600 ring-2 ring-brand-soft` 
                        : "border-[var(--color-border-subtle)] bg-white hover:border-[var(--color-primary)] text-[var(--color-text-primary)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded flex items-center justify-center text-white ${activeNodeId === "backend" ? "bg-[var(--color-primary)]" : "bg-[var(--color-primary)]"}`}>
                        <Server size={11} />
                      </div>
                      <h4 className="text-[11px] font-bold">2. Express Server</h4>
                    </div>
                    <p className="text-[10px] text-[var(--color-text-secondary)] leading-normal block">API Server, Port 3000 Web proxy & Cô lập</p>
                  </div>
                </div>

                {/* Connecting Ribbon */}
                <div className="flex justify-between items-center px-4 relative z-10">
                  <div className="bg-slate-200 border border-[var(--color-border-default)] font-mono text-[9px] font-bold px-2 py-0.5 rounded-full text-[var(--color-text-secondary)] mx-auto">
                    API FLOW & SECURED STREAM CHANNELS
                  </div>
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-2 gap-4 relative z-10 w-full">
                  {/* NODE 5: RPG Game & SVG Tree */}
                  <div 
                    onClick={() => setActiveNodeId("game")}
                    className={`border-2 p-3.5 rounded-[var(--radius-card)] cursor-pointer transition-all flex flex-col gap-1.5 shadow-xs ${
                      activeNodeId === "game" 
                        ? `${systemNodes[4].color} border-emerald-600 ring-2 ring-emerald-50` 
                        : "border-[var(--color-border-subtle)] bg-white hover:border-emerald-400 text-[var(--color-text-primary)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded flex items-center justify-center text-white ${activeNodeId === "game" ? "bg-emerald-600" : "bg-emerald-500"}`}>
                        <Zap size={11} />
                      </div>
                      <h4 className="text-[11px] font-bold">5. 2D RPG & Mindmap</h4>
                    </div>
                    <p className="text-[10px] text-[var(--color-text-secondary)] leading-normal block">Canvas, SVG renders, Đấu quái trắc nghiệm</p>
                  </div>

                  {/* NODE 3: Cognitive AI Gateway */}
                  <div 
                    onClick={() => setActiveNodeId("gemini_ai")}
                    className={`border-2 p-3.5 rounded-[var(--radius-card)] cursor-pointer transition-all flex flex-col gap-1.5 shadow-xs ${
                      activeNodeId === "gemini_ai" 
                        ? `${systemNodes[2].color} border-purple-600 ring-2 ring-purple-50` 
                        : "border-[var(--color-border-subtle)] bg-white hover:border-purple-400 text-[var(--color-text-primary)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded flex items-center justify-center text-white bg-purple-500`}>
                        <Cpu size={11} />
                      </div>
                      <h4 className="text-[11px] font-bold">3. Cognitive Gemini AI</h4>
                    </div>
                    <p className="text-[10px] text-[var(--color-text-secondary)] leading-normal block">Gemini 3.5 Flash, Bóc cấu trúc JSON, OCR</p>
                  </div>
                </div>

                {/* Row 3 helper units */}
                <div className="grid grid-cols-2 gap-4 relative z-10 w-full">
                  {/* NODE 4: Audio Lab */}
                  <div 
                    onClick={() => setActiveNodeId("audio_lab")}
                    className={`border-2 p-3.5 rounded-[var(--radius-card)] cursor-pointer transition-all flex flex-col gap-1.5 shadow-xs ${
                      activeNodeId === "audio_lab" 
                        ? `${systemNodes[3].color} border-teal-600 ring-2 ring-teal-50` 
                        : "border-[var(--color-border-subtle)] bg-white hover:border-teal-400 text-[var(--color-text-primary)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded flex items-center justify-center text-white bg-teal-500`}>
                        <Globe size={11} />
                      </div>
                      <h4 className="text-[11px] font-bold">4. Audio Lab & TTS</h4>
                    </div>
                    <p className="text-[10px] text-[var(--color-text-secondary)] leading-normal block">HTML5 MediaRecorder, Phát âm đa ngữ</p>
                  </div>

                  {/* NODE 6: Cache & Sandbox */}
                  <div 
                    onClick={() => setActiveNodeId("cache_vault")}
                    className={`border-2 p-3.5 rounded-[var(--radius-card)] cursor-pointer transition-all flex flex-col gap-1.5 shadow-xs ${
                      activeNodeId === "cache_vault" 
                        ? `${systemNodes[5].color} border-amber-600 ring-2 ring-amber-50` 
                        : "border-[var(--color-border-subtle)] bg-white hover:border-amber-400 text-[var(--color-text-primary)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded flex items-center justify-center text-white bg-amber-500`}>
                        <ShieldCheck size={11} />
                      </div>
                      <h4 className="text-[11px] font-bold">6. Secure Cache Vault</h4>
                    </div>
                    <p className="text-[10px] text-[var(--color-text-secondary)] leading-normal block">LocalStorage persistent, Tách độc tố macro</p>
                  </div>
                </div>

              </div>

              {/* Security info */}
              <div className="bg-[var(--color-neutral-soft)] border border-[var(--color-border-subtle)] p-3.5 rounded-[var(--radius-card)] text-[11px] text-[var(--color-text-secondary)] leading-relaxed flex items-start gap-2">
                <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-bold text-[var(--color-text-primary)]">Môi trường đám mây độc bản:</span>
                  VietLearn AI Studio vận hành toàn cục trên cổng bảo mật HTTPS, sử dụng kiến trúc fullstack Node API phối hợp nạp tệp không trung gian.
                </div>
              </div>

            </div>

            {/* Selected Node documentation and Code block */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              
              <div className="bg-[var(--color-neutral-soft)] border border-[var(--color-border-subtle)] rounded-[var(--radius-card)] p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)]/50 pb-2">
                  <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100/50 text-[var(--color-primary-hover)] rounded text-[9px] font-bold uppercase tracking-wider">
                    {activeNode.category}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--color-neutral)]">{activeNode.id}</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white ${activeNode.accentColor}`}>
                    {React.createElement(activeNode.icon, { size: 14 })}
                  </div>
                  <h4 className="font-bold text-[var(--color-text-primary)] text-xs">{activeNode.title}</h4>
                </div>

                <p className="text-xs text-[var(--color-text-secondary)] font-medium leading-relaxed italic">
                  "{activeNode.summary}"
                </p>

                <div className="space-y-2 text-[10px]">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-[var(--color-neutral)] uppercase tracking-wide">CÔNG NGHỆ CHỦ ĐẠO:</span>
                    <span className="text-[var(--color-text-primary)] font-medium bg-white p-1.5 rounded border border-[var(--color-border-subtle)]/60 leading-tight">{activeNode.tech}</span>
                  </div>
                  
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-[var(--color-neutral)] uppercase tracking-wide">FILE PHỤ TRÁCH QUẢN LÝ:</span>
                    <span className="text-[var(--color-text-primary)] font-mono bg-white p-1.5 rounded border border-[var(--color-border-subtle)]/60 break-all">{activeNode.files}</span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-[var(--color-neutral)] uppercase tracking-wide">CƠ CHẾ VẬN HÀNH:</span>
                    <p className="text-[var(--color-text-secondary)] leading-normal bg-white p-2 rounded border border-[var(--color-border-subtle)]/60">{activeNode.details}</p>
                  </div>
                </div>
              </div>

              {/* Code payload representing real internal connection */}
              <div className="bg-slate-900 rounded-[var(--radius-card)] overflow-hidden font-mono text-[9.5px]">
                <div className="bg-slate-800 text-[var(--color-neutral)] px-3.5 py-2 border-b border-slate-700 text-[9px] uppercase font-bold flex items-center justify-between">
                  <span>MÃ NGUỒN PHÂN HỆ</span>
                  <span className="text-teal-400">TYPESCRIPT</span>
                </div>
                <pre className="p-3 text-emerald-300 overflow-x-auto leading-normal whitespace-pre-wrap font-mono max-h-[180px]">
                  <code>{activeNode.payload}</code>
                </pre>
              </div>

            </div>

          </div>

        </Card>
      ) : (
        /* ==================== 8 KNOWLEDGE BASE TOPICS ==================== */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
          {/* Topics sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-[var(--radius-card)] p-5 shadow-sm">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <BookOpen size={18} />
                Học Viện Kỹ Thuật VietLearn
              </h3>
              <p className="text-xs text-indigo-100 mt-2">
                Giải đáp trực quan hệ thống 8 thắc mắc cốt lõi về quy trình biên dịch sản phẩm Web/App di động, OCR, NLP AI, Bảo mật và Dịch thuật ngữ cảnh.
              </p>
            </div>

            <Card className="p-4 flex flex-col gap-2 font-sans">
              <span className="text-[12px] font-black text-[var(--color-neutral)] uppercase tracking-wider px-3 mb-1 block">DASHBOARD CHUYÊN ĐỀ</span>
              {techTopics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopicId(topic.id)}
                  className={`text-left text-[14px] py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-between group ${
                    selectedTopicId === topic.id
                      ? "bg-indigo-100 border-[var(--color-primary)] text-[var(--color-primary-hover)] font-black shadow-xs"
                      : "bg-[var(--color-surface)] border-transparent text-[var(--color-text-primary)] font-bold hover:bg-[var(--color-neutral-soft)] hover:border-[var(--color-border-subtle)]"
                  }`}
                >
                  <div className="truncate pr-2">
                    <span className="text-[10px] font-black text-[var(--color-primary)] block mb-0.5">{topic.category}</span>
                    {topic.title}
                  </div>
                  <ChevronIcon topicId={topic.id} />
                </button>
              ))}
            </Card>
          </div>

          {/* Main explanation content */}
          <div className="lg:col-span-8 flex flex-col gap-6 w-full">
            <Card className="p-6 md:p-8 flex flex-col gap-6">
              {/* Header */}
              <div className="border-b-2 border-[var(--color-border-subtle)] pb-5">
                <span className="px-3 py-1.5 bg-indigo-100 text-[var(--color-primary-hover)] rounded-full text-[12px] font-black uppercase tracking-wider border-2 border-indigo-100">
                  {activeTopic.category}
                </span>
                <h2 className="text-2xl font-black text-[var(--color-text-primary)] mt-3">{activeTopic.title}</h2>
                <div className="bg-amber-100 border-2 border-amber-300 rounded-xl p-4 mt-4 text-[14px] text-amber-900 font-bold">
                  🙋 <span className="italic">Thắc mắc người dùng:</span> "{activeTopic.question}"
                </div>
              </div>

              {/* Interactive Lab / Simulator for the specific question */}
              {activeTopic.id === "qr_scanning" && (
                <div className="bg-[var(--color-neutral-soft)] border border-[var(--color-border-subtle)] rounded-[var(--radius-card)] p-5">
                  <h4 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider mb-3 font-sans">🛠️ PHÒNG THỬ NGHIỆM ĐỊNH TUYẾN QR CODE</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-3 bg-white border border-[var(--color-border-subtle)]/80 p-4 rounded-[var(--radius-card)] text-xs">
                      <p className="font-semibold text-[var(--color-text-primary)]">1. Thiết lập mô phỏng:</p>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[var(--color-text-secondary)]">Tình trạng app di động:</span>
                        <button
                          onClick={() => setAppInstalled(!appInstalled)}
                          className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-full transition-all ${
                            appInstalled ? "bg-green-100 text-green-700" : "bg-slate-200 text-[var(--color-text-secondary)]"
                          }`}
                        >
                          {appInstalled ? "Đã cài đặt App" : "Chưa cài đặt App"}
                        </button>
                      </div>

                      <p className="text-[var(--color-text-secondary)] text-[11px] leading-relaxed">
                        Một mã QR duy nhất chứa link HTTPS: <code className="bg-[var(--color-neutral-soft)] px-1 text-rose-500">https://vietlearn.vn/room</code>
                      </p>

                      <button
                        onClick={() => {
                          setQrScanned(true);
                          setTimeout(() => setQrScanned(false), 3500);
                        }}
                        className="w-full mt-2 bg-[var(--color-primary)] hover:bg-brand-medium text-white font-semibold py-2 rounded-lg transition text-xs shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <Zap size={14} /> Quét mã QR mô phỏng
                      </button>
                    </div>

                    <div className="bg-slate-900 text-slate-100 p-4 rounded-[var(--radius-card)] font-mono text-[11px] leading-relaxed flex flex-col justify-between">
                      <div>
                        <span className="text-[var(--color-primary)] font-semibold block mb-2">// LOG HOẠT ĐỘNG THIẾT BỊ</span>
                        {qrScanned ? (
                          <div className="space-y-1.5 text-green-400 animate-pulse">
                            <p>✓ Micro-lens scanned QR Code.</p>
                            <p>✓ URL: https://vietlearn.vn/room</p>
                            <p>✓ Platform check: iOS system interceptor...</p>
                            {appInstalled ? (
                              <p className="text-indigo-300 font-bold mt-2">📲 [OK] Phát hiện App Vietlearn đã cài! Mở trực tiếp App native ứng dụng.</p>
                            ) : (
                              <p className="text-amber-300 font-bold mt-2">🌐 [OK] Chưa cài App! Mở Safari di động hiển thị ứng dụng dạng Web SPA/PWA mượt mà.</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-[var(--color-neutral)] italic">Vui lòng nhấp nút "Quét mã QR" ở bên trái để theo dõi luồng định tuyến thông minh...</p>
                        )}
                      </div>
                      <div className="border-t border-slate-800 pt-2 mt-2 text-[10px] text-[var(--color-text-secondary)]">
                        Ứng dụng: Universal Deep Linking / Apple App Site Association
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTopic.id === "expo_tunneling" && (
                <div className="bg-[var(--color-neutral-soft)] border border-[var(--color-border-subtle)] rounded-[var(--radius-card)] p-5">
                  <h4 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider mb-3 animate-pulse">🛠️ PHÒNG THỬ NGHIỆM ĐƯỜNG HẦM EXPO GO TUNNEL</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-3 bg-white border border-[var(--color-border-subtle)]/80 p-4 rounded-[var(--radius-card)] text-xs">
                      <p className="font-semibold text-[var(--color-text-primary)]">Mô phỏng Expo Tunnel:</p>
                      <p className="text-[var(--color-text-secondary)] text-[11px] leading-relaxed">
                        Khắc phục việc kiểm thử thiết bị khác mạng (máy tính WiFi văn phòng, điện thoại dùng 4G) thông qua một cổng trung chuyển từ xa.
                      </p>
                      
                      {tunnelActive ? (
                        <button
                          onClick={stopTunnelSimulator}
                          className="w-full mt-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2 rounded-lg transition text-xs shadow-sm"
                        >
                          Ngắt kết nối Đường Hầm
                        </button>
                      ) : (
                        <button
                          onClick={startTunnelSimulator}
                          className="w-full mt-2 bg-[var(--color-primary)] hover:bg-brand-medium text-white font-semibold py-2 rounded-lg transition text-xs shadow-sm flex items-center justify-center gap-1"
                        >
                          Khởi chạy Expo Tunnel (--tunnel)
                        </button>
                      )}
                    </div>

                    <div className="bg-slate-900 border border-slate-800 text-[var(--color-neutral)] p-4 rounded-[var(--radius-card)] font-mono text-[11px] leading-relaxed min-h-[140px] flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="text-amber-400 block mb-1">CỬA SỔ TERM: ~ $ npx expo start --tunnel</span>
                        {tunnelActive ? (
                          tunnelLog.map((log, idx) => <p key={idx} className="text-yellow-100">{log}</p>)
                        ) : (
                          <p className="text-[var(--color-text-secondary)] italic">Nhấn khởi chạy để đo đạc và tạo đường dẫn ảo ngrok công cộng...</p>
                        )}
                      </div>
                      {tunnelActive && (
                        <div className="mt-2 text-[10px] text-green-400 font-bold border-t border-slate-800 pt-1.5 flex items-center gap-1">
                          <CheckCircle2 size={11} /> 🌐 Điện thoại 4G quét QR lúc này sẽ tải được mượt mà!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTopic.id === "vietnamese_nlp" && (
                <div className="bg-[var(--color-neutral-soft)] border border-[var(--color-border-subtle)] rounded-[var(--radius-card)] p-5">
                  <h4 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider mb-2">🛠️ MA TRẬN PHÂN TÍCH NGỮ ÂM VÀ HẢI VÙNG</h4>
                  <p className="text-[11px] text-[var(--color-text-secondary)] mb-3 font-sans">Xem cách các phương ngữ di sản phát âm độc đáo đối với cụm từ, gây khó khăn cho Speech-to-Text chuẩn:</p>
                  
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {["Sữa bò", "Răng rứa", "Cá rô"].map((w) => (
                      <button
                        key={w}
                        onClick={() => setSelectedDialectWord(w)}
                        className={`py-1.5 px-3 text-xs font-medium rounded-lg transition-all border ${
                          selectedDialectWord === w
                            ? "bg-[var(--color-primary)] text-white border-indigo-600"
                            : "bg-white text-[var(--color-text-secondary)] border-[var(--color-border-subtle)] hover:bg-[var(--color-neutral-soft)]"
                        }`}
                      >
                        "{w}"
                      </button>
                    ))}
                  </div>

                  {selectedDialectWord === "Sữa bò" && (
                    <div className="bg-white border border-[var(--color-border-subtle)]/60 p-3.5 rounded-[var(--radius-card)] space-y-2 text-xs">
                      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-1.5">
                        <span className="font-bold text-[var(--color-text-primary)]">Miền Bắc (Hà Nội):</span>
                        <span className="font-mono text-[var(--color-primary)]">/sɯ̃ə\u0311\u0305 \u0253\u0254\u02d0\u02d1/</span>
                      </div>
                      <p className="text-[var(--color-text-secondary)] leading-relaxed text-[11px]">Phát âm sắc sảo, dứt khoát. Nghe rõ âm ngã lượn sóng đặc trưng, phân biệt rõ "sữa" với "sửa".</p>
                      
                      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pt-1.5 pb-1.5">
                        <span className="font-bold text-[var(--color-text-primary)]">Miền Trung (Huế):</span>
                        <span className="font-mono text-[var(--color-primary)]">/sɯə\u0311 \u0253\u0254\u02d0\u02d1/</span>
                      </div>
                      <p className="text-[var(--color-text-secondary)] leading-relaxed text-[11px]">Trọng âm trầm, giọng nén mạnh. Thanh Ngã có chiều hướng đồng nhất nhẹ thành thanh Hỏi kết hợp nén họng sâu.</p>

                      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pt-1.5 pb-1.5">
                        <span className="font-bold text-[var(--color-text-primary)]">Miền Nam (Sài Gòn):</span>
                        <span className="font-mono text-[var(--color-primary)]">/sɯə\u0311\u031a \u0253\u0254\u02d0\u02d1/</span>
                      </div>
                      <p className="text-[var(--color-text-secondary)] leading-relaxed text-[11px]">Phát âm êm mượt. Đồng nhất hoàn toàn thanh Hỏi và Thanh Ngã. "Sữa bò" nghe như "Sửa bò".</p>
                    </div>
                  )}

                  {selectedDialectWord === "Răng rứa" && (
                    <div className="bg-white border border-[var(--color-border-subtle)]/60 p-3.5 rounded-[var(--radius-card)] space-y-2 text-xs font-sans">
                      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-1.5">
                        <span className="font-bold text-[var(--color-text-primary)]">Ý nghĩa:</span>
                        <span className="font-mono text-emerald-600">"Sao thế?" / "Sao vậy?"</span>
                      </div>
                      <p className="text-[var(--color-text-secondary)] leading-relaxed text-[11px]">Từ vựng bản địa miền Trung cốt lõi. Người miền Bắc/Nam hiếm khi tự động thốt ra.</p>

                      <div className="flex items-center justify-between pt-1 pb-1">
                        <span className="font-bold text-[var(--color-text-primary)]">Thử thách STT:</span>
                        <span className="text-amber-600 font-semibold">[DỄ LỖI]</span>
                      </div>
                      <p className="text-[var(--color-text-secondary)] leading-relaxed text-[11px]">Với các mô hình ASR thô sơ không có NLP vùng miền, họ sẽ phiên dịch nhầm cụm "răng rứa" thành "Răng" (kẽ răng, bộ răng) và "rứa" (con rùa) làm hư hỏng ngữ nghĩa.</p>
                    </div>
                  )}

                  {selectedDialectWord === "Cá rô" && (
                    <div className="bg-white border border-[var(--color-border-subtle)]/60 p-3.5 rounded-[var(--radius-card)] space-y-2 text-xs">
                      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-1.5">
                        <span className="font-bold text-[var(--color-text-primary)]">Phát âm Miền Bắc:</span>
                        <span className="text-[var(--color-text-primary)]">"Cá giô / Cá rô"</span>
                      </div>
                      <div className="flex items-center justify-between pt-1.5">
                        <span className="font-bold text-[var(--color-text-primary)]">Phát âm Miền Nam:</span>
                        <span className="text-[var(--color-text-primary)]">"Cá gô"</span>
                      </div>
                      <p className="text-[var(--color-text-secondary)] leading-relaxed text-[11px] mt-1">Trong tiếng Nam Bộ, phụ âm "r" thường biến âm thành thanh mềm "g" hoặc "d". AI phải tự động hiểu "Cá gô" chính là con cá rô đồng.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Core Markdown-style content */}
              <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed space-y-4">
                <div className="prose prose-indigo max-w-none text-[var(--color-text-secondary)] whitespace-pre-wrap font-sans">
                  {activeTopic.explanation}
                </div>
              </div>

              {/* Modular Block Diagrams */}
              {activeTopic.diagramSteps && (
                <div className="bg-[var(--color-neutral-soft)] border border-[var(--color-border-subtle)] rounded-[var(--radius-card)] p-5 md:p-6 mt-2 animate-fade-in">
                  <h4 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider mb-4 flex items-center gap-1.5 font-sans">
                    <Layers size={14} className="text-[var(--color-primary)]" />
                    Dòng Chảy Sơ Đồ Quy Trình (Data Flow)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {activeTopic.diagramSteps.map((step, idx) => (
                      <div key={idx} className="bg-white border border-[var(--color-border-subtle)]/60 p-4 rounded-[var(--radius-card)] flex flex-col gap-2 relative">
                        <div className="absolute top-3.5 right-3.5 text-[15px] font-black text-slate-200 font-mono">
                          0{idx + 1}
                        </div>
                        <div className="w-8 h-8 bg-indigo-50 text-[var(--color-primary)] rounded-lg flex items-center justify-center font-bold text-sm">
                          {idx === 0 ? "✎" : idx === 1 ? "⚙" : "✔"}
                        </div>
                        <h5 className="font-bold text-[var(--color-text-primary)] text-[11px] mt-1">{step.title}</h5>
                        <p className="text-[var(--color-text-secondary)] text-[10px] leading-relaxed">{step.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Visual Code Block */}
              {activeTopic.visualCode && (
                <div className="bg-slate-900 rounded-[var(--radius-card)] overflow-hidden mt-2 font-mono text-[10.5px]">
                  <div className="bg-slate-800 text-[var(--color-neutral)] px-4 py-2.5 flex items-center justify-between text-[10px] border-b border-slate-700">
                    <span className="font-mono flex items-center gap-1.5">
                      <Code size={13} className="text-teal-400" /> CODE MINH HỌA HỆ THỐNG
                    </span>
                    <span className="text-[var(--color-text-secondary)] text-[9px] uppercase font-bold">TYPESCRIPT / CODE</span>
                  </div>
                  <pre className="p-4 text-emerald-300 overflow-x-auto select-all leading-normal whitespace-pre text-left">
                    <code>{activeTopic.visualCode}</code>
                  </pre>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ── Knowledge Stats Footer — Stitch style ──────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-[var(--color-border-subtle)]">
        <div className="space-y-1">
          <p className="text-[13px] text-[var(--color-text-secondary)] font-medium">Total Modules</p>
          <p className="text-[28px] font-bold font-display text-[var(--color-text-primary)] leading-tight">
            {techTopics.length * 16}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[13px] text-[var(--color-text-secondary)] font-medium">Hours Learned</p>
          <p className="text-[28px] font-bold font-display text-[var(--color-text-primary)] leading-tight">
            42.5
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[13px] text-[var(--color-text-secondary)] font-medium">Certificates</p>
          <p className="text-[28px] font-bold font-display text-[var(--color-text-primary)] leading-tight">
            3
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[13px] text-[var(--color-text-secondary)] font-medium">Lab Score</p>
          <p className="text-[28px] font-bold font-display text-[var(--color-primary)] leading-tight">
            88%
          </p>
        </div>
      </section>
    </div>
  );
}

function ChevronIcon({ topicId }: { topicId: string }) {
  return (
    <div className="w-5 h-5 rounded-full bg-white border border-[var(--color-border-subtle)] flex items-center justify-center text-[var(--color-neutral)] group-hover:bg-indigo-50 group-hover:text-[var(--color-primary)] group-hover:border-indigo-100 transition">
      <ArrowRight size={10} />
    </div>
  );
}
