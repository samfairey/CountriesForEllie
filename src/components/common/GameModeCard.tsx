import { motion } from "framer-motion";
import { Link } from "react-router-dom";

interface GameModeCardProps {
  icon: string;
  title: string;
  description: string;
  to?: string;
  enabled?: boolean;
  variant?: "default" | "blitz";
}

export function GameModeCard({
  icon,
  title,
  description,
  to,
  enabled = false,
  variant = "default",
}: GameModeCardProps) {
  const isBlitz = variant === "blitz" && enabled;

  const content = (
    <motion.div
      whileHover={enabled ? { scale: 1.02, y: -2 } : undefined}
      whileTap={enabled ? { scale: 0.98 } : undefined}
      className={`relative rounded-2xl p-6 border transition-all h-full ${
        isBlitz
          ? "bg-gradient-to-br from-amber-500/10 via-navy-light to-orange-500/5 border-amber-500/40 hover:border-amber-500/70 hover:shadow-lg hover:shadow-amber-500/5 cursor-pointer"
          : enabled
            ? "bg-gradient-to-br from-navy-light to-navy-light/70 border-navy-lighter hover:border-sky/50 hover:shadow-lg hover:shadow-sky/5 cursor-pointer"
            : "bg-navy-light/50 border-navy-lighter/50 opacity-50 cursor-not-allowed"
      }`}
    >
      {/* Blitz glow effect */}
      {isBlitz && (
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            boxShadow: "0 0 20px rgba(245, 158, 11, 0.08), inset 0 0 20px rgba(245, 158, 11, 0.03)",
          }}
        />
      )}
      <div className="text-4xl mb-3" role="img" aria-hidden="true">{icon}</div>
      <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-400">{description}</p>
      {enabled ? (
        <div className="mt-4">
          <span
            className={`inline-block px-4 py-1.5 text-white text-sm font-medium rounded-full transition-colors ${
              isBlitz
                ? "bg-amber-500 hover:bg-amber-600"
                : "bg-sky hover:bg-sky-dark"
            }`}
          >
            {isBlitz ? "Play" : "Play"}
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
    return (
      <Link to={to} className="no-underline block h-full" aria-label={`Play ${title}`}>
        {content}
      </Link>
    );
  }

  return content;
}
