/**
 * Normalize a string for comparison: lowercase, strip accents/diacritics,
 * remove punctuation and extra whitespace.
 */
function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // remove punctuation
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check if user input matches the country name or any of its alternatives.
 * Uses normalized comparison with a Levenshtein tolerance for minor typos.
 */
export function fuzzyMatch(
  input: string,
  correctName: string,
  alternatives: string[]
): boolean {
  const normalizedInput = normalize(input);
  if (!normalizedInput) return false;

  const candidates = [correctName, ...alternatives].map(normalize);

  for (const candidate of candidates) {
    // Exact match after normalization
    if (normalizedInput === candidate) return true;

    // Allow Levenshtein distance of 1 for short names, 2 for longer names
    const maxDist = candidate.length <= 5 ? 1 : 2;
    if (levenshtein(normalizedInput, candidate) <= maxDist) return true;
  }

  return false;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[m][n];
}
