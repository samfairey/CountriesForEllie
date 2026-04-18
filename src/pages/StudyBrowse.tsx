import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import countriesData from "../data/countries.json";
import type { Country, Region } from "../types/country";
import type { GameMode } from "../types/progress";
import { useProgress } from "../hooks/useProgress";

const countries = countriesData as Country[];

const REGIONS: (Region | "All")[] = ["All", "Africa", "Americas", "Asia", "Europe", "Oceania"];

type SortOrder = "population" | "alphabetical";

/** Five mastery dots — one per dimension. Reverse is treated as a separate
 *  dimension (mastered when you've seen the "name → flag/shape" variant enough
 *  — we approximate via master-mode stats, which uses reversed questions). */
const MASTERY_DIMENSIONS: { mode: GameMode; label: string }[] = [
  { mode: "flag-quiz",       label: "Flag" },
  { mode: "capital-quiz",    label: "Capital" },
  { mode: "pin-the-map",     label: "Location" },
  { mode: "name-that-shape", label: "Shape" },
  { mode: "master-mode",     label: "Reverse" },
];

function isMastered(
  stats: Record<string, { timesSeen: number; timesCorrect: number }>,
  countryId: string,
  mode: GameMode,
): boolean {
  const s = stats[`${countryId}:${mode}`];
  return !!s && s.timesSeen >= 3 && s.timesCorrect === s.timesSeen;
}

export function StudyBrowse() {
  const { progress } = useProgress();
  const [region, setRegion] = useState<Region | "All">("All");
  const [sort, setSort] = useState<SortOrder>("population");

  const list = useMemo(() => {
    const pool = region === "All" ? countries : countries.filter((c) => c.region === region);
    const sorted = pool.slice();
    if (sort === "population") sorted.sort((a, b) => b.population - a.population);
    else sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [region, sort]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-2xl mx-auto"
    >
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 flex items-center gap-2">
        <span>📚</span> Browse Countries
      </h1>
      <p className="text-slate-400 mb-4 text-sm">
        Tap any country to study its flag, capital, location, and shape.
      </p>

      {/* Compact controls row: region pills + sort toggle */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0 ${
                region === r
                  ? "bg-sky text-white"
                  : "bg-navy-lighter text-slate-300 hover:bg-navy-lighter/80"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex rounded-full bg-navy-lighter p-0.5 shrink-0">
          {([
            ["population", "Population"],
            ["alphabetical", "A-Z"],
          ] as [SortOrder, string][]).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setSort(value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                sort === value ? "bg-sky text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Country list */}
      <div className="bg-navy-light border border-navy-lighter rounded-2xl overflow-hidden">
        <div className="px-4 py-2 text-xs uppercase tracking-wider text-slate-500 border-b border-navy-lighter">
          {list.length} countries
        </div>
        <div>
          {list.map((c) => (
            <Link
              key={c.id}
              to={`/study/country/${c.id}`}
              className="flex items-center gap-3 px-4 py-3 border-b border-navy-lighter/30 last:border-b-0 hover:bg-navy-lighter/30 transition-colors no-underline"
            >
              <img
                src={c.flagSvgUrl}
                alt=""
                className="w-8 h-6 object-contain rounded-sm shrink-0"
                loading="lazy"
              />
              <div className="flex-1 min-w-0">
                <div className="text-slate-100 text-sm font-medium truncate">{c.name}</div>
                <div className="text-slate-500 text-xs truncate">{c.capital}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0" title="Mastery across dimensions">
                {MASTERY_DIMENSIONS.map(({ mode, label }) => {
                  const mastered = isMastered(progress.countryStats, c.id, mode);
                  return (
                    <span
                      key={mode}
                      title={`${label}: ${mastered ? "Mastered" : "Not mastered"}`}
                      className={`w-2 h-2 rounded-full ${
                        mastered ? "bg-emerald" : "bg-navy-lighter"
                      }`}
                    />
                  );
                })}
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Link
        to="/study"
        className="block text-center mt-6 text-slate-400 hover:text-white transition-colors text-sm no-underline"
      >
        &larr; Back to Study
      </Link>
    </motion.div>
  );
}
