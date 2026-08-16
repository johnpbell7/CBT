import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type Settings = {
  mins: number;
  /** Opt-in: send new clips to /api/transcribe when live dictation is absent. */
  autoTranscribe?: boolean;
};

export type Parked = { ts: number; text: string; done: boolean };

export type TreeKind = "let-go" | "do-now" | "plan";
export type TreeEntry = {
  ts: number;
  text: string;
  kind: TreeKind;
  plan: string;
  planWhen: string;
};

export type GroundRound = { ts: number; items: string[][]; said: string };

export type Clip = {
  ts: number;
  tag: string;
  secs: number;
  mime: string;
  blob: Blob;
  transcript: string;
};

interface WorryDB extends DBSchema {
  meta: { key: string; value: Settings };
  parked: { key: number; value: Parked };
  tree: { key: number; value: TreeEntry };
  ground: { key: number; value: GroundRound };
  clips: { key: number; value: Clip };
}

const DB_NAME = "worrytime";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<WorryDB>> | null = null;

function db() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (!dbPromise) {
    dbPromise = openDB<WorryDB>(DB_NAME, DB_VERSION, {
      upgrade(d) {
        if (!d.objectStoreNames.contains("meta")) d.createObjectStore("meta");
        if (!d.objectStoreNames.contains("parked")) d.createObjectStore("parked", { keyPath: "ts" });
        if (!d.objectStoreNames.contains("tree")) d.createObjectStore("tree", { keyPath: "ts" });
        if (!d.objectStoreNames.contains("ground")) d.createObjectStore("ground", { keyPath: "ts" });
        if (!d.objectStoreNames.contains("clips")) d.createObjectStore("clips", { keyPath: "ts" });
      },
    });
  }
  return dbPromise;
}

/* Every accessor swallows storage failures. A private-mode Safari with
   IndexedDB blocked should degrade to an in-memory session, never a crash. */
async function safe<T>(work: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await work();
  } catch {
    return fallback;
  }
}

/* ---- settings ---- */

export const DEFAULT_MINS = 15;

export async function getSettings(): Promise<Settings> {
  return safe(async () => {
    const d = await db();
    return (await d.get("meta", "settings")) ?? { mins: DEFAULT_MINS };
  }, { mins: DEFAULT_MINS });
}

export async function putSettings(s: Settings): Promise<void> {
  await safe(async () => {
    const d = await db();
    await d.put("meta", s, "settings");
  }, undefined);
}

/* ---- generic keyed stores ---- */

type KeyedStore = "parked" | "tree" | "ground" | "clips";
type ValueOf<S extends KeyedStore> = S extends "parked"
  ? Parked
  : S extends "tree"
    ? TreeEntry
    : S extends "ground"
      ? GroundRound
      : Clip;

/** Newest first — every list in the UI reads that way. */
export async function all<S extends KeyedStore>(store: S): Promise<ValueOf<S>[]> {
  return safe(async () => {
    const d = await db();
    const rows = (await d.getAll(store)) as ValueOf<S>[];
    return rows.sort((a, b) => b.ts - a.ts);
  }, [] as ValueOf<S>[]);
}

export async function put<S extends KeyedStore>(store: S, value: ValueOf<S>): Promise<void> {
  await safe(async () => {
    const d = await db();
    await d.put(store, value as never);
  }, undefined);
}

export async function remove(store: KeyedStore, ts: number): Promise<void> {
  await safe(async () => {
    const d = await db();
    await d.delete(store, ts);
  }, undefined);
}

export async function clearAll(): Promise<void> {
  await safe(async () => {
    const d = await db();
    const stores: (KeyedStore | "meta")[] = ["parked", "tree", "ground", "clips", "meta"];
    await Promise.all(stores.map((s) => d.clear(s as KeyedStore)));
  }, undefined);
}

/**
 * Timestamps double as primary keys, so two things saved in the same
 * millisecond would overwrite each other. Nudge forward until free.
 */
export async function freeKey(store: KeyedStore, from: number): Promise<number> {
  return safe(async () => {
    const d = await db();
    let ts = from;
    while ((await d.getKey(store, ts)) !== undefined) ts += 1;
    return ts;
  }, from);
}
