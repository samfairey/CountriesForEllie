import { useState, useCallback, useEffect } from "react";
import type { Region } from "../types/country";

export type DefaultDifficulty = "easy" | "medium" | "hard";
export type ThemeName = "midnight" | "daylight" | "botanical" | "garden";

export interface AppSettings {
  soundEnabled: boolean;
  defaultDifficulty: DefaultDifficulty;
  defaultRegion: Region | "All";
  reducedMotion: boolean;
  hasSeenSplash: boolean;
  theme: ThemeName;
}

const STORAGE_KEY = "atlas-settings";

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: false,
  defaultDifficulty: "easy",
  defaultRegion: "All",
  reducedMotion: typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  hasSeenSplash: false,
  theme: "midnight",
};

/** Apply the selected theme to <html data-theme="..."> — single source of truth. */
export function applyTheme(theme: ThemeName): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

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

  // Keep <html data-theme> in sync with stored setting
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

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
    localStorage.removeItem("atlas-mastered-countries");
    window.location.reload();
  }, []);

  return { settings, update, resetProgress };
}

/** Static read of saved settings (no hook needed) */
export function getSettings(): AppSettings {
  return loadSettings();
}
