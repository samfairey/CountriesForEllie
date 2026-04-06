import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import countriesData from "../data/countries.json";
import type { Country, Region } from "../types/country";
import { useSettings } from "../hooks/useSettings";

const countries = countriesData as Country[];

const REGIONS: { region: Region; emoji: string }[] = [
  { region: "Europe", emoji: "🇪🇺" },
  { region: "Africa", emoji: "🌍" },
  { region: "Asia", emoji: "🌏" },
  { region: "Americas", emoji: "🌎" },
  { region: "Oceania", emoji: "🏝️" },
];

const regionCounts = REGIONS.map((r) => ({
  ...r,
  count: countries.filter((c) => c.region === r.region).length,
}));

const MODES = [
  { path: "/flag-quiz", icon: "🏴", title: "Flag Quiz", desc: "Learn flags from around the world", primary: true },
  { path: "/capital-quiz", icon: "🏛️", title: "Capital Quiz", desc: "Match countries to their capitals", primary: true },
  { path: "/pin-the-map", icon: "📍", title: "Pin the Map", desc: "Find countries on the map", primary: false },
  { path: "/name-that-shape", icon: "🗺️", title: "Name that Shape", desc: "Identify countries by outline", primary: false },
];

export function Welcome() {
  const [step, setStep] = useState(0);
  const [selectedRegion, setSelectedRegion] = useState<Region>("Europe");
  const [selectedMode, setSelectedMode] = useState("/flag-quiz");
  const navigate = useNavigate();
  const { update } = useSettings();

  const handleFinish = () => {
    update({ hasOnboarded: true, defaultRegion: selectedRegion });
    navigate(selectedMode);
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <AnimatePresence mode="wait">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="text-8xl mb-6 inline-block"
              >
                🌍
              </motion.div>
              <h1 className="text-4xl font-bold text-white mb-3">
                Welcome to <span className="text-sky">Atlas</span>
              </h1>
              <p className="text-slate-400 text-lg mb-8 max-w-sm mx-auto">
                Master every country in the world — their flags, capitals, locations, and shapes
              </p>
              <button
                onClick={() => setStep(1)}
                className="px-8 py-3 bg-sky hover:bg-sky-dark text-white font-semibold rounded-xl transition-colors text-lg"
              >
                Let's get started →
              </button>
            </motion.div>
          )}

          {/* Step 1: Pick region */}
          {step === 1 && (
            <motion.div
              key="region"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-white mb-2 text-center">
                Where would you like to start?
              </h2>
              <p className="text-slate-400 text-sm mb-6 text-center">
                You can explore all regions anytime — this just sets your starting point
              </p>

              <div className="space-y-3 mb-8">
                {regionCounts.map((r) => (
                  <button
                    key={r.region}
                    onClick={() => setSelectedRegion(r.region)}
                    className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-4 ${
                      selectedRegion === r.region
                        ? "bg-sky/10 border-sky text-white"
                        : "bg-navy-light border-navy-lighter text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    <span className="text-3xl">{r.emoji}</span>
                    <div className="flex-1">
                      <div className="font-semibold">{r.region}</div>
                      <div className="text-xs text-slate-400">{r.count} countries</div>
                    </div>
                    {selectedRegion === r.region && (
                      <span className="text-sky">✓</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(0)}
                  className="px-6 py-3 bg-navy-lighter text-slate-300 font-semibold rounded-xl transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 bg-sky hover:bg-sky-dark text-white font-semibold rounded-xl transition-colors text-lg"
                >
                  Next →
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Pick mode */}
          {step === 2 && (
            <motion.div
              key="mode"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-white mb-2 text-center">
                How would you like to learn?
              </h2>
              <p className="text-slate-400 text-sm mb-6 text-center">
                Pick a mode to start with — you can try them all later
              </p>

              {/* Primary modes */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                {MODES.filter((m) => m.primary).map((m) => (
                  <button
                    key={m.path}
                    onClick={() => setSelectedMode(m.path)}
                    className={`p-5 rounded-xl border text-center transition-all ${
                      selectedMode === m.path
                        ? "bg-sky/10 border-sky text-white"
                        : "bg-navy-light border-navy-lighter text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    <div className="text-3xl mb-2">{m.icon}</div>
                    <div className="font-semibold text-sm">{m.title}</div>
                    <div className="text-xs text-slate-400 mt-1">{m.desc}</div>
                  </button>
                ))}
              </div>

              {/* Secondary modes */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                {MODES.filter((m) => !m.primary).map((m) => (
                  <button
                    key={m.path}
                    onClick={() => setSelectedMode(m.path)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      selectedMode === m.path
                        ? "bg-sky/10 border-sky text-white"
                        : "bg-navy-light border-navy-lighter text-slate-400 hover:border-slate-500"
                    }`}
                  >
                    <span className="text-xl mr-2">{m.icon}</span>
                    <span className="text-sm font-medium">{m.title}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 bg-navy-lighter text-slate-300 font-semibold rounded-xl transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleFinish}
                  className="flex-1 py-3 bg-sky hover:bg-sky-dark text-white font-semibold rounded-xl transition-colors text-lg"
                >
                  Start Learning →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 mt-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step ? "bg-sky" : "bg-navy-lighter"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
