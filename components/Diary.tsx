"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/components/Store";
import MoodFace, { MOODS, moodLabel } from "@/components/MoodFace";
import { buzz, TAP } from "@/lib/haptics";
import { when } from "@/lib/format";

/* A balanced spread, not a list of problems — naming a good day matters as
   much as naming a bad one. */
const FEELINGS = [
  "Calm", "Content", "Hopeful", "Grateful",
  "Tired", "Flat", "Restless", "Distracted",
  // "Sad" rather than "Low" — the mood scale already uses Low, and two
  // controls with the same word on one screen is a trap.
  "Anxious", "Sad", "Irritable", "Angry",
  "Overwhelmed", "Lonely", "Ashamed", "Relieved",
];

export default function Diary() {
  const { diary, addDiary } = useStore();

  const [mood, setMood] = useState<number | null>(null);
  const [feelings, setFeelings] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [today, setToday] = useState("");

  // Dates are client-only — the prerendered HTML can't know the timezone.
  useEffect(() => {
    setToday(
      new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }),
    );
  }, []);

  const toggleFeeling = useCallback((word: string) => {
    buzz(TAP);
    setFeelings((f) => (f.includes(word) ? f.filter((w) => w !== word) : [...f, word]));
  }, []);

  const save = useCallback(() => {
    if (mood === null) return;
    buzz(TAP);
    void addDiary({ mood, feelings, note: note.trim() });
    setSaved(true);
  }, [addDiary, feelings, mood, note]);

  const again = () => {
    buzz(TAP);
    setMood(null);
    setFeelings([]);
    setNote("");
    setSaved(false);
  };

  const recent = diary.slice(0, 3);

  if (saved) {
    return (
      <>
        <div className="card rise">
          <h2 className="q">Logged</h2>
          <p className="muted" style={{ margin: "0 0 14px" }}>
            No need to do anything with it. Noticing how you feel, and naming it, is the whole exercise.
          </p>
          <button className="btn quiet" onClick={again}>
            Log another
          </button>
        </div>
        <RecentList entries={recent} />
      </>
    );
  }

  return (
    <>
      <div className="card">
        <h2 className="q" style={{ marginBottom: 2 }}>
          How do you feel?
        </h2>
        <p className="muted" style={{ margin: "0 0 14px" }}>
          {today || "Today"} — a rough answer is fine.
        </p>

        <div className="moods" role="group" aria-label="Mood">
          {MOODS.map((m) => (
            <button
              key={m.level}
              type="button"
              className="mood"
              aria-pressed={mood === m.level}
              aria-label={m.label}
              onClick={() => {
                buzz(TAP);
                setMood(m.level);
              }}
            >
              <MoodFace level={m.level} />
              <span>{m.label}</span>
            </button>
          ))}
        </div>

        <h2 style={{ margin: "22px 2px 9px" }}>Anything else in there?</h2>
        <div className="chips" style={{ marginTop: 0 }}>
          {FEELINGS.map((word) => (
            <button
              key={word}
              type="button"
              className="pick"
              aria-pressed={feelings.includes(word)}
              onClick={() => toggleFeeling(word)}
            >
              {word}
            </button>
          ))}
        </div>

        <h2 style={{ margin: "22px 2px 9px" }}>Today, in a line or two</h2>
        <textarea
          placeholder="What happened, or what's sitting with you. Optional."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <button className="btn" style={{ marginTop: 14 }} disabled={mood === null} onClick={save}>
          {mood === null ? "Pick a mood to save" : "Save today"}
        </button>
      </div>
      <RecentList entries={recent} />
    </>
  );
}

function RecentList({ entries }: { entries: { ts: number; mood: number; feelings: string[]; note: string }[] }) {
  if (entries.length === 0) return null;
  return (
    <>
      <h2>Recent check-ins</h2>
      <div className="card tight">
        {entries.map((e) => (
          <div className="row" key={e.ts}>
            <div className="entry grow">
              <span className="face">
                <MoodFace level={e.mood} />
              </span>
              <div className="grow">
                <div style={{ fontSize: "15.5px" }}>
                  {moodLabel(e.mood)}
                  {e.feelings.length > 0 && (
                    <span className="muted"> · {e.feelings.join(", ")}</span>
                  )}
                </div>
                <div className="tiny">{when(e.ts)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
