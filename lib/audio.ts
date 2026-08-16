/**
 * Every sound in the app is synthesised — no audio files, nothing to fetch,
 * works offline. One lazily-created AudioContext, resumed on demand because
 * iOS starts it suspended until a user gesture touches it.
 */

let ctx: AudioContext | null = null;

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const w = window as WebkitWindow;
      const Ctor = window.AudioContext || w.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Call from a tap handler so later sounds are allowed to play on iOS. */
export function unlockAudio(): void {
  const c = context();
  if (!c) return;
  try {
    const g = c.createGain();
    g.gain.value = 0;
    g.connect(c.destination);
    const o = c.createOscillator();
    o.connect(g);
    o.start();
    o.stop(c.currentTime + 0.01);
  } catch {
    /* no-op */
  }
}

function noiseBuffer(c: AudioContext, secs: number): AudioBuffer {
  const len = Math.max(1, Math.floor(c.sampleRate * secs));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/** Soft two-note bell at the end of a worry-time session. */
export function chime(): void {
  const c = context();
  if (!c) return;
  const t0 = c.currentTime;
  const partials: [number, number, number][] = [
    // freq, start offset, peak gain
    [660, 0, 0.16],
    [990, 0, 0.07],
    [880, 0.42, 0.14],
    [1320, 0.42, 0.05],
  ];
  for (const [freq, at, peak] of partials) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    const start = t0 + at;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 1.5);
    o.connect(g).connect(c.destination);
    o.start(start);
    o.stop(start + 1.6);
  }
}

/** Paper crumpling — band-passed noise, gain wobbling as the note balls up. */
export function rustle(): void {
  const c = context();
  if (!c) return;
  const t0 = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.75);

  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(2600, t0);
  bp.frequency.linearRampToValueAtTime(4200, t0 + 0.4);
  bp.frequency.linearRampToValueAtTime(1800, t0 + 0.72);
  bp.Q.value = 0.85;

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  // irregular crackle rather than one smooth swell
  const steps: [number, number][] = [
    [0.05, 0.1], [0.12, 0.04], [0.19, 0.13], [0.27, 0.05],
    [0.34, 0.15], [0.43, 0.06], [0.52, 0.11], [0.62, 0.04],
  ];
  for (const [at, v] of steps) g.gain.exponentialRampToValueAtTime(v, t0 + at);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.75);

  src.connect(bp).connect(g).connect(c.destination);
  src.start(t0);
  src.stop(t0 + 0.78);
}

/** Landing in the bin — a low body plus a short noise slap. */
export function thud(): void {
  const c = context();
  if (!c) return;
  const t0 = c.currentTime;

  const o = c.createOscillator();
  const og = c.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(168, t0);
  o.frequency.exponentialRampToValueAtTime(48, t0 + 0.18);
  og.gain.setValueAtTime(0.0001, t0);
  og.gain.exponentialRampToValueAtTime(0.22, t0 + 0.012);
  og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
  o.connect(og).connect(c.destination);
  o.start(t0);
  o.stop(t0 + 0.32);

  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.18);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1400;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.12, t0);
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
  src.connect(lp).connect(ng).connect(c.destination);
  src.start(t0);
  src.stop(t0 + 0.18);
}
