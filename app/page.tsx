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
    const fromHash = tabFromHash(window.location.hash);
    if (fromHash) setTab(fromHash);
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
