export type Tab = "worry" | "tree" | "ground" | "saved";

export const TABS: { id: Tab; label: string }[] = [
  { id: "worry", label: "Worry time" },
  { id: "tree", label: "Worry tree" },
  { id: "ground", label: "Grounding" },
  { id: "saved", label: "Saved" },
];

export function tabFromHash(hash: string): Tab | null {
  const id = hash.replace(/^#/, "");
  return TABS.some((t) => t.id === id) ? (id as Tab) : null;
}
