import { useState, useEffect, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProgressBar } from "../common/ProgressBar";
import { CountryFactStrip } from "./CountryFactStrip";
import type { Country } from "../../types/country";

interface QuizQuestionProps {
  /** The visual prompt area (flag image, country name, etc.) */
  prompt: ReactNode;
  /** Text shown when answer is wrong: "it was {correctAnswer}" */
  correctAnswer: string;
  /** Multiple choice options (empty for hard mode) */
  options: string[];
  currentIndex: number;
  totalQuestions: number;
  onAnswer: (answer: string) => void;
  lastAnswerCorrect: boolean | null;
  selectedAnswer: string | null;
  isHardMode: boolean;
  /** Placeholder text for the hard mode input */
  inputPlaceholder?: string;
  /** Custom renderer for option button content. Receives the option value. */
  renderOptionLabel?: (option: string) => ReactNode;
  /** Called when user wants to quit the quiz early */
  onQuit?: () => void;
  /** If provided, a muted fact strip is shown below options after answering. */
  factCountry?: Country | null;
}

export function QuizQuestionView({
  prompt,
  correctAnswer,
  options,
  currentIndex,
  totalQuestions,
  onAnswer,
  lastAnswerCorrect,
  selectedAnswer,
  isHardMode,
  inputPlaceholder = "Type your answer...",
  renderOptionLabel,
  onQuit,
  factCountry,
}: QuizQuestionProps) {
  const [typedAnswer, setTypedAnswer] = useState("");
  const answered = lastAnswerCorrect !== null;

  useEffect(() => {
    setTypedAnswer("");
  }, [currentIndex]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (answered || isHardMode) return;
      const num = parseInt(e.key);
      if (num >= 1 && num <= options.length) {
        onAnswer(options[num - 1]);
      }
    },
    [answered, isHardMode, options, onAnswer]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleSubmitTyped = (e: React.FormEvent) => {
    e.preventDefault();
    if (typedAnswer.trim() && !answered) {
      onAnswer(typedAnswer.trim());
    }
  };

  const bgFlash =
    lastAnswerCorrect === true
      ? "ring-2 ring-emerald/50"
      : lastAnswerCorrect === false
        ? "ring-2 ring-rose/50"
        : "";

  return (
    <motion.div
      key={currentIndex}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.25 }}
      className="max-w-2xl mx-auto"
    >
      <ProgressBar current={currentIndex + 1} total={totalQuestions} onQuit={onQuit} />

      {/* Prompt area */}
      <div
        className={`mt-6 rounded-2xl overflow-hidden bg-navy-light border border-navy-lighter flex flex-col items-center justify-center p-6 transition-all duration-300 ${bgFlash}`}
      >
        {prompt}
      </div>

      {/* Answer area */}
      <div className="mt-6">
        {isHardMode ? (
          <form onSubmit={handleSubmitTyped} className="flex gap-3">
            <input
              type="text"
              value={typedAnswer}
              onChange={(e) => setTypedAnswer(e.target.value)}
              placeholder={inputPlaceholder}
              disabled={answered}
              autoFocus
              className="flex-1 px-4 py-3 bg-navy-light border border-navy-lighter rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!typedAnswer.trim() || answered}
              className="px-6 py-3 bg-sky hover:bg-sky-dark disabled:bg-navy-lighter disabled:text-slate-500 text-white font-semibold rounded-xl transition-colors"
            >
              Submit
            </button>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {options.map((option, i) => {
              let btnClass =
                "bg-navy-light border-navy-lighter text-slate-200 hover:border-sky/60 hover:bg-navy-lighter";

              if (answered) {
                if (option === correctAnswer) {
                  // Strong green fill so the correct answer is unmistakable
                  btnClass =
                    "bg-emerald border-emerald text-white font-semibold";
                } else if (option === selectedAnswer && !lastAnswerCorrect) {
                  btnClass = "bg-rose border-rose text-white";
                } else {
                  btnClass =
                    "bg-navy-light/50 border-navy-lighter/50 text-slate-500";
                }
              }

              return (
                <motion.button
                  key={option}
                  whileTap={!answered ? { scale: 0.97 } : undefined}
                  onClick={() => !answered && onAnswer(option)}
                  disabled={answered}
                  className={`p-3 rounded-xl border text-left transition-all ${btnClass}`}
                  aria-label={`Option ${i + 1}: ${option}`}
                >
                  <span className="text-xs text-slate-500 mr-2">{i + 1}</span>
                  {renderOptionLabel ? renderOptionLabel(option) : option}
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Hard mode feedback — always reveal the correct answer so the
            player can learn even when their typing was accepted. */}
        <AnimatePresence>
          {answered && isHardMode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mt-4 p-3 rounded-xl text-center font-semibold ${
                lastAnswerCorrect
                  ? "bg-emerald/15 text-emerald"
                  : "bg-rose/15 text-rose"
              }`}
            >
              {lastAnswerCorrect ? (
                <>
                  <div>Correct!</div>
                  <div className="text-xs font-normal text-emerald/80 mt-1">
                    Answer: {correctAnswer}
                  </div>
                </>
              ) : (
                <>
                  <div>Not quite</div>
                  <div className="text-xs font-normal text-rose/80 mt-1">
                    Correct answer: {correctAnswer}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Did-you-know strip — only visible during the post-answer pause */}
        <AnimatePresence>
          {answered && factCountry && (
            <CountryFactStrip country={factCountry} key={factCountry.id} />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
