export interface CountryModeStats {
  timesSeen: number;
  timesCorrect: number;
  lastSeen: string; // ISO date string
}

export type GameMode = "flag-quiz" | "pin-the-map" | "name-that-shape" | "capital-quiz" | "blitz";

export interface ProgressData {
  /** per-country, per-mode stats: key = `${countryId}:${mode}` */
  countryStats: Record<string, CountryModeStats>;
  totalQuizzesCompleted: number;
  currentStreak: number;
  bestStreak: number;
  lastPlayedDate: string | null; // ISO date string (YYYY-MM-DD)
}

export const DEFAULT_PROGRESS: ProgressData = {
  countryStats: {},
  totalQuizzesCompleted: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastPlayedDate: null,
};
