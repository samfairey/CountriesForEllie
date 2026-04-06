import type { ProgressData, GameMode } from "../types/progress";
import type { BlitzScoreEntry } from "../types/blitz";

export interface UserStats {
  progress: ProgressData;
  blitzScores: BlitzScoreEntry[];
  /** Count of countries with >=3 correct in a specific mode */
  masteredByMode: Record<string, number>;
  /** Count of countries mastered across all 4 quiz modes */
  fullyMastered: number;
  /** Modes that have been played at least once */
  modesPlayed: Set<GameMode>;
  /** Best blitz streak ever recorded */
  bestBlitzStreak: number;
  /** Best blitz score for 60s mode */
  bestBlitz60: number;
  /** Regions fully mastered (all countries, all modes) */
  regionsMastered: Set<string>;
  /** Whether user has completed a perfect 20-question quiz */
  hasPerfectQuiz: boolean;
  /** Whether user completed a hard quiz with >80% */
  hasHardMode80: boolean;
  /** Whether user completed a reverse quiz with >80% */
  hasReverse80: boolean;
}

export type AchievementCategory = "learning" | "streaks" | "mastery" | "challenge" | "explorer";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  condition: (stats: UserStats) => boolean;
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: string; // ISO date
}

const ACHIEVEMENTS: Achievement[] = [
  // Learning Milestones
  {
    id: "first-steps",
    title: "First Steps",
    description: "Complete your first quiz",
    icon: "🐣",
    category: "learning",
    condition: (s) => s.progress.totalQuizzesCompleted >= 1,
  },
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Complete 10 quizzes",
    icon: "🔟",
    category: "learning",
    condition: (s) => s.progress.totalQuizzesCompleted >= 10,
  },
  {
    id: "century",
    title: "Century",
    description: "Complete 100 quizzes",
    icon: "💯",
    category: "learning",
    condition: (s) => s.progress.totalQuizzesCompleted >= 100,
  },
  {
    id: "scholar",
    title: "Scholar",
    description: "Complete 500 quizzes",
    icon: "🎓",
    category: "learning",
    condition: (s) => s.progress.totalQuizzesCompleted >= 500,
  },

  // Streak Achievements
  {
    id: "on-fire",
    title: "On Fire",
    description: "Maintain a 3-day streak",
    icon: "🔥",
    category: "streaks",
    condition: (s) => s.progress.bestStreak >= 3,
  },
  {
    id: "dedicated",
    title: "Dedicated",
    description: "Maintain a 7-day streak",
    icon: "⚡",
    category: "streaks",
    condition: (s) => s.progress.bestStreak >= 7,
  },
  {
    id: "committed",
    title: "Committed",
    description: "Maintain a 30-day streak",
    icon: "💪",
    category: "streaks",
    condition: (s) => s.progress.bestStreak >= 30,
  },
  {
    id: "unstoppable",
    title: "Unstoppable",
    description: "Maintain a 100-day streak",
    icon: "🏔️",
    category: "streaks",
    condition: (s) => s.progress.bestStreak >= 100,
  },
  {
    id: "blitz-streak",
    title: "Blitz Streak",
    description: "Get a 10-question streak in Blitz mode",
    icon: "🔥",
    category: "streaks",
    condition: (s) => s.bestBlitzStreak >= 10,
  },
  {
    id: "blazing",
    title: "Blazing",
    description: "Get a 25-question streak in Blitz mode",
    icon: "⚡",
    category: "streaks",
    condition: (s) => s.bestBlitzStreak >= 25,
  },

  // Mastery Achievements
  {
    id: "flag-novice",
    title: "Flag Novice",
    description: "Master the flags of 10 countries",
    icon: "🏴",
    category: "mastery",
    condition: (s) => (s.masteredByMode["flag-quiz"] ?? 0) >= 10,
  },
  {
    id: "flag-expert",
    title: "Flag Expert",
    description: "Master the flags of 50 countries",
    icon: "🏴",
    category: "mastery",
    condition: (s) => (s.masteredByMode["flag-quiz"] ?? 0) >= 50,
  },
  {
    id: "vexillologist",
    title: "Vexillologist",
    description: "Master the flags of all 195 countries",
    icon: "🏴",
    category: "mastery",
    condition: (s) => (s.masteredByMode["flag-quiz"] ?? 0) >= 195,
  },
  {
    id: "capital-novice",
    title: "Capital Novice",
    description: "Master 10 capitals",
    icon: "🏛️",
    category: "mastery",
    condition: (s) => (s.masteredByMode["capital-quiz"] ?? 0) >= 10,
  },
  {
    id: "capital-expert",
    title: "Capital Expert",
    description: "Master 50 capitals",
    icon: "🏛️",
    category: "mastery",
    condition: (s) => (s.masteredByMode["capital-quiz"] ?? 0) >= 50,
  },
  {
    id: "diplomat",
    title: "Diplomat",
    description: "Master all 195 capitals",
    icon: "🏛️",
    category: "mastery",
    condition: (s) => (s.masteredByMode["capital-quiz"] ?? 0) >= 195,
  },
  {
    id: "navigator",
    title: "Navigator",
    description: "Master the locations of 50 countries",
    icon: "📍",
    category: "mastery",
    condition: (s) => (s.masteredByMode["pin-the-map"] ?? 0) >= 50,
  },
  {
    id: "cartographer",
    title: "Cartographer",
    description: "Master all 195 country shapes",
    icon: "🗺️",
    category: "mastery",
    condition: (s) => (s.masteredByMode["name-that-shape"] ?? 0) >= 195,
  },
  {
    id: "world-citizen",
    title: "World Citizen",
    description: "Master all dimensions of all 195 countries",
    icon: "🌍",
    category: "mastery",
    condition: (s) => s.fullyMastered >= 195,
  },

  // Regional Achievements
  {
    id: "euro-expert",
    title: "Euro Expert",
    description: "Master all European countries across all modes",
    icon: "🇪🇺",
    category: "explorer",
    condition: (s) => s.regionsMastered.has("Europe"),
  },
  {
    id: "africa-ace",
    title: "Africa Ace",
    description: "Master all African countries across all modes",
    icon: "🌍",
    category: "explorer",
    condition: (s) => s.regionsMastered.has("Africa"),
  },
  {
    id: "asia-aficionado",
    title: "Asia Aficionado",
    description: "Master all Asian countries across all modes",
    icon: "🌏",
    category: "explorer",
    condition: (s) => s.regionsMastered.has("Asia"),
  },
  {
    id: "americas-ace",
    title: "Americas Ace",
    description: "Master all countries in the Americas",
    icon: "🌎",
    category: "explorer",
    condition: (s) => s.regionsMastered.has("Americas"),
  },
  {
    id: "island-hopper",
    title: "Island Hopper",
    description: "Master all Oceanian countries",
    icon: "🏝️",
    category: "explorer",
    condition: (s) => s.regionsMastered.has("Oceania"),
  },

  // Challenge Achievements
  {
    id: "speed-demon",
    title: "Speed Demon",
    description: "Score 5,000+ in a 1-minute Blitz",
    icon: "⚡",
    category: "challenge",
    condition: (s) => s.bestBlitz60 >= 5000,
  },
  {
    id: "perfectionist",
    title: "Perfectionist",
    description: "Get 100% on a 20-question quiz",
    icon: "🎯",
    category: "challenge",
    condition: (s) => s.hasPerfectQuiz,
  },
  {
    id: "hard-mode",
    title: "Hard Mode Hero",
    description: "Complete a Hard difficulty quiz with >80% accuracy",
    icon: "🧠",
    category: "challenge",
    condition: (s) => s.hasHardMode80,
  },
  {
    id: "world-tour",
    title: "World Tour",
    description: "Play at least one quiz in every mode",
    icon: "🌍",
    category: "challenge",
    condition: (s) => s.modesPlayed.size >= 5,
  },
  {
    id: "reverse-master",
    title: "Reverse Master",
    description: "Complete a reverse quiz with >80% accuracy",
    icon: "🔄",
    category: "challenge",
    condition: (s) => s.hasReverse80,
  },
];

export function getAllAchievements(): Achievement[] {
  return ACHIEVEMENTS;
}

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
