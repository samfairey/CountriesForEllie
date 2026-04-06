import { Link } from "react-router-dom";
import { useProgress } from "../../hooks/useProgress";

export function Nav() {
  const { progress } = useProgress();

  return (
    <nav className="sticky top-0 z-50 bg-navy/90 backdrop-blur-md border-b border-navy-lighter">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-white font-bold text-lg no-underline">
          <span className="text-2xl">🌍</span>
          <span>Atlas</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-gold">
            <span>🔥</span>
            <span className="font-semibold">{progress.currentStreak}</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald">
            <span>✅</span>
            <span className="font-semibold">{progress.totalQuizzesCompleted}</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
