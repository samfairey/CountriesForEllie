import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import countriesData from "../data/countries.json";
import type { Country, Region } from "../types/country";
import type { QuizQuestion } from "../hooks/useQuiz";
import type { FeatureCollection, Geometry } from "geojson";
import { useQuiz } from "../hooks/useQuiz";
import { useProgress } from "../hooks/useProgress";
import { useAchievementChecker } from "../hooks/useAchievementChecker";
import { fuzzyMatch } from "../utils/fuzzyMatch";
import { shuffle } from "../utils/shuffle";
import { loadGeoJson, getCountryFeature, preloadGeoJson } from "../utils/geoData";
import { getSettings } from "../hooks/useSettings";
import { QuizSetup, type Difficulty, type DifficultyOption } from "../components/quiz/QuizSetup";
import { QuizQuestionView } from "../components/quiz/QuizQuestion";
import { QuizResults } from "../components/quiz/QuizResults";
import { ProgressBar } from "../components/common/ProgressBar";
import { CountryOutline } from "../components/quiz/CountryOutline";
import type { Achievement } from "../data/achievements";

const countries = countriesData as Country[];
const QUESTIONS_PER_ROUND = 20;

const SHAPE_DIFFICULTIES: DifficultyOption[] = [
  { value: "easy", label: "Easy", desc: "4 options + flag" },
  { value: "medium", label: "Medium", desc: "6 options" },
  { value: "hard", label: "Hard", desc: "Type it" },
];

/** Standard: show shape → name the country */
function generateShapeQuestions(
  pool: Country[],
  count: number,
  optionCount: number
): QuizQuestion<Country>[] {
  const questionCountries = shuffle(pool).slice(0, count);

  return questionCountries.map((country) => {
    if (optionCount === 0) {
      return { subject: country, correctAnswer: country.name, options: [] };
    }

    const others = pool.filter((c) => c.id !== country.id);
    const wrongOptions = shuffle(others).slice(0, optionCount - 1);

    return {
      subject: country,
      correctAnswer: country.name,
      options: shuffle([country.name, ...wrongOptions.map((c) => c.name)]),
    };
  });
}

/** Reverse: show country name → pick the correct shape from 4 */
function generateReverseShapeQuestions(
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
      correctAnswer: country.id,
      options: shuffle([country.id, ...wrongOptions.map((c) => c.id)]),
    };
  });
}

const countryById = new Map(countries.map((c) => [c.id, c]));

export function NameThatShape({ onAchievements }: { onAchievements?: (a: Achievement[]) => void }) {
  const { recordAnswer, completeQuiz, progress } = useProgress();
  const { updateChallengeFlags } = useAchievementChecker(progress, onAchievements);
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [reversed, setReversed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const geoDataRef = useRef<FeatureCollection | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const autoStarted = useRef(false);
  const lastRegion = useRef<Region | "All">("All");

  // Refs for config to avoid stale closure in startQuiz
  const reversedRef = useRef(false);
  const difficultyRef = useRef<Difficulty>("easy");

  useEffect(() => {
    preloadGeoJson();
  }, []);

  const config = useMemo(
    () => ({
      generateQuestions: (pool: Country[], count: number, optionCount: number) => {
        return reversedRef.current
          ? generateReverseShapeQuestions(pool, count, optionCount)
          : generateShapeQuestions(pool, count, optionCount);
      },
      checkAnswer:
        (input: string, q: QuizQuestion<Country>) => {
          if (!reversedRef.current && difficultyRef.current === "hard") {
            return fuzzyMatch(input, q.correctAnswer, q.subject.alternatives);
          }
          return input === q.correctAnswer;
        },
      onAnswer: (q: QuizQuestion<Country>, correct: boolean) => {
        recordAnswer(q.subject.id, "name-that-shape", correct);
      },
      onComplete: () => {
        completeQuiz();
        updateChallengeFlags({ modesPlayed: ["name-that-shape"] });
      },
    }),
    [recordAnswer, completeQuiz]
  );

  const quiz = useQuiz<Country>(config);
  const quizRef = useRef(quiz);
  quizRef.current = quiz;

  const handleStart = useCallback(
    async (region: Region | "All", diff: Difficulty, rev: boolean) => {
      // Update refs before starting quiz so config reads correct values
      reversedRef.current = rev;
      difficultyRef.current = diff;
      setDifficulty(diff);
      setReversed(rev);
      lastRegion.current = region;
      setLoading(true);

      const geo = await loadGeoJson();
      geoDataRef.current = geo;
      setGeoData(geo);

      const pool =
        region === "All" ? countries : countries.filter((c) => c.region === region);
      const count = Math.min(QUESTIONS_PER_ROUND, pool.length);
      const optionCount = diff === "easy" ? 4 : diff === "medium" ? 6 : 0;

      setLoading(false);
      quizRef.current.startQuiz(pool, count, optionCount);
    },
    []
  );

  // Auto-start from home page
  useEffect(() => {
    if (autoStarted.current) return;
    if (searchParams.get("autostart") === "1" && quiz.phase === "setup") {
      autoStarted.current = true;
      const rev = searchParams.get("reverse") === "1";
      setSearchParams({}, { replace: true });
      const saved = getSettings();
      const diff = saved.defaultDifficulty as Difficulty;
      handleStart(saved.defaultRegion, diff, rev);
    }
  }, [searchParams, quiz.phase, handleStart, setSearchParams]);

  const goHome = useCallback(() => navigate("/"), [navigate]);
  const replay = useCallback(() => {
    handleStart(lastRegion.current, difficulty, reversed);
  }, [handleStart, difficulty, reversed]);

  const getGeometry = (countryId: string): Geometry | null => {
    const data = geoData ?? geoDataRef.current;
    if (!data) return null;
    const feature = getCountryFeature(data, countryId);
    return feature?.geometry ?? null;
  };

  const q = quiz.currentQuestion;
  const isHardMode = !reversed && difficulty === "hard";

  // Rotation for hard mode
  const rotation = useMemo(() => {
    if (difficulty !== "hard" || reversed) return 0;
    return Math.floor(Math.random() * 360);
  }, [quiz.currentIndex, difficulty, reversed]);

  const renderStandardPrompt = () => {
    if (!q) return null;
    const geo = getGeometry(q.subject.id);
    if (!geo) return <p className="text-slate-400">Loading shape...</p>;

    return (
      <div className="flex flex-col items-center gap-3">
        <CountryOutline
          geometry={geo}
          width={360}
          height={270}
          fillColor="#0ea5e9"
          strokeColor="#1e293b"
          strokeWidth={1.5}
          rotation={difficulty === "hard" ? rotation : 0}
        />
        {difficulty === "easy" && (
          <img
            src={q.subject.flagSvgUrl}
            alt="Flag hint"
            className="h-10 w-auto object-contain rounded shadow border border-navy-lighter"
          />
        )}
      </div>
    );
  };

  const renderReversePrompt = () => {
    if (!q) return null;
    return (
      <div className="text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white">
          {q.subject.name}
        </h2>
        <p className="text-slate-400 mt-2 text-sm">
          Which outline belongs to this country?
        </p>
        {difficulty === "easy" && (
          <img
            src={q.subject.flagSvgUrl}
            alt="Flag hint"
            className="mt-4 h-10 w-auto object-contain rounded shadow border border-navy-lighter mx-auto"
            draggable={false}
          />
        )}
      </div>
    );
  };

  const renderReverseShapeOptions = () => {
    if (!q) return null;
    const answered = quiz.lastAnswerCorrect !== null;

    return (
      <div className="grid grid-cols-2 gap-3 max-w-xl mx-auto">
        {q.options.map((optionId) => {
          const geo = getGeometry(optionId);
          if (!geo) return null;

          let borderClass = "border-navy-lighter hover:border-sky/60";
          if (answered) {
            if (optionId === q.correctAnswer) {
              borderClass = "border-emerald bg-emerald/10";
            } else if (
              optionId === quiz.selectedAnswer &&
              !quiz.lastAnswerCorrect
            ) {
              borderClass = "border-rose bg-rose/10";
            } else {
              borderClass = "border-navy-lighter/50 opacity-40";
            }
          }

          return (
            <motion.button
              key={optionId}
              whileTap={!answered ? { scale: 0.97 } : undefined}
              onClick={() => !answered && quiz.submitAnswer(optionId)}
              disabled={answered}
              className={`p-3 rounded-xl border bg-navy-light transition-all flex items-center justify-center ${borderClass}`}
            >
              <CountryOutline
                geometry={geo}
                width={160}
                height={120}
                fillColor={
                  answered && optionId === q.correctAnswer
                    ? "#10b981"
                    : answered &&
                        optionId === quiz.selectedAnswer &&
                        !quiz.lastAnswerCorrect
                      ? "#f43f5e"
                      : "#0ea5e9"
                }
                strokeColor="#1e293b"
                strokeWidth={1}
              />
            </motion.button>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <AnimatePresence mode="wait">
        {quiz.phase === "setup" && (
          <div key="setup">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-8 h-8 border-3 border-sky border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-400">Loading shape data...</p>
              </div>
            ) : (
              <QuizSetup
                title="Name that Shape"
                description="Can you recognise countries by their outline? Test your geography skills!"
                onStart={handleStart}
                showReverse
                reverseLabel={["Shape \u2192 Name", "Name \u2192 Shape"]}
                difficulties={SHAPE_DIFFICULTIES}
                disableHardWhenReversed
              />
            )}
          </div>
        )}

        {quiz.phase === "playing" && q && (
          <div key="playing">
            {reversed ? (
              <motion.div
                key={`q-${quiz.currentIndex}`}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col max-w-2xl mx-auto"
                style={{ height: "calc(100vh - 3.5rem)" }}
              >
                <div className="px-4 pt-4 flex-shrink-0">
                  <ProgressBar
                    current={quiz.currentIndex + 1}
                    total={quiz.totalQuestions}
                    onQuit={goHome}
                  />
                </div>

                {/* Country name prompt */}
                <div className="px-4 py-3 flex-shrink-0">
                  {renderReversePrompt()}
                </div>

                {/* Spacer pushes options to bottom */}
                <div className="flex-1 min-h-0" />

                {/* Shape options pinned to bottom */}
                <div className="px-4 pb-4 flex-shrink-0">
                  {renderReverseShapeOptions()}

                  {/* Feedback */}
                  <AnimatePresence>
                    {quiz.lastAnswerCorrect !== null && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`mt-3 p-3 rounded-xl text-center font-semibold ${
                          quiz.lastAnswerCorrect
                            ? "bg-emerald/15 text-emerald"
                            : "bg-rose/15 text-rose"
                        }`}
                      >
                        {quiz.lastAnswerCorrect
                          ? "Correct!"
                          : `Wrong — it was ${countryById.get(q.correctAnswer)?.name ?? q.correctAnswer}`}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ) : (
              <div>
                <QuizQuestionView
                  key={`q-${quiz.currentIndex}`}
                  prompt={renderStandardPrompt()}
                  correctAnswer={q.correctAnswer}
                  options={q.options}
                  currentIndex={quiz.currentIndex}
                  totalQuestions={quiz.totalQuestions}
                  onAnswer={quiz.submitAnswer}
                  lastAnswerCorrect={quiz.lastAnswerCorrect}
                  selectedAnswer={quiz.selectedAnswer}
                  isHardMode={isHardMode}
                  inputPlaceholder="Type the country name..."
                  onQuit={goHome}
                />
              </div>
            )}
          </div>
        )}

        {quiz.phase === "results" && (
          <QuizResults
            key="results"
            results={quiz.results}
            score={quiz.score}
            totalQuestions={quiz.totalQuestions}
            elapsedMs={quiz.elapsedMs}
            onPlayAgain={replay}
            renderWrongItem={(r) => {
              const geo = getGeometry(
                reversed ? r.question.correctAnswer : r.question.subject.id
              );
              return (
                <div className="flex items-center gap-4 bg-navy-light border border-navy-lighter rounded-xl p-3">
                  {geo && (
                    <CountryOutline
                      geometry={geo}
                      width={64}
                      height={48}
                      fillColor="#0ea5e9"
                      strokeColor="#1e293b"
                      strokeWidth={0.5}
                    />
                  )}
                  <img
                    src={r.question.subject.flagSvgUrl}
                    alt={`Flag of ${r.question.subject.name}`}
                    className="w-12 h-8 object-contain rounded"
                  />
                  <div className="text-left flex-1">
                    <div className="text-emerald font-medium text-sm">
                      {r.question.subject.name}
                    </div>
                    <div className="text-rose text-xs">
                      Your answer:{" "}
                      {reversed
                        ? countryById.get(r.userAnswer)?.name ?? r.userAnswer
                        : r.userAnswer}
                    </div>
                  </div>
                </div>
              );
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
