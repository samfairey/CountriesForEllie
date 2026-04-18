import type { Country, Region } from "../types/country";

export type DifficultyTier = "easy" | "medium" | "hard";

/**
 * Apply the difficulty-tier population filter to a country list.
 *
 * - `easy`   → top 50% by population **within each region**
 * - `medium` → bottom 50% by population **within each region**
 * - `hard`   → all countries in the list
 *
 * The per-region split ensures that picking "All" regions on Easy doesn't
 * wipe out small European countries in favour of the global top-50, and
 * that picking "All" on Medium still gives you genuinely lesser-known
 * countries from every region (not just the 97 least-populous globally).
 *
 * @param countries  already filtered to the selected region(s) OR the full list.
 *                   The function re-groups by region internally, so passing
 *                   a region-filtered list is fine.
 * @param difficulty selected tier
 */
export function filterByDifficulty(
  countries: Country[],
  difficulty: DifficultyTier
): Country[] {
  if (difficulty === "hard") return countries.slice();

  // Group by region, sort each group by population desc, keep top or bottom half
  const byRegion = new Map<Region, Country[]>();
  for (const c of countries) {
    const bucket = byRegion.get(c.region);
    if (bucket) bucket.push(c);
    else byRegion.set(c.region, [c]);
  }

  const result: Country[] = [];
  for (const group of byRegion.values()) {
    const sorted = group.slice().sort((a, b) => b.population - a.population);
    const half = Math.ceil(sorted.length / 2);
    if (difficulty === "easy") {
      // Top half (most populous) — the well-known countries
      result.push(...sorted.slice(0, half));
    } else {
      // Bottom half (least populous) — the lesser-known countries.
      // Use Math.floor so a 7-item region contributes 3 to medium
      // (and 4 to easy), keeping the sum equal to the group size.
      const bottomStart = Math.ceil(sorted.length / 2);
      result.push(...sorted.slice(bottomStart));
    }
  }

  return result;
}
