import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { BlitzResult, BlitzQuestionType, TimeLimit } from "../../types/blitz";
import { saveToLeaderboard } from "../../types/blitz";
import { playHighScore } from "../../utils/sounds";

interface BlitzResultsProps {
  results: BlitzResult[];
  score: number;
  bestStreak: number;
  timeLimit: TimeLimit;
  region: string;
  onPlayAgain: () => void;
}

interface ModeStats {
  total: number;
  correct: number;
  points: number;
}

export function BlitzResults({
  results,
  score,
  bestStreak,
  timeLimit,
  region,
  onPlayAgain,
}: BlitzResultsProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const [isNewHigh, setIsNewHigh] = useState(false);

  const totalCorrect = results.filter((r) => r.correct).length;
  const accuracy = results.length > 0 ? Math.round((totalCorrect / results.length) * 100) : 0;

  // Save to leaderboard on mount
  useEffect(() => {
    const newHigh = saveToLeaderboard({
      score,
      date: new Date().toISOString().slice(0, 10),
      accuracy,
      bestStreak,
      questionsAnswered: results.length,
      region,
      timeLimit,
    });
    setIsNewHigh(newHigh);
    if (newHigh) {
      setTimeout(() => playHighScore(), 400);
    }
  }, []);

  // Counting-up animation
  useEffect(() => {
    if (score === 0) return;
    const duration = 1500;
    const steps = 30;
    const increment = score / steps;
    let current = 0;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      current = Math.min(Math.round(increment * step), score);
      setDisplayScore(current);
      if (step >= steps) {
        clearInterval(interval);
        setDisplayScore(score);
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [score]);

  // Per-mode breakdown
  const modeBreakdown = results.reduce<Record<BlitzQuestionType, ModeStats>>(
    (acc, r) => {
      const m = r.question.type;
      if (!acc[m]) acc[m] = { total: 0, correct: 0, points: 0 };
      acc[m].total++;
      if (r.correct) acc[m].correct++;
      acc[m].points += r.pointsEarned;
      return acc;
    },
    {} as Record<BlitzQuestionType, ModeStats>
  );

  const modeIcons: Record<BlitzQuestionType, string> = {
    flag: "🏴",
    capital: "🏛️",
    pinMap: "📍",
    nameShape: "🗺️",
  };

  const modeLabels: Record<BlitzQuestionType, string> = {
    flag: "Flags",
    capital: "Capitals",
    pinMap: "Map",
    nameShape: "Shapes",
  };

  // Accuracy circle
  const circleRadius = 40;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (accuracy / 100) * circumference;
  const accuracyColor =
    accuracy >= 80 ? "#10b981" : accuracy >= 50 ? "#f59e0b" : "#f43f5e";

  // Average response time
  const avgTime =
    results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.responseTimeMs, 0) / results.length)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-lg mx-auto text-center"
    >
      {/* New high score badge */}
      {isNewHigh && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
          className="mb-4 inline-block px-4 py-1.5 bg-gold/15 border border-gold/30 rounded-full text-gold font-bold text-sm"
        >
          🏆 New Personal Best!
        </motion.div>
      )}

      {/* Score */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: "spring" }}
        className="mb-6"
      >
        <div className="text-6xl font-bold text-white mb-1">
          {displayScore.toLocaleString()}
        </div>
        <div className="text-slate-400 text-sm">points</div>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Accuracy circle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col items-center"
        >
          <svg width="90" height="90" className="mb-1">
            <circle
              cx="45"
              cy="45"
              r={circleRadius}
              fill="none"
              stroke="#1e293b"
              strokeWidth="6"
            />
            <motion.circle
              cx="45"
              cy="45"
              r={circleRadius}
              fill="none"
              stroke={accuracyColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
              transform="rotate(-90 45 45)"
            />
            <text
              x="45"
              y="45"
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize="16"
              fontWeight="bold"
            >
              {accuracy}%
            </text>
          </svg>
          <span className="text-xs text-slate-400">Accuracy</span>
        </motion.div>

        {/* Streak */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col items-center justify-center"
        >
          <div className="text-3xl font-bold text-gold mb-1">🔥 {bestStreak}</div>
          <span className="text-xs text-slate-400">Best Streak</span>
        </motion.div>

        {/* Questions & Speed */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col items-center justify-center"
        >
          <div className="text-3xl font-bold text-white mb-1">
            {totalCorrect}/{results.length}
          </div>
          <span className="text-xs text-slate-400">
            {(avgTime / 1000).toFixed(1)}s avg
          </span>
        </motion.div>
      </div>

      {/* Mode breakdown */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="bg-navy-light border border-navy-lighter rounded-xl p-4 mb-6 text-left"
      >
        <h3 className="text-sm font-semibold text-white mb-3">Mode Breakdown</h3>
        <div className="space-y-2">
          {(Object.entries(modeBreakdown) as [BlitzQuestionType, ModeStats][]).map(
            ([mode, stats]) => (
              <div key={mode} className="flex items-center gap-3 text-sm">
                <span className="w-6 text-center">{modeIcons[mode]}</span>
                <span className="text-slate-300 flex-1">{modeLabels[mode]}</span>
                <span className="text-emerald font-medium">
                  {stats.correct}/{stats.total}
                </span>
                <span className="text-slate-500 text-xs w-16 text-right">
                  {stats.points.toLocaleString()} pts
                </span>
              </div>
            )
          )}
        </div>
      </motion.div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onPlayAgain}
          className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors text-lg"
        >
          Play Again ⚡
        </button>
        <button
          onClick={() => {
            const text = `⚡ Atlas Blitz: ${score.toLocaleString()} pts | ${accuracy}% accuracy | 🔥${bestStreak} streak | ${timeLimit / 60}min`;
            navigator.clipboard.writeText(text).catch(() => {});
          }}
          className="px-4 py-3 bg-navy-lighter hover:bg-navy-lighter/80 text-slate-300 font-semibold rounded-xl transition-colors"
          title="Copy score to clipboard"
        >
          📋
        </button>
      </div>
    </motion.div>
  );
}
