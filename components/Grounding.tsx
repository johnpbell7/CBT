"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/components/Store";
import { useDictation } from "@/components/useDictation";
import { Listener, splitPhrase } from "@/lib/recorder";
import { buzz, TAP } from "@/lib/haptics";

const SENSES: { count: number; verb: string; hint: string; placeholder: string }[] = [
  { count: 5, verb: "things you can see", hint: "Look around properly — the dull things count.", placeholder: "Something you can see" },
  { count: 4, verb: "things you can feel", hint: "The chair, your feet, the air, fabric on your arm.", placeholder: "Something you can feel" },
  { count: 3, verb: "things you can hear", hint: "Stop and listen past the obvious one.", placeholder: "Something you can hear" },
  { count: 2, verb: "things you can smell", hint: "Faint counts. So does nothing much.", placeholder: "Something you can smell" },
  { count: 1, verb: "thing you can taste", hint: "Tea, toothpaste, or just your own mouth.", placeholder: "Something you can taste" },
];

export default function Grounding({ active }: { active: boolean }) {
  const { addGround } = useStore();

  const [step, setStep] = useState(0);
  const [items, setItems] = useState<string[][]>(() => SENSES.map(() => []));
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [said, setSaid] = useState("");
  const [finished, setFinished] = useState(false);

  const listener = useRef<Listener | null>(null);
  const canListen = useDictation();

  const stopListening = useCallback(() => {
    listener.current?.stop();
    listener.current = null;
    setListening(false);
  }, []);

  /* A spoken phrase can carry several items and can spill into the next
     sense, so fill from wherever there's room and advance as slots close. */
  const absorb = useCallback((phrase: string) => {
    const parts = splitPhrase(phrase);
    if (!parts.length) return;
    setSaid((s) => (s ? `${s} ${phrase}` : phrase));
    setItems((prev) => {
      const next = prev.map((row) => row.slice());
      let cursor = next.findIndex((row, i) => row.length < SENSES[i].count);
      for (const part of parts) {
        if (cursor < 0) break;
        next[cursor].push(part);
        if (next[cursor].length >= SENSES[cursor].count) {
          cursor = next.findIndex((row, i) => row.length < SENSES[i].count);
        }
      }
      const open = next.findIndex((row, i) => row.length < SENSES[i].count);
      setStep(open < 0 ? SENSES.length - 1 : open);
      return next;
    });
  }, []);

  const toggleListen = useCallback(() => {
    buzz(TAP);
    if (listener.current) {
      stopListening();
      return;
    }
    const l = new Listener({
      onResult: (t, isFinal) => {
        if (isFinal) absorb(t);
      },
    });
    if (l.start()) {
      listener.current = l;
      setListening(true);
    }
  }, [absorb, stopListening]);

  useEffect(() => {
    if (!active) stopListening();
  }, [active, stopListening]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") stopListening();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      listener.current?.stop();
      listener.current = null;
    };
  }, [stopListening]);

  const sense = SENSES[step];
  const filled = items[step].length;
  const full = filled >= sense.count;
  const total = items.reduce((n, row) => n + row.length, 0);

  const addItem = () => {
    const value = text.trim();
    if (!value || full) return;
    buzz(TAP);
    setItems((prev) => prev.map((row, i) => (i === step ? [...row, value] : row)));
    setText("");
  };

  const finish = useCallback(() => {
    buzz(TAP);
    stopListening();
    void addGround({ items, said: said.trim() });
    setFinished(true);
  }, [addGround, items, said, stopListening]);

  const restart = () => {
    buzz(TAP);
    setStep(0);
    setItems(SENSES.map(() => []));
    setText("");
    setSaid("");
    setFinished(false);
  };

  if (finished) {
    return (
      <section className={`view${active ? " on" : ""}`} id="v-ground" aria-labelledby="t-ground" role="tabpanel">
        <h1 id="t-ground">5–4–3–2–1</h1>
        <p className="lede">
          Name what&apos;s actually around you. Senses pull attention out of the loop and back into the room.
        </p>
        <div className="card rise">
          <h2 className="q">Round saved</h2>
          <p className="muted" style={{ margin: "0 0 14px" }}>
            {total} {total === 1 ? "thing" : "things"} named. Notice where your attention is now compared with
            when you started.
          </p>
          <button className="btn quiet" onClick={restart}>
            Go again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={`view${active ? " on" : ""}`} id="v-ground" aria-labelledby="t-ground" role="tabpanel">
      <h1 id="t-ground">5–4–3–2–1</h1>
      <p className="lede">
        Name what&apos;s actually around you. Senses pull attention out of the loop and back into the room.
      </p>

      <div className="steps" aria-hidden="true">
        {SENSES.map((_, i) => (
          <i key={i} className={i <= step ? "on" : ""}></i>
        ))}
      </div>

      <div className="card">
        <h2 className="q" style={{ marginBottom: 2 }}>
          {sense.count} {sense.verb}
        </h2>
        <p className="muted" style={{ margin: "0 0 12px" }}>
          {sense.hint}
        </p>

        <div className="dots" aria-label={`${filled} of ${sense.count} named`}>
          {Array.from({ length: sense.count }, (_, i) => (
            <i key={i} className={i < filled ? "on" : ""}></i>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <input
            type="text"
            placeholder={sense.placeholder}
            enterKeyHint="done"
            autoComplete="off"
            value={text}
            disabled={full}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addItem();
              }
            }}
          />
          <button className="btn sm" style={{ flex: "none" }} onClick={addItem} disabled={full}>
            Add
          </button>
        </div>

        {items[step].length > 0 && (
          <div className="chips">
            {items[step].map((item, i) => (
              <span className="chip" key={`${i}-${item}`}>
                {item}
              </span>
            ))}
          </div>
        )}

        <div className="btn-row" style={{ marginTop: 18 }}>
          {/* Until the slots are full, naming things is the point — the
              move-on button stays quiet so it doesn't compete with Add. */}
          {step < SENSES.length - 1 ? (
            <button
              className={full ? "btn" : "btn plain"}
              onClick={() => { buzz(TAP); setStep(step + 1); setText(""); }}
            >
              {full ? "Next sense" : "Skip ahead"}
            </button>
          ) : (
            <button className={full ? "btn" : "btn plain"} onClick={finish}>
              Finish
            </button>
          )}
          {step > 0 && (
            <button className="btn plain sm" style={{ flex: "none" }} onClick={() => { buzz(TAP); setStep(step - 1); setText(""); }}>
              Back
            </button>
          )}
        </div>
      </div>

      <h2>Or say them out loud</h2>
      <div className="card">
        <div className="rec-head">
          <button
            className="rec-btn sm"
            data-on={listening}
            aria-label={listening ? "Stop listening" : "Start listening"}
            onClick={toggleListen}
          >
            <span className="rec-dot"></span>
          </button>
          <div className="grow">
            <div className="tiny">
              {listening
                ? "Listening — name them as you spot them, and they'll drop into the slots."
                : "Speak instead of typing. Say a few at once: “the lamp, my mug and the window”."}
            </div>
          </div>
        </div>
        {canListen === false && (
          <div className="err">
            Live dictation isn&apos;t available in this browser. On iPhone it needs Settings → General → Keyboard →
            Dictation switched on; in Firefox, type the items instead.
          </div>
        )}
      </div>

      <p className="foot">A practice aid for CBT skills, not a substitute for treatment or crisis support.</p>
    </section>
  );
}
