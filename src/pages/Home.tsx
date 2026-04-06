import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useProgress } from "../hooks/useProgress";
import { useAchievements } from "../hooks/useAchievements";
import { useSettings, type DefaultDifficulty } from "../hooks/useSettings";
import { getHighScore } from "../types/blitz";
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

  const region = settings.defaultRegion;
  const difficulty = settings.defaultDifficulty;

  const setRegion = (r: Region | "All") => update({ defaultRegion: r });
  const setDifficulty = (d: DefaultDifficulty) => update({ defaultDifficulty: d });

  const play = (path: string) => navigate(`${path}?autostart=1`);

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
        <QuizButton
          icon="🏴"
          label="Flag Quiz"
          onClick={() => play("/flag-quiz")}
        />
        <QuizButton
          icon="🏛️"
          label="Capital Quiz"
          onClick={() => play("/capital-quiz")}
        />
        <QuizButton
          icon="🗺️"
          label="Name that Shape"
          onClick={() => play("/name-that-shape")}
        />
      </motion.div>

      {/* Pin the Map — standalone */}
      <motion.div variants={item} className="mb-4">
        <button
          onClick={() => play("/pin-the-map")}
          className="w-full rounded-2xl p-4 border bg-gradient-to-r from-navy-light to-navy-light/70 border-navy-lighter hover:border-sky/50 hover:shadow-lg hover:shadow-sky/5 transition-all text-left flex items-center gap-4"
        >
          <span className="text-3xl" role="img" aria-hidden="true">📍</span>
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-sm">Pin the Map</div>
            <div className="text-slate-400 text-xs">Find countries on the map — borders only</div>
          </div>
          <span className="px-3 py-1 bg-sky hover:bg-sky-dark text-white text-sm font-medium rounded-full shrink-0 transition-colors">
            Play
          </span>
        </button>
      </motion.div>

      {/* Blitz Mode — standalone */}
      <motion.div variants={item}>
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
    </motion.div>
  );
}

function QuizButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="rounded-2xl p-4 border bg-gradient-to-br from-navy-light to-navy-light/70 border-navy-lighter hover:border-sky/50 hover:shadow-lg hover:shadow-sky/5 transition-all flex flex-col items-center gap-2 text-center"
    >
      <span className="text-2xl sm:text-3xl" role="img" aria-hidden="true">{icon}</span>
      <span className="text-white font-semibold text-xs sm:text-sm leading-tight">{label}</span>
    </motion.button>
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
