import { useState, useCallback } from "react";
import type { ProgressData, GameMode, CountryModeStats } from "../types/progress";
import { DEFAULT_PROGRESS } from "../types/progress";

const STORAGE_KEY = "atlas-progress";

function loadProgress(): ProgressData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ProgressData;
  } catch {
    // corrupted data — reset
  }
  return { ...DEFAULT_PROGRESS };
}

function saveProgress(data: ProgressData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useProgress() {
  const [progress, setProgress] = useState<ProgressData>(loadProgress);

  const recordAnswer = useCallback(
    (countryId: string, mode: GameMode, correct: boolean) => {
      setProgress((prev) => {
        const key = `${countryId}:${mode}`;
        const existing: CountryModeStats = prev.countryStats[key] ?? {
          timesSeen: 0,
          timesCorrect: 0,
          lastSeen: todayString(),
        };

        const updated: ProgressData = {
          ...prev,
          countryStats: {
            ...prev.countryStats,
            [key]: {
              timesSeen: existing.timesSeen + 1,
              timesCorrect: existing.timesCorrect + (correct ? 1 : 0),
              lastSeen: todayString(),
            },
          },
        };

        saveProgress(updated);
        return updated;
      });
    },
    []
  );

  const completeQuiz = useCallback(() => {
    setProgress((prev) => {
      const today = todayString();
      const lastPlayed = prev.lastPlayedDate;

      let newStreak = prev.currentStreak;
      if (lastPlayed === today) {
        // Already played today — streak unchanged
      } else if (lastPlayed) {
        const lastDate = new Date(lastPlayed);
        const todayDate = new Date(today);
        const diffMs = todayDate.getTime() - lastDate.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        newStreak = diffDays === 1 ? prev.currentStreak + 1 : 1;
      } else {
        newStreak = 1;
      }

      const updated: ProgressData = {
        ...prev,
        totalQuizzesCompleted: prev.totalQuizzesCompleted + 1,
        currentStreak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak),
        lastPlayedDate: today,
      };

      saveProgress(updated);
      return updated;
    });
  }, []);

  const getCountryStats = useCallback(
    (countryId: string, mode: GameMode): CountryModeStats | null => {
      return progress.countryStats[`${countryId}:${mode}`] ?? null;
    },
    [progress]
  );

  /** Manually mark a country+mode as mastered. Writes a 3/3 stat block
   *  so every mastery check (timesSeen >= 3 && timesCorrect === timesSeen)
   *  immediately treats it as mastered, regardless of prior history. */
  const markKnown = useCallback((countryId: string, mode: GameMode) => {
    setProgress((prev) => {
      const updated: ProgressData = {
        ...prev,
        countryStats: {
          ...prev.countryStats,
          [`${countryId}:${mode}`]: {
            timesSeen: 3,
            timesCorrect: 3,
            lastSeen: todayString(),
          },
        },
      };
      saveProgress(updated);
      return updated;
    });
  }, []);

  return {
    progress,
    recordAnswer,
    completeQuiz,
    getCountryStats,
    markKnown,
  };
}
