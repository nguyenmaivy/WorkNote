import React from "react";
import type { QuizQuestion } from "../../../types";
import { HelpCircle, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { Button } from "../../ui/Button";

interface ClassicQuizProps {
  activeQuizzes: QuizQuestion[];
  currentQuestionIndex: number;
  selectedAnswers: Record<number, string>;
  showExplanation: boolean;
  quizScore: number;
  quizFinished: boolean;
  onAnswerSelect: (option: string) => void;
  onNextQuestion: () => void;
  onRestartQuiz: () => void;
}

export function ClassicQuiz({
  activeQuizzes,
  currentQuestionIndex,
  selectedAnswers,
  showExplanation,
  quizScore,
  quizFinished,
  onAnswerSelect,
  onNextQuestion,
  onRestartQuiz,
}: ClassicQuizProps) {
  if (quizFinished) {
    const isPerfect = quizScore === activeQuizzes.length;
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-[16px] p-8 text-center shadow-sm">
        <div className="w-20 h-20 bg-[var(--color-primary-fixed)] rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={40} className="text-[var(--color-primary)]" />
        </div>
        <h3 className="text-[24px] font-bold text-[var(--color-text-primary)] mb-2 font-display">
          Quiz Completed!
        </h3>
        <p className="text-[16px] text-[var(--color-text-secondary)] mb-6">
          You scored <span className="font-bold text-[var(--color-primary)] text-[20px]">{quizScore}</span> out of {activeQuizzes.length}
        </p>
        
        {isPerfect ? (
          <p className="text-[14px] text-green-600 font-medium mb-6 bg-green-50 py-2 rounded-lg inline-block px-4">
            Flawless victory! You have mastered these concepts.
          </p>
        ) : (
          <p className="text-[14px] text-amber-600 font-medium mb-6 bg-amber-50 py-2 rounded-lg inline-block px-4">
            Good effort! Review the materials and try again to get a perfect score.
          </p>
        )}

        <div className="flex justify-center">
          <Button variant="primary" onClick={onRestartQuiz} className="gap-2">
            <RotateCcw size={16} />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const currentQuiz = activeQuizzes[currentQuestionIndex];
  if (!currentQuiz) return null;

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-[16px] overflow-hidden shadow-sm flex flex-col h-full max-h-[600px]">
      {/* Quiz Header Progress */}
      <div className="bg-[var(--color-surface-container-low)] p-4 border-b border-[var(--color-outline-variant)] flex items-center justify-between">
        <span className="text-[13px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
          Question {currentQuestionIndex + 1} of {activeQuizzes.length}
        </span>
        <div className="flex gap-1">
          {activeQuizzes.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-2 w-8 rounded-full ${
                idx === currentQuestionIndex 
                  ? "bg-[var(--color-primary)]" 
                  : idx < currentQuestionIndex 
                    ? "bg-[var(--color-primary)]/40" 
                    : "bg-[var(--color-outline-variant)]"
              }`} 
            />
          ))}
        </div>
      </div>

      {/* Question Body */}
      <div className="p-6 md:p-8 flex-1 overflow-y-auto">
        <h2 className="text-[18px] md:text-[20px] font-semibold text-[var(--color-text-primary)] mb-6 leading-relaxed">
          {currentQuiz.question}
        </h2>

        <div className="space-y-3">
          {currentQuiz.options.map((opt, idx) => {
            const isSelected = selectedAnswers[currentQuestionIndex] === opt;
            const isCorrect = opt === currentQuiz.correctAnswer;
            
            let btnClass = "border-[var(--color-outline-variant)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-primary)]";
            let icon = null;

            if (showExplanation) {
              if (isCorrect) {
                btnClass = "border-green-500 bg-green-50 text-green-900 shadow-sm";
                icon = <CheckCircle size={18} className="text-green-500 shrink-0" />;
              } else if (isSelected) {
                btnClass = "border-red-300 bg-red-50 text-red-900";
                icon = <XCircle size={18} className="text-red-500 shrink-0" />;
              }
            } else if (isSelected) {
              btnClass = "border-[var(--color-primary)] bg-[var(--color-primary-fixed)]/20 text-[var(--color-primary)] shadow-sm";
            }

            return (
              <button
                key={idx}
                disabled={showExplanation}
                onClick={() => onAnswerSelect(opt)}
                className={`w-full text-left p-4 rounded-[12px] border transition-all flex items-start justify-between gap-4 ${btnClass}`}
              >
                <span className="text-[15px] leading-relaxed">{opt}</span>
                {icon}
              </button>
            );
          })}
        </div>

        {/* Explanation Alert */}
        {showExplanation && (
          <div className={`mt-6 p-4 rounded-[12px] flex items-start gap-3 animate-fade-in ${
            selectedAnswers[currentQuestionIndex] === currentQuiz.correctAnswer
              ? "bg-green-50 border border-green-200"
              : "bg-blue-50 border border-blue-200"
          }`}>
            <HelpCircle size={20} className={selectedAnswers[currentQuestionIndex] === currentQuiz.correctAnswer ? "text-green-600 shrink-0 mt-0.5" : "text-blue-600 shrink-0 mt-0.5"} />
            <div>
              <h4 className={`font-semibold text-[14px] mb-1 ${
                selectedAnswers[currentQuestionIndex] === currentQuiz.correctAnswer ? "text-green-800" : "text-blue-800"
              }`}>
                {selectedAnswers[currentQuestionIndex] === currentQuiz.correctAnswer ? "Correct!" : "Explanation"}
              </h4>
              <p className="text-[14px] text-[var(--color-text-primary)] leading-relaxed">
                {currentQuiz.explanation}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-[var(--color-surface-container-lowest)] border-t border-[var(--color-outline-variant)] flex justify-end">
        <Button 
          variant="primary" 
          disabled={!showExplanation} 
          onClick={onNextQuestion}
        >
          {currentQuestionIndex < activeQuizzes.length - 1 ? "Next Question" : "Finish Quiz"}
        </Button>
      </div>
    </div>
  );
}
