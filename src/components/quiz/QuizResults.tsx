import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { QuizResult } from "../../hooks/useQuiz";

interface QuizResultsProps<T> {
  results: QuizResult<T>[];
  score: number;
  totalQuestions: number;
  elapsedMs: number;
  onPlayAgain: () => void;
  /** Custom renderer for each wrong answer in the review list */
  renderWrongItem: (result: QuizResult<T>) => ReactNode;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export function QuizResults<T>({
  results,
  score,
  totalQuestions,
  elapsedMs,
  onPlayAgain,
  renderWrongItem,
}: QuizResultsProps<T>) {
  const percentage = Math.round((score / totalQuestions) * 100);
  const wrongAnswers = results.filter((r) => !r.correct);

  const emoji =
    percentage === 100
      ? "🏆"
      : percentage >= 80
        ? "🌟"
        : percentage >= 60
          ? "👍"
          : percentage >= 40
            ? "🤔"
            : "📚";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="max-w-lg mx-auto text-center"
    >
      {/* Score reveal */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <div className="text-6xl mb-4">{emoji}</div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 15 }}
          className="text-5xl font-bold text-white mb-2"
        >
          {score} / {totalQuestions}
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-xl text-slate-400"
        >
          {percentage}% correct
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-sm text-slate-500 mt-2"
        >
          Time: {formatTime(elapsedMs)}
        </motion.div>
      </motion.div>

      {/* Wrong answers review */}
      {wrongAnswers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mb-8"
        >
          <h3 className="text-lg font-semibold text-white mb-4">
            Review ({wrongAnswers.length} missed)
          </h3>
          <div className="space-y-3">
            {wrongAnswers.map((r, i) => (
              <div key={i}>{renderWrongItem(r)}</div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="flex gap-3 justify-center"
      >
        <button
          onClick={onPlayAgain}
          className="px-6 py-3 bg-sky hover:bg-sky-dark text-white font-semibold rounded-xl transition-colors"
        >
          Play Again
        </button>
        <Link
          to="/"
          className="px-6 py-3 bg-navy-lighter hover:bg-navy-lighter/80 text-slate-300 font-semibold rounded-xl transition-colors no-underline"
        >
          Home
        </Link>
      </motion.div>
    </motion.div>
  );
}
