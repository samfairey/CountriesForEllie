import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { FeatureCollection, Geometry } from "geojson";
import countriesData from "../data/countries.json";
import type { Country, Region } from "../types/country";
import { loadGeoJson, getCountryFeature } from "../utils/geoData";
import { CountryOutline } from "../components/quiz/CountryOutline";
import { WorldMap } from "../components/map/WorldMap";

const countries = countriesData as Country[];
const countryById = new Map(countries.map((c) => [c.id, c]));

type SortOrder = "population" | "alphabetical";

const DOT_ISLAND_IDS = new Set(["mh", "pw", "fm", "tv", "ki", "fj", "to"]);

export function StudyCountry() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  // Tactile nudge: 0 by default; swipe sets to ±20 then navigates on frame-out
  const [nudgeX, setNudgeX] = useState(0);

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

  useEffect(() => {
    let cancelled = false;
    loadGeoJson().then((g) => { if (!cancelled) setGeoData(g); });
    return () => { cancelled = true; };
  }, []);

  const geometry: Geometry | null = useMemo(() => {
    if (!geoData || !country) return null;
    return getCountryFeature(geoData, country.id)?.geometry ?? null;
  }, [geoData, country]);

  /** Navigate with a subtle nudge animation so the user sees their swipe registered. */
  const goTo = useCallback(
    (target: Country, direction: "left" | "right") => {
      setNudgeX(direction === "left" ? -20 : 20);
      window.setTimeout(() => {
        navigate(`/study/country/${target.id}?region=${region}&sort=${sort}`);
      }, 150);
    },
    [navigate, region, sort],
  );

  // Swipe handling — but only on non-map areas. A data-no-swipe attribute
  // on the map wrapper lets Leaflet handle its own pan/zoom gestures
  // without us hijacking them to change country.
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest?.("[data-no-swipe]")) {
      touchStartX.current = null;
      return;
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    // Require a mostly-horizontal swipe so vertical scrolling isn't captured
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0 && next) goTo(next, "left");
    else if (dx > 0 && prev) goTo(prev, "right");
  }, [prev, next, goTo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft" && prev) goTo(prev, "right");
      else if (e.key === "ArrowRight" && next) goTo(next, "left");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, goTo]);

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

  const populationFormatted = country.population.toLocaleString("en-US");
  const hasOfficial = country.officialName && country.officialName !== country.name;

  return (
    <motion.div
      key={country.id}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: nudgeX }}
      transition={{ duration: nudgeX === 0 ? 0.2 : 0.15 }}
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
          {/* data-no-swipe: horizontal swipe here must pan the map, not switch country */}
          <div
            data-no-swipe="true"
            className="flex-1 min-h-[220px] relative rounded-lg overflow-hidden"
          >
            <WorldMap
              interactive
              highlightedCountries={[country.id]}
              selectedCountry={null}
              correctCountry={null}
              wrongCountry={null}
              onCountryClick={() => {}}
              zoomToCountry={country.id}
              showBorders
              correctAsHighlight
              className="absolute inset-0"
            />
          </div>
        </div>
      </div>

      {/* Prev / Next */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => prev && goTo(prev, "right")}
          disabled={!prev}
          className="flex-1 px-3 py-2.5 rounded-xl bg-navy-light border border-navy-lighter hover:border-sky/50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 text-sm font-medium transition-colors text-left"
        >
          ← {prev ? prev.name : "—"}
        </button>
        <button
          onClick={() => next && goTo(next, "left")}
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
