"use client";

import { useEffect, useState } from "react";
import Diary from "@/components/Diary";
import StopSheet from "@/components/StopSheet";
import { SECTION_ICONS, hueStyle, type Hue } from "@/components/icons";
import { useStore } from "@/components/Store";
import { buzz, TAP } from "@/lib/haptics";
import type { Tab } from "@/lib/tabs";

const TILES: { id: Tab; hue: Hue; name: string; desc: string }[] = [
  { id: "worry", hue: "worry", name: "Worry time", desc: "A timed slot, and a recorder" },
  { id: "tree", hue: "tree", name: "Worry tree", desc: "Two questions, three outcomes" },
  { id: "ground", hue: "ground", name: "5–4–3–2–1", desc: "Five senses, back in the room" },
  { id: "saved", hue: "saved", name: "Saved", desc: "Everything you've logged" },
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

      {/* First thing on the screen, and the largest — it is the one control
          that has to be findable when you're not thinking straight. */}
      <StopSheet onGo={onGo} />

      <h2>Tools</h2>
      <div className="tiles">
        {TILES.map((t) => (
          <button
            key={t.id}
            type="button"
            className="tile"
            style={hueStyle(t.hue)}
            onClick={() => {
              buzz(TAP);
              onGo(t.id);
            }}
          >
            <span className="ico">{SECTION_ICONS[t.hue]}</span>
            <span className="name">{t.name}</span>
            <span className="desc">{t.desc}</span>
          </button>
        ))}
      </div>

      {open > 0 && (
        <button
          className="card pale"
          style={{ display: "block", width: "100%", textAlign: "left" }}
          onClick={() => {
            buzz(TAP);
            onGo("worry");
          }}
        >
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
