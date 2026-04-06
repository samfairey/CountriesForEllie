import { motion } from "framer-motion";

interface ProgressBarProps {
  current: number;
  total: number;
  onQuit?: () => void;
}

export function ProgressBar({ current, total, onQuit }: ProgressBarProps) {
  const pct = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center text-sm text-slate-400 mb-1">
        <span>
          {current} / {total}
        </span>
        <div className="flex items-center gap-3">
          <span>{Math.round(pct)}%</span>
          {onQuit && (
            <button
              onClick={onQuit}
              className="text-slate-500 hover:text-slate-300 transition-colors text-xs px-2 py-0.5 rounded border border-navy-lighter hover:border-slate-500"
              aria-label="Quit quiz"
              title="Quit quiz"
            >
              Quit
            </button>
          )}
        </div>
      </div>
      <div className="h-2 bg-navy-lighter rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-sky rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
