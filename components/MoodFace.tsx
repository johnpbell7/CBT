/**
 * The 1–5 mood scale, drawn rather than emoji — the toolkit has no emoji
 * anywhere, and a stroked glyph inherits the section tint the way the tab
 * icons do.
 */

export const MOODS: { level: number; label: string }[] = [
  { level: 1, label: "Rough" },
  { level: 2, label: "Low" },
  { level: 3, label: "OK" },
  { level: 4, label: "Good" },
  { level: 5, label: "Great" },
];

export const moodLabel = (level: number) =>
  MOODS.find((m) => m.level === level)?.label ?? "Unrecorded";

/* Only the mouth changes — a deep frown through flat to a full smile. */
const MOUTHS: Record<number, string> = {
  1: "M8 16.5Q12 12.9 16 16.5",
  2: "M8.3 15.7Q12 13.7 15.7 15.7",
  3: "M8.5 15h7",
  4: "M8.3 14.3Q12 16.3 15.7 14.3",
  5: "M8 13.9Q12 17.7 16 13.9",
};

export default function MoodFace({ level }: { level: number }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.3 9.9v.9M14.7 9.9v.9" />
      <path d={MOUTHS[level] ?? MOUTHS[3]} />
    </svg>
  );
}
