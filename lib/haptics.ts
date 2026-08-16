/**
 * navigator.vibrate does not exist on iOS and throws in some embedded
 * webviews. Every call site goes through here so nothing has to remember.
 */
export function buzz(pattern: number | number[]): void {
  try {
    const nav = typeof navigator === "undefined" ? null : navigator;
    if (!nav || typeof nav.vibrate !== "function") return;
    nav.vibrate(pattern);
  } catch {
    /* unsupported — silence is the correct fallback */
  }
}

export const TAP = 12;
export const THUD: number[] = [0, 34, 30, 16];
export const CHIME: number[] = [0, 80, 90, 80, 90, 160];
