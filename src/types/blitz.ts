export type BlitzQuestionType = "flag" | "capital" | "pinMap" | "nameShape";

export type BlitzDifficulty = "normal" | "expert";

export type TimeLimit = 60 | 180 | 300;

export interface BlitzQuestion {
  type: BlitzQuestionType;
  /** Whether this is a reverse variant */
  reversed: boolean;
  /** The country being quizzed */
  countryId: string;
  countryName: string;
  flagUrl: string;
  capital: string;
  /** The correct answer string */
  correctAnswer: string;
  /** MC options (empty for typed input) */
  options: string[];
  /** For nameShape: the country ID whose geometry to show */
  shapeId?: string;
  /** For nameShape expert: random rotation */
  rotation?: number;
}

export interface BlitzResult {
  question: BlitzQuestion;
  userAnswer: string;
  correct: boolean;
  responseTimeMs: number;
  pointsEarned: number;
}

export interface BlitzScoreEntry {
  score: number;
  date: string;
  accuracy: number;
  bestStreak: number;
  questionsAnswered: number;
  region: string;
  timeLimit: TimeLimit;
}

const LEADERBOARD_KEY = "atlas-blitz-leaderboard";

export function loadLeaderboard(): Record<string, BlitzScoreEntry[]> {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export function saveToLeaderboard(entry: BlitzScoreEntry): boolean {
  const boards = loadLeaderboard();
  const key = `${entry.timeLimit}s`;
  if (!boards[key]) boards[key] = [];

  const list = boards[key];
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  boards[key] = list.slice(0, 10);

  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(boards));

  // Return true if this is a new high score
  return boards[key][0].date === entry.date && boards[key][0].score === entry.score;
}

export function getHighScore(timeLimit: TimeLimit): number {
  const boards = loadLeaderboard();
  const key = `${timeLimit}s`;
  const list = boards[key];
  return list && list.length > 0 ? list[0].score : 0;
}
