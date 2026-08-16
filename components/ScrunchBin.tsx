"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { rustle, thud, unlockAudio } from "@/lib/audio";
import { buzz, THUD } from "@/lib/haptics";

/* Timings are the prototype's. Do not retune them. */
const SCRUNCH_MS = 1300;
const LID_OPEN_MS = 620;
const HAPTIC_MS = 1180;
const LID_SHUT_MS = SCRUNCH_MS + 260;

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function ScrunchBin({ text, onLanded }: { text: string; onLanded: () => void }) {
  const [go, setGo] = useState(false);
  const [gone, setGone] = useState(false);
  const [open, setOpen] = useState(false);
  const [bump, setBump] = useState(false);
  const [thrown, setThrown] = useState(false);

  const paper = useRef<HTMLDivElement>(null);
  const bin = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const landed = useRef(onLanded);
  landed.current = onLanded;

  useEffect(() => {
    const list = timers.current;
    return () => {
      for (const t of list) clearTimeout(t);
    };
  }, []);

  const after = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const throwIt = useCallback(() => {
    if (thrown) return;
    setThrown(true);
    unlockAudio();

    // Reduced motion: straight to the end state, no travel, no sound.
    if (reducedMotion()) {
      setGone(true);
      landed.current();
      return;
    }

    // Measure note centre → bin mouth at the moment of throwing, so it lands
    // correctly at any viewport width.
    const p = paper.current?.getBoundingClientRect();
    const b = bin.current?.getBoundingClientRect();
    if (p && b && paper.current) {
      const tx = b.left + b.width * 0.5 - (p.left + p.width * 0.5);
      const ty = b.top + b.height * 0.24 - (p.top + p.height * 0.5);
      paper.current.style.setProperty("--tx", `${Math.round(tx)}px`);
      paper.current.style.setProperty("--ty", `${Math.round(ty)}px`);
    }

    rustle();
    setGo(true);
    after(LID_OPEN_MS, () => setOpen(true));
    after(HAPTIC_MS, () => buzz(THUD));
    after(SCRUNCH_MS, () => {
      setGone(true);
      setBump(true);
      thud();
      landed.current();
    });
    after(LID_SHUT_MS, () => setOpen(false));
    after(SCRUNCH_MS + 520, () => setBump(false));
  }, [thrown]);

  return (
    <>
      <div className="stage">
        <div className={`paper${go ? " go" : ""}${gone ? " gone" : ""}`} ref={paper}>
          <span className="kicker">HYPOTHETICAL</span>
          {text}
          <span className="crease" aria-hidden="true"></span>
        </div>

        <div className={`bin${open ? " open" : ""}${bump ? " bump" : ""}`} ref={bin} aria-hidden="true">
          <svg viewBox="0 0 120 128" fill="none">
            <g className="lid">
              {/* sits on the rim, no gap, so the hinge reads as real */}
              <rect x="12" y="28" width="96" height="13" rx="6.5" fill="#E2E4EC" />
              <rect x="50" y="21" width="20" height="8" rx="4" fill="#E2E4EC" />
            </g>
            <path
              d="M22 41h76l-7 76a8 8 0 0 1-8 7H37a8 8 0 0 1-8-7L22 41Z"
              fill="#EFF0F6"
              stroke="rgba(36,38,54,.10)"
              strokeWidth="1.5"
            />
            <path
              d="M45 56v52M60 56v52M75 56v52"
              stroke="rgba(36,38,54,.09)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="shelf" aria-hidden="true"></div>
      </div>

      {!thrown && (
        <button className="btn" onClick={throwIt}>
          Let it go
        </button>
      )}
    </>
  );
}
