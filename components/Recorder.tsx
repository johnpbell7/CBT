"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/components/Store";
import { Recorder as Engine, METER_BARS, type RecErrorKind } from "@/lib/recorder";
import { unlockAudio } from "@/lib/audio";
import { buzz, TAP } from "@/lib/haptics";
import { mmss } from "@/lib/format";

const IDLE_HINT = "Tap to record — talking a worry through often shrinks it";

const ERRORS: Record<RecErrorKind, string> = {
  denied:
    "Microphone access was turned down. It's remembered per site, so allow it in your browser's settings for this page, then tap record again.",
  unsupported:
    "This browser can't record audio here. Recording needs a secure (https) page — try Safari on iPhone or Chrome on Android.",
};

export default function Recorder({ active }: { active: boolean }) {
  const { addClip } = useStore();
  const [on, setOn] = useState(false);
  const [secs, setSecs] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => new Array(METER_BARS).fill(0));
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const engine = useRef<Engine | null>(null);
  const addClipRef = useRef(addClip);
  addClipRef.current = addClip;

  const stop = useCallback(() => {
    engine.current?.stop();
  }, []);

  const toggle = useCallback(async () => {
    buzz(TAP);
    unlockAudio();
    if (engine.current?.active) {
      stop();
      return;
    }
    setErr(null);
    setSaved(false);

    const rec = new Engine({
      onLevels: setLevels,
      onTick: setSecs,
      onTranscript: () => {
        /* the final transcript arrives with the clip */
      },
      onError: (kind) => {
        setErr(ERRORS[kind]);
        setOn(false);
        engine.current = null;
      },
      onStop: ({ blob, mime, secs: len, transcript }) => {
        setOn(false);
        engine.current = null;
        if (blob.size > 0) {
          void addClipRef.current({ tag: "Worry time", secs: len, mime, blob, transcript });
          setSaved(true);
        }
      },
    });
    engine.current = rec;
    const started = await rec.start();
    if (started) setOn(true);
    else engine.current = null;
  }, [stop]);

  // Never keep the mic open behind the user's back.
  useEffect(() => {
    if (!active) stop();
  }, [active, stop]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") stop();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      engine.current?.abandon();
      engine.current = null;
    };
  }, [stop]);

  return (
    <div className="card">
      <div className="rec-head">
        <button
          className="rec-btn"
          data-on={on}
          aria-label={on ? "Stop recording" : "Start recording"}
          onClick={toggle}
        >
          <span className="rec-dot"></span>
        </button>
        <div className="grow">
          <div className="meter" aria-hidden="true">
            {levels.map((v, i) => (
              <i key={i} style={{ height: `${4 + v * 28}px` }} />
            ))}
          </div>
          <div className="tiny num">
            {on ? `Recording ${mmss(secs, false)}` : saved ? "Saved to your recordings" : IDLE_HINT}
          </div>
        </div>
      </div>
      {err && <div className="err">{err}</div>}
    </div>
  );
}
