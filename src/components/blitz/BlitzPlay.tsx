import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Country } from "../../types/country";
import type { BlitzQuestion, BlitzResult, BlitzQuestionType } from "../../types/blitz";
import type { FeatureCollection, Geometry } from "geojson";
import { getCountryFeature } from "../../utils/geoData";
import { CountryOutline } from "../quiz/CountryOutline";
import { WorldMap } from "../map/WorldMap";
import { playCorrect, playWrong, playStreak, playTick, playTimesUp } from "../../utils/sounds";
import { hapticCorrect, hapticWrong, hapticStreak } from "../../utils/haptics";
import { fuzzyMatch } from "../../utils/fuzzyMatch";

interface BlitzPlayProps {
  generator: { next: () => BlitzQuestion };
  timeLimit: number;
  countryById: Map<string, Country>;
  geoData: FeatureCollection | null;
  onFinish: (results: BlitzResult[], score: number, streak: number) => void;
}

/** Scoring: base 100, streak multiplier, speed bonus */
function calcPoints(streak: number, responseTimeMs: number): number {
  const base = 100;
  const streakMultiplier = Math.min(streak, 10); // cap at 10x
  const speedBonus = responseTimeMs < 3000 ? 50 : 0;
  return base * streakMultiplier + speedBonus;
}

export function BlitzPlay({
  generator,
  timeLimit,
  countryById,
  geoData,
  onFinish,
}: BlitzPlayProps) {
  const [question, setQuestion] = useState<BlitzQuestion>(() => generator.next());
  const [results, setResults] = useState<BlitzResult[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [answered, setAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [floatingPoints, setFloatingPoints] = useState<{ id: number; pts: number } | null>(null);
  const [streakMilestone, setStreakMilestone] = useState<number | null>(null);
  const [typedAnswer, setTypedAnswer] = useState("");

  const questionStartRef = useRef(Date.now());
  const floatingIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const finishedRef = useRef(false);

  // Map feedback state for pinMap questions
  const [mapCorrectId, setMapCorrectId] = useState<string | null>(null);
  const [mapWrongId, setMapWrongId] = useState<string | null>(null);

  // Timer countdown
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 0.1;
        if (next <= 10 && next > 9.9 && Math.floor(next) === 10) playTick();
        if (next <= 5 && Math.abs(next - Math.round(next)) < 0.05) playTick();
        if (next <= 0) {
          clearInterval(timerRef.current);
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(timerRef.current);
  }, []);

  // Time's up
  useEffect(() => {
    if (timeLeft <= 0 && !finishedRef.current) {
      finishedRef.current = true;
      playTimesUp();
      // Small delay so the UI shows 0 before transitioning
      setTimeout(() => {
        onFinish(results, score, bestStreak);
      }, 800);
    }
  }, [timeLeft, results, score, bestStreak, onFinish]);

  const getGeometry = useCallback(
    (countryId: string): Geometry | null => {
      if (!geoData) return null;
      const feature = getCountryFeature(geoData, countryId);
      return feature?.geometry ?? null;
    },
    [geoData]
  );

  const advanceQuestion = useCallback(() => {
    const next = generator.next();
    setQuestion(next);
    setAnswered(false);
    setLastCorrect(null);
    setSelectedAnswer(null);
    setTypedAnswer("");
    setMapCorrectId(null);
    setMapWrongId(null);
    questionStartRef.current = Date.now();
  }, [generator]);

  const handleAnswer = useCallback(
    (answer: string) => {
      if (answered || timeLeft <= 0) return;

      const responseTimeMs = Date.now() - questionStartRef.current;
      setAnswered(true);
      setSelectedAnswer(answer);

      // Check correctness
      let correct = answer === question.correctAnswer;

      // For typed input, use fuzzy matching
      if (question.options.length === 0 && question.type !== "pinMap") {
        const country = countryById.get(question.countryId);
        const alts = question.type === "capital"
          ? country?.capitalAlternatives ?? []
          : country?.alternatives ?? [];
        correct = fuzzyMatch(answer, question.correctAnswer, alts);
      }

      const newStreak = correct ? streak + 1 : 0;
      const pts = correct ? calcPoints(newStreak, responseTimeMs) : 0;

      setLastCorrect(correct);
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);

      if (correct) {
        setScore((s) => s + pts);
        playCorrect();
        hapticCorrect();

        // Floating points animation
        floatingIdRef.current++;
        setFloatingPoints({ id: floatingIdRef.current, pts });

        // Streak milestones
        if ([5, 10, 15, 20, 25, 30].includes(newStreak)) {
          playStreak();
          hapticStreak();
          setStreakMilestone(newStreak);
          setTimeout(() => setStreakMilestone(null), 1200);
        }

        // Advance quickly on correct
        setTimeout(advanceQuestion, 200);
      } else {
        playWrong();
        hapticWrong();
        // Show correct answer briefly, then advance
        setTimeout(advanceQuestion, 600);
      }

      // Map feedback for pinMap
      if (question.type === "pinMap" && !question.reversed) {
        if (correct) {
          setMapCorrectId(answer);
        } else {
          setMapWrongId(answer);
          setMapCorrectId(question.correctAnswer);
        }
      }

      const result: BlitzResult = {
        question,
        userAnswer: answer,
        correct,
        responseTimeMs,
        pointsEarned: pts,
      };
      setResults((prev) => [...prev, result]);
    },
    [answered, timeLeft, question, streak, bestStreak, countryById, advanceQuestion]
  );

  // Keyboard shortcuts for MC options
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (answered || question.options.length === 0) return;
      const num = parseInt(e.key);
      if (num >= 1 && num <= question.options.length) {
        handleAnswer(question.options[num - 1]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [answered, question.options, handleAnswer]);

  const handleTypedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typedAnswer.trim() && !answered) {
      handleAnswer(typedAnswer.trim());
    }
  };

  // Timer bar calculations
  const timeFraction = timeLeft / timeLimit;
  const timerColor =
    timeFraction > 0.5 ? "bg-emerald" : timeFraction > 0.25 ? "bg-amber-500" : "bg-rose";
  const timerPulse = timeFraction <= 0.25 ? "animate-pulse" : "";

  // Question prompt rendering
  const renderPrompt = useMemo(() => {
    const q = question;
    switch (q.type) {
      case "flag":
        if (q.reversed) {
          // Show country name, pick flag
          return (
            <div className="text-center">
              <p className="text-slate-400 text-xs mb-1">Which flag?</p>
              <h2 className="text-2xl font-bold text-white">{q.countryName}</h2>
            </div>
          );
        }
        // Show flag, pick country
        return (
          <img
            src={q.flagUrl}
            alt="Flag"
            className="max-h-32 w-auto object-contain rounded-lg shadow-lg"
            draggable={false}
          />
        );

      case "capital":
        if (q.reversed) {
          // Show capital, pick country
          return (
            <div className="text-center">
              <p className="text-slate-400 text-xs mb-1">Which country?</p>
              <h2 className="text-2xl font-bold text-white">{q.capital}</h2>
            </div>
          );
        }
        // Show country (+ small flag), pick capital
        return (
          <div className="flex items-center gap-3">
            <img
              src={q.flagUrl}
              alt=""
              className="h-8 w-auto object-contain rounded"
            />
            <div>
              <p className="text-slate-400 text-xs">Capital of...</p>
              <h2 className="text-2xl font-bold text-white">{q.countryName}</h2>
            </div>
          </div>
        );

      case "pinMap":
        if (q.reversed) {
          return (
            <p className="text-slate-400 text-sm">
              Which country is <span className="text-white font-semibold">highlighted</span>?
            </p>
          );
        }
        return (
          <div className="flex items-center gap-3">
            <img src={q.flagUrl} alt="" className="h-6 w-auto rounded" />
            <h2 className="text-xl font-bold text-white">{q.countryName}</h2>
            <span className="text-slate-400 text-xs ml-auto">Click on map</span>
          </div>
        );

      case "nameShape": {
        if (q.reversed) {
          // Show name, pick correct shape
          return (
            <div className="text-center">
              <p className="text-slate-400 text-xs mb-1">Which outline?</p>
              <h2 className="text-2xl font-bold text-white">{q.countryName}</h2>
            </div>
          );
        }
        // Show shape, pick name
        const geo = getGeometry(q.shapeId ?? q.countryId);
        if (!geo) return <p className="text-slate-400">Loading...</p>;
        return (
          <CountryOutline
            geometry={geo}
            width={200}
            height={150}
            fillColor="#0ea5e9"
            strokeColor="#1e293b"
            strokeWidth={1.5}
            rotation={q.rotation ?? 0}
          />
        );
      }
    }
  }, [question, getGeometry]);

  // Options rendering
  const renderOptions = () => {
    const q = question;

    // pinMap non-reversed: use the map
    if (q.type === "pinMap" && !q.reversed) {
      return (
        <div className="relative" style={{ height: 280 }}>
          <WorldMap
            interactive
            highlightedCountries={[]}
            selectedCountry={null}
            correctCountry={mapCorrectId}
            wrongCountry={mapWrongId}
            onCountryClick={(id) => handleAnswer(id)}
            zoomToCountry={null}
            showBorders
            className="absolute inset-0 rounded-xl overflow-hidden"
          />
        </div>
      );
    }

    // pinMap reversed: highlight on map + MC below
    if (q.type === "pinMap" && q.reversed) {
      return (
        <div>
          <div className="relative mb-3" style={{ height: 200 }}>
            <WorldMap
              interactive={false}
              highlightedCountries={[q.countryId]}
              selectedCountry={null}
              correctCountry={null}
              wrongCountry={null}
              onCountryClick={() => {}}
              zoomToCountry={q.countryId}
              showBorders
              className="absolute inset-0 rounded-xl overflow-hidden"
            />
          </div>
          {renderMcOptions()}
        </div>
      );
    }

    // nameShape reversed: shape grid options
    if (q.type === "nameShape" && q.reversed) {
      return (
        <div className="grid grid-cols-2 gap-2">
          {q.options.map((optionId) => {
            const geo = getGeometry(optionId);
            if (!geo) return null;

            let borderClass = "border-navy-lighter hover:border-sky/60";
            if (answered) {
              if (optionId === q.correctAnswer) {
                borderClass = "border-emerald bg-emerald/10";
              } else if (optionId === selectedAnswer && !lastCorrect) {
                borderClass = "border-rose bg-rose/10";
              } else {
                borderClass = "border-navy-lighter/50 opacity-40";
              }
            }

            return (
              <button
                key={optionId}
                onClick={() => !answered && handleAnswer(optionId)}
                disabled={answered}
                className={`p-2 rounded-xl border bg-navy-light transition-all flex items-center justify-center ${borderClass}`}
              >
                <CountryOutline
                  geometry={geo}
                  width={100}
                  height={75}
                  fillColor={
                    answered && optionId === q.correctAnswer
                      ? "#10b981"
                      : answered && optionId === selectedAnswer && !lastCorrect
                        ? "#f43f5e"
                        : "#0ea5e9"
                  }
                  strokeColor="#1e293b"
                  strokeWidth={1}
                />
              </button>
            );
          })}
        </div>
      );
    }

    // flag reversed: flag image grid
    if (q.type === "flag" && q.reversed) {
      return (
        <div className="grid grid-cols-2 gap-2">
          {q.options.map((optionId) => {
            const c = countryById.get(optionId);
            if (!c) return null;

            let borderClass = "border-navy-lighter hover:border-sky/60";
            if (answered) {
              if (optionId === q.correctAnswer) {
                borderClass = "border-emerald bg-emerald/10";
              } else if (optionId === selectedAnswer && !lastCorrect) {
                borderClass = "border-rose bg-rose/10";
              } else {
                borderClass = "border-navy-lighter/50 opacity-40";
              }
            }

            return (
              <button
                key={optionId}
                onClick={() => !answered && handleAnswer(optionId)}
                disabled={answered}
                className={`p-2 rounded-xl border bg-navy-light transition-all flex items-center justify-center ${borderClass}`}
              >
                <img
                  src={c.flagSvgUrl}
                  alt="Flag option"
                  className="h-12 w-auto object-contain rounded"
                />
              </button>
            );
          })}
        </div>
      );
    }

    // Typed input (expert mode, empty options)
    if (q.options.length === 0) {
      return (
        <form onSubmit={handleTypedSubmit} className="flex gap-2">
          <input
            type="text"
            value={typedAnswer}
            onChange={(e) => setTypedAnswer(e.target.value)}
            placeholder="Type your answer..."
            disabled={answered}
            autoFocus
            className="flex-1 px-3 py-2.5 bg-navy-light border border-navy-lighter rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky transition-colors text-sm disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!typedAnswer.trim() || answered}
            className="px-4 py-2.5 bg-sky hover:bg-sky/80 disabled:bg-navy-lighter disabled:text-slate-500 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            Go
          </button>
        </form>
      );
    }

    // Standard MC options
    return renderMcOptions();
  };

  const renderMcOptions = () => {
    const q = question;
    return (
      <div className="grid grid-cols-2 gap-2">
        {q.options.map((option, i) => {
          let btnClass =
            "bg-navy-light border-navy-lighter text-slate-200 hover:border-sky/60";

          if (answered) {
            if (option === q.correctAnswer) {
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
              onClick={() => !answered && handleAnswer(option)}
              disabled={answered}
              className={`p-2.5 rounded-xl border text-left text-sm transition-all ${btnClass}`}
            >
              <span className="text-xs text-slate-500 mr-1.5">{i + 1}</span>
              {option}
            </button>
          );
        })}
      </div>
    );
  };

  // Mode icon for the question type badge
  const modeIcon: Record<BlitzQuestionType, string> = {
    flag: "🏴",
    capital: "🏛️",
    pinMap: "📍",
    nameShape: "🗺️",
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Timer bar */}
      <div className="mb-4">
        <div className="h-2 bg-navy-lighter rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${timerColor} ${timerPulse} rounded-full`}
            style={{ width: `${timeFraction * 100}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-slate-400">
          <span>{Math.ceil(timeLeft)}s</span>
          <span className="text-slate-500">{modeIcon[question.type]} {question.type}</span>
        </div>
      </div>

      {/* Score + Streak header */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <AnimatePresence>
            {lastCorrect && (
              <motion.div
                key="score-bump"
                initial={{ scale: 1.4, opacity: 1 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
              />
            )}
          </AnimatePresence>
          <motion.div
            key={score}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.15, type: "spring" }}
            className="text-3xl font-bold text-white"
          >
            {score.toLocaleString()}
          </motion.div>
          <span className="text-xs text-slate-400">points</span>

          {/* Floating points */}
          <AnimatePresence>
            {floatingPoints && (
              <motion.div
                key={floatingPoints.id}
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -40 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                onAnimationComplete={() => setFloatingPoints(null)}
                className="absolute -top-2 left-full ml-2 text-emerald font-bold text-sm whitespace-nowrap"
              >
                +{floatingPoints.pts}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Streak */}
        <div className="text-right">
          {streak > 0 && (
            <motion.div
              key={streak}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="text-gold font-bold text-lg"
            >
              🔥 {streak}
            </motion.div>
          )}
          <span className="text-xs text-slate-500">
            Q{results.length + (answered ? 0 : 1)}
          </span>
        </div>
      </div>

      {/* Streak milestone flash */}
      <AnimatePresence>
        {streakMilestone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="mb-3 text-center py-2 bg-gold/15 border border-gold/30 rounded-xl"
          >
            <span className="text-gold font-bold">
              🔥 {streakMilestone} streak!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Answer flash feedback */}
      <AnimatePresence>
        {lastCorrect !== null && (
          <motion.div
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            transition={{ duration: lastCorrect ? 0.2 : 0.5 }}
            className={`absolute inset-0 pointer-events-none z-10 rounded-xl ${
              lastCorrect ? "bg-emerald/10" : "bg-rose/10"
            }`}
          />
        )}
      </AnimatePresence>

      {/* Question card */}
      <div className="relative">
        <motion.div
          key={`q-${results.length}-${question.countryId}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.15 }}
          className={`rounded-2xl bg-navy-light border p-4 mb-3 flex items-center justify-center min-h-[120px] ${
            lastCorrect === true
              ? "border-emerald/50"
              : lastCorrect === false
                ? "border-rose/50"
                : "border-navy-lighter"
          }`}
        >
          {renderPrompt}
        </motion.div>

        {/* Wrong answer correction */}
        <AnimatePresence>
          {lastCorrect === false && question.type !== "pinMap" && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center text-sm text-rose mb-2"
            >
              {question.correctAnswer.length > 2
                ? question.correctAnswer
                : countryById.get(question.correctAnswer)?.name ?? question.correctAnswer}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Options */}
        {renderOptions()}
      </div>
    </div>
  );
}
