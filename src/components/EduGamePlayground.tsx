import React, { useState } from "react";
import type { QuizQuestion } from "../types";
import { Gamepad2, Compass, Sword, Flame, Star, Trophy, Timer, Puzzle, Tractor } from "lucide-react";
import { Card } from "./ui/Card";
import GameFarmLobby from "./GameFarmLobby";
import { RpgGameBoard } from "./game/rpg/RpgGameBoard";
import { ClassicQuiz } from "./game/classic/ClassicQuiz";

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
      {/* Hero Banner */}
      <section className="relative rounded-[16px] overflow-hidden bg-[var(--color-primary)]/5 p-6 md:p-7 border border-[var(--color-primary)]/15">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[var(--color-primary)]/20 to-transparent rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-[var(--color-primary)] text-white p-2 rounded-lg shadow-md">
              <Gamepad2 size={24} />
            </div>
            <h2 className="text-[24px] md:text-[28px] font-bold text-[var(--color-text-primary)] font-display tracking-tight">
              Play & Learn
            </h2>
          </div>
          <p className="text-[15px] text-[var(--color-text-secondary)] max-w-2xl leading-relaxed mt-2">
            Transform your study materials into interactive games. Challenge yourself, earn XP, and master the concepts through active recall and spaced repetition.
          </p>
        </div>

        <div className="flex gap-4 mt-8 overflow-x-auto pb-2 scrollbar-hide snap-x">
          <button
            onClick={() => setActiveSubTab("farm_lobby")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-semibold transition-all whitespace-nowrap snap-start ${
              activeSubTab === "farm_lobby"
                ? "bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20"
                : "bg-[var(--color-surface)] border border-[var(--color-outline-variant)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-container-low)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Tractor size={18} className={activeSubTab === "farm_lobby" ? "animate-bounce" : ""} />
            Farm Game
          </button>
          <button
            onClick={() => setActiveSubTab("rpg_quest")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-semibold transition-all whitespace-nowrap snap-start ${
              activeSubTab === "rpg_quest"
                ? "bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20"
                : "bg-[var(--color-surface)] border border-[var(--color-outline-variant)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-container-low)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Compass size={18} className={activeSubTab === "rpg_quest" ? "animate-spin-slow" : ""} />
            RPG Quest
          </button>
          <button
            onClick={() => setActiveSubTab("classic_quiz")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-semibold transition-all whitespace-nowrap snap-start ${
              activeSubTab === "classic_quiz"
                ? "bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20"
                : "bg-[var(--color-surface)] border border-[var(--color-outline-variant)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-container-low)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Puzzle size={18} className={activeSubTab === "classic_quiz" ? "animate-pulse" : ""} />
            Classic Quiz
          </button>
        </div>
      </section>

      {/* Main Game Area */}
      <section>
        {activeSubTab === "farm_lobby" && (
          <div className="animate-fade-in space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-[12px] p-4 flex items-start gap-3">
              <Star className="text-amber-500 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-[14px] font-bold text-amber-900 mb-1">Interactive Farm Simulator</h4>
                <p className="text-[13px] text-amber-800 leading-relaxed">
                  Plant seeds by answering questions correctly. Water them with daily reviews. Harvest knowledge points when they fully grow!
                </p>
              </div>
            </div>
            
            <GameFarmLobby />
          </div>
        )}

        {activeSubTab === "rpg_quest" && (
          <div className="animate-fade-in space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><Sword size={20} /></div>
                  <div>
                    <p className="text-[12px] text-indigo-600 font-bold uppercase tracking-wider">Mode</p>
                    <p className="text-[15px] font-semibold text-slate-800">Knowledge Quest</p>
                  </div>
                </div>
              </Card>
              <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-100 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg text-orange-600"><Flame size={20} /></div>
                  <div>
                    <p className="text-[12px] text-orange-600 font-bold uppercase tracking-wider">Difficulty</p>
                    <p className="text-[15px] font-semibold text-slate-800">Adaptive</p>
                  </div>
                </div>
              </Card>
              <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><Trophy size={20} /></div>
                  <div>
                    <p className="text-[12px] text-emerald-600 font-bold uppercase tracking-wider">Rewards</p>
                    <p className="text-[15px] font-semibold text-slate-800">EXP & Badges</p>
                  </div>
                </div>
              </Card>
            </div>

            <RpgGameBoard activeQuizzes={activeQuizzes} />
          </div>
        )}

        {activeSubTab === "classic_quiz" && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[20px] font-bold text-[var(--color-text-primary)] font-display flex items-center gap-2">
                <Timer className="text-[var(--color-primary)]" size={24} />
                Focus Mode
              </h3>
              <div className="text-[13px] text-[var(--color-text-secondary)] font-medium bg-[var(--color-surface-container-low)] px-3 py-1.5 rounded-full">
                {activeQuizzes.length} Questions
              </div>
            </div>

            <ClassicQuiz 
              activeQuizzes={activeQuizzes}
              currentQuestionIndex={currentQuestionIndex}
              selectedAnswers={selectedAnswers}
              showExplanation={showExplanation}
              quizScore={quizScore}
              quizFinished={quizFinished}
              onAnswerSelect={handleQuizAnswerSelect}
              onNextQuestion={nextQuizQuestion}
              onRestartQuiz={restartClassicQuiz}
            />
          </div>
        )}
      </section>
    </div>
  );
}
