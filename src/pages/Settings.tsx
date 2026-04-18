import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useSettings, type ThemeName } from "../hooks/useSettings";

interface ThemeMeta {
  id: ThemeName;
  label: string;
  swatches: string[]; // 4 colours (bg, surface, accent, secondary-accent)
}

const THEMES: ThemeMeta[] = [
  { id: "midnight",  label: "Midnight",     swatches: ["#0f172a", "#1e293b", "#0ea5e9", "#10b981"] },
  { id: "daylight",  label: "Daylight",     swatches: ["#f8fafc", "#ffffff", "#0ea5e9", "#10b981"] },
  { id: "botanical", label: "Botanical",    swatches: ["#2c2418", "#3d3328", "#B46C72", "#9CA469"] },
  { id: "garden",    label: "Garden Party", swatches: ["#1a2e2e", "#243d3d", "#9EC0EB", "#C1D591"] },
];

export function Settings() {
  const { settings, update, resetProgress } = useSettings();
  const navigate = useNavigate();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleConfirmReset = () => {
    resetProgress();
    setShowResetConfirm(false);
    // Go home first, then reload to refresh in-memory state. Reload happens
    // after a short beat so the toast stays visible during the transition.
    navigate("/?resetToast=1");
    window.setTimeout(() => window.location.reload(), 1400);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-lg mx-auto"
    >
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Theme */}
        <div className="bg-navy-light border border-navy-lighter rounded-xl p-4">
          <div className="text-white font-medium mb-1">Theme</div>
          <div className="text-xs text-slate-400 mb-3">Choose your preferred look</div>
          <div className="grid grid-cols-2 gap-2">
            {THEMES.map((t) => {
              const active = settings.theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => update({ theme: t.id })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    active
                      ? "border-sky bg-sky/10"
                      : "border-navy-lighter hover:border-slate-500"
                  }`}
                  aria-pressed={active}
                >
                  <div className="flex gap-1 mb-2">
                    {t.swatches.map((c, i) => (
                      <span
                        key={i}
                        className="w-4 h-4 rounded-full border border-black/20"
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                  <div className="text-sm font-medium text-white">{t.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reduced Motion */}
        <div className="bg-navy-light border border-navy-lighter rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Reduced Motion</div>
              <div className="text-xs text-slate-400">Disable non-essential animations</div>
            </div>
            <button
              onClick={() => update({ reducedMotion: !settings.reducedMotion })}
              className={`w-12 h-7 rounded-full transition-colors relative ${
                settings.reducedMotion ? "bg-sky" : "bg-navy-lighter"
              }`}
              role="switch"
              aria-checked={settings.reducedMotion}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform ${
                  settings.reducedMotion ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Reset Progress */}
        <div className="bg-navy-light border border-navy-lighter rounded-xl p-4">
          <div className="text-white font-medium mb-1">Reset Progress</div>
          <div className="text-xs text-slate-400 mb-3">
            Delete all learning data, achievements, and scores
          </div>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2 bg-rose/10 border border-rose/30 text-rose text-sm font-medium rounded-lg hover:bg-rose/20 transition-colors"
          >
            Reset All Data
          </button>
        </div>

        {/* About */}
        <div className="bg-navy-light border border-navy-lighter rounded-xl p-4">
          <div className="text-white font-medium mb-2">About</div>
          <div className="text-xs text-slate-400 space-y-1">
            <p>El Atlas v1.0.0 — A geography learning app</p>
            <p>Country data: 195 UN-recognised sovereign states</p>
            <p>Flags: flagcdn.com</p>
            <p>Map borders: Natural Earth via datasets/geo-countries</p>
            <p className="pt-2 text-slate-500">
              &copy; 2026 Neutron Star Education Ltd. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      <Link
        to="/"
        className="block text-center mt-8 text-slate-400 hover:text-white transition-colors text-sm no-underline"
      >
        &larr; Back to Home
      </Link>

      {/* Reset confirmation modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9990] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowResetConfirm(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-navy-light border border-navy-lighter rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <h2 id="reset-title" className="text-lg font-semibold text-white mb-2">
                Reset all progress?
              </h2>
              <p className="text-slate-300 text-sm mb-5">
                This will permanently delete all your quiz history, mastery
                data, streaks, achievements, and high scores. This cannot be
                undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-transparent border border-navy-lighter hover:border-slate-500 text-slate-300 hover:text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReset}
                  className="flex-1 px-4 py-2.5 bg-rose hover:bg-rose-dark text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Reset Everything
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
