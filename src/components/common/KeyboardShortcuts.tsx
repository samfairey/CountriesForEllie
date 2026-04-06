import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { isSoundEnabled, setSoundEnabled } from "../../utils/sounds";

const SHORTCUTS = [
  { keys: ["1", "-", "6"], desc: "Select answer option" },
  { keys: ["Enter"], desc: "Submit text input" },
  { keys: ["Esc"], desc: "Go back / close" },
  { keys: ["?"], desc: "Show this help" },
  { keys: ["m"], desc: "Toggle sound mute" },
];

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger when typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
      if (e.key === "m" && !e.ctrlKey && !e.metaKey) {
        setSoundEnabled(!isSoundEnabled());
      }
    },
    [open]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[9990] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-navy-light border border-navy-lighter rounded-2xl p-6 max-w-sm w-full shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="Close shortcuts"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              {SHORTCUTS.map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{s.desc}</span>
                  <div className="flex gap-1">
                    {s.keys.map((k, j) =>
                      k === "-" ? (
                        <span key={j} className="text-slate-500 text-xs">
                          –
                        </span>
                      ) : (
                        <kbd
                          key={j}
                          className="px-2 py-1 bg-navy-lighter border border-navy-lighter rounded text-xs text-slate-300 font-mono"
                        >
                          {k}
                        </kbd>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-4 text-center">
              Press <kbd className="px-1 bg-navy-lighter rounded text-slate-400 font-mono">?</kbd> to toggle
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
