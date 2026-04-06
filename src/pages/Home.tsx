import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useProgress } from "../hooks/useProgress";
import { useAchievements } from "../hooks/useAchievements";
import { useSettings, type DefaultDifficulty } from "../hooks/useSettings";
import { getHighScore } from "../types/blitz";
import { getMasteredCount } from "../hooks/useMastery";
import type { Region } from "../types/country";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const REGIONS: (Region | "All")[] = ["All", "Africa", "Americas", "Asia", "Europe", "Oceania"];
const DIFFICULTIES: { value: DefaultDifficulty; label: string; desc: string }[] = [
  { value: "easy", label: "Easy", desc: "4 choices" },
  { value: "medium", label: "Medium", desc: "6 choices" },
  { value: "hard", label: "Hard", desc: "Type it" },
];

interface QuizMode {
  icon: string;
  label: string;
  path: string;
  directions: [string, string]; // [standard, reverse]
}

const QUIZ_MODES: QuizMode[] = [
  { icon: "\u{1F3F4}", label: "Flag Quiz", path: "/flag-quiz", directions: ["Flag \u2192 Name", "Name \u2192 Flag"] },
  { icon: "\u{1F3DB}\uFE0F", label: "Capital Quiz", path: "/capital-quiz", directions: ["Country \u2192 Capital", "Capital \u2192 Country"] },
  { icon: "\u{1F5FA}\uFE0F", label: "Name that Shape", path: "/name-that-shape", directions: ["Shape \u2192 Name", "Name \u2192 Shape"] },
];

const PIN_DIRECTIONS: [string, string] = ["Name \u2192 Map", "Map \u2192 Name"];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning!";
  if (hour < 18) return "Good afternoon!";
  return "Good evening!";
}

/** Count mastered countries (seen 3+ times with 100% in any mode) */
function countMastered(countryStats: Record<string, { timesSeen: number; timesCorrect: number }>): number {
  const mastered = new Set<string>();
  for (const [key, stats] of Object.entries(countryStats)) {
    const countryId = key.split(":")[0];
    if (stats.timesSeen >= 3 && stats.timesCorrect === stats.timesSeen) {
      mastered.add(countryId);
    }
  }
  return mastered.size;
}

export function Home() {
  const { progress } = useProgress();
  const { unlockedIds, totalAchievements } = useAchievements();
  const { settings, update } = useSettings();
  const navigate = useNavigate();
  const blitzHigh = getHighScore(180);
  const mastered = countMastered(progress.countryStats);
  const masterModeMastered = getMasteredCount();

  const region = settings.defaultRegion;
  const difficulty = settings.defaultDifficulty;

  // Per-mode reverse state
  const [reversed, setReversed] = useState<Record<string, boolean>>({});
  const isReversed = (path: string) => reversed[path] ?? false;
  const toggleReverse = (path: string) =>
    setReversed((prev) => ({ ...prev, [path]: !prev[path] }));

  const setRegion = (r: Region | "All") => update({ defaultRegion: r });
  const setDifficulty = (d: DefaultDifficulty) => update({ defaultDifficulty: d });

  const play = (path: string) => {
    const rev = isReversed(path);
    const params = rev ? "autostart=1&reverse=1" : "autostart=1";
    navigate(`${path}?${params}`);
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Hero — compact */}
      <motion.div variants={item} className="text-center mb-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-0.5">
          {getGreeting()}
        </h1>
        {progress.currentStreak > 0 && (
          <p className="text-gold text-sm font-medium">
            🔥 {progress.currentStreak} day streak — keep it going!
          </p>
        )}
        {progress.currentStreak === 0 && progress.totalQuizzesCompleted > 0 && (
          <p className="text-slate-400 text-sm">
            Start a quiz to begin your streak!
          </p>
        )}
        {progress.totalQuizzesCompleted === 0 && (
          <p className="text-slate-400 text-sm">
            Pick a region and difficulty, then jump in!
          </p>
        )}
      </motion.div>

      {/* Quick stats strip */}
      <motion.div
        variants={item}
        className="flex items-center justify-center gap-2.5 sm:gap-4 mb-6 overflow-x-auto pb-1"
      >
        <StatPill label="Mastered" value={`${mastered}/195`} icon="⭐" />
        <StatPill label="Streak" value={`${progress.currentStreak}`} icon="🔥" />
        {blitzHigh > 0 && (
          <StatPill label="Blitz" value={blitzHigh.toLocaleString()} icon="⚡" />
        )}
        <Link to="/achievements" className="no-underline">
          <StatPill label="Achievements" value={`${unlockedIds.size}/${totalAchievements}`} icon="🏆" />
        </Link>
        <StatPill label="Quizzes" value={`${progress.totalQuizzesCompleted}`} icon="✅" />
      </motion.div>

      {/* Region selector */}
      <motion.div variants={item} className="mb-4">
        <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
          Region
        </label>
        <div className="flex flex-wrap gap-1.5">
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                region === r
                  ? "bg-sky text-white shadow-lg shadow-sky/25"
                  : "bg-navy-lighter text-slate-300 hover:bg-navy-lighter/80"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Difficulty selector */}
      <motion.div variants={item} className="mb-6">
        <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
          Difficulty
        </label>
        <div className="flex gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              onClick={() => setDifficulty(d.value)}
              className={`flex-1 py-2 px-2 rounded-xl text-center transition-all border ${
                difficulty === d.value
                  ? "bg-sky/10 border-sky text-white"
                  : "bg-navy-light border-navy-lighter text-slate-300 hover:border-slate-500"
              }`}
            >
              <div className="font-semibold text-sm">{d.label}</div>
              <div className="text-xs text-slate-400">{d.desc}</div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Main quiz modes — 3 across */}
      <motion.div variants={item} className="grid grid-cols-3 gap-2.5 mb-4">
        {QUIZ_MODES.map((mode) => (
          <QuizButton
            key={mode.path}
            icon={mode.icon}
            label={mode.label}
            direction={mode.directions[isReversed(mode.path) ? 1 : 0]}
            reversed={isReversed(mode.path)}
            onPlay={() => play(mode.path)}
            onToggleReverse={() => toggleReverse(mode.path)}
          />
        ))}
      </motion.div>

      {/* Pin the Map — standalone */}
      <motion.div variants={item} className="mb-4">
        <div className="w-full rounded-2xl p-4 border bg-gradient-to-r from-navy-light to-navy-light/70 border-navy-lighter hover:border-sky/50 hover:shadow-lg hover:shadow-sky/5 transition-all flex items-center gap-3">
          <button
            onClick={() => play("/pin-the-map")}
            className="flex items-center gap-3 flex-1 min-w-0 text-left"
          >
            <span className="text-3xl shrink-0" role="img" aria-hidden="true">📍</span>
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold text-sm">Pin the Map</div>
              <div className="text-slate-400 text-xs">
                {PIN_DIRECTIONS[isReversed("/pin-the-map") ? 1 : 0]}
              </div>
            </div>
          </button>
          <button
            onClick={() => toggleReverse("/pin-the-map")}
            className={`px-2 py-1 rounded-lg text-xs font-medium transition-all border shrink-0 ${
              isReversed("/pin-the-map")
                ? "bg-violet-500/15 border-violet-500/50 text-violet-400"
                : "bg-navy-lighter/50 border-navy-lighter text-slate-500 hover:text-slate-300"
            }`}
            title="Toggle direction"
          >
            ⇄
          </button>
          <button
            onClick={() => play("/pin-the-map")}
            className="px-3 py-1 bg-sky hover:bg-sky-dark text-white text-sm font-medium rounded-full shrink-0 transition-colors"
          >
            Play
          </button>
        </div>
      </motion.div>

      {/* Blitz Mode — standalone */}
      <motion.div variants={item} className="mb-4">
        <Link to="/blitz" className="no-underline block">
          <div className="w-full rounded-2xl p-4 border bg-gradient-to-r from-amber-500/10 via-navy-light to-orange-500/5 border-amber-500/40 hover:border-amber-500/70 hover:shadow-lg hover:shadow-amber-500/5 transition-all text-left flex items-center gap-4">
            <span className="text-3xl" role="img" aria-hidden="true">⚡</span>
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold text-sm">Blitz Mode</div>
              <div className="text-slate-400 text-xs">Race the clock with mixed questions</div>
            </div>
            <span className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-full shrink-0 transition-colors">
              Play
            </span>
          </div>
        </Link>
      </motion.div>

      {/* Master Mode — standalone */}
      <motion.div variants={item}>
        <Link to="/master-mode" className="no-underline block">
          <div className="w-full rounded-2xl p-4 border bg-gradient-to-r from-violet-500/10 via-navy-light to-purple-500/5 border-violet-500/40 hover:border-violet-500/70 hover:shadow-lg hover:shadow-violet-500/5 transition-all text-left flex items-center gap-4">
            <span className="text-3xl" role="img" aria-hidden="true">👑</span>
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold text-sm">Master Mode</div>
              <div className="text-slate-400 text-xs">Flag + Capital + Map — master every country</div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="px-3 py-1 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-full transition-colors">
                Play
              </span>
              {masterModeMastered > 0 && (
                <span className="text-xs text-violet-400 font-medium">
                  {masterModeMastered}/195
                </span>
              )}
            </div>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
}

function QuizButton({
  icon,
  label,
  direction,
  reversed,
  onPlay,
  onToggleReverse,
}: {
  icon: string;
  label: string;
  direction: string;
  reversed: boolean;
  onPlay: () => void;
  onToggleReverse: () => void;
}) {
  return (
    <div className="rounded-2xl border bg-gradient-to-br from-navy-light to-navy-light/70 border-navy-lighter hover:border-sky/50 hover:shadow-lg hover:shadow-sky/5 transition-all flex flex-col items-center text-center overflow-hidden">
      {/* Main play area */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={onPlay}
        className="flex flex-col items-center gap-1.5 pt-4 pb-2 px-2 w-full"
      >
        <span className="text-2xl sm:text-3xl" role="img" aria-hidden="true">{icon}</span>
        <span className="text-white font-semibold text-xs sm:text-sm leading-tight">{label}</span>
      </motion.button>
      {/* Direction toggle */}
      <button
        onClick={onToggleReverse}
        className={`w-full py-1.5 px-2 text-[10px] sm:text-xs font-medium transition-all border-t flex items-center justify-center gap-1 ${
          reversed
            ? "bg-violet-500/10 border-violet-500/30 text-violet-400"
            : "bg-navy-lighter/30 border-navy-lighter/50 text-slate-500 hover:text-slate-300"
        }`}
        title="Toggle direction"
      >
        <span className="truncate">{direction}</span>
        <span className="shrink-0">⇄</span>
      </button>
    </div>
  );
}

function StatPill({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-navy-light/60 border border-navy-lighter/50 rounded-full shrink-0">
      <span className="text-sm">{icon}</span>
      <span className="text-white font-semibold text-sm">{value}</span>
      <span className="text-slate-500 text-xs hidden sm:inline">{label}</span>
    </div>
  );
}
