import { useCallback, useEffect, useMemo, useState } from "react";
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

  const goTo = useCallback(
    (target: Country) => {
      navigate(`/study/country/${target.id}?region=${region}&sort=${sort}`);
    },
    [navigate, region, sort],
  );

  /** Tap anywhere on the page (except the map or any explicit [data-no-tap]
   *  element) to advance to the next country. */
  const handlePageClick = useCallback(
    (e: React.MouseEvent) => {
      if (!next) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest?.("[data-no-tap]")) return;
      goTo(next);
    },
    [next, goTo],
  );

  // Keyboard arrows still work for keyboard users
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft" && prev) goTo(prev);
      else if ((e.key === "ArrowRight" || e.key === " ") && next) {
        e.preventDefault();
        goTo(next);
      }
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
    <div
      className="max-w-2xl mx-auto pb-20 cursor-pointer"
      onClick={handlePageClick}
      role={next ? "button" : undefined}
      aria-label={next ? `Tap to continue to ${next.name}` : undefined}
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
          {/* data-no-tap: interacting with the map pans/zooms it — never
              triggers tap-to-continue. The map auto-zooms to the country. */}
          <div
            data-no-tap="true"
            className="flex-1 min-h-[220px] relative rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
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

      {/* Tap-to-continue hint */}
      {next && (
        <div className="text-center text-xs text-slate-500 mb-4 select-none">
          Tap anywhere to continue to <span className="text-slate-400">{next.name}</span> →
        </div>
      )}
      {!next && (
        <div className="text-center text-xs text-slate-500 mb-4 select-none">
          Last country in this list
        </div>
      )}

      {/* Back to list — guarded so its click doesn't bubble to the page */}
      <Link
        to="/study/browse"
        data-no-tap="true"
        onClick={(e) => e.stopPropagation()}
        className="block text-center mt-2 text-slate-400 hover:text-white transition-colors text-sm no-underline"
      >
        &larr; Back to list
      </Link>
    </div>
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
