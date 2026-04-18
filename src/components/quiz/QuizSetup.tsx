import { useState } from "react";
import { motion } from "framer-motion";
import type { Region } from "../../types/country";
import { getSettings } from "../../hooks/useSettings";

export type Difficulty = "easy" | "medium" | "hard";

const REGIONS: (Region | "All")[] = ["All", "Africa", "Americas", "Asia", "Europe", "Oceania"];
export type DifficultyOption = { value: Difficulty; label: string; desc: string };

const DEFAULT_DIFFICULTIES: DifficultyOption[] = [
  { value: "easy", label: "Easy", desc: "10 questions · Most populated countries" },
  { value: "medium", label: "Medium", desc: "10 questions · Least populated countries" },
  { value: "hard", label: "Hard", desc: "20 questions · All countries" },
];

interface QuizSetupProps {
  title: string;
  description: string;
  onStart: (region: Region | "All", difficulty: Difficulty, reversed: boolean) => void;
  showReverse?: boolean;
  reverseLabel?: [string, string]; // [standard label, reverse label]
  /** Hide hard mode when reversed (e.g. Flag Quiz reverse can't be typed) */
  disableHardWhenReversed?: boolean;
  /** Custom difficulty options (overrides defaults) */
  difficulties?: DifficultyOption[];
}

export function QuizSetup({
  title,
  description,
  onStart,
  showReverse = false,
  reverseLabel = ["Standard", "Reverse"],
  disableHardWhenReversed = false,
  difficulties = DEFAULT_DIFFICULTIES,
}: QuizSetupProps) {
  const saved = getSettings();
  // Clamp saved difficulty to available options
  const availableDiffs = difficulties.map((d) => d.value);
  const initialDiff = availableDiffs.includes(saved.defaultDifficulty)
    ? saved.defaultDifficulty
    : availableDiffs[0];

  const [region, setRegion] = useState<Region | "All">(saved.defaultRegion);
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDiff);
  const [reversed, setReversed] = useState(false);

  const hardDisabled = disableHardWhenReversed && reversed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-lg mx-auto"
    >
      <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
      <p className="text-slate-400 mb-8">{description}</p>

      {/* Region selector — background/text only, no shadow or glow */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Region
        </label>
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

      {/* Difficulty selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Difficulty
        </label>
        <div className="grid grid-cols-3 gap-3">
          {difficulties.map((d) => {
            const disabled = d.value === "hard" && hardDisabled;
            return (
              <button
                key={d.value}
                onClick={() => !disabled && setDifficulty(d.value)}
                disabled={disabled}
                className={`p-3 rounded-xl text-center transition-all border ${
                  disabled
                    ? "bg-navy-light/50 border-navy-lighter/50 text-slate-600 cursor-not-allowed"
                    : difficulty === d.value
                      ? "bg-sky/10 border-sky text-white"
                      : "bg-navy-light border-navy-lighter text-slate-300 hover:border-slate-500"
                }`}
              >
                <div className="font-semibold">{d.label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{d.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reverse mode toggle */}
      {showReverse && (
        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Direction
          </label>
          <div className="flex rounded-full bg-navy-lighter p-1">
            {reverseLabel.map((label, i) => {
              const isActive = reversed === (i === 1);
              return (
                <button
                  key={label}
                  onClick={() => {
                    const newReversed = i === 1;
                    setReversed(newReversed);
                    if (newReversed && disableHardWhenReversed && difficulty === "hard") {
                      setDifficulty("medium");
                    }
                  }}
                  className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-sky text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={() => onStart(region, difficulty, reversed)}
        className="w-full py-3 bg-sky hover:bg-sky-dark text-white font-semibold rounded-xl transition-colors text-lg"
      >
        Start Quiz
      </button>
    </motion.div>
  );
}
