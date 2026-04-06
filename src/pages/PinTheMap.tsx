import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import countriesData from "../data/countries.json";
import type { Country, Region } from "../types/country";
import type { QuizQuestion } from "../hooks/useQuiz";
import { useQuiz } from "../hooks/useQuiz";
import { useProgress } from "../hooks/useProgress";
import { useAchievementChecker } from "../hooks/useAchievementChecker";
import { shuffle } from "../utils/shuffle";
import { preloadGeoJson } from "../utils/geoData";
import { QuizSetup, type Difficulty } from "../components/quiz/QuizSetup";
import { ProgressBar } from "../components/common/ProgressBar";
import { QuizResults } from "../components/quiz/QuizResults";
import { WorldMap } from "../components/map/WorldMap";
import type { Achievement } from "../data/achievements";

const countries = countriesData as Country[];
const QUESTIONS_PER_ROUND = 20;

/** Standard mode: show country name, user clicks on map */
function generatePinQuestions(
  pool: Country[],
  count: number,
  _optionCount: number
): QuizQuestion<Country>[] {
  return shuffle(pool)
    .slice(0, count)
    .map((country) => ({
      subject: country,
      correctAnswer: country.id,
      options: [], // no MC options — map click is the answer
    }));
}

/** Reverse mode: highlight country on map, user picks name from MC */
function generateReversePinQuestions(
  pool: Country[],
  count: number,
  optionCount: number
): QuizQuestion<Country>[] {
  const questionCountries = shuffle(pool).slice(0, count);

  return questionCountries.map((country) => {
    const others = pool.filter((c) => c.id !== country.id);
    const wrongOptions = shuffle(others).slice(0, Math.max(optionCount - 1, 3));

    return {
      subject: country,
      correctAnswer: country.name,
      options: shuffle([country.name, ...wrongOptions.map((c) => c.name)]),
    };
  });
}

export function PinTheMap({ onAchievements }: { onAchievements?: (a: Achievement[]) => void }) {
  const { recordAnswer, completeQuiz, progress } = useProgress();
  const { updateChallengeFlags } = useAchievementChecker(progress, onAchievements);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [reversed, setReversed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Map feedback state
  const [correctId, setCorrectId] = useState<string | null>(null);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [zoomTarget, setZoomTarget] = useState<string | null>(null);

  // Preload GeoJSON on mount
  useEffect(() => {
    preloadGeoJson();
  }, []);

  const config = useMemo(
    () => ({
      generateQuestions: reversed ? generateReversePinQuestions : generatePinQuestions,
      onAnswer: (q: QuizQuestion<Country>, correct: boolean) => {
        recordAnswer(q.subject.id, "pin-the-map", correct);
      },
      onComplete: () => {
        completeQuiz();
        updateChallengeFlags({ modesPlayed: ["pin-the-map"] });
      },
    }),
    [reversed, recordAnswer, completeQuiz]
  );

  const quiz = useQuiz<Country>(config);
  const quizRef = useRef(quiz);
  quizRef.current = quiz;

  const handleStart = useCallback(
    (region: Region | "All", diff: Difficulty, rev: boolean) => {
      setDifficulty(diff);
      setReversed(rev);
      setLoading(true);

      const pool =
        region === "All" ? countries : countries.filter((c) => c.region === region);
      const count = Math.min(QUESTIONS_PER_ROUND, pool.length);
      const optionCount = diff === "easy" ? 4 : diff === "medium" ? 6 : 4;

      // Preload flag images
      const preloadPromises = shuffle(pool)
        .slice(0, count)
        .map(
          (c) =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => resolve();
              img.onerror = () => resolve();
              img.src = c.flagSvgUrl;
            })
        );

      Promise.all(preloadPromises).then(() => {
        setLoading(false);
        setCorrectId(null);
        setWrongId(null);
        setZoomTarget(null);
        quizRef.current.startQuiz(pool, count, optionCount);
      });
    },
    []
  );

  const handleMapClick = useCallback(
    (countryId: string) => {
      if (!quiz.currentQuestion || quiz.lastAnswerCorrect !== null || reversed) return;

      const correct = countryId === quiz.currentQuestion.correctAnswer;
      if (correct) {
        setCorrectId(countryId);
        setWrongId(null);
      } else {
        setWrongId(countryId);
        setCorrectId(quiz.currentQuestion.correctAnswer);
        setZoomTarget(quiz.currentQuestion.correctAnswer);
      }

      quiz.submitAnswer(countryId);

      // Reset map highlights after the quiz auto-advances
      const delay = correct ? 200 : 600;
      setTimeout(() => {
        setCorrectId(null);
        setWrongId(null);
        setZoomTarget(null);
      }, delay);
    },
    [quiz, reversed]
  );

  const handleMcAnswer = useCallback(
    (answer: string) => {
      if (!quiz.currentQuestion || quiz.lastAnswerCorrect !== null) return;
      quiz.submitAnswer(answer);

      // Reset zoom after advance
      const correct = answer === quiz.currentQuestion.correctAnswer;
      const delay = correct ? 200 : 600;
      setTimeout(() => {
        setZoomTarget(null);
      }, delay);
    },
    [quiz]
  );

  const showBorders = difficulty !== "hard";
  const q = quiz.currentQuestion;

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100vh - 3.5rem)" }}>
      <AnimatePresence mode="wait">
        {quiz.phase === "setup" && (
          <div key="setup" className="flex-1 flex items-start justify-center pt-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-8 h-8 border-3 border-sky border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-400">Loading map data...</p>
              </div>
            ) : (
              <QuizSetup
                title="Pin the Map"
                description="Find countries on the world map. Test your geography knowledge!"
                onStart={handleStart}
                showReverse
                reverseLabel={["Name → Map", "Map → Name"]}
              />
            )}
          </div>
        )}

        {quiz.phase === "playing" && q && (
          <div key="playing" className="flex flex-col flex-1">
            {/* Top panel */}
            <div className="px-4 py-3 bg-navy-light/90 backdrop-blur-sm border-b border-navy-lighter z-10">
              <ProgressBar
                current={quiz.currentIndex + 1}
                total={quiz.totalQuestions}
              />
              {!reversed && (
                <div className="flex items-center gap-3 mt-3">
                  <img
                    src={q.subject.flagSvgUrl}
                    alt={`Flag of ${q.subject.name}`}
                    className="h-8 w-auto object-contain rounded shadow border border-navy-lighter"
                  />
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    {q.subject.name}
                  </h2>
                  <span className="text-slate-400 text-sm ml-auto">
                    Click on the map
                  </span>
                </div>
              )}
              {reversed && (
                <p className="text-slate-400 text-sm mt-2">
                  Which country is highlighted? Pick from the options below.
                </p>
              )}
            </div>

            {/* Map */}
            <div className="flex-1 relative" style={{ minHeight: 300 }}>
              <WorldMap
                interactive={!reversed}
                highlightedCountries={reversed ? [q.subject.id] : []}
                selectedCountry={null}
                correctCountry={correctId}
                wrongCountry={wrongId}
                onCountryClick={handleMapClick}
                zoomToCountry={
                  zoomTarget ||
                  (reversed && difficulty === "easy" ? q.subject.id : null)
                }
                showBorders={showBorders}
                className="absolute inset-0"
              />

              {/* Feedback overlay for map-click mode */}
              <AnimatePresence>
                {!reversed && quiz.lastAnswerCorrect !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`absolute top-4 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 rounded-full font-semibold text-sm shadow-lg ${
                      quiz.lastAnswerCorrect
                        ? "bg-emerald text-white"
                        : "bg-rose text-white"
                    }`}
                  >
                    {quiz.lastAnswerCorrect
                      ? "Correct!"
                      : `Wrong — it was ${q.subject.name}`}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* MC options for reverse mode */}
            {reversed && (
              <div className="px-4 py-3 bg-navy-light/90 backdrop-blur-sm border-t border-navy-lighter">
                <div className="grid grid-cols-2 gap-2 max-w-2xl mx-auto">
                  {q.options.map((option, i) => {
                    let btnClass =
                      "bg-navy-light border-navy-lighter text-slate-200 hover:border-sky/60";
                    const answered = quiz.lastAnswerCorrect !== null;

                    if (answered) {
                      if (option === q.correctAnswer) {
                        btnClass =
                          "bg-emerald/15 border-emerald text-emerald font-semibold";
                      } else if (
                        option === quiz.selectedAnswer &&
                        !quiz.lastAnswerCorrect
                      ) {
                        btnClass = "bg-rose/15 border-rose text-rose";
                      } else {
                        btnClass =
                          "bg-navy-light/50 border-navy-lighter/50 text-slate-500";
                      }
                    }

                    return (
                      <button
                        key={option}
                        onClick={() => !answered && handleMcAnswer(option)}
                        disabled={answered}
                        className={`p-2.5 rounded-xl border text-left text-sm transition-all ${btnClass}`}
                      >
                        <span className="text-xs text-slate-500 mr-1.5">
                          {i + 1}
                        </span>
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {quiz.phase === "results" && (
          <div key="results" className="flex-1 py-8">
            <QuizResults
              results={quiz.results}
              score={quiz.score}
              totalQuestions={quiz.totalQuestions}
              elapsedMs={quiz.elapsedMs}
              onPlayAgain={quiz.reset}
              renderWrongItem={(r) => (
                <div className="flex items-center gap-4 bg-navy-light border border-navy-lighter rounded-xl p-3">
                  <img
                    src={r.question.subject.flagSvgUrl}
                    alt={`Flag of ${r.question.subject.name}`}
                    className="w-16 h-10 object-contain rounded"
                  />
                  <div className="text-left flex-1">
                    <div className="text-emerald font-medium text-sm">
                      {r.question.subject.name}
                    </div>
                    <div className="text-slate-400 text-xs">
                      {r.question.subject.region} &middot;{" "}
                      {r.question.subject.subregion}
                    </div>
                  </div>
                </div>
              )}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
