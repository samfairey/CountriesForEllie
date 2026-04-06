import { lazy, Suspense, useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Shell } from "./components/layout/Shell";
import { Home } from "./pages/Home";
import { FlagQuiz } from "./pages/FlagQuiz";
import { CapitalQuiz } from "./pages/CapitalQuiz";
import { Settings } from "./pages/Settings";
import { Achievements } from "./pages/Achievements";
import { Welcome } from "./pages/Welcome";
import { KeyboardShortcuts } from "./components/common/KeyboardShortcuts";
import { AchievementToast } from "./components/common/AchievementToast";
import { hasOnboarded } from "./hooks/useSettings";
import type { Achievement } from "./data/achievements";

// Lazy load map-heavy pages
const PinTheMap = lazy(() =>
  import("./pages/PinTheMap").then((m) => ({ default: m.PinTheMap }))
);
const NameThatShape = lazy(() =>
  import("./pages/NameThatShape").then((m) => ({ default: m.NameThatShape }))
);
const BlitzMode = lazy(() =>
  import("./pages/BlitzMode").then((m) => ({ default: m.BlitzMode }))
);

function LoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-8 h-8 border-3 border-sky border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-slate-400">Loading...</p>
    </div>
  );
}

export default function App() {
  const [toastAchievements, setToastAchievements] = useState<Achievement[]>([]);

  const showAchievementToast = useCallback((achievements: Achievement[]) => {
    if (achievements.length > 0) {
      setToastAchievements(achievements);
    }
  }, []);

  const onboarded = hasOnboarded();

  return (
    <BrowserRouter>
      <KeyboardShortcuts />
      <AchievementToast
        achievements={toastAchievements}
        onDismiss={() => setToastAchievements([])}
      />
      <Routes>
        <Route path="/welcome" element={<Welcome />} />
        <Route element={<Shell />}>
          <Route
            path="/"
            element={onboarded ? <Home /> : <Navigate to="/welcome" replace />}
          />
          <Route path="/flag-quiz" element={<FlagQuiz onAchievements={showAchievementToast} />} />
          <Route path="/capital-quiz" element={<CapitalQuiz onAchievements={showAchievementToast} />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route
            path="/pin-the-map"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <PinTheMap onAchievements={showAchievementToast} />
              </Suspense>
            }
          />
          <Route
            path="/name-that-shape"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <NameThatShape onAchievements={showAchievementToast} />
              </Suspense>
            }
          />
          <Route
            path="/blitz"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <BlitzMode onAchievements={showAchievementToast} />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
