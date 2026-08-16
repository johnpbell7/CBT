"use client";

import type { Tab } from "@/lib/tabs";
import { TABS } from "@/lib/tabs";

const ICONS: Record<Tab, React.ReactElement> = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.6 10.4 12 3.6l8.4 6.8V20a1.4 1.4 0 0 1-1.4 1.4H5a1.4 1.4 0 0 1-1.4-1.4Z" />
      <path d="M9.6 21.4v-6.2h4.8v6.2" />
    </svg>
  ),
  worry: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9.5V13l2.5 1.5M9 2h6M18.5 5.5l1.5-1.5" />
    </svg>
  ),
  tree: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v6M12 9c0 3-6 2-6 5v1M12 9c0 3 6 2 6 5v1" />
      <rect x="9" y="18" width="6" height="4" rx="1.4" />
      <rect x="3" y="18" width="6" height="4" rx="1.4" />
      <rect x="15" y="18" width="6" height="4" rx="1.4" />
    </svg>
  ),
  ground: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12c2.5-4 6-6 9-6s6.5 2 9 6c-2.5 4-6 6-9 6s-6.5-2-9-6Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  ),
  saved: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3.5h12a1.5 1.5 0 0 1 1.5 1.5v15.2a.8.8 0 0 1-1.25.66L12 16.6l-6.25 4.26A.8.8 0 0 1 4.5 20.2V5A1.5 1.5 0 0 1 6 3.5Z" />
    </svg>
  ),
};

export default function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="tabbar" role="tablist" aria-label="Sections">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={tab === t.id}
          aria-controls={`v-${t.id}`}
          onClick={() => onChange(t.id)}
        >
          {ICONS[t.id]}
          {t.label}
        </button>
      ))}
    </nav>
  );
}
