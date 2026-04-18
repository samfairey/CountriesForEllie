import { useMemo, useCallback, useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import countriesData from "../data/countries.json";
import type { Country, Region } from "../types/country";
import type { QuizQuestion } from "../hooks/useQuiz";
import { useQuiz } from "../hooks/useQuiz";
import { useProgress } from "../hooks/useProgress";
import { useAchievementChecker } from "../hooks/useAchievementChecker";
import { fuzzyMatch } from "../utils/fuzzyMatch";
import { shuffle } from "../utils/shuffle";
import { filterByDifficulty } from "../utils/countryFilters";
import { getSettings } from "../hooks/useSettings";
import { QuizSetup, type Difficulty, type DifficultyOption } from "../components/quiz/QuizSetup";
import { QuizQuestionView } from "../components/quiz/QuizQuestion";
import { QuizResults } from "../components/quiz/QuizResults";
import type { Achievement } from "../data/achievements";

const countries = countriesData as Country[];
const ROUND_LENGTH: Record<Difficulty, number> = { easy: 10, medium: 10, hard: 20 };

const CAPITAL_DIFFICULTIES: DifficultyOption[] = [
  { value: "easy", label: "Easy", desc: "10 questions · Most populated countries" },
  { value: "medium", label: "Medium", desc: "10 questions · Least populated countries" },
  { value: "hard", label: "Hard", desc: "20 questions · All countries" },
];

/** Standard: show country name → pick capital */
function generateCapitalQuestions(
  pool: Country[],
  count: number,
  optionCount: number
): QuizQuestion<Country>[] {
  const questionCountries = shuffle(pool).slice(0, count);

  return questionCountries.map((country) => {
    if (optionCount === 0) {
      return { subject: country, correctAnswer: country.capital, options: [] };
    }

    const others = pool.filter((c) => c.id !== country.id);
    const wrongOptions = shuffle(others).slice(0, optionCount - 1);

    return {
      subject: country,
      correctAnswer: country.capital,
      options: shuffle([country.capital, ...wrongOptions.map((c) => c.capital)]),
    };
  });
}

/** Reverse: show capital → pick country name */
function generateReverseCapitalQuestions(
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

export function CapitalQuiz({ onAchievements }: { onAchievements?: (a: Achievement[]) => void }) {
  const { recordAnswer, completeQuiz, progress } = useProgress();
  const { updateChallengeFlags } = useAchievementChecker(progress, onAchievements);
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [reversed, setReversed] = useState(false);
  const [preloading, setPreloading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const autoStarted = useRef(false);
  const lastRegion = useRef<Region | "All">("All");

  const config = useMemo(
    () => ({
      generateQuestions: reversed
        ? generateReverseCapitalQuestions
        : generateCapitalQuestions,
      checkAnswer:
        difficulty === "hard"
          ? (input: string, q: QuizQuestion<Country>) => {
              if (reversed) {
                return fuzzyMatch(input, q.correctAnswer, q.subject.alternatives);
              }
              return fuzzyMatch(
                input,
                q.correctAnswer,
                q.subject.capitalAlternatives
              );
            }
          : undefined,
      onAnswer: (q: QuizQuestion<Country>, correct: boolean) => {
        recordAnswer(q.subject.id, "capital-quiz", correct);
      },
      onComplete: () => {
        completeQuiz();
        updateChallengeFlags({ modesPlayed: ["capital-quiz"] });
      },
    }),
    [difficulty, reversed, recordAnswer, completeQuiz]
  );

  const quiz = useQuiz<Country>(config);
  const quizRef = useRef(quiz);
  quizRef.current = quiz;

  const handleStart = useCallback(
    (region: Region | "All", diff: Difficulty, rev: boolean) => {
      setDifficulty(diff);
      setReversed(rev);
      lastRegion.current = region;
      const regionPool =
        region === "All" ? countries : countries.filter((c) => c.region === region);
      // Population-based difficulty tier: Easy = top 50% per region, Medium = bottom 50%, Hard = all
      const pool = filterByDifficulty(regionPool, diff);
      const count = Math.min(ROUND_LENGTH[diff], pool.length);
      const optionCount = diff === "easy" ? 4 : diff === "medium" ? 6 : 0;

      // Preload flag images (used as hints on easy)
      setPreloading(true);
      const preloadPool = shuffle(pool).slice(0, count);
      const preloadPromises = preloadPool.map(
        (c) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = c.flagSvgUrl;
          })
      );

      Promise.all(preloadPromises).then(() => {
        setPreloading(false);
        quizRef.current.startQuiz(pool, count, optionCount);
      });
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

  const renderPrompt = (q: QuizQuestion<Country>) => {
    const showFlag = difficulty === "easy";

    if (reversed) {
      // Show capital → pick country
      return (
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            {q.subject.capital}
          </h2>
          <p className="text-slate-400 mt-2 text-sm">
            Which country has this capital?
          </p>
          {showFlag && (
            <img
              src={q.subject.flagSvgUrl}
              alt="Hint flag"
              className="mt-4 h-12 w-auto object-contain rounded shadow-md border border-navy-lighter mx-auto"
              draggable={false}
            />
          )}
        </div>
      );
    }
    // Standard: show country name → pick capital
    return (
      <div className="text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white">
          {q.subject.name}
        </h2>
        <p className="text-slate-400 mt-2 text-sm">
          What is the capital of this country?
        </p>
        {showFlag && (
          <img
            src={q.subject.flagSvgUrl}
            alt={`Flag of ${q.subject.name}`}
            className="mt-4 h-12 w-auto object-contain rounded shadow-md border border-navy-lighter mx-auto"
            draggable={false}
          />
        )}
      </div>
    );
  };

  return (
    <div>
      <AnimatePresence mode="wait">
        {quiz.phase === "setup" && (
          <div key="setup">
            {preloading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-8 h-8 border-3 border-sky border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-400">Loading...</p>
              </div>
            ) : (
              <QuizSetup
                title="Capital Quiz"
                description="Test your knowledge of world capitals. Choose a region and difficulty to begin."
                onStart={handleStart}
                showReverse
                reverseLabel={["Country \u2192 Capital", "Capital \u2192 Country"]}
                difficulties={CAPITAL_DIFFICULTIES}
              />
            )}
          </div>
        )}

        {quiz.phase === "playing" && quiz.currentQuestion && (
          <QuizQuestionView
            key={`q-${quiz.currentIndex}`}
            prompt={renderPrompt(quiz.currentQuestion)}
            correctAnswer={quiz.currentQuestion.correctAnswer}
            options={quiz.currentQuestion.options}
            currentIndex={quiz.currentIndex}
            totalQuestions={quiz.totalQuestions}
            onAnswer={quiz.submitAnswer}
            lastAnswerCorrect={quiz.lastAnswerCorrect}
            selectedAnswer={quiz.selectedAnswer}
            isHardMode={difficulty === "hard"}
            inputPlaceholder={
              reversed
                ? "Type the country name..."
                : "Type the capital city..."
            }
            onQuit={goHome}
          />
        )}

        {quiz.phase === "results" && (
          <QuizResults
            key="results"
            results={quiz.results}
            score={quiz.score}
            totalQuestions={quiz.totalQuestions}
            elapsedMs={quiz.elapsedMs}
            onPlayAgain={replay}
            renderWrongItem={(r) => (
              <div className="flex items-center gap-4 bg-navy-light border border-navy-lighter rounded-xl p-3">
                <img
                  src={r.question.subject.flagSvgUrl}
                  alt={`Flag of ${r.question.subject.name}`}
                  className="w-16 h-10 object-contain rounded"
                />
                <div className="text-left flex-1">
                  <div className="text-white text-sm font-medium">
                    {r.question.subject.name}
                  </div>
                  <div className="text-emerald font-medium text-sm">
                    {reversed
                      ? r.question.subject.name
                      : r.question.subject.capital}
                  </div>
                  <div className="text-rose text-xs">
                    Your answer: {r.userAnswer}
                  </div>
                </div>
              </div>
            )}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
