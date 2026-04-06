import { motion } from "framer-motion";

interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm text-slate-400 mb-1">
        <span>
          {current} / {total}
        </span>
        <span>{Math.round(pct)}%</span>
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
