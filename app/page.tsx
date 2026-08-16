"use client";

import { useCallback, useEffect, useState } from "react";
import TabBar from "@/components/TabBar";
import Home from "@/components/Home";
import WorryTime from "@/components/WorryTime";
import WorryTree from "@/components/WorryTree";
import Grounding from "@/components/Grounding";
import Saved from "@/components/Saved";
import { StoreProvider } from "@/components/Store";
import { tabFromHash, type Tab } from "@/lib/tabs";

/**
 * One route, tabs as state. A router transition would cut the fade and the
 * tint cross-fade; the hash mirror keeps the phone's back gesture honest.
 * Every section stays mounted so a running timer survives a tab change —
 * `.view.on` toggles display, exactly as the prototype did.
 */
export default function Page() {
  const [tab, setTab] = useState<Tab>("home");

  useEffect(() => {
    /* Always open on Home, whatever the URL remembers. A browser restoring
       the last session, or a home-screen icon reopening on #ground, should
       still start at the dashboard. The stale hash is replaced rather than
       pushed, so the back gesture doesn't walk into a tab nobody chose.

       Note this is a fresh load only — coming back to a suspended app does
       not re-run it, so switching away mid-session and returning leaves you
       where you were, timer and all. */
    if (window.location.hash) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    setTab("home");

    const onHash = () => setTab(tabFromHash(window.location.hash) ?? "home");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    document.body.dataset.tab = tab;
  }, [tab]);

  const go = useCallback((next: Tab) => {
    setTab(next);
    // A new entry, so the back gesture walks back through the tabs.
    if (tabFromHash(window.location.hash) !== next) window.location.hash = next;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return (
    <StoreProvider>
      <main>
        <Home active={tab === "home"} onGo={go} />
        <WorryTime active={tab === "worry"} />
        <WorryTree active={tab === "tree"} />
        <Grounding active={tab === "ground"} />
        <Saved active={tab === "saved"} />
      </main>
      <TabBar tab={tab} onChange={go} />
    </StoreProvider>
  );
}
