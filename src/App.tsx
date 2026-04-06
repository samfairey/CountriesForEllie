import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Shell } from "./components/layout/Shell";
import { Home } from "./pages/Home";
import { FlagQuiz } from "./pages/FlagQuiz";
import { CapitalQuiz } from "./pages/CapitalQuiz";

// Lazy load map-heavy pages to avoid bundling leaflet + GeoJSON on initial load
const PinTheMap = lazy(() =>
  import("./pages/PinTheMap").then((m) => ({ default: m.PinTheMap }))
);
const NameThatShape = lazy(() =>
  import("./pages/NameThatShape").then((m) => ({ default: m.NameThatShape }))
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
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Home />} />
          <Route path="/flag-quiz" element={<FlagQuiz />} />
          <Route path="/capital-quiz" element={<CapitalQuiz />} />
          <Route
            path="/pin-the-map"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <PinTheMap />
              </Suspense>
            }
          />
          <Route
            path="/name-that-shape"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <NameThatShape />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
