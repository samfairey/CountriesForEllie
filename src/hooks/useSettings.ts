import { useState, useCallback } from "react";
import type { Region } from "../types/country";

export type DefaultDifficulty = "easy" | "medium" | "hard";

export interface AppSettings {
  soundEnabled: boolean;
  defaultDifficulty: DefaultDifficulty;
  defaultRegion: Region | "All";
  reducedMotion: boolean;
  hasOnboarded: boolean;
}

const STORAGE_KEY = "atlas-settings";

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: false,
  defaultDifficulty: "easy",
  defaultRegion: "All",
  reducedMotion: typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  hasOnboarded: false,
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  const update = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  const resetProgress = useCallback(() => {
    localStorage.removeItem("atlas-progress");
    localStorage.removeItem("atlas-achievements");
    localStorage.removeItem("atlas-challenge-flags");
    localStorage.removeItem("atlas-blitz-leaderboard");
    window.location.reload();
  }, []);

  return { settings, update, resetProgress };
}

/** Static read of saved settings (no hook needed) */
export function getSettings(): AppSettings {
  return loadSettings();
}

/** Static check without hook (for routing) */
export function hasOnboarded(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.hasOnboarded === true;
    }
  } catch {}
  return false;
}
