/**
 * Country list preview with mastery dots.
 *
 * Rendered below the "Start" button on each quiz setup screen (and below
 * "Start Round" in Master Mode). Shows exactly which countries will appear
 * in the upcoming round after region + difficulty filtering, with a 5-dot
 * mastery indicator per country covering flag / capital / location / shape /
 * reverse (master-mode).
 *
 * Dot colours:
 *   green  = mastered   (timesSeen >= 3 AND 100% accuracy)
 *   amber  = learning   (seen, not mastered, not struggling)
 *   red    = struggling (seen >= 2 AND accuracy < 50%)
 *   grey   = unseen     (no stats recorded)
 */
import type { Country } from "../../types/country";
import type { GameMode } from "../../types/progress";
import { useProgress } from "../../hooks/useProgress";

type Status = "mastered" | "learning" | "struggling" | "unseen";

function statusOf(
  stats: Record<string, { timesSeen: number; timesCorrect: number }>,
  countryId: string,
  mode: GameMode,
): Status {
  const s = stats[`${countryId}:${mode}`];
  if (!s || s.timesSeen === 0) return "unseen";
  if (s.timesSeen >= 3 && s.timesCorrect === s.timesSeen) return "mastered";
  const accuracy = s.timesCorrect / s.timesSeen;
  if (s.timesSeen >= 2 && accuracy < 0.5) return "struggling";
  return "learning";
}

const STATUS_CLASS: Record<Status, string> = {
  mastered:   "bg-emerald",
  learning:   "bg-amber-500",
  struggling: "bg-rose",
  unseen:     "bg-navy-lighter",
};

const MASTERY_DIMENSIONS: { mode: GameMode; label: string }[] = [
  { mode: "flag-quiz",       label: "Flag" },
  { mode: "capital-quiz",    label: "Capital" },
  { mode: "pin-the-map",     label: "Location" },
  { mode: "name-that-shape", label: "Shape" },
  { mode: "master-mode",     label: "Reverse" },
];

interface CountryListPreviewProps {
  /** Countries that will appear in the upcoming round — pre-filtered
   *  by region and difficulty. */
  countries: Country[];
  headingLabel?: string;
}

export function CountryListPreview({
  countries,
  headingLabel = "Countries in this round",
}: CountryListPreviewProps) {
  const { progress } = useProgress();

  return (
    <div className="mt-6 bg-navy-light border border-navy-lighter rounded-xl overflow-hidden">
      <div className="px-4 py-3 text-sm font-medium text-white border-b border-navy-lighter">
        {headingLabel} ({countries.length})
      </div>
      <div className="max-h-[300px] overflow-y-auto">
        {countries.length === 0 && (
          <div className="px-4 py-6 text-slate-400 text-sm text-center">
            No countries match this filter.
          </div>
        )}
        {countries.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 px-4 py-2 border-b border-navy-lighter/30 last:border-b-0"
          >
            <img
              src={c.flagSvgUrl}
              alt=""
              className="w-6 h-4 object-contain rounded-sm shrink-0"
              loading="lazy"
            />
            <span className="flex-1 text-slate-200 text-sm truncate">{c.name}</span>
            <div
              className="flex items-center gap-1 shrink-0"
              title="Mastery: flag · capital · location · shape · reverse"
            >
              {MASTERY_DIMENSIONS.map(({ mode, label }) => {
                const status = statusOf(progress.countryStats, c.id, mode);
                return (
                  <span
                    key={mode}
                    title={`${label}: ${status}`}
                    className={`w-2 h-2 rounded-full ${STATUS_CLASS[status]}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
