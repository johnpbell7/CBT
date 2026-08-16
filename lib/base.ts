/**
 * Where the app is mounted. Empty on a normal deploy; "/CBT" on GitHub Pages.
 * Inlined at build time by next.config.ts.
 */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** True when built as a static export — no server, so no transcription route. */
export const STATIC = process.env.NEXT_PUBLIC_STATIC === "1";

/** Prefix an app-absolute path with the base path. */
export const at = (path: string) => `${BASE}${path}`;
