import { useMemo, useCallback, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import countriesData from "../data/countries.json";
import type { Country, Region } from "../types/country";
import type { QuizQuestion } from "../hooks/useQuiz";
import { useQuiz } from "../hooks/useQuiz";
import { useProgress } from "../hooks/useProgress";
import { useAchievementChecker } from "../hooks/useAchievementChecker";
import { fuzzyMatch } from "../utils/fuzzyMatch";
import { shuffle } from "../utils/shuffle";
import { QuizSetup, type Difficulty } from "../components/quiz/QuizSetup";
import { QuizQuestionView } from "../components/quiz/QuizQuestion";
import { QuizResults } from "../components/quiz/QuizResults";
import { ProgressBar } from "../components/common/ProgressBar";
import type { Achievement } from "../data/achievements";

const countries = countriesData as Country[];
const QUESTIONS_PER_ROUND = 20;

function generateFlagQuestions(
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

function generateReverseFlagQuestions(
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
      correctAnswer: country.id,
      options: shuffle([country.id, ...wrongOptions.map((c) => c.id)]),
    };
  });
}

const countryById = new Map(countries.map((c) => [c.id, c]));

export function FlagQuiz({ onAchievements }: { onAchievements?: (a: Achievement[]) => void }) {
  const { recordAnswer, completeQuiz, progress } = useProgress();
  const { updateChallengeFlags } = useAchievementChecker(progress, onAchievements);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [reversed, setReversed] = useState(false);
  const [preloading, setPreloading] = useState(false);

  const config = useMemo(
    () => ({
      generateQuestions: reversed ? generateReverseFlagQuestions : generateFlagQuestions,
      checkAnswer:
        !reversed && difficulty === "hard"
          ? (input: string, q: QuizQuestion<Country>) =>
              fuzzyMatch(input, q.correctAnswer, q.subject.alternatives)
          : undefined,
      onAnswer: (q: QuizQuestion<Country>, correct: boolean) => {
        recordAnswer(q.subject.id, "flag-quiz", correct);
      },
      onComplete: () => {
        completeQuiz();
        updateChallengeFlags({ modesPlayed: ["flag-quiz"] });
      },
    }),
    [difficulty, reversed, recordAnswer, completeQuiz, updateChallengeFlags]
  );

  const quiz = useQuiz<Country>(config);
  const quizRef = useRef(quiz);
  quizRef.current = quiz;

  // Track challenge flags when quiz completes
  const handleComplete = quiz.phase === "results";
  useMemo(() => {
    if (handleComplete && quiz.totalQuestions >= 20) {
      if (quiz.score === quiz.totalQuestions) {
        updateChallengeFlags({ hasPerfectQuiz: true });
      }
      const pct = (quiz.score / quiz.totalQuestions) * 100;
      if (difficulty === "hard" && pct > 80) {
        updateChallengeFlags({ hasHardMode80: true });
      }
      if (reversed && pct > 80) {
        updateChallengeFlags({ hasReverse80: true });
      }
    }
  }, [handleComplete]);

  const handleStart = useCallback(
    (region: Region | "All", diff: Difficulty, rev: boolean) => {
      setDifficulty(diff);
      setReversed(rev);
      const pool =
        region === "All" ? countries : countries.filter((c) => c.region === region);
      const count = Math.min(QUESTIONS_PER_ROUND, pool.length);
      const optionCount = diff === "easy" ? 4 : diff === "medium" ? 6 : 0;

      setPreloading(true);
      const preloadPool = shuffle(pool).slice(0, Math.min(count * 2, pool.length));
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

  const renderPrompt = (q: QuizQuestion<Country>) => {
    if (reversed) {
      return (
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            {q.subject.name}
          </h2>
          <p className="text-slate-400 mt-2 text-sm">Which flag belongs to this country?</p>
        </div>
      );
    }
    return (
      <img
        src={q.subject.flagSvgUrl}
        alt="Flag — guess the country"
        className="max-h-48 sm:max-h-64 w-auto object-contain rounded-lg shadow-lg"
        draggable={false}
      />
    );
  };

  const renderReverseFlagOptions = () => {
    const q = quiz.currentQuestion;
    if (!q) return null;
    const answered = quiz.lastAnswerCorrect !== null;

    return (
      <div className="grid grid-cols-2 gap-3 max-w-xl mx-auto mt-6">
        {q.options.map((optionId) => {
          const c = countryById.get(optionId);
          if (!c) return null;

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
              <img
                src={c.flagSvgUrl}
                alt="Flag option"
                className="h-16 sm:h-20 w-auto object-contain rounded shadow-sm"
                draggable={false}
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
            {preloading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-8 h-8 border-3 border-sky border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-400">Loading flags...</p>
              </div>
            ) : (
              <QuizSetup
                title="Flag Quiz"
                description="How well do you know your flags? Choose a region and difficulty to begin."
                onStart={handleStart}
                showReverse
                reverseLabel={["Flag → Country", "Country → Flag"]}
                disableHardWhenReversed
              />
            )}
          </div>
        )}

        {quiz.phase === "playing" && quiz.currentQuestion && (
          reversed ? (
            <motion.div
              key={`q-${quiz.currentIndex}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="max-w-2xl mx-auto"
            >
              <ProgressBar
                current={quiz.currentIndex + 1}
                total={quiz.totalQuestions}
              />
              <div className="mt-6 rounded-2xl bg-navy-light border border-navy-lighter p-6 flex flex-col items-center">
                {renderPrompt(quiz.currentQuestion)}
              </div>
              {renderReverseFlagOptions()}

              <AnimatePresence>
                {quiz.lastAnswerCorrect !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`mt-4 p-3 rounded-xl text-center font-semibold ${
                      quiz.lastAnswerCorrect
                        ? "bg-emerald/15 text-emerald"
                        : "bg-rose/15 text-rose"
                    }`}
                  >
                    {quiz.lastAnswerCorrect
                      ? "Correct!"
                      : `Wrong — it was ${quiz.currentQuestion.subject.name}`}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
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
              inputPlaceholder="Type the country name..."
            />
          )
        )}

        {quiz.phase === "results" && (
          <QuizResults
            key="results"
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
                  <div className="text-rose text-xs">
                    Your answer:{" "}
                    {reversed
                      ? countryById.get(r.userAnswer)?.name ?? r.userAnswer
                      : r.userAnswer}
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
