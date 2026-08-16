"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/components/Store";
import { chime, unlockAudio } from "@/lib/audio";
import { buzz, CHIME, TAP } from "@/lib/haptics";
import { minutesLabel, mmss } from "@/lib/format";
import * as wake from "@/lib/wakelock";

const R = 104;
const CIRCUMFERENCE = 2 * Math.PI * R;
const PRESETS = [10, 15, 20];
const CUSTOM_MIN = 1;
const CUSTOM_MAX = 90;

type Phase = "idle" | "running" | "paused" | "done";

export default function Timer() {
  const { settings, saveSettings, ready } = useStore();

  const [mins, setMins] = useState(settings.mins);
  const [custom, setCustom] = useState(!PRESETS.includes(settings.mins));
  const [phase, setPhase] = useState<Phase>("idle");
  const [left, setLeft] = useState(settings.mins * 60);

  // Absolute end time, so backgrounding the app cannot drift the countdown.
  const endAt = useRef(0);
  const restAt = useRef(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const notified = useRef(false);

  // Adopt the persisted length once, and only while nothing is running.
  const adopted = useRef(false);
  useEffect(() => {
    if (!ready || adopted.current) return;
    adopted.current = true;
    setMins(settings.mins);
    setCustom(!PRESETS.includes(settings.mins));
    setLeft(settings.mins * 60);
  }, [ready, settings.mins]);

  const stopTick = useCallback(() => {
    if (tick.current) clearInterval(tick.current);
    tick.current = null;
  }, []);

  const finish = useCallback(() => {
    stopTick();
    setPhase("done");
    setLeft(0);
    void wake.release();
    if (!notified.current) {
      notified.current = true;
      chime();
      buzz(CHIME);
      notify();
    }
  }, [stopTick]);

  const sync = useCallback(() => {
    const remaining = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
    setLeft(remaining);
    if (remaining <= 0) finish();
  }, [finish]);

  const start = useCallback(() => {
    unlockAudio();
    buzz(TAP);
    notified.current = false;
    const seconds = phase === "paused" ? restAt.current : mins * 60;
    endAt.current = Date.now() + seconds * 1000;
    setLeft(seconds);
    setPhase("running");
    void wake.acquire();
    stopTick();
    tick.current = setInterval(sync, 250);
  }, [mins, phase, stopTick, sync]);

  const pause = useCallback(() => {
    buzz(TAP);
    restAt.current = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
    setLeft(restAt.current);
    setPhase("paused");
    stopTick();
    void wake.release();
  }, [stopTick]);

  const reset = useCallback(() => {
    buzz(TAP);
    stopTick();
    notified.current = false;
    setPhase("idle");
    setLeft(mins * 60);
    void wake.release();
  }, [mins, stopTick]);

  useEffect(() => stopTick, [stopTick]);

  // Coming back from the background: re-read the clock, retake the wake lock.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      if (phase === "running") {
        sync();
        void wake.reacquire();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [phase, sync]);

  const applyMins = useCallback(
    (next: number, isCustom: boolean) => {
      buzz(TAP);
      const clamped = Math.min(CUSTOM_MAX, Math.max(CUSTOM_MIN, next));
      setCustom(isCustom);
      setMins(clamped);
      if (phase === "idle" || phase === "done") {
        setLeft(clamped * 60);
        setPhase("idle");
        notified.current = false;
      }
      // Spread, so changing the length doesn't clear other preferences.
      void saveSettings({ ...settings, mins: clamped });
    },
    [phase, saveSettings, settings],
  );

  const total = Math.max(1, mins * 60);
  const fraction = phase === "idle" ? 1 : Math.max(0, Math.min(1, left / total));
  const offset = CIRCUMFERENCE * (1 - fraction);

  const stateLine =
    phase === "running"
      ? "In your worry time"
      : phase === "paused"
        ? "Paused"
        : phase === "done"
          ? "Time's up — let it rest"
          : `${minutesLabel(mins)} set aside`;

  return (
    <div className="card">
      <div className={`dial${phase === "done" ? " done" : ""}`} id="dial">
        <svg viewBox="0 0 240 240" aria-hidden="true">
          <circle className="track" cx="120" cy="120" r={R}></circle>
          <circle
            className="prog"
            cx="120"
            cy="120"
            r={R}
            style={{ strokeDasharray: CIRCUMFERENCE, strokeDashoffset: offset }}
          ></circle>
        </svg>
        <div className="face">
          <div className="clock num" role="timer" aria-live="off">
            {mmss(left)}
          </div>
          <div className="state">{stateLine}</div>
        </div>
      </div>

      <div className="seg" role="group" aria-label="Session length">
        {PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={!custom && mins === m}
            onClick={() => applyMins(m, false)}
          >
            {m} min
          </button>
        ))}
        <button type="button" aria-pressed={custom} onClick={() => applyMins(mins, true)}>
          Custom
        </button>
      </div>

      {custom && (
        <div className="stepper">
          <button type="button" aria-label="One minute less" onClick={() => applyMins(mins - 1, true)}>
            −
          </button>
          <span className="val num">{minutesLabel(mins)}</span>
          <button type="button" aria-label="One minute more" onClick={() => applyMins(mins + 1, true)}>
            +
          </button>
        </div>
      )}

      <div className="btn-row" style={{ marginTop: 18 }}>
        <button className="btn" onClick={phase === "running" ? pause : start} disabled={phase === "done"}>
          {phase === "running" ? "Pause" : phase === "paused" ? "Resume" : "Start"}
        </button>
        <button className="btn plain sm" style={{ flex: "none" }} onClick={reset}>
          Reset
        </button>
      </div>
    </div>
  );
}

/** Best-effort local notification. iOS only allows it once installed. */
function notify(): void {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    new Notification("Worry time is up", {
      body: "Close the slot for today. Anything still nagging can be parked.",
      tag: "worry-time-end",
    });
  } catch {
    /* not available in this context */
  }
}
