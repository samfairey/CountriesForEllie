import { motion } from "framer-motion";
import { Link } from "react-router-dom";

interface GameModeCardProps {
  icon: string;
  title: string;
  description: string;
  to?: string;
  enabled?: boolean;
}

export function GameModeCard({
  icon,
  title,
  description,
  to,
  enabled = false,
}: GameModeCardProps) {
  const content = (
    <motion.div
      whileHover={enabled ? { scale: 1.03, y: -2 } : undefined}
      whileTap={enabled ? { scale: 0.98 } : undefined}
      className={`relative rounded-2xl p-6 border transition-colors ${
        enabled
          ? "bg-navy-light border-navy-lighter hover:border-sky/50 cursor-pointer"
          : "bg-navy-light/50 border-navy-lighter/50 opacity-50 cursor-not-allowed"
      }`}
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-400">{description}</p>
      {enabled ? (
        <div className="mt-4">
          <span className="inline-block px-4 py-1.5 bg-sky hover:bg-sky-dark text-white text-sm font-medium rounded-full transition-colors">
            Play
          </span>
        </div>
      ) : (
        <div className="mt-4">
          <span className="inline-block px-4 py-1.5 bg-navy-lighter text-slate-500 text-sm font-medium rounded-full">
            Coming Soon
          </span>
        </div>
      )}
    </motion.div>
  );

  if (enabled && to) {
    return <Link to={to}>{content}</Link>;
  }

  return content;
}
