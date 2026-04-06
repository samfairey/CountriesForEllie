import { useEffect, useRef } from "react";
import type { ProgressData } from "../types/progress";
import type { Achievement } from "../data/achievements";
import { useAchievements } from "./useAchievements";

/**
 * Watches progress for changes and automatically checks for newly unlocked achievements.
 * Returns a callback to trigger achievement check with additional challenge flags.
 */
export function useAchievementChecker(
  progress: ProgressData,
  onNewAchievements?: (achievements: Achievement[]) => void
) {
  const { checkAchievements, updateChallengeFlags } = useAchievements();
  const lastCheckedRef = useRef(progress.totalQuizzesCompleted);

  // Check achievements whenever totalQuizzesCompleted changes
  useEffect(() => {
    if (progress.totalQuizzesCompleted > lastCheckedRef.current) {
      lastCheckedRef.current = progress.totalQuizzesCompleted;
      // Small delay to ensure localStorage is fully updated
      const timer = setTimeout(() => {
        const newA = checkAchievements(progress);
        if (newA.length > 0) {
          onNewAchievements?.(newA);
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [progress.totalQuizzesCompleted, checkAchievements, progress, onNewAchievements]);

  return { updateChallengeFlags };
}
