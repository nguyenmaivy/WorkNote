import React, { useState } from "react";
import type { QuizQuestion } from "../../../types";
import { useRpgEngine } from "./useRpgEngine";
import { RpgCanvasRenderer } from "./RpgCanvasRenderer";
import { ShieldAlert, HelpCircle } from "lucide-react";
import { Button } from "../../ui/Button";

interface RpgGameBoardProps {
  activeQuizzes: QuizQuestion[];
}

export function RpgGameBoard({ activeQuizzes }: RpgGameBoardProps) {
  const {
    gameState,
    playerXP,
    playerLevel,
    speedBoost,
    sageStatus,
    activeNpc,
    grantXpAndBoost,
    markSageSatisfied,
    closeNpcPanel,
  } = useRpgEngine(activeQuizzes);

  const [rpgUserSelectedAnswer, setRpgUserSelectedAnswer] = useState<string | null>(null);
  const [rpgNpcFeedback, setRpgNpcFeedback] = useState<{ isCorrect: boolean; feedbackText: string } | null>(null);

  const handleRpgSubmitAnswer = () => {
    if (!activeNpc || !rpgUserSelectedAnswer) return;

    const currentQuiz = activeQuizzes[activeNpc.qIndex];
    const isCorrect = rpgUserSelectedAnswer === currentQuiz.correctAnswer;

    if (isCorrect) {
      setRpgNpcFeedback({
        isCorrect: true,
        feedbackText: `📚 Cực kỳ tuyệt vời! Bậc hiền triết mỉm cười gật đầu: "Đáp án xuất sắc, chính xác lắm!"\n🚀 Bạn nhận được +50 EXP Phép Thuật.`
      });
      grantXpAndBoost(50);
      markSageSatisfied(activeNpc.name);
    } else {
      setRpgNpcFeedback({
        isCorrect: false,
        feedbackText: `⚠️ Hiền triết lắc đầu ái ngại: "Chưa đúng rồi trò ơi!".\nHướng dẫn: ${currentQuiz.explanation}`
      });
    }
  };

  const handleCloseNpcPanel = () => {
    setRpgUserSelectedAnswer(null);
    setRpgNpcFeedback(null);
    closeNpcPanel();
  };

  return (
    <div className="relative w-full aspect-video bg-[#0f172a] rounded-[16px] overflow-hidden border-4 border-[#334155] shadow-inner font-mono">
      {/* HUD - Heads Up Display */}
      <div className="absolute top-4 left-4 z-10 flex gap-4">
        <div className="bg-black/60 backdrop-blur-sm border border-white/20 text-white px-3 py-1.5 rounded-[8px] flex items-center gap-2">
          <span className="text-[11px] text-white/70 uppercase">LVL</span>
          <span className="font-bold text-[16px] text-yellow-400">{playerLevel}</span>
        </div>
        <div className="bg-black/60 backdrop-blur-sm border border-white/20 text-white px-3 py-1.5 rounded-[8px] flex flex-col justify-center min-w-[120px]">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-white/70 uppercase tracking-widest">EXP</span>
            <span className="text-[10px] font-bold text-blue-300">{playerXP} / {playerLevel * 100}</span>
          </div>
          <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${(playerXP / (playerLevel * 100)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {speedBoost && (
        <div className="absolute top-4 right-4 z-10 bg-purple-500/80 backdrop-blur border border-purple-300 text-white px-3 py-1.5 rounded-[8px] text-[12px] font-bold animate-pulse flex items-center gap-2">
          ⚡ Speed Boost Active!
        </div>
      )}

      {/* Instruction Overlay */}
      {!activeNpc && playerXP === 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black/70 text-white text-[12px] px-4 py-2 rounded-full backdrop-blur-sm animate-bounce">
          Sử dụng phím ⌨️ W A S D hoặc Mũi tên để di chuyển đến gặp các Bậc Hiền Triết.
        </div>
      )}

      {/* Game Canvas */}
      <RpgCanvasRenderer 
        gameState={gameState} 
        sageStatus={sageStatus} 
        speedBoost={speedBoost} 
        playerXP={playerXP} 
      />

      {/* Active NPC Dialog / Encounter Overlay */}
      {activeNpc && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border-2 border-[var(--color-primary)] rounded-[16px] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[var(--color-primary)] text-white p-4 flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl border border-white/40">
                {activeNpc.avatar}
              </div>
              <div>
                <h3 className="font-bold text-[16px]">{activeNpc.name}</h3>
                <p className="text-[12px] text-white/80 opacity-90">{activeNpc.topicName}</p>
              </div>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto">
              {!rpgNpcFeedback ? (
                <>
                  <div className="bg-[var(--color-primary)]/5 p-4 rounded-[12px] border border-[var(--color-primary)]/20 mb-5 relative">
                    <HelpCircle className="absolute -top-3 -left-3 text-[var(--color-primary)] bg-[var(--color-surface)] rounded-full" size={24} />
                    <p className="text-[14px] text-[var(--color-text-primary)] font-medium leading-relaxed font-sans">
                      "{activeQuizzes[activeNpc.qIndex].question}"
                    </p>
                  </div>
                  <div className="space-y-2">
                    {activeQuizzes[activeNpc.qIndex].options.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => setRpgUserSelectedAnswer(opt)}
                        className={`w-full text-left p-3 rounded-[10px] text-[13px] font-sans transition-all border ${
                          rpgUserSelectedAnswer === opt
                            ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md"
                            : "bg-[var(--color-surface-container-lowest)] border-[var(--color-outline-variant)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-container-low)]"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className={`p-4 rounded-[12px] border font-sans ${
                  rpgNpcFeedback.isCorrect 
                    ? "bg-green-50 border-green-200 text-green-900"
                    : "bg-red-50 border-red-200 text-red-900"
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {rpgNpcFeedback.isCorrect ? <ShieldAlert size={18} className="text-green-600" /> : <ShieldAlert size={18} className="text-red-600" />}
                    <span className="font-bold">{rpgNpcFeedback.isCorrect ? "Trả lời chính xác!" : "Trả lời sai!"}</span>
                  </div>
                  <p className="text-[14px] whitespace-pre-wrap">{rpgNpcFeedback.feedbackText}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] flex justify-end gap-3">
              {!rpgNpcFeedback ? (
                <>
                  <Button variant="secondary" onClick={handleCloseNpcPanel}>Rời đi</Button>
                  <Button 
                    variant="primary" 
                    onClick={handleRpgSubmitAnswer}
                    disabled={!rpgUserSelectedAnswer}
                  >
                    Trả lời
                  </Button>
                </>
              ) : (
                <Button variant="primary" onClick={handleCloseNpcPanel}>
                  {rpgNpcFeedback.isCorrect ? "Tiếp tục phiêu lưu" : "Thử lại sau"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
