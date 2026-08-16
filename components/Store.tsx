"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as db from "@/lib/db";
import type { Clip, GroundRound, Parked, Settings, TreeEntry } from "@/lib/db";

type Store = {
  ready: boolean;
  settings: Settings;
  parked: Parked[];
  tree: TreeEntry[];
  ground: GroundRound[];
  clips: Clip[];
  saveSettings: (s: Settings) => Promise<void>;
  addParked: (text: string) => Promise<void>;
  toggleParked: (row: Parked) => Promise<void>;
  addTree: (entry: Omit<TreeEntry, "ts">) => Promise<void>;
  addGround: (round: Omit<GroundRound, "ts">) => Promise<void>;
  addClip: (clip: Omit<Clip, "ts">) => Promise<void>;
  setTranscript: (clip: Clip, transcript: string) => Promise<void>;
  drop: (store: "parked" | "tree" | "ground" | "clips", ts: number) => Promise<void>;
  wipe: () => Promise<void>;
};

const Ctx = createContext<Store | null>(null);

/** Everything lives on the device. This is the only thing that touches it. */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>({ mins: db.DEFAULT_MINS });
  const [parked, setParked] = useState<Parked[]>([]);
  const [tree, setTree] = useState<TreeEntry[]>([]);
  const [ground, setGround] = useState<GroundRound[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);

  useEffect(() => {
    let live = true;
    (async () => {
      const [s, p, t, g, c] = await Promise.all([
        db.getSettings(),
        db.all("parked"),
        db.all("tree"),
        db.all("ground"),
        db.all("clips"),
      ]);
      if (!live) return;
      setSettings(s);
      setParked(p);
      setTree(t);
      setGround(g);
      setClips(c);
      setReady(true);
    })();
    return () => {
      live = false;
    };
  }, []);

  const saveSettings = useCallback(async (s: Settings) => {
    setSettings(s);
    await db.putSettings(s);
  }, []);

  const addParked = useCallback(async (text: string) => {
    const ts = await db.freeKey("parked", Date.now());
    const row: Parked = { ts, text, done: false };
    setParked((rows) => [row, ...rows]);
    await db.put("parked", row);
  }, []);

  const toggleParked = useCallback(async (row: Parked) => {
    const next = { ...row, done: !row.done };
    setParked((rows) => rows.map((r) => (r.ts === row.ts ? next : r)));
    await db.put("parked", next);
  }, []);

  const addTree = useCallback(async (entry: Omit<TreeEntry, "ts">) => {
    const ts = await db.freeKey("tree", Date.now());
    const row: TreeEntry = { ...entry, ts };
    setTree((rows) => [row, ...rows]);
    await db.put("tree", row);
  }, []);

  const addGround = useCallback(async (round: Omit<GroundRound, "ts">) => {
    const ts = await db.freeKey("ground", Date.now());
    const row: GroundRound = { ...round, ts };
    setGround((rows) => [row, ...rows]);
    await db.put("ground", row);
  }, []);

  const addClip = useCallback(async (clip: Omit<Clip, "ts">) => {
    const ts = await db.freeKey("clips", Date.now());
    const row: Clip = { ...clip, ts };
    setClips((rows) => [row, ...rows]);
    await db.put("clips", row);
  }, []);

  const setTranscript = useCallback(async (clip: Clip, transcript: string) => {
    const next = { ...clip, transcript };
    setClips((rows) => rows.map((r) => (r.ts === clip.ts ? next : r)));
    await db.put("clips", next);
  }, []);

  const drop = useCallback(async (store: "parked" | "tree" | "ground" | "clips", ts: number) => {
    if (store === "parked") setParked((r) => r.filter((x) => x.ts !== ts));
    if (store === "tree") setTree((r) => r.filter((x) => x.ts !== ts));
    if (store === "ground") setGround((r) => r.filter((x) => x.ts !== ts));
    if (store === "clips") setClips((r) => r.filter((x) => x.ts !== ts));
    await db.remove(store, ts);
  }, []);

  const wipe = useCallback(async () => {
    setParked([]);
    setTree([]);
    setGround([]);
    setClips([]);
    setSettings({ mins: db.DEFAULT_MINS });
    await db.clearAll();
  }, []);

  const value = useMemo<Store>(
    () => ({
      ready,
      settings,
      parked,
      tree,
      ground,
      clips,
      saveSettings,
      addParked,
      toggleParked,
      addTree,
      addGround,
      addClip,
      setTranscript,
      drop,
      wipe,
    }),
    [ready, settings, parked, tree, ground, clips, saveSettings, addParked, toggleParked, addTree, addGround, addClip, setTranscript, drop, wipe],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside StoreProvider");
  return v;
}
