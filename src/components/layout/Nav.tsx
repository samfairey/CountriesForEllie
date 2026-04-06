import { Link } from "react-router-dom";
import { useState } from "react";
import { useProgress } from "../../hooks/useProgress";
import { isSoundEnabled, setSoundEnabled } from "../../utils/sounds";

export function Nav() {
  const { progress } = useProgress();
  const [soundOn, setSoundOn] = useState(isSoundEnabled);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  return (
    <nav className="sticky top-0 z-50 bg-navy/90 backdrop-blur-md border-b border-navy-lighter">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-white font-bold text-lg no-underline">
          <span className="text-2xl">🌍</span>
          <span>Atlas</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <button
            onClick={toggleSound}
            className="text-slate-400 hover:text-white transition-colors p-1"
            title={soundOn ? "Mute sounds" : "Unmute sounds"}
            aria-label={soundOn ? "Mute sounds" : "Unmute sounds"}
          >
            {soundOn ? "🔊" : "🔇"}
          </button>
          <Link
            to="/achievements"
            className="text-slate-400 hover:text-white transition-colors p-1 no-underline"
            title="Achievements"
            aria-label="Achievements"
          >
            🏆
          </Link>
          <Link
            to="/settings"
            className="text-slate-400 hover:text-white transition-colors p-1 no-underline"
            title="Settings"
            aria-label="Settings"
          >
            ⚙️
          </Link>
          <div className="flex items-center gap-1.5 text-gold ml-1">
            <span>🔥</span>
            <span className="font-semibold">{progress.currentStreak}</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
