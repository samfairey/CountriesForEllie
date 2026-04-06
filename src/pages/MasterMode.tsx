import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import countriesData from "../data/countries.json";
import type { Country, Region } from "../types/country";
import type { LatLngBoundsExpression } from "leaflet";
import { useProgress } from "../hooks/useProgress";
import { useAchievementChecker } from "../hooks/useAchievementChecker";
import { useMastery } from "../hooks/useMastery";
import { getSettings } from "../hooks/useSettings";
import { shuffle } from "../utils/shuffle";
import { preloadGeoJson } from "../utils/geoData";
import { WorldMap } from "../components/map/WorldMap";
import type { Achievement } from "../data/achievements";

const countries = countriesData as Country[];
const COUNTRIES_PER_ROUND = 5;
const OPTION_COUNT = 6;

const REGION_BOUNDS: Record<Region | "All", LatLngBoundsExpression> = {
  All: [[-60, -170], [75, 180]],
  Africa: [[-35, -18], [37, 52]],
  Americas: [[-56, -170], [72, -34]],
  Asia: [[-10, 25], [55, 150]],
  Europe: [[35, -25], [72, 45]],
  Oceania: [[-48, 110], [15, 180]],
  Antarctica: [[-90, -180], [-60, 180]],
};

type Phase = "setup" | "playing" | "round-results";
type Step = "flag" | "capital" | "map";

interface CountryRoundResult {
  country: Country;
  flag: boolean | null;
  capital: boolean | null;
  map: boolean | null;
}

interface FlagOption {
  id: string;
  flagUrl: string;
}

export function MasterMode({ onAchievements }: { onAchievements?: (a: Achievement[]) => void }) {
  const { recordAnswer, completeQuiz, progress } = useProgress();
  const { updateChallengeFlags } = useAchievementChecker(progress, onAchievements);
  const { mastered, masteredCount, markMastered } = useMastery();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("setup");
  const [region, setRegion] = useState<Region | "All">(getSettings().defaultRegion);
  const [loading, setLoading] = useState(false);

  // Round state
  const [roundCountries, setRoundCountries] = useState<Country[]>([]);
  const [countryIndex, setCountryIndex] = useState(0);
  const [step, setStep] = useState<Step>("flag");
  const [roundResults, setRoundResults] = useState<CountryRoundResult[]>([]);
  const [roundNumber, setRoundNumber] = useState(0);
  const [poolExhausted, setPoolExhausted] = useState(false);

  // Per-step state
  const [flagOptions, setFlagOptions] = useState<FlagOption[]>([]);
  const [capitalOptions, setCapitalOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);

  // Map state
  const [mapCorrectId, setMapCorrectId] = useState<string | null>(null);
  const [mapWrongId, setMapWrongId] = useState<string | null>(null);
  const [zoomTarget, setZoomTarget] = useState<string | null>(null);
  const pendingAdvance = useRef(false);

  useEffect(() => {
    preloadGeoJson();
  }, []);

  const currentCountry = roundCountries[countryIndex] ?? null;

  // Build the unmastered pool for a region
  const getPool = useCallback(
    (r: Region | "All") => {
      const regionPool = r === "All" ? countries : countries.filter((c) => c.region === r);
      return regionPool.filter((c) => !mastered.has(c.id));
    },
    [mastered]
  );

  const generateFlagOptions = useCallback(
    (country: Country, pool: Country[]): FlagOption[] => {
      const others = pool.filter((c) => c.id !== country.id);
      const wrong = shuffle(others).slice(0, OPTION_COUNT - 1);
      return shuffle([
        { id: country.id, flagUrl: country.flagSvgUrl },
        ...wrong.map((c) => ({ id: c.id, flagUrl: c.flagSvgUrl })),
      ]);
    },
    []
  );

  const generateCapitalOptions = useCallback(
    (country: Country, pool: Country[]): string[] => {
      const others = pool.filter((c) => c.id !== country.id);
      const wrong = shuffle(others).slice(0, OPTION_COUNT - 1);
      return shuffle([country.capital, ...wrong.map((c) => c.capital)]);
    },
    []
  );

  const startRound = useCallback(
    (r: Region | "All", roundNum: number) => {
      const pool = getPool(r);
      if (pool.length === 0) {
        setPoolExhausted(true);
        setPhase("round-results");
        return;
      }

      const count = Math.min(COUNTRIES_PER_ROUND, pool.length);
      const selected = shuffle(pool).slice(0, count);

      // Preload flags
      setLoading(true);
      const allPool = r === "All" ? countries : countries.filter((c) => c.region === r);
      const preloadPromises = allPool.slice(0, 30).map(
        (c) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = c.flagSvgUrl;
          })
      );

      Promise.all(preloadPromises).then(() => {
        setRoundCountries(selected);
        setCountryIndex(0);
        setStep("flag");
        setRoundResults(
          selected.map((c) => ({ country: c, flag: null, capital: null, map: null }))
        );
        setRoundNumber(roundNum);
        setSelectedAnswer(null);
        setLastCorrect(null);
        setMapCorrectId(null);
        setMapWrongId(null);
        setZoomTarget(null);
        setPoolExhausted(false);

        // Generate options for first country
        setFlagOptions(generateFlagOptions(selected[0], allPool));
        setCapitalOptions(generateCapitalOptions(selected[0], allPool));

        setLoading(false);
        setPhase("playing");
      });
    },
    [getPool, generateFlagOptions, generateCapitalOptions]
  );

  const handleStart = useCallback(() => {
    startRound(region, 1);
  }, [region, startRound]);

  const advanceStep = useCallback(() => {
    pendingAdvance.current = false;
    setSelectedAnswer(null);
    setLastCorrect(null);
    setMapCorrectId(null);
    setMapWrongId(null);
    setZoomTarget(null);

    if (step === "flag") {
      setStep("capital");
    } else if (step === "capital") {
      setStep("map");
    } else {
      // Map done — advance to next country or round results
      const nextIdx = countryIndex + 1;
      if (nextIdx >= roundCountries.length) {
        // Round complete
        completeQuiz();
        updateChallengeFlags({ modesPlayed: ["master-mode"] });
        setPhase("round-results");
      } else {
        setCountryIndex(nextIdx);
        setStep("flag");
        // Generate options for next country
        const allPool = region === "All" ? countries : countries.filter((c) => c.region === region);
        setFlagOptions(generateFlagOptions(roundCountries[nextIdx], allPool));
        setCapitalOptions(generateCapitalOptions(roundCountries[nextIdx], allPool));
      }
    }
  }, [step, countryIndex, roundCountries, region, completeQuiz, updateChallengeFlags, generateFlagOptions, generateCapitalOptions]);

  const handleFlagAnswer = useCallback(
    (answerId: string) => {
      if (selectedAnswer !== null || !currentCountry) return;
      const correct = answerId === currentCountry.id;
      setSelectedAnswer(answerId);
      setLastCorrect(correct);
      recordAnswer(currentCountry.id, "master-mode", correct);

      setRoundResults((prev) => {
        const next = [...prev];
        next[countryIndex] = { ...next[countryIndex], flag: correct };
        return next;
      });

      setTimeout(advanceStep, correct ? 600 : 1200);
    },
    [selectedAnswer, currentCountry, countryIndex, recordAnswer, advanceStep]
  );

  const handleCapitalAnswer = useCallback(
    (answer: string) => {
      if (selectedAnswer !== null || !currentCountry) return;
      const correct = answer === currentCountry.capital;
      setSelectedAnswer(answer);
      setLastCorrect(correct);
      recordAnswer(currentCountry.id, "master-mode", correct);

      setRoundResults((prev) => {
        const next = [...prev];
        next[countryIndex] = { ...next[countryIndex], capital: correct };
        return next;
      });

      setTimeout(advanceStep, correct ? 600 : 1200);
    },
    [selectedAnswer, currentCountry, countryIndex, recordAnswer, advanceStep]
  );

  const handleMapClick = useCallback(
    (countryId: string) => {
      if (pendingAdvance.current || !currentCountry) return;
      pendingAdvance.current = true;

      const correct = countryId === currentCountry.id;
      recordAnswer(currentCountry.id, "master-mode", correct);

      if (correct) {
        setMapCorrectId(countryId);
      } else {
        setMapWrongId(countryId);
        setMapCorrectId(currentCountry.id);
        setZoomTarget(currentCountry.id);
      }

      setRoundResults((prev) => {
        const next = [...prev];
        next[countryIndex] = { ...next[countryIndex], map: correct };
        return next;
      });

      const delay = correct ? 800 : 1800;
      setTimeout(advanceStep, delay);
    },
    [currentCountry, countryIndex, recordAnswer, advanceStep]
  );

  // Mark mastered countries when entering round results
  useEffect(() => {
    if (phase === "round-results" && !poolExhausted) {
      roundResults.forEach((r) => {
        if (r.flag === true && r.capital === true && r.map === true) {
          markMastered(r.country.id);
        }
      });
    }
  }, [phase, poolExhausted, roundResults, markMastered]);

  const handleNextRound = useCallback(() => {
    startRound(region, roundNumber + 1);
  }, [region, roundNumber, startRound]);

  const goHome = useCallback(() => navigate("/"), [navigate]);

  // Region bounds for map step
  const initialBounds = useMemo(() => {
    if (region === "All") return null;
    return REGION_BOUNDS[region];
  }, [region]);

  const totalInRegion = useMemo(() => {
    return region === "All" ? countries.length : countries.filter((c) => c.region === region).length;
  }, [region]);

  const masteredInRegion = useMemo(() => {
    if (region === "All") return masteredCount;
    return countries.filter((c) => c.region === region && mastered.has(c.id)).length;
  }, [region, mastered, masteredCount]);

  // Count newly mastered this round
  const newlyMastered = roundResults.filter(
    (r) => r.flag === true && r.capital === true && r.map === true
  ).length;

  const remainingPool = totalInRegion - masteredInRegion;

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 3.5rem)" }}>
      <AnimatePresence mode="wait">
        {/* ── SETUP ── */}
        {phase === "setup" && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-start justify-center pt-8 px-4"
          >
            <div className="max-w-md w-full">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-slate-400">Preparing round...</p>
                </div>
              ) : (
                <>
                  <h1 className="text-3xl font-bold text-white mb-2">Master Mode</h1>
                  <p className="text-slate-400 mb-6">
                    For each country: identify the flag, name the capital, and find it on the map.
                    Get all three right to master it!
                  </p>

                  {/* Mastery progress */}
                  <div className="bg-navy-light border border-navy-lighter rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-300 font-medium">Mastered</span>
                      <span className="text-sm text-violet-400 font-bold">
                        {masteredInRegion} / {totalInRegion}
                      </span>
                    </div>
                    <div className="h-2 bg-navy-lighter rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-violet-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${totalInRegion > 0 ? (masteredInRegion / totalInRegion) * 100 : 0}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>

                  {/* Region selector */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-300 mb-3">Region</label>
                    <div className="flex flex-wrap gap-2">
                      {(["All", "Africa", "Americas", "Asia", "Europe", "Oceania"] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => setRegion(r)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            region === r
                              ? "bg-violet-500 text-white shadow-lg shadow-violet-500/25"
                              : "bg-navy-lighter text-slate-300 hover:bg-navy-lighter/80"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {remainingPool === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-5xl mb-4">🏆</div>
                      <h2 className="text-xl font-bold text-white mb-2">
                        {region === "All" ? "World" : region} Mastered!
                      </h2>
                      <p className="text-slate-400 text-sm">
                        You've mastered every country in this region. Try another region or reset in settings.
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={handleStart}
                      className="w-full py-3 bg-violet-500 hover:bg-violet-600 text-white font-semibold rounded-xl transition-colors text-lg"
                    >
                      Start Round ({Math.min(COUNTRIES_PER_ROUND, remainingPool)} countries)
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* ── PLAYING ── */}
        {phase === "playing" && currentCountry && (
          <div key="playing" className="flex flex-col flex-1">
            {/* Header */}
            <div className="px-4 py-3 bg-navy-light/90 backdrop-blur-sm border-b border-navy-lighter z-10">
              {/* Progress dots */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex gap-1.5">
                  {roundCountries.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i < countryIndex
                          ? "bg-violet-500"
                          : i === countryIndex
                            ? "bg-white"
                            : "bg-navy-lighter"
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={goHome}
                  className="text-slate-500 hover:text-slate-300 transition-colors text-xs px-2 py-0.5 rounded border border-navy-lighter hover:border-slate-500"
                >
                  Quit
                </button>
              </div>

              {/* Country name + step indicator */}
              <div className="flex items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-bold text-white flex-1">
                  {currentCountry.name}
                </h2>
                <div className="flex gap-1">
                  {(["flag", "capital", "map"] as Step[]).map((s) => {
                    const result = roundResults[countryIndex];
                    const done = s === "flag" ? result?.flag !== null : s === "capital" ? result?.capital !== null : result?.map !== null;
                    const correct = s === "flag" ? result?.flag : s === "capital" ? result?.capital : result?.map;
                    const active = s === step;
                    return (
                      <span
                        key={s}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium transition-all ${
                          done && correct
                            ? "bg-emerald/20 text-emerald"
                            : done && !correct
                              ? "bg-rose/20 text-rose"
                              : active
                                ? "bg-violet-500/20 text-violet-400 border border-violet-500/40"
                                : "bg-navy-lighter text-slate-500"
                        }`}
                      >
                        {s === "flag" ? "🏴" : s === "capital" ? "🏛️" : "📍"}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Step-specific prompt */}
              {step === "flag" && (
                <p className="text-slate-400 text-sm mt-1">Which flag belongs to this country?</p>
              )}
              {step === "capital" && (
                <div className="flex items-center gap-2 mt-1">
                  <img
                    src={currentCountry.flagSvgUrl}
                    alt=""
                    className="h-5 w-auto rounded"
                  />
                  <p className="text-slate-400 text-sm">What is the capital?</p>
                </div>
              )}
              {step === "map" && (
                <div className="flex items-center gap-2 mt-1">
                  <img
                    src={currentCountry.flagSvgUrl}
                    alt=""
                    className="h-5 w-auto rounded"
                  />
                  <p className="text-slate-400 text-sm">
                    Capital: <span className="text-white">{currentCountry.capital}</span> — find it on the map
                  </p>
                </div>
              )}
            </div>

            {/* Step content */}
            <div className="flex-1 relative min-h-0">
              <AnimatePresence mode="wait">
                {step === "flag" && (
                  <motion.div
                    key={`flag-${countryIndex}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="absolute inset-0 overflow-auto p-4"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
                      {flagOptions.map((opt) => {
                        let borderClass = "border-navy-lighter hover:border-sky/60";
                        if (selectedAnswer !== null) {
                          if (opt.id === currentCountry.id) {
                            borderClass = "border-emerald bg-emerald/10";
                          } else if (opt.id === selectedAnswer && !lastCorrect) {
                            borderClass = "border-rose bg-rose/10";
                          } else {
                            borderClass = "border-navy-lighter/50 opacity-40";
                          }
                        }
                        return (
                          <motion.button
                            key={opt.id}
                            whileTap={selectedAnswer === null ? { scale: 0.97 } : undefined}
                            onClick={() => handleFlagAnswer(opt.id)}
                            disabled={selectedAnswer !== null}
                            className={`p-3 rounded-xl border bg-navy-light transition-all flex items-center justify-center aspect-[3/2] ${borderClass}`}
                          >
                            <img
                              src={opt.flagUrl}
                              alt="Flag option"
                              className="max-h-16 sm:max-h-20 w-auto object-contain rounded shadow-sm"
                              draggable={false}
                            />
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {step === "capital" && (
                  <motion.div
                    key={`capital-${countryIndex}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="absolute inset-0 overflow-auto p-4"
                  >
                    <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
                      {capitalOptions.map((option, i) => {
                        let btnClass = "bg-navy-light border-navy-lighter text-slate-200 hover:border-sky/60";
                        if (selectedAnswer !== null) {
                          if (option === currentCountry.capital) {
                            btnClass = "bg-emerald/15 border-emerald text-emerald font-semibold";
                          } else if (option === selectedAnswer && !lastCorrect) {
                            btnClass = "bg-rose/15 border-rose text-rose";
                          } else {
                            btnClass = "bg-navy-light/50 border-navy-lighter/50 text-slate-500";
                          }
                        }
                        return (
                          <button
                            key={option}
                            onClick={() => handleCapitalAnswer(option)}
                            disabled={selectedAnswer !== null}
                            className={`p-3 rounded-xl border text-left text-sm transition-all ${btnClass}`}
                          >
                            <span className="text-xs text-slate-500 mr-1.5">{i + 1}</span>
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {step === "map" && (
                  <motion.div
                    key={`map-${countryIndex}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0"
                  >
                    <WorldMap
                      interactive
                      highlightedCountries={[]}
                      selectedCountry={null}
                      correctCountry={mapCorrectId}
                      wrongCountry={mapWrongId}
                      onCountryClick={handleMapClick}
                      zoomToCountry={zoomTarget}
                      showBorders
                      capitals={[]}
                      initialBounds={initialBounds}
                      cleanMap
                      className="absolute inset-0"
                    />

                    {/* Map feedback overlay */}
                    <AnimatePresence>
                      {(mapCorrectId || mapWrongId) && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className={`absolute top-4 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 rounded-full font-semibold text-sm shadow-lg ${
                            !mapWrongId
                              ? "bg-emerald text-white"
                              : "bg-rose text-white"
                          }`}
                        >
                          {!mapWrongId ? "Correct!" : "Wrong!"}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* ── ROUND RESULTS ── */}
        {phase === "round-results" && (
          <motion.div
            key="results"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-auto px-4 py-8"
          >
            <div className="max-w-md mx-auto text-center">
              {poolExhausted ? (
                <>
                  <div className="text-6xl mb-4">🏆</div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {region === "All" ? "World" : region} Mastered!
                  </h2>
                  <p className="text-slate-400 mb-8">
                    You've mastered every country. Amazing!
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    Round {roundNumber} Complete
                  </h2>
                  {newlyMastered > 0 ? (
                    <p className="text-violet-400 font-medium mb-6">
                      👑 {newlyMastered} countr{newlyMastered === 1 ? "y" : "ies"} mastered!
                    </p>
                  ) : (
                    <p className="text-slate-400 mb-6">
                      Keep practising — get all three right to master a country.
                    </p>
                  )}

                  {/* Per-country results */}
                  <div className="space-y-3 mb-8 text-left">
                    {roundResults.map((r) => {
                      const allCorrect = r.flag === true && r.capital === true && r.map === true;
                      return (
                        <div
                          key={r.country.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border ${
                            allCorrect
                              ? "bg-violet-500/10 border-violet-500/40"
                              : "bg-navy-light border-navy-lighter"
                          }`}
                        >
                          <img
                            src={r.country.flagSvgUrl}
                            alt=""
                            className="h-8 w-12 object-contain rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-medium text-sm truncate">
                              {r.country.name}
                            </div>
                            <div className="text-slate-400 text-xs">
                              {r.country.capital}
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <StepBadge correct={r.flag} label="🏴" />
                            <StepBadge correct={r.capital} label="🏛️" />
                            <StepBadge correct={r.map} label="📍" />
                          </div>
                          {allCorrect && (
                            <span className="text-violet-400 text-lg" title="Mastered">👑</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Mastery progress */}
                  <div className="bg-navy-light border border-navy-lighter rounded-xl p-3 mb-6">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-400">Overall mastery</span>
                      <span className="text-xs text-violet-400 font-bold">
                        {masteredInRegion + newlyMastered} / {totalInRegion}
                      </span>
                    </div>
                    <div className="h-1.5 bg-navy-lighter rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all duration-500"
                        style={{ width: `${totalInRegion > 0 ? ((masteredInRegion + newlyMastered) / totalInRegion) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3 justify-center">
                {!poolExhausted && remainingPool - newlyMastered > 0 && (
                  <button
                    onClick={handleNextRound}
                    className="px-6 py-3 bg-violet-500 hover:bg-violet-600 text-white font-semibold rounded-xl transition-colors"
                  >
                    Next Round
                  </button>
                )}
                <button
                  onClick={goHome}
                  className="px-6 py-3 bg-navy-lighter hover:bg-navy-lighter/80 text-slate-300 font-semibold rounded-xl transition-colors"
                >
                  Home
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepBadge({ correct, label }: { correct: boolean | null; label: string }) {
  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded-full ${
        correct === true
          ? "bg-emerald/20 text-emerald"
          : correct === false
            ? "bg-rose/20 text-rose"
            : "bg-navy-lighter text-slate-500"
      }`}
    >
      {label}
    </span>
  );
}
