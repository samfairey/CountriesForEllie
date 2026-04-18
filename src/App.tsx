import { lazy, Suspense, useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Shell } from "./components/layout/Shell";
import { Home } from "./pages/Home";
import { FlagQuiz } from "./pages/FlagQuiz";
import { CapitalQuiz } from "./pages/CapitalQuiz";
import { Settings } from "./pages/Settings";
import { Achievements } from "./pages/Achievements";
import { Study } from "./pages/Study";
import { KeyboardShortcuts } from "./components/common/KeyboardShortcuts";
import { AchievementToast } from "./components/common/AchievementToast";
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
const MasterMode = lazy(() =>
  import("./pages/MasterMode").then((m) => ({ default: m.MasterMode }))
);

function LoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-8 h-8 border-3 border-sky border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-slate-400">Loading...</p>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-6xl mb-4">🌍</div>
      <h1 className="text-3xl font-bold text-white mb-2">Page not found</h1>
      <p className="text-slate-400 mb-6">
        Looks like you've wandered off the map!
      </p>
      <Link
        to="/"
        className="px-6 py-3 bg-sky hover:bg-sky-dark text-white font-semibold rounded-xl transition-colors no-underline"
      >
        Back to Home
      </Link>
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

  return (
    <BrowserRouter>
      <KeyboardShortcuts />
      <AchievementToast
        achievements={toastAchievements}
        onDismiss={() => setToastAchievements([])}
      />
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Home />} />
          <Route path="/flag-quiz" element={<FlagQuiz onAchievements={showAchievementToast} />} />
          <Route path="/capital-quiz" element={<CapitalQuiz onAchievements={showAchievementToast} />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/study" element={<Study />} />
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
          <Route
            path="/master-mode"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <MasterMode onAchievements={showAchievementToast} />
              </Suspense>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
