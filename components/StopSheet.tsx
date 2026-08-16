"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MIC_ICON, PARK_ICON, SECTION_ICONS, hueStyle, type Hue } from "@/components/icons";
import { buzz, TAP } from "@/lib/haptics";
import type { Tab } from "@/lib/tabs";

/**
 * The STOP skill, as a button: interrupt the spiral first, then pick a tool.
 * Choosing what you need is hard when you're already in it, so the sheet asks
 * in plain language and routes rather than making you navigate.
 */
const OPTIONS: { tab: Tab; hue: Hue; icon: React.ReactElement; name: string; desc: string }[] = [
  {
    tab: "ground",
    hue: "ground",
    icon: SECTION_ICONS.ground,
    name: "Get me out of my head",
    desc: "5–4–3–2–1 — name what's around you, one sense at a time",
  },
  {
    tab: "tree",
    hue: "tree",
    icon: SECTION_ICONS.tree,
    name: "A worry keeps circling",
    desc: "Two questions to work out what it actually needs",
  },
  {
    tab: "worry",
    hue: "worry",
    icon: MIC_ICON,
    name: "I need to say it out loud",
    desc: "Record it — talking a worry through often shrinks it",
  },
  {
    tab: "worry",
    hue: "worry",
    icon: PARK_ICON,
    name: "Park it until later",
    desc: "Write it down and deal with it in your worry time",
  },
];

export default function StopSheet({ onGo }: { onGo: (t: Tab) => void }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    opener.current?.focus();
  }, []);

  // Escape closes it, and the page behind must not scroll while it's up.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  const choose = (tab: Tab) => {
    buzz(TAP);
    setOpen(false);
    onGo(tab);
  };

  return (
    <>
      <button
        className="stop"
        ref={opener}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          buzz(TAP);
          setOpen(true);
        }}
      >
        <span className="word">STOP</span>
        <span className="sub">When it&apos;s getting too much</span>
      </button>

      {/* Portalled to <body>: `main` establishes a stacking context at
          z-index 1, so a sheet rendered inside it sits under the tab bar no
          matter how high its own z-index is. */}
      {open && mounted && createPortal(
        <div className="sheet" role="presentation">
          <div className="sheet-veil" onClick={close} />
          <div
            className="sheet-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="stop-title"
            tabIndex={-1}
            ref={panel}
          >
            <div className="grab" aria-hidden="true" />

            <h2 className="q" id="stop-title" style={{ marginBottom: 4 }}>
              What do you need?
            </h2>
            <p className="muted" style={{ margin: "0 0 16px" }}>
              You&apos;ve stopped — that&apos;s the difficult part done. Take one breath, then pick whichever
              of these sounds closest.
            </p>

            {OPTIONS.map((o) => (
              <button key={o.name} className="opt" onClick={() => choose(o.tab)}>
                <span className="ico" style={hueStyle(o.hue)}>
                  {o.icon}
                </span>
                <span className="grow">
                  <span className="name">{o.name}</span>
                  <span className="desc">{o.desc}</span>
                </span>
              </button>
            ))}

            <button className="btn plain" style={{ marginTop: 4 }} onClick={close}>
              Nothing — I just needed to stop
            </button>

            <p className="foot">
              If you&apos;re in crisis or unsafe, this app isn&apos;t the right help. In the UK, call 111, or
              Samaritans free on 116 123, any time.
            </p>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
