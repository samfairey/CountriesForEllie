import { useState, useCallback, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import countriesData from "../data/countries.json";
import type { Country, Region } from "../types/country";
import type { BlitzQuestion, BlitzQuestionType, BlitzDifficulty, BlitzResult, TimeLimit } from "../types/blitz";
import type { FeatureCollection } from "geojson";
import type { Achievement } from "../data/achievements";
import { createBlitzGenerator } from "../utils/blitzGenerator";
import { loadGeoJson, preloadGeoJson } from "../utils/geoData";
import { useProgress } from "../hooks/useProgress";
import { useAchievementChecker } from "../hooks/useAchievementChecker";
import { BlitzSetup } from "../components/blitz/BlitzSetup";
import { BlitzPlay } from "../components/blitz/BlitzPlay";
import { BlitzResults } from "../components/blitz/BlitzResults";

const countries = countriesData as Country[];
const countryById = new Map(countries.map((c) => [c.id, c]));

type Phase = "setup" | "playing" | "results";

interface BlitzConfig {
  region: Region | "All";
  timeLimit: TimeLimit;
  modes: BlitzQuestionType[];
  difficulty: BlitzDifficulty;
}

export function BlitzMode({ onAchievements }: { onAchievements?: (a: Achievement[]) => void }) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [config, setConfig] = useState<BlitzConfig | null>(null);
  const [generator, setGenerator] = useState<{ next: () => BlitzQuestion } | null>(null);
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);

  // Results state
  const [finalResults, setFinalResults] = useState<BlitzResult[]>([]);
  const [finalScore, setFinalScore] = useState(0);
  const [finalStreak, setFinalStreak] = useState(0);

  const { completeQuiz, progress } = useProgress();
  const { updateChallengeFlags } = useAchievementChecker(progress, onAchievements);

  // Preload GeoJSON on mount
  useEffect(() => {
    preloadGeoJson();
  }, []);

  const handleStart = useCallback(
    async (cfg: BlitzConfig) => {
      setConfig(cfg);
      setLoading(true);

      // Load geo data if map/shape modes are enabled
      let geo = geoData;
      if (cfg.modes.includes("pinMap") || cfg.modes.includes("nameShape")) {
        geo = await loadGeoJson();
        setGeoData(geo);
      }

      // Build country pool
      const pool =
        cfg.region === "All"
          ? countries
          : countries.filter((c) => c.region === cfg.region);

      // Preload flag images for pool
      await Promise.all(
        pool.slice(0, 40).map(
          (c) =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => resolve();
              img.onerror = () => resolve();
              img.src = c.flagSvgUrl;
            })
        )
      );

      const gen = createBlitzGenerator({
        pool,
        enabledModes: cfg.modes,
        difficulty: cfg.difficulty,
      });

      setGenerator(gen);
      setLoading(false);
      setPhase("playing");
    },
    [geoData]
  );

  const handleFinish = useCallback(
    (results: BlitzResult[], score: number, streak: number) => {
      setFinalResults(results);
      setFinalScore(score);
      setFinalStreak(streak);
      completeQuiz();
      updateChallengeFlags({
        modesPlayed: ["blitz"],
        bestBlitzStreak: streak,
      });
      setPhase("results");
    },
    [completeQuiz, updateChallengeFlags]
  );

  const handlePlayAgain = useCallback(() => {
    setPhase("setup");
    setGenerator(null);
    setFinalResults([]);
    setFinalScore(0);
    setFinalStreak(0);
  }, []);

  return (
    <div className="py-4">
      <AnimatePresence mode="wait">
        {phase === "setup" && (
          <div key="setup">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-8 h-8 border-3 border-sky border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-400">Preparing blitz...</p>
              </div>
            ) : (
              <BlitzSetup onStart={handleStart} />
            )}
          </div>
        )}

        {phase === "playing" && generator && config && (
          <div key="playing">
            <BlitzPlay
              generator={generator}
              timeLimit={config.timeLimit}
              countryById={countryById}
              geoData={geoData}
              onFinish={handleFinish}
            />
          </div>
        )}

        {phase === "results" && config && (
          <div key="results">
            <BlitzResults
              results={finalResults}
              score={finalScore}
              bestStreak={finalStreak}
              timeLimit={config.timeLimit}
              region={config.region}
              onPlayAgain={handlePlayAgain}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
