const STORAGE_KEY = "atlas-sound-enabled";

let audioCtx: AudioContext | null = null;
let _enabled = false;

// Load preference from localStorage
try {
  _enabled = localStorage.getItem(STORAGE_KEY) === "true";
} catch {}

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.15
) {
  if (!_enabled) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

export function playCorrect() {
  playTone(880, 0.15, "sine", 0.12);
  setTimeout(() => playTone(1100, 0.12, "sine", 0.1), 80);
}

export function playWrong() {
  playTone(220, 0.2, "square", 0.08);
}

export function playStreak() {
  playTone(660, 0.1, "sine", 0.1);
  setTimeout(() => playTone(880, 0.1, "sine", 0.1), 100);
  setTimeout(() => playTone(1100, 0.15, "sine", 0.12), 200);
}

export function playTick() {
  playTone(800, 0.05, "sine", 0.06);
}

export function playTimesUp() {
  playTone(440, 0.3, "triangle", 0.15);
  setTimeout(() => playTone(330, 0.4, "triangle", 0.12), 200);
}

export function playHighScore() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2, "sine", 0.12), i * 120);
  });
}

export function isSoundEnabled(): boolean {
  return _enabled;
}

export function setSoundEnabled(enabled: boolean) {
  _enabled = enabled;
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {}
  // Resume audio context on user gesture
  if (enabled && audioCtx?.state === "suspended") {
    audioCtx.resume();
  }
}
