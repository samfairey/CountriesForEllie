import { useState, useCallback } from "react";
import countriesData from "../data/countries.json";
import type { Country } from "../types/country";
import type { GameMode, ProgressData } from "../types/progress";
import { loadLeaderboard } from "../types/blitz";
import {
  getAllAchievements,
  type UnlockedAchievement,
  type UserStats,
  type Achievement,
} from "../data/achievements";

const countries = countriesData as Country[];

const STORAGE_KEY = "atlas-achievements";
const CHALLENGE_KEY = "atlas-challenge-flags";

/** Extra flags for challenge achievements that can't be derived from progress alone */
export interface ChallengeFlags {
  hasPerfectQuiz: boolean;
  hasHardMode80: boolean;
  hasReverse80: boolean;
  modesPlayed: string[]; // GameMode[]
  bestBlitzStreak: number;
}

function loadUnlocked(): UnlockedAchievement[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveUnlocked(list: UnlockedAchievement[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function loadChallengeFlags(): ChallengeFlags {
  try {
    const raw = localStorage.getItem(CHALLENGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    hasPerfectQuiz: false,
    hasHardMode80: false,
    hasReverse80: false,
    modesPlayed: [],
    bestBlitzStreak: 0,
  };
}

function saveChallengeFlags(flags: ChallengeFlags) {
  localStorage.setItem(CHALLENGE_KEY, JSON.stringify(flags));
}

const QUIZ_MODES: GameMode[] = ["flag-quiz", "capital-quiz", "pin-the-map", "name-that-shape"];

/** Build UserStats from progress data */
function buildUserStats(progress: ProgressData, flags: ChallengeFlags): UserStats {
  const masteredByMode: Record<string, number> = {};
  const countryMastery: Record<string, Set<string>> = {}; // countryId -> set of mastered modes

  for (const [key, stats] of Object.entries(progress.countryStats)) {
    const [countryId, mode] = key.split(":");
    if (stats.timesSeen >= 3 && stats.timesCorrect === stats.timesSeen) {
      masteredByMode[mode] = (masteredByMode[mode] ?? 0) + 1;
      if (!countryMastery[countryId]) countryMastery[countryId] = new Set();
      countryMastery[countryId].add(mode);
    }
  }

  // Fully mastered = mastered in all 4 quiz modes
  let fullyMastered = 0;
  for (const modes of Object.values(countryMastery)) {
    if (QUIZ_MODES.every((m) => modes.has(m))) fullyMastered++;
  }

  // Region mastery: all countries in region mastered in all modes
  const regionsMastered = new Set<string>();
  const regionCountries: Record<string, string[]> = {};
  for (const c of countries) {
    if (!regionCountries[c.region]) regionCountries[c.region] = [];
    regionCountries[c.region].push(c.id);
  }
  for (const [region, ids] of Object.entries(regionCountries)) {
    const allMastered = ids.every((id) => {
      const modes = countryMastery[id];
      return modes && QUIZ_MODES.every((m) => modes.has(m));
    });
    if (allMastered) regionsMastered.add(region);
  }

  // Blitz stats
  const boards = loadLeaderboard();
  const blitzScores = Object.values(boards).flat();
  const bestBlitz60 = (boards["60s"] ?? []).reduce((max, e) => Math.max(max, e.score), 0);

  return {
    progress,
    blitzScores,
    masteredByMode,
    fullyMastered,
    modesPlayed: new Set(flags.modesPlayed as GameMode[]),
    bestBlitzStreak: flags.bestBlitzStreak,
    bestBlitz60,
    regionsMastered,
    hasPerfectQuiz: flags.hasPerfectQuiz,
    hasHardMode80: flags.hasHardMode80,
    hasReverse80: flags.hasReverse80,
  };
}

export function useAchievements() {
  const [unlocked, setUnlocked] = useState<UnlockedAchievement[]>(loadUnlocked);
  const [challengeFlags, setChallengeFlags] = useState<ChallengeFlags>(loadChallengeFlags);

  const unlockedIds = new Set(unlocked.map((u) => u.id));

  /** Update challenge flags (called after quiz results) */
  const updateChallengeFlags = useCallback(
    (update: Partial<ChallengeFlags>) => {
      setChallengeFlags((prev) => {
        const next = { ...prev };
        if (update.hasPerfectQuiz) next.hasPerfectQuiz = true;
        if (update.hasHardMode80) next.hasHardMode80 = true;
        if (update.hasReverse80) next.hasReverse80 = true;
        if (update.modesPlayed) {
          const set = new Set([...next.modesPlayed, ...update.modesPlayed]);
          next.modesPlayed = [...set];
        }
        if (update.bestBlitzStreak && update.bestBlitzStreak > next.bestBlitzStreak) {
          next.bestBlitzStreak = update.bestBlitzStreak;
        }
        saveChallengeFlags(next);
        return next;
      });
    },
    []
  );

  /** Check for newly unlocked achievements. Returns list of newly unlocked. */
  const checkAchievements = useCallback(
    (progress: ProgressData): Achievement[] => {
      const currentFlags = loadChallengeFlags();
      const stats = buildUserStats(progress, currentFlags);
      const allAchievements = getAllAchievements();
      const currentUnlocked = loadUnlocked();
      const currentIds = new Set(currentUnlocked.map((u) => u.id));

      const newlyUnlocked: Achievement[] = [];
      const today = new Date().toISOString().slice(0, 10);

      for (const achievement of allAchievements) {
        if (currentIds.has(achievement.id)) continue;
        try {
          if (achievement.condition(stats)) {
            newlyUnlocked.push(achievement);
            currentUnlocked.push({ id: achievement.id, unlockedAt: today });
            currentIds.add(achievement.id);
          }
        } catch {
          // Skip achievements that fail to evaluate
        }
      }

      if (newlyUnlocked.length > 0) {
        saveUnlocked(currentUnlocked);
        setUnlocked(currentUnlocked);
      }

      return newlyUnlocked;
    },
    []
  );

  return {
    unlocked,
    unlockedIds,
    challengeFlags,
    updateChallengeFlags,
    checkAchievements,
    totalAchievements: getAllAchievements().length,
  };
}
