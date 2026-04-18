import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Region } from "../../types/country";
import type { BlitzQuestionType, BlitzDifficulty, TimeLimit, BlitzScoreEntry } from "../../types/blitz";
import { loadLeaderboard } from "../../types/blitz";

const REGIONS: (Region | "All")[] = ["All", "Africa", "Americas", "Asia", "Europe", "Oceania"];

const TIME_OPTIONS: { value: TimeLimit; label: string; desc: string }[] = [
  { value: 60, label: "1 min", desc: "Quick burst" },
  { value: 180, label: "3 min", desc: "Standard" },
  { value: 300, label: "5 min", desc: "Marathon" },
];

const MODE_OPTIONS: { value: BlitzQuestionType; icon: string; label: string }[] = [
  { value: "flag", icon: "🏴", label: "Flags" },
  { value: "capital", icon: "🏛️", label: "Capitals" },
  { value: "pinMap", icon: "📍", label: "Map" },
  { value: "nameShape", icon: "🗺️", label: "Shapes" },
];

interface BlitzSetupProps {
  onStart: (config: {
    region: Region | "All";
    timeLimit: TimeLimit;
    modes: BlitzQuestionType[];
    difficulty: BlitzDifficulty;
  }) => void;
}

export function BlitzSetup({ onStart }: BlitzSetupProps) {
  const [region, setRegion] = useState<Region | "All">("All");
  const [timeLimit, setTimeLimit] = useState<TimeLimit>(180);
  const [modes, setModes] = useState<BlitzQuestionType[]>(["flag", "capital", "pinMap", "nameShape"]);
  const [difficulty, setDifficulty] = useState<BlitzDifficulty>("easy");
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const toggleMode = (mode: BlitzQuestionType) => {
    setModes((prev) => {
      if (prev.includes(mode)) {
        if (prev.length === 1) return prev; // must have at least one
        return prev.filter((m) => m !== mode);
      }
      return [...prev, mode];
    });
  };

  const boards = loadLeaderboard();
  const currentBoard = boards[`${timeLimit}s`] || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-lg mx-auto"
    >
      <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
        <span>⚡</span> Blitz Mode
      </h1>
      <p className="text-slate-400 mb-8">
        Race against the clock with mixed questions. How high can you score?
      </p>

      {/* Region */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-slate-300 mb-2">Region</label>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                region === r
                  ? "bg-sky text-white"
                  : "bg-navy-lighter text-slate-300 hover:bg-navy-lighter/80"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Time limit */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-slate-300 mb-2">Time Limit</label>
        <div className="grid grid-cols-3 gap-3">
          {TIME_OPTIONS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTimeLimit(t.value)}
              className={`p-3 rounded-xl text-center transition-all border ${
                timeLimit === t.value
                  ? "bg-amber-500/10 border-amber-500 text-white"
                  : "bg-navy-light border-navy-lighter text-slate-300 hover:border-slate-500"
              }`}
            >
              <div className="font-bold text-lg">{t.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Mode mix */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Question Types
        </label>
        <div className="flex flex-wrap gap-2">
          {MODE_OPTIONS.map((m) => {
            const active = modes.includes(m.value);
            return (
              <button
                key={m.value}
                onClick={() => toggleMode(m.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  active
                    ? "bg-sky text-white shadow-md"
                    : "bg-navy-lighter text-slate-500 hover:text-slate-300"
                }`}
              >
                {m.icon} {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Difficulty */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">Difficulty</label>
        <div className="flex rounded-full bg-navy-lighter p-1">
          {(["easy", "normal", "expert"] as BlitzDifficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all capitalize ${
                difficulty === d
                  ? "bg-sky text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {difficulty === "easy" && "Top 50% most populous countries · 4 options"}
          {difficulty === "normal" && "All 195 countries · 4 options"}
          {difficulty === "expert" && "All countries · 6 options · typed input · rotated shapes"}
        </p>
      </div>

      {/* Start + Leaderboard buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => onStart({ region, timeLimit, modes, difficulty })}
          className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors text-lg"
        >
          Start Blitz ⚡
        </button>
        <button
          onClick={() => setShowLeaderboard((v) => !v)}
          className="px-4 py-3 bg-navy-lighter hover:bg-navy-lighter/80 text-slate-300 font-semibold rounded-xl transition-colors"
        >
          🏆
        </button>
      </div>

      {/* Leaderboard */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden"
          >
            <div className="bg-navy-light border border-navy-lighter rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">
                🏆 High Scores — {timeLimit / 60} min
              </h3>
              {currentBoard.length === 0 ? (
                <p className="text-slate-500 text-sm">No scores yet. Be the first!</p>
              ) : (
                <div className="space-y-2">
                  {currentBoard.map((entry: BlitzScoreEntry, i: number) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 text-sm ${
                        i === 0 ? "text-gold" : "text-slate-400"
                      }`}
                    >
                      <span className="w-6 text-right font-bold">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                      </span>
                      <span className="font-semibold flex-1">
                        {entry.score.toLocaleString()} pts
                      </span>
                      <span className="text-xs">
                        {entry.accuracy}% · 🔥{entry.bestStreak} · {entry.region}
                      </span>
                      <span className="text-xs text-slate-500">
                        {entry.date}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
