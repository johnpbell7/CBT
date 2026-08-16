/**
 * Screen Wake Lock, guarded. The screen must not sleep mid-session, but the
 * API is absent on iOS below 16.4 and the sentinel is dropped whenever the
 * page is hidden — so re-acquire on the way back.
 */

type Sentinel = { released: boolean; release: () => Promise<void>; addEventListener: (t: string, f: () => void) => void };
type WakeNavigator = Navigator & { wakeLock?: { request: (t: "screen") => Promise<Sentinel> } };

let sentinel: Sentinel | null = null;
let want = false;

export function supported(): boolean {
  return typeof navigator !== "undefined" && "wakeLock" in navigator;
}

export async function acquire(): Promise<void> {
  want = true;
  if (!supported() || sentinel) return;
  try {
    const nav = navigator as WakeNavigator;
    const s = await nav.wakeLock!.request("screen");
    s.addEventListener("release", () => {
      sentinel = null;
    });
    if (!want) {
      // released while the request was in flight
      await s.release();
      return;
    }
    sentinel = s;
  } catch {
    /* denied or unsupported — the timer still runs */
  }
}

export async function release(): Promise<void> {
  want = false;
  const s = sentinel;
  sentinel = null;
  if (!s) return;
  try {
    await s.release();
  } catch {
    /* already gone */
  }
}

/** Call on visibilitychange → visible. */
export async function reacquire(): Promise<void> {
  if (want && !sentinel) await acquire();
}
