/**
 * Small muted fact strip shown below the answer options during the
 * post-answer reveal pause. Fills the empty space on taller screens
 * with an extra learning touchpoint, without being distracting.
 */
import { motion } from "framer-motion";
import type { Country } from "../../types/country";

interface CountryFactStripProps {
  country: Country;
}

/** Human-friendly population with abbreviation (1.4B / 67.4M / 510K). */
function formatPopulation(pop: number): string {
  if (pop >= 1_000_000_000) return `${(pop / 1_000_000_000).toFixed(1)}B`;
  if (pop >= 1_000_000) return `${(pop / 1_000_000).toFixed(1)}M`;
  if (pop >= 1_000) return `${(pop / 1_000).toFixed(0)}K`;
  return String(pop);
}

export function CountryFactStrip({ country }: CountryFactStripProps) {
  const facts = [
    country.region,
    country.subregion,
    `${formatPopulation(country.population)} people`,
    `Capital: ${country.capital}`,
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.1 }}
      className="mt-4 px-4 py-3 rounded-xl border border-navy-lighter/40 bg-navy-light/40 text-center"
    >
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
        Did you know?
      </div>
      <div className="text-sm text-slate-400">
        {facts.join(" · ")}
      </div>
    </motion.div>
  );
}
