import React, { useState, useEffect, useRef } from "react";
import { QuizQuestion } from "../types";
import {
  Play,
  RotateCcw,
  Award,
  CheckCircle,
  XCircle,
  ChevronRight,
  HelpCircle,
  Gamepad2,
  Compass,
  ShieldAlert,
  Sword,
  Flame,
  Star,
  Trophy,
  Timer,
  Puzzle,
  Tractor,
} from "lucide-react";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import GameFarmLobby from "./GameFarmLobby";

interface EduGamePlaygroundProps {
  quizList?: QuizQuestion[];
}

export default function EduGamePlayground({ quizList }: EduGamePlaygroundProps) {
  const [activeSubTab, setActiveSubTab] = useState<"farm_lobby" | "rpg_quest" | "classic_quiz">("farm_lobby");

  // Fallback default quizzes if user hasn't processed any files yet
  const defaultQuizzes: QuizQuestion[] = [
    {
      id: "fallback_q1",
      question: "Để chuyển một ứng dụng Web (SaaS) sang di động mà không cần viết lại mã nguồn gốc hoàn toàn, kỹ thuật bao bọc nào sau đây được sử dụng?",
      options: [
        "Sử dụng Capacitor / Cordova chạy Webview bọc Native Bridge",
        "Biên dịch trực tiếp mã HTML sang mã máy Swift",
        "Sử dụng trình giả lập Android Studio chạy trên máy khách",
        "Nhúng mã Web tĩnh thông qua file tin nhắn SMS"
      ],
      correctAnswer: "Sử dụng Capacitor / Cordova chạy Webview bọc Native Bridge",
      explanation: "Capacitor giúp bọc toàn bộ code HTML/JS/CSS của bạn chạy trong WebView của di động, đồng thời cấp quyền truy cập phần cứng thông qua mã JS Bridge."
    },
    {
      id: "fallback_q2",
      question: "Vì sao khi chạy thử ứng dụng di động dạng local bằng Expo Go, ta thường sử dụng tuỳ chọn '--tunnel'?",
      options: [
        "Để tăng dung lượng tải của ảnh và video",
        "Để điện thoại khác lớp mạng (hoặc dùng 3G/4G) vẫn kết nối trực tiếp đến máy tính chạy bundler thông qua ngrok",
        "Để tự động dịch ngôn ngữ tài liệu",
        "Để lưu trữ dữ liệu offline trực tiếp vào RAM"
      ],
      correctAnswer: "Để điện thoại khác lớp mạng (hoặc dùng 3G/4G) vẫn kết nối trực tiếp đến máy tính chạy bundler thông qua ngrok",
      explanation: "Tùy chọn --tunnel thiết lập một đường hầm truyền dữ liệu an toàn ngrok, kết nối trực tiếp smartphone và máy chủ Metro bọc ngoài giới hạn mạng cục bộ (LAN)."
    },
    {
      id: "fallback_q3",
      question: "Phương pháp bảo mật cốt lõi để phòng tránh mã độc nhúng trong tệp PDF/Docs khi trích xuất chữ viết là gì?",
      options: [
        "Đổi tên đuôi tệp thành .jpg bằng ứng dụng văn phòng",
        "Mở tệp và phân tách chữ viết trong môi trường Container Sandbox cách ly, hoặc kết xuất ảnh vật lý rồi quét OCR điểm ảnh",
        "Yêu cầu người gửi tự ký cam kết không có mã độc ẩn",
        "Chỉ mở tệp trên máy tính dùng Windows XP để tránh lây lan"
      ],
      correctAnswer: "Mở tệp và phân tách chữ viết trong môi trường Container Sandbox cách ly, hoặc kết xuất ảnh vật lý rồi quét OCR điểm ảnh",
      explanation: "Môi trường Sandbox cách ly các khối mã thực thi tiềm ẩn từ PDF khỏi máy chủ chính. Chuyển PDF sang ảnh để quét OCR giúp triệt tiêu hoàn toàn mã độc."
    }
  ];

  const activeQuizzes = quizList && quizList.length > 0 ? quizList : defaultQuizzes;

  // Classic Quiz States
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);

  // 2D RPG Quest Canvas States
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playerX, setPlayerX] = useState<number>(180);
  const [playerY, setPlayerY] = useState<number>(110);
  const [playerDir, setPlayerDir] = useState<string>("down"); // "up" | "down" | "left" | "right"
  const [playerXP, setPlayerXP] = useState<number>(0);
  const [playerLevel, setPlayerLevel] = useState<number>(1);
  const [speedBoost, setSpeedBoost] = useState<boolean>(false);

  // Active Colliding NPC Quiz Panel State
  const [rpgActiveNpc, setRpgActiveNpc] = useState<{ name: string; avatar: string; topicName: string; qIndex: number } | null>(null);
  const [rpgUserSelectedAnswer, setRpgUserSelectedAnswer] = useState<string | null>(null);
  const [rpgNpcFeedback, setRpgNpcFeedback] = useState<{ isCorrect: boolean; feedbackText: string } | null>(null);

  // Status of the 3 Sages on the Map
  const [sageStatus, setSageStatus] = useState<Record<string, "idle" | "satisfied">>({
    "Thầy Đồ Phương Bắc": "idle",
    "Đạo Sĩ Phương Trung": "idle",
    "Hiền Nhân Phương Nam": "idle"
  });

  const speed = 12;

  // Render HTML5 2D Tile Map canvas game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Map Dimensions: 380 x 240
    let animationId: number;

    const drawGame = () => {
      // 1. Clear Screen / Draw Grass Background
      ctx.fillStyle = "#ecfdf5"; // soft mint green
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw beautiful retro checkers grid for grassland tiles
      ctx.fillStyle = "#f0fdf4";
      for (let i = 0; i < canvas.width; i += 32) {
        for (let j = 0; j < canvas.height; j += 32) {
          if ((i + j) % 64 === 0) {
            ctx.fillRect(i, j, 32, 32);
          }
        }
      }

      // 2. Draw Obstacles (Decorative ruins, books, library desks)
      drawStoneRuins(ctx, 40, 140);
      drawStoneRuins(ctx, 280, 150);
      drawDecorativeBook(ctx, 120, 30);
      drawDecorativeBook(ctx, 200, 40);

      // 3. Draw The 3 Sages (NPC Targets)
      // NPC 1: Bắc Sage
      drawSage(ctx, 60, 60, "Thầy Đồ Phương Bắc", sageStatus["Thầy Đồ Phương Bắc"] === "satisfied");
      // NPC 2: Trung Sage
      drawSage(ctx, 190, 180, "Đạo Sĩ Phương Trung", sageStatus["Đạo Sĩ Phương Trung"] === "satisfied");
      // NPC 3: Nam Sage
      drawSage(ctx, 310, 60, "Hiền Nhân Phương Nam", sageStatus["Hiền Nhân Phương Nam"] === "satisfied");

      // 4. Draw User Player Avatar (Stylized Wizard Cadet)
      drawPlayer(ctx, playerX, playerY, playerDir, speedBoost);

      // 5. Draw Target Guides (Visual dashed lines indicating where instructors stand)
      if (playerXP < 150) {
        ctx.strokeStyle = "rgba(129, 140, 248, 0.4)";
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(playerX, playerY);
        // Point to the nearest unsatisfied teacher
        if (sageStatus["Thầy Đồ Phương Bắc"] === "idle") {
          ctx.lineTo(60, 60);
        } else if (sageStatus["Đạo Sĩ Phương Trung"] === "idle") {
          ctx.lineTo(190, 180);
        } else {
          ctx.lineTo(310, 60);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      animationId = requestAnimationFrame(drawGame);
    };

    drawGame();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [playerX, playerY, playerDir, sageStatus, speedBoost, playerXP]);

  // Collide detectors to check proximity to physical teachers (30px triggers)
  useEffect(() => {
    if (rpgActiveNpc) return; // Wait until current quiz is answered

    // Sage 1: Bắc - Maps to Q0
    const distNorth = Math.hypot(playerX - 60, playerY - 60);
    if (distNorth < 35 && sageStatus["Thầy Đồ Phương Bắc"] === "idle") {
      setRpgActiveNpc({
        name: "Thầy Đồ Phương Bắc",
        avatar: "🧙‍♂️",
        topicName: "Kiến trúc Biên dịch & Mobile-only",
        qIndex: 0 % activeQuizzes.length
      });
      return;
    }

    // Sage 2: Trung - Maps to Q1
    const distCentral = Math.hypot(playerX - 190, playerY - 180);
    if (distCentral < 35 && sageStatus["Đạo Sĩ Phương Trung"] === "idle") {
      setRpgActiveNpc({
        name: "Đạo Sĩ Phương Trung",
        avatar: "👨‍🏫",
        topicName: "Expo Tunnels & Thừa Mạng Local",
        qIndex: 1 % activeQuizzes.length
      });
      return;
    }

    // Sage 3: Nam - Maps to Q2
    const distSouth = Math.hypot(playerX - 310, playerY - 60);
    if (distSouth < 35 && sageStatus["Hiền Nhân Phương Nam"] === "idle") {
      setRpgActiveNpc({
        name: "Hiền Nhân Phương Nam",
        avatar: "🦉",
        topicName: "Bảo mật chống Virus tập tin & Deep Link",
        qIndex: 2 % activeQuizzes.length
      });
      return;
    }

  }, [playerX, playerY, sageStatus, rpgActiveNpc, activeQuizzes]);

  // Movement actions
  const movePlayer = (direction: string) => {
    setPlayerDir(direction);
    const stepSize = speed;

    setPlayerX((prevX) => {
      let nx = prevX;
      if (direction === "left") nx = Math.max(16, prevX - stepSize);
      if (direction === "right") nx = Math.min(364, prevX + stepSize);
      return nx;
    });

    setPlayerY((prevY) => {
      let ny = prevY;
      if (direction === "up") ny = Math.max(16, prevY - stepSize);
      if (direction === "down") ny = Math.min(224, prevY + stepSize);
      return ny;
    });
  };

  // Keyboard controls handler inside game board
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (rpgActiveNpc) return; // freeze movement inside quiz
      const key = e.key.toLowerCase();
      if (key === "a" || key === "arrowleft") movePlayer("left");
      if (key === "d" || key === "arrowright") movePlayer("right");
      if (key === "w" || key === "arrowup") movePlayer("up");
      if (key === "s" || key === "arrowdown") movePlayer("down");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rpgActiveNpc]);

  // Graphic Helpers
  const drawPlayer = (ctx: CanvasRenderingContext2D, x: number, y: number, dir: string, boost: boolean) => {
    // Magic wizard shadow pool
    ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
    ctx.beginPath();
    ctx.ellipse(x, y + 8, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wizard Blue wizard robe
    ctx.fillStyle = boost ? "#a855f7" : "#58CC03"; // Purple if boosted, Indigo normally
    ctx.beginPath();
    ctx.moveTo(x - 8, y + 5);
    ctx.lineTo(x + 8, y + 5);
    ctx.lineTo(x + 10, y + 15);
    ctx.lineTo(x - 10, y + 15);
    ctx.closePath();
    ctx.fill();

    // Face skin
    ctx.fillStyle = "#fed7aa";
    ctx.beginPath();
    ctx.arc(x, y - 1, 6, 0, Math.PI * 2);
    ctx.fill();

    // Golden cadet wizard hat!
    ctx.fillStyle = "#eab308";
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 5);
    ctx.lineTo(x + 8, y - 5);
    ctx.lineTo(x, y - 16);
    ctx.closePath();
    ctx.fill();

    // Hat peak pompom
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(x, y - 17, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Direction indicators (eyes)
    ctx.fillStyle = "#0f172a";
    if (dir === "down") {
      ctx.fillRect(x - 3, y - 3, 2, 2);
      ctx.fillRect(x + 1, y - 3, 2, 2);
    } else if (dir === "left") {
      ctx.fillRect(x - 5, y - 3, 2, 2);
    } else if (dir === "right") {
      ctx.fillRect(x + 3, y - 3, 2, 2);
    } else if (dir === "up") {
      // eyes hidden on back view
    }
  };

  const drawSage = (ctx: CanvasRenderingContext2D, x: number, y: number, name: string, satisfied: boolean) => {
    // Ground portal ring beneath teacher
    ctx.strokeStyle = satisfied ? "rgba(34, 197, 94, 0.6)" : "rgba(129, 140, 248, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y + 10, satisfied ? 14 : 12, 0, Math.PI * 2);
    ctx.stroke();

    // Sage avatar representational robe
    ctx.fillStyle = satisfied ? "#22c55e" : "#0284c7"; // Green if satisfied, Sky blue if waiting
    ctx.beginPath();
    ctx.moveTo(x - 9, y + 10);
    ctx.lineTo(x + 9, y + 10);
    ctx.lineTo(x + 7, y - 2);
    ctx.lineTo(x - 7, y - 2);
    ctx.closePath();
    ctx.fill();

    // Sage wisdom long white beard!
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.moveTo(x - 3, y + 2);
    ctx.lineTo(x + 3, y + 2);
    ctx.lineTo(x, y + 13);
    ctx.closePath();
    ctx.fill();

    // Sage Face head
    ctx.fillStyle = "#ffedd5";
    ctx.beginPath();
    ctx.arc(x, y - 5, 5, 0, Math.PI * 2);
    ctx.fill();

    // Sage Cap
    ctx.fillStyle = "#334155";
    ctx.fillRect(x - 5, y - 11, 10, 3);

    // Label tag
    ctx.fillStyle = satisfied ? "#dcfce7" : "#f1f5f9";
    ctx.fillRect(x - 35, y - 24, 70, 10);
    ctx.strokeStyle = satisfied ? "#86efac" : "#cbd5e1";
    ctx.strokeRect(x - 35, y - 24, 70, 10);

    ctx.fillStyle = satisfied ? "#15803d" : "#334155";
    ctx.font = "bold 6.5px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(satisfied ? "✓ Hoàn thành" : name.split(" ")[1], x, y - 17);
  };

  const drawStoneRuins = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(x, y, 20, 16);
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(x + 2, y + 2, 6, 5);
    ctx.fillRect(x + 10, y + 8, 8, 6);
  };

  const drawDecorativeBook = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = "#f43f5e";
    ctx.fillRect(x, y, 12, 16);
    ctx.fillStyle = "#fff";
    ctx.fillRect(x + 2, y + 1, 8, 1);
    ctx.fillRect(x + 2, y + 14, 8, 1);
  };

  // RPG active NPC Answer submitted action
  const handleRpgSubmitAnswer = () => {
    if (!rpgActiveNpc || !rpgUserSelectedAnswer) return;

    const currentQuiz = activeQuizzes[rpgActiveNpc.qIndex];
    const isCorrect = rpgUserSelectedAnswer === currentQuiz.correctAnswer;

    if (isCorrect) {
      setRpgNpcFeedback({
        isCorrect: true,
        feedbackText: `📚 Cực kỳ tuyệt vời! Bậc hiền triết mỉm cười gật đầu: "Đáp án xuất sắc, chính xác lắm!"\n🚀 Bạn nhận được +50 EXP Phép Thuật.`
      });
      // Add XP & check levels
      setPlayerXP((prev) => {
        const next = prev + 50;
        if (next >= playerLevel * 100) {
          setPlayerLevel((lvl) => lvl + 1);
        }
        return next;
      });
      // satisfied!
      setSageStatus((prev) => ({
        ...prev,
        [rpgActiveNpc.name]: "satisfied"
      }));

      // Grant a temporary wizard speed boost
      setSpeedBoost(true);
      setTimeout(() => setSpeedBoost(false), 5000);

    } else {
      setRpgNpcFeedback({
        isCorrect: false,
        feedbackText: `⚠️ Hiền triết lắc đầu ái ngại: "Chưa đúng rồi trò ơi!".\nHướng dẫn: ${currentQuiz.explanation}`
      });
    }
  };

  const closeRpgActiveNpcPanel = () => {
    setRpgActiveNpc(null);
    setRpgUserSelectedAnswer(null);
    setRpgNpcFeedback(null);
  };

  // Classic Quiz action handler
  const handleQuizAnswerSelect = (option: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: option
    }));
    setShowExplanation(true);
  };

  const nextQuizQuestion = () => {
    setShowExplanation(false);
    if (currentQuestionIndex < activeQuizzes.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // Calculate score
      let correctCount = 0;
      activeQuizzes.forEach((q, idx) => {
        if (selectedAnswers[idx] === q.correctAnswer) {
          correctCount++;
        }
      });
      setQuizScore(correctCount);
      setQuizFinished(true);
    }
  };

  const restartClassicQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowExplanation(false);
    setQuizFinished(false);
  };

  return (
    <div className="flex flex-col gap-6" id="edu-gameboard">
      {/* ── Stitch Hero Banner — Knowledge Quests & Puzzles ───────── */}
      <section className="relative rounded-[16px] overflow-hidden bg-[var(--color-primary)]/5 p-6 md:p-7 border border-[var(--color-primary)]/15">
        <div
          aria-hidden
          className="absolute inset-0 z-0 opacity-25 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 100% 0%, var(--color-primary) 0%, transparent 55%)",
          }}
        />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Sword size={16} className="text-[var(--color-secondary)]" />
              <span className="text-[12px] text-[var(--color-secondary)] uppercase tracking-wider font-semibold">
                Gamified Learning
              </span>
            </div>
            <h2 className="text-[28px] md:text-[34px] font-bold text-[var(--color-text-primary)] font-display leading-tight mb-2">
              Knowledge Quests & Puzzles
            </h2>
            <p className="text-[14px] md:text-[15px] text-[var(--color-text-secondary)] leading-relaxed">
              Tăng cấp hiểu biết qua các thử thách tương tác. Khám phá thế giới 2D, giải câu
              đố logic, làm chủ kiến thức trong môi trường không phân tán.
            </p>
          </div>
          {/* Daily streak mini-card */}
          <div className="hidden md:flex flex-col gap-2 bg-white p-4 rounded-[12px] shadow-[var(--shadow-card)] border border-[var(--color-border-subtle)] min-w-[200px]">
            <div className="flex justify-between items-center">
              <span className="text-[13px] text-[var(--color-text-secondary)] font-medium">
                Daily Streak
              </span>
              <span className="flex items-center text-orange-500 font-bold text-[14px]">
                <Flame size={16} className="mr-1" /> 12
              </span>
            </div>
            <div className="h-1.5 w-full bg-[var(--color-surface-container-high)] rounded-full overflow-hidden">
              <div className="h-full bg-orange-400 w-3/4 rounded-full" />
            </div>
            <p className="text-[11px] text-[var(--color-text-secondary)] text-right">
              3 days to next tier
            </p>
          </div>
        </div>
      </section>

      {/* ── Mini stats row ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-[var(--color-border-subtle)] rounded-[12px] p-3 flex items-center gap-3 shadow-[var(--shadow-card)]">
          <div className="w-9 h-9 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
            <Star size={16} />
          </div>
          <div>
            <div className="text-[11px] text-[var(--color-text-secondary)] uppercase tracking-wider">XP</div>
            <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">{playerXP}</div>
          </div>
        </div>
        <div className="bg-white border border-[var(--color-border-subtle)] rounded-[12px] p-3 flex items-center gap-3 shadow-[var(--shadow-card)]">
          <div className="w-9 h-9 rounded-full bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] flex items-center justify-center">
            <Trophy size={16} />
          </div>
          <div>
            <div className="text-[11px] text-[var(--color-text-secondary)] uppercase tracking-wider">Level</div>
            <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">Lvl {playerLevel}</div>
          </div>
        </div>
        <div className="bg-white border border-[var(--color-border-subtle)] rounded-[12px] p-3 flex items-center gap-3 shadow-[var(--shadow-card)]">
          <div className="w-9 h-9 rounded-full bg-tertiary/10 text-[var(--color-tertiary)] flex items-center justify-center" style={{ background: "rgba(75, 65, 225, 0.10)" }}>
            <Timer size={16} />
          </div>
          <div>
            <div className="text-[11px] text-[var(--color-text-secondary)] uppercase tracking-wider">Questions</div>
            <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">{activeQuizzes.length}</div>
          </div>
        </div>
        <div className="bg-white border border-[var(--color-border-subtle)] rounded-[12px] p-3 flex items-center gap-3 shadow-[var(--shadow-card)]">
          <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
            <Puzzle size={16} />
          </div>
          <div>
            <div className="text-[11px] text-[var(--color-text-secondary)] uppercase tracking-wider">Sages</div>
            <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">
              {Object.values(sageStatus).filter((s) => s === "satisfied").length} / 3
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Switcher (Stitch pill style) ─────────────────────── */}
      <div className="flex border-b border-[var(--color-border-subtle)] pb-3 justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Gamepad2 className="text-[var(--color-primary)]" size={18} />
          <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)] font-display">
            Active Challenges
          </h3>
        </div>

        <div className="inline-flex bg-[var(--color-surface-container-low)] p-1 rounded-full border border-[var(--color-border-subtle)]">
          <button
            onClick={() => setActiveSubTab("farm_lobby")}
            className={`px-4 py-1.5 text-[13px] font-semibold rounded-full transition-all flex items-center gap-1.5 ${activeSubTab === "farm_lobby"
                ? "bg-[var(--color-primary)] text-white shadow-[var(--shadow-primary-glow)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
          >
            <Tractor size={14} /> Farm Lobby
          </button>
          <button
            onClick={() => setActiveSubTab("classic_quiz")}
            className={`px-4 py-1.5 text-[13px] font-semibold rounded-full transition-all flex items-center gap-1.5 ${activeSubTab === "classic_quiz"
                ? "bg-[var(--color-primary)] text-white shadow-[var(--shadow-primary-glow)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
          >
            <Puzzle size={14} /> Quiz Arena
          </button>
        </div>
      </div>

      {/* Farm Lobby — Multiplayer 2D farm with quiz gates */}
      {activeSubTab === "farm_lobby" && (
        <GameFarmLobby quizList={activeQuizzes} />
      )}


      {/* Subtab 2: Classic timed quiz arena */}
      {activeSubTab === "classic_quiz" && (
        <div className="max-w-xl mx-auto w-full" id="quiz-dashboard">
          {quizFinished ? (
            <Card className="bg-[var(--color-neutral-soft)] p-6 text-center space-y-4 animate-fade-in border-2">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-[var(--color-primary-hover)] mx-auto text-3xl font-black">
                {quizScore} / {activeQuizzes.length}
              </div>
              <h3 className="text-xl font-black text-[var(--color-text-primary)]">Hoàn Thành Đấu Trường Giải Đố</h3>
              <p className="text-[16px] text-[var(--color-text-secondary)] max-w-sm mx-auto font-bold">
                Chúc mừng bạn đã kết thúc bài ôn tập! Việc làm trắc nghiệm lặp lại định kỳ giúp tối ưu hóa trí nhớ dài hạn.
              </p>
              <div className="pt-2">
                <Button
                  onClick={restartClassicQuiz}
                  className="mx-auto"
                  icon={<RotateCcw size={18} />}
                >
                  Thử Sức Lại
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4 animate-fade-in">
              {/* Question progress headers */}
              <div className="flex justify-between items-center text-[12px] uppercase tracking-wider font-black text-[var(--color-neutral)]">
                <span>Câu hỏi {currentQuestionIndex + 1} của {activeQuizzes.length}</span>
                <span className="text-[var(--color-primary)] font-mono">Exam Engine Active</span>
              </div>

              {/* Question card */}
              <Card className="p-5 mt-1">
                <h4 className="text-[16px] font-black text-[var(--color-text-primary)] leading-[1.55]">
                  {activeQuizzes[currentQuestionIndex]?.question}
                </h4>
              </Card>

              {/* Answers options layout */}
              <div className="grid grid-cols-1 gap-3">
                {activeQuizzes[currentQuestionIndex]?.options.map((opt, idx) => {
                  const isSelected = selectedAnswers[currentQuestionIndex] === opt;
                  const isCorrectAnswer = opt === activeQuizzes[currentQuestionIndex].correctAnswer;
                  const hasAnswered = selectedAnswers[currentQuestionIndex] !== undefined;

                  let optStyle = "bg-[var(--color-surface)] border-[var(--color-border-subtle)] text-[var(--color-text-primary)] hover:bg-[var(--color-neutral-soft)] active:bg-indigo-100";
                  if (hasAnswered) {
                    if (isSelected) {
                      optStyle = isCorrectAnswer
                        ? "bg-indigo-100 border-[var(--color-primary)] text-[var(--color-primary-hover)] font-black"
                        : "bg-rose-100 border-rose-400 text-rose-700 font-black";
                    } else if (isCorrectAnswer) {
                      optStyle = "bg-indigo-50 border-[var(--color-primary)] text-[var(--color-primary)] font-black";
                    } else {
                      optStyle = "bg-[var(--color-surface)] border-[var(--color-border-subtle)] text-[var(--color-neutral)] pointer-events-none opacity-60";
                    }
                  } else if (isSelected) {
                    optStyle = "bg-indigo-50 border-[var(--color-primary)] text-[var(--color-primary-hover)] font-black shadow-xs";
                  }

                  return (
                    <button
                      key={idx}
                      disabled={hasAnswered}
                      onClick={() => handleQuizAnswerSelect(opt)}
                      className={`text-left text-[16px] p-4 rounded-xl border-2 transition-all duration-200 flex items-start gap-3 font-bold button-pressable select-none ${optStyle}`}
                    >
                      <span className="w-6 h-6 rounded-full bg-[var(--color-neutral-soft)] border-2 border-[var(--color-border-subtle)]/60 font-black text-[12px] flex items-center justify-center mt-0.5 shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-1 leading-[1.5]">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Feedbacks explanations */}
              {showExplanation && (
                <Card className="bg-indigo-50 border-indigo-100 p-5 animate-slide-up space-y-3">
                  <div className="flex items-center gap-2 font-black text-[var(--color-primary-hover)] text-[14px]">
                    <Award size={18} className="text-[var(--color-primary)]" />
                    <span>LỜI KHUYÊN & GIẢI THÍCH CHUYÊN GIA:</span>
                  </div>
                  <p className="text-[var(--color-text-primary)] leading-[1.55] font-bold text-[14px]">
                    {activeQuizzes[currentQuestionIndex]?.explanation}
                  </p>

                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={nextQuizQuestion}
                      icon={<ChevronRight size={18} />}
                    >
                      {currentQuestionIndex === activeQuizzes.length - 1 ? "Hoàn thành" : "Câu tiếp theo"}
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
