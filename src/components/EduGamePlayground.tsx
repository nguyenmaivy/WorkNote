import React, { useState, useEffect, useRef } from "react";
import { QuizQuestion } from "../types";
import { Play, RotateCcw, Award, CheckCircle, XCircle, ChevronRight, HelpCircle, Gamepad2, Compass, ShieldAlert } from "lucide-react";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

interface EduGamePlaygroundProps {
  quizList?: QuizQuestion[];
}

export default function EduGamePlayground({ quizList }: EduGamePlaygroundProps) {
  const [activeSubTab, setActiveSubTab] = useState<"rpg_quest" | "classic_quiz">("rpg_quest");

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
    <Card className="p-6 overflow-hidden flex flex-col gap-6" id="edu-gameboard">
      
      {/* Tab Switcher */}
      <div className="flex border-b-2 border-[var(--color-border-subtle)] pb-3 justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-[24px] font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <Gamepad2 className="text-[var(--color-primary)]" size={24} />
            Hệ Trò Chơi Ôn Tập Kiến Thức
          </h2>
          <p className="text-[14px] text-[var(--color-text-secondary)] font-bold">Hai chế độ học tập: Đi cảnh thám hiểm 2D hoặc thi tài giải đố đấu trường truyền thống.</p>
        </div>
        
        <div className="flex bg-[var(--color-neutral-soft)] p-1 rounded-xl border-2 border-[var(--color-border-subtle)]">
          <button
            onClick={() => setActiveSubTab("rpg_quest")}
            className={`px-4 py-2 text-[14px] font-bold rounded-[10px] transition-all border-2 ${
              activeSubTab === "rpg_quest" ? "bg-[var(--color-surface)] border-[var(--color-border-subtle)] text-[var(--color-text-primary)] shadow-xs" : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            🧙‍♂️ Rừng Thám Hiểm 2D
          </button>
          <button
            onClick={() => setActiveSubTab("classic_quiz")}
            className={`px-4 py-2 text-[14px] font-bold rounded-[10px] transition-all border-2 ${
              activeSubTab === "classic_quiz" ? "bg-[var(--color-surface)] border-[var(--color-border-subtle)] text-[var(--color-text-primary)] shadow-xs" : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            🎯 Đấu Trường Trắc Nghiệm
          </button>
        </div>
      </div>

      {/* Subtab 1: 2D RPG TileQuest Game rendering */}
      {activeSubTab === "rpg_quest" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* RPG Left Info and controls */}
          <div className="md:col-span-5 space-y-4">
            <Card className="bg-indigo-50 border-indigo-100 p-4">
              <h4 className="text-[14px] font-bold text-[var(--color-primary-hover)] flex items-center gap-1 uppercase tracking-wide">
                <Compass size={18} /> Hướng Dẫn Chơi 2D Quest:
              </h4>
              <ul className="text-[var(--color-primary-hover)] text-[14px] font-bold space-y-1.5 list-disc list-inside mt-2.5 leading-relaxed">
                <li>Sử dụng các phím <kbd className="bg-[var(--color-surface)] px-1.5 py-0.5 border-2 border-[var(--color-border-subtle)] rounded-md text-amber-600 font-black">W-A-S-D</kbd> hoặc nút di chuyển.</li>
                <li>Di chuyển nhân vật thám hiểm tới gần <strong>3 lão sư đứng trên thảm cỏ</strong> để nhận thử thách kiểm tra kiến thức.</li>
                <li>Trả lời đúng giúp bạn tích lũy <strong className="text-[var(--color-primary)]">EXP</strong> để thăng cấp, kiếm bùa tốc biến di chuyển cực nhanh!</li>
              </ul>
            </Card>

            {/* Custom On-Screen D-Pad for responsive touch screens / convenient plays */}
            <Card className="bg-[var(--color-neutral-soft)] p-4 flex flex-col items-center gap-2">
              <span className="text-[12px] font-bold text-[var(--color-neutral)] uppercase tracking-[0.8px]">NÚT BẤM DI CHUYỂN</span>
              <div className="grid grid-cols-3 gap-2 w-32">
                <div />
                <button
                  onClick={() => movePlayer("up")}
                  disabled={!!rpgActiveNpc}
                  className="bg-[var(--color-surface)] hover:bg-[var(--color-neutral-soft)] border-2 border-[var(--color-border-subtle)] text-[var(--color-text-primary)] font-black p-3.5 rounded-xl active:bg-indigo-100 active:translate-y-1 transition flex items-center justify-center shadow-xs disabled:opacity-50 select-none"
                >
                  ▲
                </button>
                <div />
                <button
                  onClick={() => movePlayer("left")}
                  disabled={!!rpgActiveNpc}
                  className="bg-[var(--color-surface)] hover:bg-[var(--color-neutral-soft)] border-2 border-[var(--color-border-subtle)] text-[var(--color-text-primary)] font-black p-3.5 rounded-xl active:bg-indigo-100 active:translate-y-1 transition flex items-center justify-center shadow-xs disabled:opacity-50 select-none"
                >
                  ◀
                </button>
                <button
                  onClick={() => movePlayer("down")}
                  disabled={!!rpgActiveNpc}
                  className="bg-[var(--color-surface)] hover:bg-[var(--color-neutral-soft)] border-2 border-[var(--color-border-subtle)] text-[var(--color-text-primary)] font-black p-3.5 rounded-xl active:bg-indigo-100 active:translate-y-1 transition flex items-center justify-center shadow-xs disabled:opacity-50 select-none"
                >
                  ▼
                </button>
                <button
                  onClick={() => movePlayer("right")}
                  disabled={!!rpgActiveNpc}
                  className="bg-[var(--color-surface)] hover:bg-[var(--color-neutral-soft)] border-2 border-[var(--color-border-subtle)] text-[var(--color-text-primary)] font-black p-3.5 rounded-xl active:bg-indigo-100 active:translate-y-1 transition flex items-center justify-center shadow-xs disabled:opacity-50 select-none"
                >
                  ▶
                </button>
              </div>
            </Card>

            {/* XP progress bars */}
            <Card className="bg-[var(--color-neutral-soft)] p-4">
              <div className="flex justify-between text-[14px] font-bold text-[var(--color-text-primary)] mb-2">
                <span>Cấp độ: {playerLevel} (Cadet)</span>
                <span>{playerXP} / {playerLevel * 100} XP</span>
              </div>
              <div className="w-full bg-border-default h-3 rounded-full overflow-hidden border-2 border-[var(--color-border-subtle)]">
                <div
                  className="bg-[var(--color-primary)] h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (playerXP / (playerLevel * 100)) * 100)}%` }}
                />
              </div>
              {speedBoost && (
                <div className="mt-2 text-[12px] text-[var(--color-primary)]-strong font-black animate-pulse">
                  ⚡ Đang kích hoạt bùa Tăng Tốc (+150% Movement Speed)!
                </div>
              )}
            </Card>
          </div>

          {/* RPG Canvas Game view screen */}
          <div className="md:col-span-7 flex flex-col gap-4">
            <div className="relative border-4 border-slate-700 rounded-[var(--radius-card)] overflow-hidden shadow-md mx-auto w-full max-w-[380px]">
              <canvas
                ref={canvasRef}
                width={380}
                height={240}
                className="w-full block bg-emerald-50 cursor-crosshair"
              />

              {/* RPG Colliding Interactive Modal Overlaid inside local bounds */}
              {rpgActiveNpc && (
                <div className="absolute inset-0 bg-slate-900/90 flex flex-col justify-between p-4 text-slate-100 animate-fade-in z-30 overflow-y-auto">
                  
                  {/* Modal Header */}
                  <div className="border-b border-slate-800 pb-2 flex items-center gap-2">
                    <span className="text-2xl">{rpgActiveNpc.avatar}</span>
                    <div>
                      <h4 className="text-xs font-bold text-green-400">{rpgActiveNpc.name}</h4>
                      <p className="text-[10px] text-[var(--color-neutral)]">{rpgActiveNpc.topicName}</p>
                    </div>
                  </div>

                  {/* Proximity Question content body */}
                  <div className="my-2 text-xs">
                    <p className="text-[11px] text-[var(--color-neutral)] mb-3 font-semibold">
                      "Hãy giải quyết câu hỏi này để chứng minh nỗ lực của ngươi:"
                    </p>
                    <p className="font-bold text-white text-[11px] mb-3 leading-normal">
                      {activeQuizzes[rpgActiveNpc.qIndex]?.question}
                    </p>

                    {rpgNpcFeedback ? (
                      <div className={`p-2.5 rounded-lg border text-[10.5px] leading-relaxed mb-1 ${
                        rpgNpcFeedback.isCorrect
                          ? "bg-emerald-950/80 border-emerald-800 text-emerald-300"
                          : "bg-red-950/80 border-red-800 text-red-300"
                      }`}>
                        {rpgNpcFeedback.feedbackText}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {activeQuizzes[rpgActiveNpc.qIndex]?.options.map((opt, oIdx) => (
                          <label
                            key={oIdx}
                            className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer hover:bg-slate-800/80 transition text-[10px] ${
                              rpgUserSelectedAnswer === opt
                                ? "bg-indigo-950 border-[var(--color-primary)] text-indigo-300 font-bold"
                                : "border-slate-800 text-[var(--color-neutral)]"
                            }`}
                          >
                            <input
                              type="radio"
                              name="rpg-opt"
                              value={opt}
                              checked={rpgUserSelectedAnswer === opt}
                              onChange={() => setRpgUserSelectedAnswer(opt)}
                              className="mt-0.5"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Modal Footer actions */}
                  <div className="border-t-2 border-slate-700 pt-3 flex justify-end gap-3 mt-4">
                    {rpgNpcFeedback ? (
                      <Button
                        onClick={closeRpgActiveNpcPanel}
                      >
                        Tiếp tục hành trình
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="secondary"
                          onClick={closeRpgActiveNpcPanel}
                        >
                          Rút lui
                        </Button>
                        <Button
                          onClick={handleRpgSubmitAnswer}
                          disabled={!rpgUserSelectedAnswer}
                        >
                          Xác nhận trả lời
                        </Button>
                      </>
                    )}
                  </div>

                </div>
              )}
            </div>

            <p className="text-[10px] text-[var(--color-neutral)] text-center italic">
              *Ấn phím W, A, S, D hoặc sử dụng bộ di chuyển ảo để dẫn lối anh hùng tìm kiếm học vấn.*
            </p>
          </div>
        </div>
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

    </Card>
  );
}
