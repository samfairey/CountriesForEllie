import { useState, useCallback, useRef, useEffect } from "react";
import { playCorrect, playWrong } from "../utils/sounds";
import { hapticCorrect, hapticWrong } from "../utils/haptics";

export type QuizPhase = "setup" | "playing" | "results";

export interface QuizQuestion<T> {
  /** The item being quizzed on (e.g., a Country) */
  subject: T;
  /** The correct answer string */
  correctAnswer: string;
  /** Multiple choice options (empty array for typed input mode) */
  options: string[];
}

export interface QuizResult<T> {
  question: QuizQuestion<T>;
  userAnswer: string;
  correct: boolean;
}

export interface QuizConfig<T> {
  /** Generate questions from a pool of items */
  generateQuestions: (items: T[], count: number, optionCount: number) => QuizQuestion<T>[];
  /** Check if typed answer is correct (for hard mode) */
  checkAnswer?: (input: string, question: QuizQuestion<T>) => boolean;
  /** Called for each answered question */
  onAnswer?: (question: QuizQuestion<T>, correct: boolean) => void;
  /** Called when the quiz is complete */
  onComplete?: () => void;
}

export function useQuiz<T>(config: QuizConfig<T>) {
  const [phase, setPhase] = useState<QuizPhase>("setup");
  const [questions, setQuestions] = useState<QuizQuestion<T>[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<QuizResult<T>[]>([]);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const startTimeRef = useRef<number>(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const currentQuestion = questions[currentIndex] ?? null;
  const totalQuestions = questions.length;
  const score = results.filter((r) => r.correct).length;

  // Timer
  useEffect(() => {
    if (phase === "playing") {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const startQuiz = useCallback(
    (items: T[], questionCount: number, optionCount: number) => {
      const generated = config.generateQuestions(items, questionCount, optionCount);
      setQuestions(generated);
      setCurrentIndex(0);
      setResults([]);
      setLastAnswerCorrect(null);
      setSelectedAnswer(null);
      setElapsedMs(0);
      setPhase("playing");
    },
    [config]
  );

  const submitAnswer = useCallback(
    (answer: string) => {
      if (!currentQuestion || lastAnswerCorrect !== null) return;

      let correct: boolean;
      if (config.checkAnswer) {
        correct = config.checkAnswer(answer, currentQuestion);
      } else {
        correct = answer === currentQuestion.correctAnswer;
      }

      if (correct) { playCorrect(); hapticCorrect(); }
      else { playWrong(); hapticWrong(); }
      setLastAnswerCorrect(correct);
      setSelectedAnswer(answer);

      const result: QuizResult<T> = {
        question: currentQuestion,
        userAnswer: answer,
        correct,
      };
      const newResults = [...results, result];
      setResults(newResults);
      config.onAnswer?.(currentQuestion, correct);

      const delay = correct ? 600 : 1200;
      setTimeout(() => {
        if (currentIndex + 1 >= totalQuestions) {
          if (timerRef.current) clearInterval(timerRef.current);
          setElapsedMs(Date.now() - startTimeRef.current);
          setPhase("results");
          config.onComplete?.();
        } else {
          setCurrentIndex((i) => i + 1);
          setLastAnswerCorrect(null);
          setSelectedAnswer(null);
        }
      }, delay);
    },
    [currentQuestion, lastAnswerCorrect, results, currentIndex, totalQuestions, config]
  );

  const reset = useCallback(() => {
    setPhase("setup");
    setQuestions([]);
    setCurrentIndex(0);
    setResults([]);
    setLastAnswerCorrect(null);
    setSelectedAnswer(null);
    setElapsedMs(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  return {
    phase,
    currentQuestion,
    currentIndex,
    totalQuestions,
    score,
    results,
    lastAnswerCorrect,
    selectedAnswer,
    elapsedMs,
    startQuiz,
    submitAnswer,
    reset,
  };
}
