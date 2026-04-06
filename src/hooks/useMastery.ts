import { useState, useCallback } from "react";

const STORAGE_KEY = "atlas-mastered-countries";

function loadMastered(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {}
  return new Set();
}

function saveMastered(set: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

/** Static read without hook (for Home page stats) */
export function getMasteredCount(): number {
  return loadMastered().size;
}

export function useMastery() {
  const [mastered, setMastered] = useState<Set<string>>(loadMastered);

  const markMastered = useCallback((countryId: string) => {
    setMastered((prev) => {
      const next = new Set(prev);
      next.add(countryId);
      saveMastered(next);
      return next;
    });
  }, []);

  const isMastered = useCallback(
    (countryId: string) => mastered.has(countryId),
    [mastered]
  );

  return {
    mastered,
    masteredCount: mastered.size,
    markMastered,
    isMastered,
  };
}
