import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { FeatureCollection, Geometry } from "geojson";
import countriesData from "../data/countries.json";
import type { Country, Region } from "../types/country";
import type { GameMode } from "../types/progress";
import { useProgress } from "../hooks/useProgress";
import { loadGeoJson, getCountryFeature } from "../utils/geoData";
import { CountryOutline } from "../components/quiz/CountryOutline";
import { WorldMap } from "../components/map/WorldMap";

const countries = countriesData as Country[];
const countryById = new Map(countries.map((c) => [c.id, c]));

type SortOrder = "population" | "alphabetical";

const DIMENSIONS: { mode: GameMode; label: string }[] = [
  { mode: "flag-quiz",       label: "Flag" },
  { mode: "capital-quiz",    label: "Capital" },
  { mode: "pin-the-map",     label: "Location" },
  { mode: "name-that-shape", label: "Shape" },
  { mode: "master-mode",     label: "Reverse" },
];

/** Status buckets for mastery colour-coding */
type Status = "mastered" | "learning" | "unseen";
function statusOf(
  stats: Record<string, { timesSeen: number; timesCorrect: number }>,
  id: string,
  mode: GameMode,
): Status {
  const s = stats[`${id}:${mode}`];
  if (!s) return "unseen";
  if (s.timesSeen >= 3 && s.timesCorrect === s.timesSeen) return "mastered";
  return "learning";
}

const DOT_ISLAND_IDS = new Set(["mh", "pw", "fm", "tv", "ki", "fj", "to"]);

export function StudyCountry() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { progress, markKnown } = useProgress();
  const [searchParams] = useSearchParams();
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);

  // Preserve the sort order + region the browser used so prev/next match
  const region = (searchParams.get("region") as Region | "All" | null) ?? "All";
  const sort = ((searchParams.get("sort") as SortOrder | null) ?? "population");

  const siblingList = useMemo(() => {
    const pool = region === "All" ? countries : countries.filter((c) => c.region === region);
    const sorted = pool.slice();
    if (sort === "population") sorted.sort((a, b) => b.population - a.population);
    else sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [region, sort]);

  const country = id ? countryById.get(id) : undefined;
  const currentIdx = country ? siblingList.findIndex((c) => c.id === country.id) : -1;
  const prev = currentIdx > 0 ? siblingList[currentIdx - 1] : null;
  const next = currentIdx >= 0 && currentIdx < siblingList.length - 1 ? siblingList[currentIdx + 1] : null;

  // Load map data once
  useEffect(() => {
    let cancelled = false;
    loadGeoJson().then((g) => { if (!cancelled) setGeoData(g); });
    return () => { cancelled = true; };
  }, []);

  const geometry: Geometry | null = useMemo(() => {
    if (!geoData || !country) return null;
    return getCountryFeature(geoData, country.id)?.geometry ?? null;
  }, [geoData, country]);

  // Keyboard + swipe navigation through the list
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 60) return;
    const qs = `?region=${region}&sort=${sort}`;
    if (dx < 0 && next) navigate(`/study/country/${next.id}${qs}`);
    else if (dx > 0 && prev) navigate(`/study/country/${prev.id}${qs}`);
  }, [prev, next, navigate, region, sort]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const qs = `?region=${region}&sort=${sort}`;
      if (e.key === "ArrowLeft" && prev) navigate(`/study/country/${prev.id}${qs}`);
      else if (e.key === "ArrowRight" && next) navigate(`/study/country/${next.id}${qs}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, navigate, region, sort]);

  if (!country) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <h1 className="text-xl text-white">Country not found</h1>
        <Link to="/study/browse" className="text-sky hover:underline text-sm mt-4 inline-block no-underline">
          Browse all countries
        </Link>
      </div>
    );
  }

  const handleMarkKnown = () => {
    DIMENSIONS.forEach(({ mode }) => markKnown(country.id, mode));
  };

  const populationFormatted = country.population.toLocaleString("en-US");
  const hasOfficial = country.officialName && country.officialName !== country.name;

  return (
    <motion.div
      key={country.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="max-w-2xl mx-auto pb-20"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Flag + name header */}
      <div className="flex flex-col items-center text-center mb-4">
        <img
          src={country.flagSvgUrl}
          alt={`Flag of ${country.name}`}
          className="w-48 h-auto object-contain rounded-lg shadow-lg border border-navy-lighter mb-4"
          draggable={false}
        />
        <h1 className="text-3xl font-bold text-white leading-tight">{country.name}</h1>
        {hasOfficial && (
          <p className="text-slate-400 text-sm mt-1">{country.officialName}</p>
        )}
      </div>

      {/* Facts strip */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <FactCard label="Capital" value={country.capital} />
        <FactCard label="Region" value={`${country.region} · ${country.subregion}`} />
        <FactCard label="Population" value={populationFormatted} />
        <FactCard label="ISO" value={country.id.toUpperCase()} />
      </div>

      {/* Outline + mini-map */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="bg-navy-light border border-navy-lighter rounded-2xl p-3 flex flex-col items-center">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Outline</div>
          {geometry ? (
            <CountryOutline
              geometry={geometry}
              width={300}
              height={220}
              fillColor="#0ea5e9"
              strokeColor="#1e293b"
              strokeWidth={1.5}
              dotSmallIslands={DOT_ISLAND_IDS.has(country.id)}
            />
          ) : (
            <div className="w-full h-[220px] flex items-center justify-center text-slate-500 text-xs">
              Loading shape…
            </div>
          )}
        </div>
        <div className="bg-navy-light border border-navy-lighter rounded-2xl p-3 flex flex-col">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1 text-center">Location</div>
          <div className="flex-1 min-h-[220px] relative rounded-lg overflow-hidden">
            <WorldMap
              interactive={false}
              highlightedCountries={[country.id]}
              selectedCountry={null}
              correctCountry={null}
              wrongCountry={null}
              onCountryClick={() => {}}
              zoomToCountry={country.id}
              showBorders
              className="absolute inset-0"
            />
          </div>
        </div>
      </div>

      {/* Mastery status */}
      <div className="bg-navy-light border border-navy-lighter rounded-2xl p-4 mb-4">
        <div className="text-white font-semibold text-sm mb-3">Mastery</div>
        <div className="grid grid-cols-1 gap-2">
          {DIMENSIONS.map(({ mode, label }) => {
            const status = statusOf(progress.countryStats, country.id, mode);
            const colour =
              status === "mastered" ? "text-emerald"
              : status === "learning" ? "text-gold"
              : "text-slate-500";
            const indicator =
              status === "mastered" ? "bg-emerald"
              : status === "learning" ? "bg-gold"
              : "bg-navy-lighter";
            const text =
              status === "mastered" ? "Mastered ✓"
              : status === "learning" ? "Learning"
              : "Not started";
            return (
              <div key={mode} className="flex items-center gap-3 text-sm">
                <span className={`w-2.5 h-2.5 rounded-full ${indicator}`} />
                <span className="text-slate-300 w-20">{label}</span>
                <span className={colour}>{text}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 mb-4">
        <Link
          to={`/flag-quiz?autostart=1`}
          className="flex-1 px-3 py-2 rounded-xl bg-navy-light border border-navy-lighter hover:border-sky/50 text-slate-200 text-sm font-medium text-center transition-colors no-underline"
          title="Start a short quiz (uses the Flag Quiz flow)"
        >
          🎯 Quiz me
        </Link>
        <button
          onClick={handleMarkKnown}
          className="flex-1 px-3 py-2 rounded-xl bg-emerald/15 border border-emerald/40 hover:bg-emerald/25 text-emerald text-sm font-medium transition-colors"
        >
          ✓ Mark as known
        </button>
      </div>

      {/* Prev / Next */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => prev && navigate(`/study/country/${prev.id}?region=${region}&sort=${sort}`)}
          disabled={!prev}
          className="flex-1 px-3 py-2.5 rounded-xl bg-navy-light border border-navy-lighter hover:border-sky/50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 text-sm font-medium transition-colors text-left"
        >
          ← {prev ? prev.name : "—"}
        </button>
        <button
          onClick={() => next && navigate(`/study/country/${next.id}?region=${region}&sort=${sort}`)}
          disabled={!next}
          className="flex-1 px-3 py-2.5 rounded-xl bg-navy-light border border-navy-lighter hover:border-sky/50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 text-sm font-medium transition-colors text-right"
        >
          {next ? next.name : "—"} →
        </button>
      </div>

      <Link
        to="/study/browse"
        className="block text-center mt-6 text-slate-400 hover:text-white transition-colors text-sm no-underline"
      >
        &larr; Back to list
      </Link>
    </motion.div>
  );
}

function FactCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-navy-light border border-navy-lighter rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">{label}</div>
      <div className="text-slate-100 text-sm font-medium">{value}</div>
    </div>
  );
}
