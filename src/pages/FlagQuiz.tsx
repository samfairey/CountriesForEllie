import { useMemo, useCallback, useState } from "react";
import { AnimatePresence } from "framer-motion";
import countriesData from "../data/countries.json";
import type { Country, Region } from "../types/country";
import type { QuizQuestion } from "../hooks/useQuiz";
import { useQuiz } from "../hooks/useQuiz";
import { useProgress } from "../hooks/useProgress";
import { fuzzyMatch } from "../utils/fuzzyMatch";
import { shuffle } from "../utils/shuffle";
import { QuizSetup, type Difficulty } from "../components/quiz/QuizSetup";
import { QuizQuestionView } from "../components/quiz/QuizQuestion";
import { QuizResults } from "../components/quiz/QuizResults";

const countries = countriesData as Country[];
const QUESTIONS_PER_ROUND = 20;

function generateFlagQuestions(
  pool: Country[],
  count: number,
  optionCount: number
): QuizQuestion<Country>[] {
  const questionCountries = shuffle(pool).slice(0, count);
  const usedAsWrong = new Set<string>();

  return questionCountries.map((country) => {
    if (optionCount === 0) {
      return { subject: country, correctAnswer: country.name, options: [] };
    }

    const sameRegion = pool.filter(
      (c) => c.id !== country.id && c.region === country.region && !usedAsWrong.has(c.id)
    );
    const otherRegion = pool.filter(
      (c) => c.id !== country.id && c.region !== country.region && !usedAsWrong.has(c.id)
    );
    const wrongPool = shuffle([...sameRegion, ...otherRegion]);
    const wrongOptions = wrongPool.slice(0, optionCount - 1);
    wrongOptions.forEach((c) => usedAsWrong.add(c.id));

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
  const usedAsWrong = new Set<string>();

  return questionCountries.map((country) => {
    if (optionCount === 0) {
      // Hard mode: show country name, user describes the flag — not practical.
      // In reverse hard mode, we still show the country name and user can't type a flag.
      // So reverse hard = show country name, pick the correct flag from... not feasible for text.
      // We'll keep it as: show country name, no options (but this mode doesn't make sense for flags).
      // Fallback: just do standard hard mode for flags.
      return { subject: country, correctAnswer: country.name, options: [] };
    }

    // Reverse: show country name → pick the correct flag
    // Options are country IDs (we'll render them as flags in the prompt)
    const sameRegion = pool.filter(
      (c) => c.id !== country.id && c.region === country.region && !usedAsWrong.has(c.id)
    );
    const otherRegion = pool.filter(
      (c) => c.id !== country.id && c.region !== country.region && !usedAsWrong.has(c.id)
    );
    const wrongPool = shuffle([...sameRegion, ...otherRegion]);
    const wrongOptions = wrongPool.slice(0, optionCount - 1);
    wrongOptions.forEach((c) => usedAsWrong.add(c.id));

    return {
      subject: country,
      correctAnswer: country.id,
      options: shuffle([country.id, ...wrongOptions.map((c) => c.id)]),
    };
  });
}

// Lookup map for reverse mode flag rendering
const countryById = new Map(countries.map((c) => [c.id, c]));

export function FlagQuiz() {
  const { recordAnswer, completeQuiz } = useProgress();
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
      },
    }),
    [difficulty, reversed, recordAnswer, completeQuiz]
  );

  const quiz = useQuiz<Country>(config);

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
        quiz.startQuiz(pool, count, optionCount);
      });
    },
    [quiz]
  );

  const renderPrompt = (q: QuizQuestion<Country>) => {
    if (reversed) {
      // Show country name, user picks the flag
      return (
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            {q.subject.name}
          </h2>
          <p className="text-slate-400 mt-2 text-sm">Which flag belongs to this country?</p>
        </div>
      );
    }
    // Standard: show flag, user picks country name
    return (
      <img
        src={q.subject.flagSvgUrl}
        alt="Flag — guess the country"
        className="max-h-48 sm:max-h-64 w-auto object-contain rounded-lg shadow-lg"
        draggable={false}
      />
    );
  };

  const renderOptionLabel = reversed
    ? (optionId: string) => {
        const c = countryById.get(optionId);
        return c ? (
          <img
            src={c.flagSvgUrl}
            alt="Flag option"
            className="h-10 sm:h-12 w-auto object-contain rounded"
          />
        ) : (
          optionId
        );
      }
    : undefined;

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
              />
            )}
          </div>
        )}

        {quiz.phase === "playing" && quiz.currentQuestion && (
          <QuizQuestionView
            key={`q-${quiz.currentIndex}`}
            prompt={renderPrompt(quiz.currentQuestion)}
            correctAnswer={
              reversed
                ? quiz.currentQuestion.subject.name
                : quiz.currentQuestion.correctAnswer
            }
            options={quiz.currentQuestion.options}
            currentIndex={quiz.currentIndex}
            totalQuestions={quiz.totalQuestions}
            onAnswer={quiz.submitAnswer}
            lastAnswerCorrect={quiz.lastAnswerCorrect}
            selectedAnswer={quiz.selectedAnswer}
            isHardMode={!reversed && difficulty === "hard"}
            inputPlaceholder="Type the country name..."
            renderOptionLabel={renderOptionLabel}
          />
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
