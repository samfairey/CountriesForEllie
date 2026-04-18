import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useSettings } from "../hooks/useSettings";

export function Settings() {
  const { settings, update, resetProgress } = useSettings();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-lg mx-auto"
    >
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      <div className="space-y-6">
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
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-4 py-2 bg-rose/10 border border-rose/30 text-rose text-sm font-medium rounded-lg hover:bg-rose/20 transition-colors"
            >
              Reset All Data
            </button>
          ) : (
            <div className="bg-rose/5 border border-rose/20 rounded-lg p-3">
              <p className="text-rose text-sm mb-3">
                This will delete all your learning data. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={resetProgress}
                  className="px-4 py-2 bg-rose text-white text-sm font-semibold rounded-lg hover:bg-rose-dark transition-colors"
                >
                  Confirm Reset
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 bg-navy-lighter text-slate-300 text-sm font-medium rounded-lg hover:bg-navy-lighter/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
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
    </motion.div>
  );
}
