/**
 * Haptic feedback via the Vibration API.
 * Silent no-op on desktop or any browser without vibration support.
 *
 * Intentionally independent of the sound/mute toggle — vibration is a
 * separate feedback channel players may want even when muted.
 */

function vibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined") return;
  if (!("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some browsers throw on cross-origin iframes — swallow.
  }
}

/** Single short pulse — confirms a correct answer. */
export function hapticCorrect(): void {
  vibrate(40);
}

/** Two quick pulses — gentle "not quite" signal for wrong answers. */
export function hapticWrong(): void {
  vibrate([40, 30, 40]);
}

/** Three quick pulses — fires on streak milestones (5, 10, 15, 20...). */
export function hapticStreak(): void {
  vibrate([30, 40, 30, 40, 30]);
}

/** Longer celebratory pattern — new high score / achievement unlocked. */
export function hapticAchievement(): void {
  vibrate([100, 50, 100]);
}
