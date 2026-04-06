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
          <span>El Atlas</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <button
            onClick={toggleSound}
            className="text-slate-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center"
            title={soundOn ? "Mute sounds" : "Unmute sounds"}
            aria-label={soundOn ? "Mute sounds" : "Unmute sounds"}
          >
            <span className="text-base leading-none">{soundOn ? "🔊" : "🔇"}</span>
          </button>
          <Link
            to="/achievements"
            className="text-slate-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center no-underline"
            title="Achievements"
            aria-label="Achievements"
          >
            <span className="text-base leading-none">🏆</span>
          </Link>
          <Link
            to="/settings"
            className="text-slate-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center no-underline"
            title="Settings"
            aria-label="Settings"
          >
            <span className="text-base leading-none">⚙️</span>
          </Link>
          <div className="flex items-center gap-1.5 text-gold ml-1 h-8">
            <span className="text-base leading-none">🔥</span>
            <span className="font-semibold leading-none">{progress.currentStreak}</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
