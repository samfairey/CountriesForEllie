import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { getAllAchievements, type AchievementCategory } from "../data/achievements";
import { useAchievements } from "../hooks/useAchievements";

const CATEGORIES: { value: AchievementCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "learning", label: "Learning" },
  { value: "streaks", label: "Streaks" },
  { value: "mastery", label: "Mastery" },
  { value: "challenge", label: "Challenge" },
  { value: "explorer", label: "Explorer" },
];

export function Achievements() {
  const { unlocked, unlockedIds, totalAchievements } = useAchievements();
  const [filter, setFilter] = useState<AchievementCategory | "all">("all");

  const allAchievements = getAllAchievements();
  const filtered =
    filter === "all"
      ? allAchievements
      : allAchievements.filter((a) => a.category === filter);

  const unlockedMap = new Map(unlocked.map((u) => [u.id, u.unlockedAt]));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-2xl mx-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Achievements</h1>
          <p className="text-sm text-slate-400 mt-1">
            {unlockedIds.size} / {totalAchievements} unlocked
          </p>
        </div>
        <Link
          to="/"
          className="text-slate-400 hover:text-white transition-colors text-sm no-underline"
        >
          ← Home
        </Link>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-navy-lighter rounded-full mb-6 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(unlockedIds.size / totalAchievements) * 100}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full bg-gold rounded-full"
        />
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setFilter(cat.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filter === cat.value
                ? "bg-sky text-white"
                : "bg-navy-lighter text-slate-400 hover:text-slate-200"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Achievement grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((achievement) => {
          const isUnlocked = unlockedIds.has(achievement.id);
          const date = unlockedMap.get(achievement.id);

          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative rounded-xl border p-4 transition-all ${
                isUnlocked
                  ? "bg-navy-light border-navy-lighter"
                  : "bg-navy-light/40 border-navy-lighter/40 opacity-60"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`text-2xl ${isUnlocked ? "" : "grayscale opacity-50"}`}
                >
                  {achievement.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm ${isUnlocked ? "text-white" : "text-slate-500"}`}>
                    {achievement.title}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {achievement.description}
                  </div>
                  {date && (
                    <div className="text-xs text-slate-500 mt-1">
                      Earned {date}
                    </div>
                  )}
                </div>
                {!isUnlocked && (
                  <div className="text-slate-600 text-sm">🔒</div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
