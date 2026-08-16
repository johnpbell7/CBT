/**
 * Section glyphs, shared by the dashboard tiles and the stop sheet.
 * No stroke attributes — `.ico svg` paints them from the tile's own hue.
 */

export type Hue = "worry" | "tree" | "ground" | "saved";

export const SECTION_ICONS: Record<Hue, React.ReactElement> = {
  worry: (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9.5V13l2.5 1.5M9 2h6M18.5 5.5l1.5-1.5" />
    </svg>
  ),
  tree: (
    <svg viewBox="0 0 24 24">
      <path d="M12 3v6M12 9c0 3-6 2-6 5v1M12 9c0 3 6 2 6 5v1" />
      <rect x="9" y="18" width="6" height="4" rx="1.4" />
      <rect x="3" y="18" width="6" height="4" rx="1.4" />
      <rect x="15" y="18" width="6" height="4" rx="1.4" />
    </svg>
  ),
  ground: (
    <svg viewBox="0 0 24 24">
      <path d="M3 12c2.5-4 6-6 9-6s6.5 2 9 6c-2.5 4-6 6-9 6s-6.5-2-9-6Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  ),
  saved: (
    <svg viewBox="0 0 24 24">
      <path d="M6 3.5h12a1.5 1.5 0 0 1 1.5 1.5v15.2a.8.8 0 0 1-1.25.66L12 16.6l-6.25 4.26A.8.8 0 0 1 4.5 20.2V5A1.5 1.5 0 0 1 6 3.5Z" />
    </svg>
  ),
};

/** Extra glyphs for the stop sheet, where two options share the worry hue. */
export const MIC_ICON = (
  <svg viewBox="0 0 24 24">
    <rect x="9" y="2.5" width="6" height="11.5" rx="3" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.5M9 21.5h6" />
  </svg>
);

export const PARK_ICON = (
  <svg viewBox="0 0 24 24">
    <path d="M4.5 6.5h15M4.5 12h15M4.5 17.5h9" />
    <circle cx="17.5" cy="17.5" r="3.2" />
    <path d="M17.5 15.9v1.7l1.1.7" />
  </svg>
);

/** Inline style that points `.ico` at a given section's hue. */
export const hueStyle = (hue: Hue) =>
  ({ "--tile-pale": `var(--c-${hue}-pale)`, "--tile-ink": `var(--c-${hue}-ink)` }) as React.CSSProperties;
