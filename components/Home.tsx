"use client";

import { useEffect, useState } from "react";
import Diary from "@/components/Diary";
import { useStore } from "@/components/Store";
import { buzz, TAP } from "@/lib/haptics";
import type { Tab } from "@/lib/tabs";

const TILES: { id: Tab; name: string; desc: string; hue: string; icon: React.ReactElement }[] = [
  {
    id: "worry",
    name: "Worry time",
    desc: "A timed slot, and a recorder",
    hue: "worry",
    icon: (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9.5V13l2.5 1.5M9 2h6M18.5 5.5l1.5-1.5" />
      </svg>
    ),
  },
  {
    id: "tree",
    name: "Worry tree",
    desc: "Two questions, three outcomes",
    hue: "tree",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M12 3v6M12 9c0 3-6 2-6 5v1M12 9c0 3 6 2 6 5v1" />
        <rect x="9" y="18" width="6" height="4" rx="1.4" />
        <rect x="3" y="18" width="6" height="4" rx="1.4" />
        <rect x="15" y="18" width="6" height="4" rx="1.4" />
      </svg>
    ),
  },
  {
    id: "ground",
    name: "5–4–3–2–1",
    desc: "Five senses, back in the room",
    hue: "ground",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M3 12c2.5-4 6-6 9-6s6.5 2 9 6c-2.5 4-6 6-9 6s-6.5-2-9-6Z" />
        <circle cx="12" cy="12" r="2.6" />
      </svg>
    ),
  },
  {
    id: "saved",
    name: "Saved",
    desc: "Everything you've logged",
    hue: "saved",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M6 3.5h12a1.5 1.5 0 0 1 1.5 1.5v15.2a.8.8 0 0 1-1.25.66L12 16.6l-6.25 4.26A.8.8 0 0 1 4.5 20.2V5A1.5 1.5 0 0 1 6 3.5Z" />
      </svg>
    ),
  },
];

export default function Home({ active, onGo }: { active: boolean; onGo: (t: Tab) => void }) {
  const { parked } = useStore();
  // Swapped in after mount — the server has no idea what time it is here.
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
  }, []);

  const open = parked.filter((p) => !p.done).length;

  return (
    <section className={`view${active ? " on" : ""}`} id="v-home" aria-labelledby="t-home" role="tabpanel">
      <h1 id="t-home">{greeting}</h1>
      <p className="lede">
        Four tools for the moments that need one, and somewhere to say how today actually went.
      </p>

      <h2>Tools</h2>
      <div className="tiles">
        {TILES.map((t) => (
          <button
            key={t.id}
            type="button"
            className="tile"
            style={
              {
                "--tile-pale": `var(--c-${t.hue}-pale)`,
                "--tile-ink": `var(--c-${t.hue}-ink)`,
              } as React.CSSProperties
            }
            onClick={() => {
              buzz(TAP);
              onGo(t.id);
            }}
          >
            <span className="ico">{t.icon}</span>
            <span className="name">{t.name}</span>
            <span className="desc">{t.desc}</span>
          </button>
        ))}
      </div>

      {open > 0 && (
        <button className="card pale" style={{ display: "block", width: "100%", textAlign: "left" }} onClick={() => { buzz(TAP); onGo("worry"); }}>
          <div style={{ fontSize: "15.5px", color: "var(--tint-ink)", fontWeight: 600 }}>
            {open} worry{open === 1 ? "" : " worries"} parked
          </div>
          <div className="muted" style={{ marginTop: 2 }}>
            Waiting for your next worry time — not before.
          </div>
        </button>
      )}

      <h2>Daily diary</h2>
      <Diary />

      <p className="foot">A practice aid for CBT skills, not a substitute for treatment or crisis support.</p>
    </section>
  );
}
