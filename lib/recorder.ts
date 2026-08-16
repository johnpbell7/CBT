/**
 * Capture, level metering and live speech recognition. Deliberately free of
 * React so its lifecycle isn't fighting Strict Mode's double-mount.
 */

export const METER_BARS = 16;

export type RecErrorKind = "denied" | "unsupported";

export type RecResult = { blob: Blob; mime: string; secs: number; transcript: string };

export type RecorderHandlers = {
  onLevels?: (levels: number[]) => void;
  onTick?: (secs: number) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onStop?: (result: RecResult) => void;
  onError?: (kind: RecErrorKind, err: unknown) => void;
};

/** Safari lands on audio/mp4, everything else on webm/opus. */
export function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  for (const m of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m;
    } catch {
      /* keep trying */
    }
  }
  return "";
}

/** Read the mime off the blob — never hardcode; iOS and Android differ. */
export function extFor(mime: string): string {
  const m = (mime || "").toLowerCase();
  if (m.includes("mp4") || m.includes("m4a") || m.includes("aac")) return "m4a";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("wav")) return "wav";
  if (m.includes("mpeg")) return "mp3";
  return "webm";
}

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

export class Recorder {
  private handlers: RecorderHandlers;
  private stream: MediaStream | null = null;
  private rec: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private raf = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private startedAt = 0;
  private mime = "";
  private listener: Listener | null = null;
  private finalText = "";
  private stopping = false;

  active = false;

  constructor(handlers: RecorderHandlers = {}) {
    this.handlers = handlers;
  }

  async start(): Promise<boolean> {
    if (this.active) return true;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      this.handlers.onError?.("unsupported", new Error("MediaRecorder unavailable"));
      return false;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (err) {
      const name = (err as { name?: string } | null)?.name;
      this.handlers.onError?.(
        name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unsupported",
        err,
      );
      return false;
    }

    this.stream = stream;
    this.chunks = [];
    this.finalText = "";
    this.stopping = false;
    this.mime = pickMime();

    try {
      this.rec = this.mime ? new MediaRecorder(stream, { mimeType: this.mime }) : new MediaRecorder(stream);
    } catch {
      try {
        this.rec = new MediaRecorder(stream);
      } catch (err) {
        this.release();
        this.handlers.onError?.("unsupported", err);
        return false;
      }
    }

    this.rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };
    this.rec.onstop = () => this.finish();
    this.rec.onerror = (e) => this.handlers.onError?.("unsupported", e);

    this.startedAt = Date.now();
    this.active = true;
    this.rec.start();

    this.startMeter(stream);

    this.timer = setInterval(() => {
      this.handlers.onTick?.(Math.floor((Date.now() - this.startedAt) / 1000));
    }, 250);
    this.handlers.onTick?.(0);

    // Live transcription rides alongside the recording where it's available.
    if (this.handlers.onTranscript && Listener.supported()) {
      this.listener = new Listener({
        onResult: (text, isFinal) => {
          if (isFinal) this.finalText = (this.finalText + " " + text).trim();
          this.handlers.onTranscript?.(isFinal ? this.finalText : text, isFinal);
        },
      });
      this.listener.start();
    }

    return true;
  }

  stop(): void {
    if (!this.active || this.stopping) return;
    this.stopping = true;
    this.listener?.stop();
    try {
      this.rec?.stop();
    } catch {
      this.finish();
    }
  }

  private finish(): void {
    if (!this.active) return;
    this.active = false;

    const secs = Math.max(1, Math.round((Date.now() - this.startedAt) / 1000));
    const mime = this.rec?.mimeType || this.mime || "audio/webm";
    const blob = new Blob(this.chunks, { type: mime });
    const transcript = this.finalText.trim();

    this.release();
    this.handlers.onStop?.({ blob, mime, secs, transcript });
  }

  private startMeter(stream: MediaStream): void {
    try {
      const w = window as WebkitWindow;
      const Ctor = window.AudioContext || w.webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      const src = this.ctx.createMediaStreamSource(stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.72;
      src.connect(this.analyser);

      const bins = new Uint8Array(this.analyser.frequencyBinCount);
      const draw = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(bins);
        const levels: number[] = [];
        // Low frequencies carry the voice, so weight the bands towards them.
        const span = Math.floor(bins.length / 2 / METER_BARS);
        for (let b = 0; b < METER_BARS; b++) {
          let sum = 0;
          for (let i = 0; i < span; i++) sum += bins[b * span + i];
          levels.push(Math.min(1, sum / span / 150));
        }
        this.handlers.onLevels?.(levels);
        this.raf = requestAnimationFrame(draw);
      };
      this.raf = requestAnimationFrame(draw);
    } catch {
      /* meter is decoration — recording still works without it */
    }
  }

  /** Drop the mic light, kill the audio graph, clear timers. */
  private release(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.analyser = null;
    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    if (this.stream) {
      for (const t of this.stream.getTracks()) t.stop();
      this.stream = null;
    }
    this.listener?.stop();
    this.listener = null;
    this.rec = null;
    this.active = false;
    this.handlers.onLevels?.(new Array(METER_BARS).fill(0));
  }

  /** Tear down without emitting a clip — used when the view goes away. */
  abandon(): void {
    this.stopping = true;
    this.active = false;
    try {
      this.rec?.stop();
    } catch {
      /* already stopped */
    }
    this.release();
  }
}

/* ------------------------------------------------------------------ *
 * SpeechRecognition
 * ------------------------------------------------------------------ */

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
};

type SpeechEventLike = {
  resultIndex: number;
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export type ListenerHandlers = {
  onResult: (text: string, isFinal: boolean) => void;
  onError?: (err: string) => void;
};

/**
 * Continuous dictation with auto-restart. Browsers cut the session short at
 * unpredictable intervals, so `onend` restarts it while we still want it.
 */
export class Listener {
  private rec: SpeechRecognitionLike | null = null;
  private want = false;
  private handlers: ListenerHandlers;

  static supported(): boolean {
    if (typeof window === "undefined") return false;
    const w = window as SpeechWindow;
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  }

  constructor(handlers: ListenerHandlers) {
    this.handlers = handlers;
  }

  start(): boolean {
    if (!Listener.supported() || this.want) return false;
    const w = window as SpeechWindow;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return false;

    this.want = true;
    try {
      const rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = navigator.language || "en-GB";
      rec.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          const text = r[0]?.transcript ?? "";
          if (text.trim()) this.handlers.onResult(text.trim(), r.isFinal);
        }
      };
      rec.onerror = (e) => {
        const kind = e.error || "unknown";
        // "no-speech" and "aborted" are routine; only surface real problems.
        if (kind !== "no-speech" && kind !== "aborted") this.handlers.onError?.(kind);
        if (kind === "not-allowed" || kind === "service-not-allowed") this.want = false;
      };
      rec.onend = () => {
        if (!this.want) return;
        try {
          rec.start();
        } catch {
          this.want = false;
        }
      };
      rec.start();
      this.rec = rec;
      return true;
    } catch {
      this.want = false;
      return false;
    }
  }

  stop(): void {
    this.want = false;
    try {
      this.rec?.stop();
    } catch {
      /* already down */
    }
    this.rec = null;
  }
}

/**
 * Turn a spoken phrase into discrete grounding items.
 * "a lamp, the window and my mug" → ["a lamp", "the window", "my mug"]
 */
export function splitPhrase(phrase: string): string[] {
  return phrase
    .replace(/[.!?]+$/g, "")
    .split(/\s*,\s*|\s+\band\b\s+|\s*;\s*/i)
    .map((s) => s.trim().replace(/^(and|um+|uh+)\s+/i, "").trim())
    .filter((s) => s.length > 0);
}
