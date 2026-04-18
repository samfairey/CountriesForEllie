import type { Country } from "../types/country";
import type { BlitzQuestion, BlitzQuestionType, BlitzDifficulty } from "../types/blitz";
import { shuffle } from "./shuffle";
import { filterByDifficulty } from "./countryFilters";

interface GeneratorOptions {
  pool: Country[];
  enabledModes: BlitzQuestionType[];
  difficulty: BlitzDifficulty;
}

/**
 * Infinite blitz question generator. Call next() to get the next question.
 * Avoids repeating the same country within 10 questions,
 * and avoids same country in different modes back-to-back.
 *
 * Difficulty tiers:
 * - easy   → top 50% by population (per region), 4 MC options, no typed input
 * - normal → all countries, 4 MC options, no typed input
 * - expert → all countries, 6 options, occasional typed input, rotated shapes
 */
export function createBlitzGenerator(opts: GeneratorOptions) {
  const { enabledModes, difficulty } = opts;
  // Easy filters the country pool to the most-recognisable half per region.
  // Distractors are drawn from this same pool so they don't leak unfamiliar
  // country names as eliminable wrong answers.
  const pool =
    difficulty === "easy"
      ? filterByDifficulty(opts.pool, "easy")
      : opts.pool;
  const optionCount = difficulty === "expert" ? 6 : 4;
  const recentCountries: string[] = []; // last 10 country IDs
  let lastCountryId = "";
  let lastMode: BlitzQuestionType | null = null;

  function pickCountry(): Country {
    const available = pool.filter((c) => !recentCountries.includes(c.id));
    const source = available.length > 0 ? available : pool;
    // Avoid same country as last question
    const filtered = source.filter((c) => c.id !== lastCountryId);
    return filtered.length > 0
      ? filtered[Math.floor(Math.random() * filtered.length)]
      : source[Math.floor(Math.random() * source.length)];
  }

  function pickMode(): BlitzQuestionType {
    if (enabledModes.length === 1) return enabledModes[0];
    // Avoid same mode back-to-back when possible
    const choices = enabledModes.filter((m) => m !== lastMode);
    const from = choices.length > 0 ? choices : enabledModes;
    return from[Math.floor(Math.random() * from.length)];
  }

  function getWrongOptions(
    country: Country,
    field: "name" | "capital",
    count: number
  ): string[] {
    const sameRegion = pool.filter(
      (c) => c.id !== country.id && c.region === country.region
    );
    const otherRegion = pool.filter(
      (c) => c.id !== country.id && c.region !== country.region
    );
    const wrongPool = shuffle([...sameRegion, ...otherRegion]);
    return wrongPool.slice(0, count).map((c) => c[field]);
  }

  function getWrongCountryIds(country: Country, count: number): string[] {
    const sameRegion = pool.filter(
      (c) => c.id !== country.id && c.region === country.region
    );
    const otherRegion = pool.filter(
      (c) => c.id !== country.id && c.region !== country.region
    );
    return shuffle([...sameRegion, ...otherRegion])
      .slice(0, count)
      .map((c) => c.id);
  }

  function next(): BlitzQuestion {
    const mode = pickMode();
    const country = pickCountry();
    const reversed = Math.random() < 0.35; // 35% chance of reverse

    recentCountries.push(country.id);
    if (recentCountries.length > 10) recentCountries.shift();
    lastCountryId = country.id;
    lastMode = mode;

    // Randomly use typed input in expert mode (20% chance for flag/capital)
    const useTyped =
      difficulty === "expert" &&
      (mode === "flag" || mode === "capital") &&
      Math.random() < 0.2;

    switch (mode) {
      case "flag": {
        if (reversed) {
          // Show country name → pick correct flag (options are country IDs)
          const wrongIds = getWrongCountryIds(country, optionCount - 1);
          return {
            type: "flag",
            reversed: true,
            countryId: country.id,
            countryName: country.name,
            flagUrl: country.flagSvgUrl,
            capital: country.capital,
            correctAnswer: country.id,
            options: shuffle([country.id, ...wrongIds]),
          };
        }
        // Show flag → pick country name
        if (useTyped) {
          return {
            type: "flag",
            reversed: false,
            countryId: country.id,
            countryName: country.name,
            flagUrl: country.flagSvgUrl,
            capital: country.capital,
            correctAnswer: country.name,
            options: [],
          };
        }
        const wrongNames = getWrongOptions(country, "name", optionCount - 1);
        return {
          type: "flag",
          reversed: false,
          countryId: country.id,
          countryName: country.name,
          flagUrl: country.flagSvgUrl,
          capital: country.capital,
          correctAnswer: country.name,
          options: shuffle([country.name, ...wrongNames]),
        };
      }

      case "capital": {
        if (reversed) {
          // Show capital → pick country name
          const wrongNames = getWrongOptions(country, "name", optionCount - 1);
          return {
            type: "capital",
            reversed: true,
            countryId: country.id,
            countryName: country.name,
            flagUrl: country.flagSvgUrl,
            capital: country.capital,
            correctAnswer: country.name,
            options: shuffle([country.name, ...wrongNames]),
          };
        }
        // Show country → pick capital
        if (useTyped) {
          return {
            type: "capital",
            reversed: false,
            countryId: country.id,
            countryName: country.name,
            flagUrl: country.flagSvgUrl,
            capital: country.capital,
            correctAnswer: country.capital,
            options: [],
          };
        }
        const wrongCaps = getWrongOptions(country, "capital", optionCount - 1);
        return {
          type: "capital",
          reversed: false,
          countryId: country.id,
          countryName: country.name,
          flagUrl: country.flagSvgUrl,
          capital: country.capital,
          correctAnswer: country.capital,
          options: shuffle([country.capital, ...wrongCaps]),
        };
      }

      case "pinMap": {
        if (reversed) {
          // Highlight country → pick name
          const wrongNames = getWrongOptions(country, "name", optionCount - 1);
          return {
            type: "pinMap",
            reversed: true,
            countryId: country.id,
            countryName: country.name,
            flagUrl: country.flagSvgUrl,
            capital: country.capital,
            correctAnswer: country.name,
            options: shuffle([country.name, ...wrongNames]),
          };
        }
        // Show name → click on map
        return {
          type: "pinMap",
          reversed: false,
          countryId: country.id,
          countryName: country.name,
          flagUrl: country.flagSvgUrl,
          capital: country.capital,
          correctAnswer: country.id,
          options: [],
        };
      }

      case "nameShape": {
        if (reversed) {
          // Show name → pick correct shape (options are country IDs)
          const wrongIds = getWrongCountryIds(country, 3);
          return {
            type: "nameShape",
            reversed: true,
            countryId: country.id,
            countryName: country.name,
            flagUrl: country.flagSvgUrl,
            capital: country.capital,
            correctAnswer: country.id,
            options: shuffle([country.id, ...wrongIds]),
            shapeId: country.id,
          };
        }
        // Show shape → pick name
        const wrongNames = getWrongOptions(country, "name", optionCount - 1);
        return {
          type: "nameShape",
          reversed: false,
          countryId: country.id,
          countryName: country.name,
          flagUrl: country.flagSvgUrl,
          capital: country.capital,
          correctAnswer: country.name,
          options: useTyped ? [] : shuffle([country.name, ...wrongNames]),
          shapeId: country.id,
          rotation: difficulty === "expert" ? Math.floor(Math.random() * 360) : 0,
        };
      }
    }
  }

  return { next };
}
