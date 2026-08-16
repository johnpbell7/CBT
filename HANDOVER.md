# Handover — Worry Time (CBT toolkit) → production build

**For:** Claude Code
**From:** design prototype `docs/reference/worry-toolkit.html` (single-file HTML, fully working except mic on `file://`)
**Goal:** ship the same app as a real Next.js PWA where recording, transcription and saved data all genuinely work, installable on iPhone.

---

## 0. Kickoff prompt (paste this into Claude Code)

> Read `HANDOVER.md` and `docs/reference/worry-toolkit.html` in full before writing any code. Build Phase 1 exactly as specified. The prototype is the design source of truth — port its CSS verbatim rather than re-authoring it. Work on the staging branch only; do not merge to `main`.

---

## 1. What this is

A four-part CBT practice tool, mobile-first, one screen at a time with a bottom tab bar:

| Tab | Function |
|---|---|
| **Worry time** | Ring countdown timer (10/15/20/custom), pause/resume, chime + haptic at zero. Voice recorder with live level meter. "Parked worries" list — capture a worry now, deal with it in the slot. |
| **Worry tree** | Guided flow: name the worry → *can you do something about it?* → *can you do it now?* → one of three outcomes (act now / make a plan / hypothetical). The hypothetical branch scrunches the worry into a bin, with animation and sound. |
| **5–4–3–2–1** | Grounding, one sense per screen. Type items or speak them — speech fills the slots automatically and the round is recorded. |
| **Saved** | Recordings with transcripts, worry tree outcomes, grounding rounds. Delete individually or clear all. |

It handles personal, sensitive content. That drives the architecture in §4.

---

## 2. Stack

- **Next.js 15**, App Router, TypeScript, React 19
- **Vercel** hosting (staging branch domain + production)
- **No UI framework.** No Tailwind, no shadcn, no component library.
- `idb` (IndexedDB wrapper) for local persistence
- Server transcription route calling **OpenAI Whisper** (`whisper-1`) — swap-in alternative: Deepgram `nova-3`

### Why no Tailwind
The prototype's look is a hand-tuned custom-property system with keyframe animation that a utility rewrite will not reproduce faithfully. Copy `<style>` from the prototype into `app/globals.css` **unchanged**, then build components against those class names. This is the single most important instruction in this document.

---

## 3. Design fidelity — do not redesign

The prototype is signed off. Preserve exactly:

- **All CSS custom properties**, including the per-tab tint swap driven by `body[data-tab="…"]`. Light mode only — there is no dark scheme, do not add one.
- **Palette** — mint `#4CC0AC` / periwinkle `#8B92E4` / apricot `#F2A868` / blossom `#F095AE`, each with `--tint-ink`, `--tint-pale`, `--tint-soft`, `--tint-line`, `--tint-nil`. Buttons are pastel fills with deep-ink text.
- **Typography** — `-apple-system` stack, 34px/-0.9px large titles, tabular numerals on the clock.
- **The scrunch-and-bin animation** — the `scrunch` and `crease` keyframes, the 1.3s duration, the runtime `--tx`/`--ty` measurement from note centre to bin mouth, the lid opening at 620ms, the bump on landing, the synthesised rustle and thud, the haptic at 1180ms. Port the timings verbatim.
- **All microcopy.** The wording was chosen for clinical tone. Don't rewrite it.
- `prefers-reduced-motion` handling throughout — the bin skips straight to its end state.
- Safe-area insets (`env(safe-area-inset-*)`) on the tab bar and header.

Anything not listed here is yours to structure sensibly.

---

## 4. Data model and where it lives

**Local-first, on-device, no account, no server storage of content.** Someone's spoken worries should not sit in a database they didn't ask for. This also removes auth, RLS and GDPR scope from Phase 1.

**IndexedDB** (`idb`), database `worrytime`, version 1:

```ts
// store: 'meta'      key 'settings' → { mins: number }
// store: 'parked'    key ts         → { ts, text, done }
// store: 'tree'      key ts         → { ts, text, kind: 'let-go'|'do-now'|'plan', plan, planWhen }
// store: 'ground'    key ts         → { ts, items: string[][], said: string }
// store: 'clips'     key ts         → { ts, tag, secs, mime, blob: Blob, transcript: string }
```

Audio goes in IndexedDB **as a Blob** — this fixes the prototype's biggest limitation, where recordings vanished on reload. Create object URLs on render and revoke them on unmount. Add a per-clip download, plus an "Export everything" that produces a zip of audio files and a JSON of the text.

Do **not** add Supabase in Phase 1. If sync is wanted later, see §9 — and note that per the staging workflow, any Supabase schema work lands in production immediately and must be flagged before it's done.

---

## 5. Recording — the part that must work

The prototype fails only because `file://` and sandboxed iframes aren't secure origins. On an https deployment `getUserMedia` works; build it properly regardless.

**Capture**
- `navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })`
- `MediaRecorder` with negotiated mime: try `audio/webm;codecs=opus`, then `audio/mp4` (Safari), else default. Store the resolved mime on the clip and use it for the file extension (`.webm` / `.m4a`).
- Level meter from an `AnalyserNode`, 16 bars, unchanged from the prototype.
- Release every track on stop; close the `AudioContext`. Stop recording on `visibilitychange` → hidden, and on route/tab change.
- Error states, verbatim from the prototype: `NotAllowedError` → permission copy; anything else → unsupported copy.

**Transcription — two paths, in this order**

1. **Live, on-device-ish:** `SpeechRecognition` / `webkitSpeechRecognition`, `continuous`, `interimResults`, `lang = navigator.language || 'en-GB'`, auto-restart on `onend` while still recording. Powers the 5–4–3–2–1 auto-fill via the existing `splitPhrase()` logic. Works Chrome + Safari (iOS needs Settings → General → Keyboard → **Dictation** on). Not Firefox.
2. **Server fallback:** `POST /api/transcribe` (Route Handler, `runtime = 'nodejs'`, `maxDuration = 60`). Accepts the audio blob as multipart, forwards to Whisper, returns `{ text }`. **Never write the audio to disk, never log the body, never persist it** — the request holds it in memory and it dies with the response. Say so in the UI: a one-line note that the clip is sent for transcription and not kept.

Wire the fallback to (a) an explicit "Transcribe" button on any saved clip, and (b) automatic use when `SpeechRecognition` is absent. Rate-limit the route and cap upload size (~20 MB).

---

## 6. PWA — installable, offline, feels native

- `app/manifest.ts` — `display: 'standalone'`, `start_url: '/'`, `theme_color: '#FBFAFC'`, `background_color: '#FBFAFC'`, `orientation: 'portrait'`, icons at 192/512 plus a maskable 512.
- `apple-touch-icon.png` at 180×180 — iOS ignores the manifest icons.
- `viewport-fit=cover`, `apple-mobile-web-app-capable`, status bar style `default`.
- Service worker (hand-rolled or `@serwist/next`) caching the app shell so it opens offline. Everything except server transcription works with no connection.
- **Screen Wake Lock** while the timer runs, released on pause/finish/hide — the screen must not sleep mid-session.
- Timer keeps using absolute timestamps (`endAt`) with a `visibilitychange` resync, so backgrounding doesn't drift it.
- Optional: local notification when the timer ends. On iOS this needs the PWA installed to the Home Screen (16.4+) — feature-detect, never assume.

---

## 7. Structure

```
app/
  layout.tsx            metadata, viewport, manifest link
  page.tsx              shell — tab state, syncs to #hash, sets body[data-tab]
  globals.css           the prototype's CSS, verbatim
  api/transcribe/route.ts
components/
  TabBar.tsx  WorryTime.tsx  Timer.tsx  Recorder.tsx  ParkedList.tsx
  WorryTree.tsx  ScrunchBin.tsx  Grounding.tsx  Saved.tsx
lib/
  db.ts          idb wrapper, typed accessors
  recorder.ts    MediaRecorder + AnalyserNode + SpeechRecognition, framework-agnostic
  audio.ts       chime, rustle, thud (WebAudio, ported as-is)
  haptics.ts     navigator.vibrate guards
docs/reference/worry-toolkit.html
```

Single route, tabs as state — a router transition would break the fade and the tint cross-fade. Mirror the tab into `location.hash` so the phone's back gesture behaves.

All four tab components are client components. Keep `lib/recorder.ts` free of React so its lifecycle isn't fighting Strict Mode double-mounts.

---

## 8. Phase 1 acceptance criteria

Ship nothing until all of these pass **on a real iPhone via the staging URL**, not just desktop Chrome:

- [ ] Visually indistinguishable from the prototype, side by side, on a 390px viewport
- [ ] Timer: correct countdown, pause/resume, custom length, chime + haptic at zero, accurate after 5 minutes backgrounded, screen stays awake
- [ ] Recording works in Safari iOS and Chrome Android; permission denial shows the right message and recovers on retry
- [ ] A recording survives a full app close and reopen, plays back, and downloads with a valid extension
- [ ] Speaking during 5–4–3–2–1 fills the slots and advances the sense; the round's transcript appears in Saved
- [ ] `/api/transcribe` returns text for a `.webm` and an `.m4a`; server keeps nothing
- [ ] Worry tree: all three branches; the bin animation runs at the prototype's timings and lands in the bin
- [ ] Reduced motion: no animation anywhere, bin still reaches its end state
- [ ] Installs to Home Screen, opens standalone with correct icon and safe areas, works offline apart from server transcription
- [ ] Lighthouse PWA passes; no console errors; `next build` clean with zero TS errors
- [ ] No analytics, no third-party scripts, no content leaving the device except an explicit transcription request

---

## 9. Later phases — don't build these yet

- **Scheduled worry time** — a daily slot with a notification, and "next slot" shown on the parked-worries list
- **Cloud sync** — Supabase auth + encrypted-at-rest sync, opt-in per user. Schema work hits production the moment it's applied to a shared DB, so flag it first and consider a second free Supabase project as the staging database
- **Practitioner mode** — export a session summary as PDF for a client, no audio
- **Thought record** — the fifth CBT module, the obvious next one after these four

---

## 10. Working agreement

- Build on the **staging branch**. Push there, it auto-deploys, report the staging URL and what to test on the phone.
- **Never merge to `main` without the word "launch".** Features batch up on staging and ship together.
- Run `next build` and the type check before every push; never push red.
- Flag anything that touches a database **before** doing it.
- Commit the prototype at `docs/reference/worry-toolkit.html` on the first commit so the design reference lives in the repo.

---

## 11. Env vars

```
OPENAI_API_KEY=            # server-only, transcription
TRANSCRIBE_MAX_MB=20
```

Set in Vercel for Preview and Production. Nothing else is required — Phase 1 has no database and no auth.

---

## 12. Known browser edges

- iOS Safari: `SpeechRecognition` needs Dictation enabled in Settings; without it, audio still records and the server route handles the text.
- iOS produces `audio/mp4`, everything else `audio/webm` — always read the mime off the blob, never hardcode.
- Firefox has no `SpeechRecognition` — server fallback only.
- `navigator.vibrate` is unsupported on iOS; the guards must not throw.
- A permission denied once is sticky per origin; the error copy must tell the user to change it in browser settings rather than just retrying.
