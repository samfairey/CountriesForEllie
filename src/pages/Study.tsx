import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import countriesData from "../data/countries.json";
import type { Country, Region } from "../types/country";
import type { GameMode } from "../types/progress";
import { useProgress } from "../hooks/useProgress";

const countries = countriesData as Country[];
const QUIZ_MODES: GameMode[] = ["flag-quiz", "capital-quiz", "pin-the-map", "name-that-shape"];

interface Buckets {
  mastered: number;
  learning: number;
  unseen: number;
  dueToday: number;
}

/**
 * Bucket every country into mastered / learning / unseen across the 4 quiz
 * modes. A country is "mastered" when it has been seen 3+ times with 100%
 * accuracy in at least one mode, "learning" if it has been seen at all,
 * otherwise "unseen".
 *
 * "Due today" uses a lightweight leitner-style heuristic: countries seen
 * before but not at full mastery, weighted by staleness (lastSeen > 3 days).
 */
function bucketCountries(
  countries: Country[],
  countryStats: Record<string, { timesSeen: number; timesCorrect: number; lastSeen: string }>,
): Buckets {
  const today = new Date().toISOString().slice(0, 10);
  const threeDaysAgo = new Date(Date.now() - 3 * 86400_000).toISOString().slice(0, 10);

  let mastered = 0;
  let learning = 0;
  let unseen = 0;
  let dueToday = 0;

  for (const c of countries) {
    let seenInAnyMode = false;
    let masteredInAnyMode = false;
    let lastSeenAcrossModes = "";

    for (const mode of QUIZ_MODES) {
      const stats = countryStats[`${c.id}:${mode}`];
      if (!stats) continue;
      seenInAnyMode = true;
      if (stats.lastSeen > lastSeenAcrossModes) lastSeenAcrossModes = stats.lastSeen;
      if (stats.timesSeen >= 3 && stats.timesCorrect === stats.timesSeen) {
        masteredInAnyMode = true;
      }
    }

    if (masteredInAnyMode) mastered++;
    else if (seenInAnyMode) {
      learning++;
      // Due if never seen today, and last seen >= 3 days ago — or has imperfect accuracy
      if (lastSeenAcrossModes && lastSeenAcrossModes <= threeDaysAgo) dueToday++;
      else if (lastSeenAcrossModes !== today) dueToday++;
    } else {
      unseen++;
    }
  }

  return { mastered, learning, unseen, dueToday };
}

function regionBuckets(
  countryStats: Record<string, { timesSeen: number; timesCorrect: number; lastSeen: string }>,
): Record<Region, { total: number; mastered: number }> {
  const result: Record<string, { total: number; mastered: number }> = {};
  for (const c of countries) {
    if (!result[c.region]) result[c.region] = { total: 0, mastered: 0 };
    result[c.region].total++;
    for (const mode of QUIZ_MODES) {
      const s = countryStats[`${c.id}:${mode}`];
      if (s && s.timesSeen >= 3 && s.timesCorrect === s.timesSeen) {
        result[c.region].mastered++;
        break;
      }
    }
  }
  return result as Record<Region, { total: number; mastered: number }>;
}

export function Study() {
  const { progress } = useProgress();
  const navigate = useNavigate();

  const buckets = useMemo(
    () => bucketCountries(countries, progress.countryStats),
    [progress.countryStats],
  );

  const regions = useMemo(
    () => regionBuckets(progress.countryStats),
    [progress.countryStats],
  );

  const openBrowser = () => navigate("/study/browse");
  // Secondary: keep the old quiz-style review accessible for users who want it.
  const startReview = () => navigate("/flag-quiz?autostart=1");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-2xl mx-auto"
    >
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 flex items-center gap-2">
        <span>📚</span> Study
      </h1>
      <p className="text-slate-400 mb-6 text-sm">
        Review what you've learned and find your weak spots.
      </p>

      {/* Primary CTA: Browse Countries */}
      <div className="bg-gradient-to-r from-sky/10 via-navy-light to-violet/10 border border-sky/30 rounded-2xl p-5 mb-6">
        <div className="text-slate-300 text-xs uppercase tracking-wider mb-1">
          Today's review
        </div>
        <div className="flex items-end gap-3 mb-4">
          <div className="text-4xl font-bold text-white">{buckets.dueToday}</div>
          <div className="text-slate-400 text-sm mb-1">
            countries could use review
          </div>
        </div>
        <button
          onClick={openBrowser}
          className="w-full py-2.5 bg-sky hover:bg-sky-dark text-white font-semibold rounded-xl transition-colors"
        >
          Browse Countries
        </button>
        {buckets.learning > 0 && (
          <button
            onClick={startReview}
            className="w-full mt-2 py-2 bg-transparent border border-navy-lighter hover:border-sky/50 text-slate-300 hover:text-white text-sm font-medium rounded-xl transition-colors"
          >
            Review Due Cards ({buckets.dueToday})
          </button>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <StatCard
          icon="⭐"
          label="Mastered"
          value={buckets.mastered}
          total={countries.length}
          color="emerald"
        />
        <StatCard
          icon="📖"
          label="Learning"
          value={buckets.learning}
          total={countries.length}
          color="sky"
        />
        <StatCard
          icon="❔"
          label="Unseen"
          value={buckets.unseen}
          total={countries.length}
          color="slate"
        />
      </div>

      {/* Region progress */}
      <div className="bg-navy-light border border-navy-lighter rounded-2xl p-4 mb-6">
        <div className="text-white font-semibold mb-3 text-sm">Region progress</div>
        <div className="space-y-3">
          {(Object.entries(regions) as [Region, { total: number; mastered: number }][])
            .sort((a, b) => b[1].mastered / b[1].total - a[1].mastered / a[1].total)
            .map(([region, r]) => {
              const pct = Math.round((r.mastered / r.total) * 100);
              return (
                <div key={region}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{region}</span>
                    <span className="text-slate-400 tabular-nums">
                      {r.mastered}/{r.total} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-navy-lighter rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full bg-emerald"
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Quick-access to quiz modes */}
      <div className="bg-navy-light border border-navy-lighter rounded-2xl p-4">
        <div className="text-white font-semibold mb-3 text-sm">Practice a specific mode</div>
        <div className="grid grid-cols-2 gap-2">
          <Link to="/flag-quiz" className="no-underline px-3 py-2 rounded-lg bg-navy-lighter/50 hover:bg-navy-lighter text-slate-200 text-sm font-medium text-center transition-colors">
            🏴 Flag Quiz
          </Link>
          <Link to="/capital-quiz" className="no-underline px-3 py-2 rounded-lg bg-navy-lighter/50 hover:bg-navy-lighter text-slate-200 text-sm font-medium text-center transition-colors">
            🏛️ Capital Quiz
          </Link>
          <Link to="/pin-the-map" className="no-underline px-3 py-2 rounded-lg bg-navy-lighter/50 hover:bg-navy-lighter text-slate-200 text-sm font-medium text-center transition-colors">
            📍 Pin the Map
          </Link>
          <Link to="/name-that-shape" className="no-underline px-3 py-2 rounded-lg bg-navy-lighter/50 hover:bg-navy-lighter text-slate-200 text-sm font-medium text-center transition-colors">
            🗺️ Name that Shape
          </Link>
        </div>
      </div>

      <Link
        to="/"
        className="block text-center mt-6 text-slate-400 hover:text-white transition-colors text-sm no-underline"
      >
        &larr; Back to Home
      </Link>
    </motion.div>
  );
}

function StatCard({
  icon, label, value, total, color,
}: { icon: string; label: string; value: number; total: number; color: "emerald" | "sky" | "slate" }) {
  const colorClass =
    color === "emerald" ? "text-emerald"
    : color === "sky" ? "text-sky"
    : "text-slate-400";
  return (
    <div className="bg-navy-light border border-navy-lighter rounded-xl p-3 text-center">
      <div className="text-xl mb-1" role="img" aria-hidden="true">{icon}</div>
      <div className={`text-xl font-bold ${colorClass} tabular-nums`}>
        {value}
      </div>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-[10px] text-slate-500">of {total}</div>
    </div>
  );
}
