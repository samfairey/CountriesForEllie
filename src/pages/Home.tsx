import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { GameModeCard } from "../components/common/GameModeCard";
import { useProgress } from "../hooks/useProgress";
import { useAchievements } from "../hooks/useAchievements";
import { getHighScore } from "../types/blitz";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

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

/** Animated spinning globe SVG for the hero section */
function GlobeAnimation() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="mb-4"
    >
      <div className="relative w-20 h-20 mx-auto">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="w-20 h-20 rounded-full border-2 border-sky/30 flex items-center justify-center"
          style={{
            background:
              "radial-gradient(circle at 35% 35%, #1e293b 0%, #0f172a 70%)",
            boxShadow: "0 0 40px rgba(14, 165, 233, 0.15), inset 0 0 20px rgba(14, 165, 233, 0.1)",
          }}
        >
          <span className="text-4xl select-none" role="img" aria-label="Globe">
            🌍
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}

export function Home() {
  const { progress } = useProgress();
  const { unlockedIds, totalAchievements } = useAchievements();
  const blitzHigh = getHighScore(180);
  const mastered = countMastered(progress.countryStats);

  return (
    <div>
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <GlobeAnimation />
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1">
          {getGreeting()}
        </h1>
        {progress.currentStreak > 0 && (
          <motion.p
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-gold text-sm font-medium"
          >
            🔥 {progress.currentStreak} day streak — keep it going!
          </motion.p>
        )}
        {progress.currentStreak === 0 && progress.totalQuizzesCompleted > 0 && (
          <p className="text-slate-400 text-sm">
            Start a quiz to begin your streak!
          </p>
        )}
        {progress.totalQuizzesCompleted === 0 && (
          <p className="text-slate-400 text-sm">
            Master flags, capitals, and geography through fun quizzes.
          </p>
        )}
      </motion.div>

      {/* Quick stats strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center justify-center gap-3 sm:gap-5 mb-8 overflow-x-auto pb-1"
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

      {/* Game modes grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <motion.div variants={item}>
          <GameModeCard
            icon="🏴"
            title="Flag Quiz"
            description="Identify countries by their flags"
            to="/flag-quiz"
            enabled
          />
        </motion.div>
        <motion.div variants={item}>
          <GameModeCard
            icon="🏛️"
            title="Capital Quiz"
            description="Match countries with their capitals"
            to="/capital-quiz"
            enabled
          />
        </motion.div>
        <motion.div variants={item}>
          <GameModeCard
            icon="📍"
            title="Pin the Map"
            description="Locate countries on an interactive map"
            to="/pin-the-map"
            enabled
          />
        </motion.div>
        <motion.div variants={item}>
          <GameModeCard
            icon="🗺️"
            title="Name that Shape"
            description="Recognise countries by their outline"
            to="/name-that-shape"
            enabled
          />
        </motion.div>
        <motion.div variants={item} className="sm:col-span-2 lg:col-span-1">
          <GameModeCard
            icon="⚡"
            title="Blitz Mode"
            description="Race the clock with mixed questions"
            to="/blitz"
            enabled
            variant="blitz"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

function StatPill({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-light/60 border border-navy-lighter/50 rounded-full shrink-0">
      <span className="text-sm">{icon}</span>
      <span className="text-white font-semibold text-sm">{value}</span>
      <span className="text-slate-500 text-xs hidden sm:inline">{label}</span>
    </div>
  );
}
