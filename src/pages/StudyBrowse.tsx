import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import type { LatLngBoundsExpression } from "leaflet";
import countriesData from "../data/countries.json";
import type { Country, Region } from "../types/country";
import { preloadGeoJson } from "../utils/geoData";
import { WorldMap } from "../components/map/WorldMap";

const countries = countriesData as Country[];

const REGIONS: (Region | "All")[] = ["All", "Africa", "Americas", "Asia", "Europe", "Oceania"];

/** Region view-box for the browse map's auto-centre behaviour.
 *  Matches the bounds used by Pin the Map / Master Mode. */
const REGION_BOUNDS: Record<Region | "All", LatLngBoundsExpression> = {
  All:        [[-60, -170], [75, 180]],
  Africa:     [[-35, -18], [37, 52]],
  Americas:   [[-56, -170], [72, -34]],
  Asia:       [[-10, 25], [55, 150]],
  Europe:     [[35, -25], [72, 45]],
  Oceania:    [[-48, 110], [15, 180]],
  Antarctica: [[-90, -180], [-60, 180]],
};

type SortOrder = "population" | "alphabetical";

export function StudyBrowse() {
  const navigate = useNavigate();
  const [region, setRegion] = useState<Region | "All">("All");
  const [sort, setSort] = useState<SortOrder>("population");
  /** Counter that bumps each time region changes so the map re-fits. */
  const [flyKey, setFlyKey] = useState(0);

  useEffect(() => {
    preloadGeoJson();
  }, []);

  // Smooth re-centre when the user picks a different region
  useEffect(() => { setFlyKey((k) => k + 1); }, [region]);

  const list = useMemo(() => {
    const pool = region === "All" ? countries : countries.filter((c) => c.region === region);
    const sorted = pool.slice();
    if (sort === "population") sorted.sort((a, b) => b.population - a.population);
    else sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [region, sort]);

  const highlightedIds = useMemo(() => list.map((c) => c.id), [list]);

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
        Tap any country — on the map or in the list — to study it.
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

      {/* Region map — auto-centres on the active region, all filtered
          countries highlighted. Tapping a country opens its detail page. */}
      <div className="bg-navy-light border border-navy-lighter rounded-2xl p-2 mb-4">
        <div className="relative h-56 rounded-lg overflow-hidden">
          <WorldMap
            interactive
            highlightedCountries={highlightedIds}
            selectedCountry={null}
            correctCountry={null}
            wrongCountry={null}
            onCountryClick={(id) => {
              // Only follow through if the tapped country is actually in the
              // current filtered list (otherwise it's a distractor we don't
              // want to deep-link from here)
              if (highlightedIds.includes(id)) {
                navigate(`/study/country/${id}?region=${region}&sort=${sort}`);
              }
            }}
            zoomToCountry={null}
            showBorders
            correctAsHighlight
            initialBounds={REGION_BOUNDS[region]}
            flyToBounds={{ bounds: REGION_BOUNDS[region], key: flyKey }}
            className="absolute inset-0"
          />
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
              to={`/study/country/${c.id}?region=${region}&sort=${sort}`}
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
              <span className="text-slate-600 text-sm shrink-0">›</span>
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
