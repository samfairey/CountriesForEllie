import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Achievement } from "../../data/achievements";
import { playTone } from "../../utils/sounds";

interface AchievementToastProps {
  achievements: Achievement[];
  onDismiss: () => void;
}

/** Play a subtle achievement unlock chime */
function playAchievementSound() {
  playTone(523, 0.15, "sine", 0.08);
  setTimeout(() => playTone(659, 0.15, "sine", 0.08), 120);
  setTimeout(() => playTone(784, 0.2, "sine", 0.1), 240);
}

export function AchievementToast({ achievements, onDismiss }: AchievementToastProps) {
  useEffect(() => {
    if (achievements.length > 0) {
      playAchievementSound();
      const timer = setTimeout(onDismiss, 4000);
      return () => clearTimeout(timer);
    }
  }, [achievements, onDismiss]);

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      role="status"
    >
      <AnimatePresence>
        {achievements.map((a) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            onClick={onDismiss}
            className="pointer-events-auto cursor-pointer bg-navy-light border border-gold/40 rounded-xl px-5 py-3 shadow-lg shadow-gold/10 flex items-center gap-3 min-w-[280px]"
          >
            <span className="text-2xl">{a.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-gold font-semibold text-sm">{a.title}</div>
              <div className="text-slate-400 text-xs truncate">{a.description}</div>
            </div>
            <motion.div
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-gold text-lg"
            >
              🏆
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
