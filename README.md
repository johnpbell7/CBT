# Worry Time

A four-part CBT practice toolkit, mobile-first, installable to the Home Screen.

| Tab | What it does |
|---|---|
| **Home** | A large STOP button that opens a sheet asking what you need and routes you to the right tool, then a greeting, a tile per tool, and the daily diary — a 1–5 mood scale, feeling words, and an optional note. A parked-worry count appears here when there is one. |
| **Worry time** | Ring countdown (10/15/20/custom) with pause, resume, chime and haptic at zero. Voice recorder with a live level meter. A parked-worries list for capturing a worry now and dealing with it in the slot. |
| **Worry tree** | Name the worry → *can you do something about it?* → *can you do it now?* → act now, make a plan, or let go. The let-go branch scrunches the worry into a bin. |
| **5–4–3–2–1** | Grounding, one sense per screen. Type the items or speak them — speech fills the slots and advances the sense. |
| **Saved** | Recordings with transcripts, diary check-ins, worry tree outcomes and grounding rounds. Delete individually, export everything, or clear the lot. |

## Where the data lives

On the device, in IndexedDB (`worrytime`, v2), and nowhere else. No account, no
server-side storage, no analytics, no third-party scripts. Audio is stored as a
Blob, so recordings survive closing the app.

The single exception is transcription: pressing **Transcribe** posts that one
clip to `/api/transcribe`, which hands it to Whisper and returns the text. The
audio is held in memory for the life of the request — never written to disk,
never logged, never persisted. On browsers without live dictation there is an
opt-in switch (off by default) to do that automatically for new clips.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build
npm run typecheck    # tsc --noEmit
```

Recording needs a secure origin. `localhost` counts; opening the files over
`file://` does not.

### Environment

```
OPENAI_API_KEY=            # server-only, transcription
TRANSCRIBE_MAX_MB=20       # upload cap, defaults to 20
```

Set both in Vercel for Preview and Production. Without `OPENAI_API_KEY` the app
works fully except that Transcribe returns a clear "not configured" message.

## Layout

```
app/
  layout.tsx              metadata, viewport, manifest
  page.tsx                shell — tab state, #hash mirror, body[data-tab]
  globals.css             the prototype's CSS, verbatim
  manifest.ts
  api/transcribe/route.ts Whisper proxy — holds nothing
components/               TabBar, Home, StopSheet, icons, Diary, MoodFace,
                          WorryTime, Timer, Recorder, ParkedList, WorryTree,
                          ScrunchBin, Grounding, Saved, Store
lib/
  db.ts                   idb wrapper, typed accessors
  recorder.ts             MediaRecorder + AnalyserNode + SpeechRecognition (React-free)
  audio.ts                chime, rustle, thud (WebAudio)
  haptics.ts              navigator.vibrate guards
  wakelock.ts             Screen Wake Lock guards
  zip.ts                  dependency-free store-only ZIP for the export
  format.ts, tabs.ts
scripts/make-icons.mjs    regenerates public/icons/* with no image deps
docs/reference/worry-toolkit.html   design reference
```

One route with tabs as state — a router transition would cut the fade and the
tint cross-fade. All four sections stay mounted so a running timer survives a
tab change.

## Design

`app/globals.css` is a verbatim copy of the prototype's stylesheet: the custom
property system, the per-tab tint swap on `body[data-tab]`, and the scrunch,
crease and bump keyframes. It is not to be refactored into utilities, and there
is no dark scheme by design. Additions live in a marked block at the foot of
the file.

The STOP button is deliberately clay (`--stop`), not alarm red: it is pressed
by someone already distressed, and a klaxon escalates. Its sheet is portalled
to `<body>` because `main` establishes a stacking context at `z-index:1`, which
would otherwise trap it beneath the tab bar. The sheet carries a crisis line
with UK numbers — change these if the user base isn't UK.

The Home tab is an addition beyond the signed-off prototype, built to the
same recipe rather than around it: a fifth tint (`body[data-tab="home"]`) in
the same family as the four section hues, and dashboard tiles that each carry
their own section's colour so the home screen previews the system. The mood
scale is drawn as stroked SVG faces, not emoji, to match the tab icons. This
divergence from `docs/reference` is deliberate — do not "correct" it.

Icons are generated, not hand-drawn — `node scripts/make-icons.mjs` rewrites
all four PNGs from a tiny rasteriser, so there is no binary asset to maintain.

## Browser notes

- iOS produces `audio/mp4`, everything else `audio/webm`. The mime is read off
  the blob and drives the download extension; it is never hardcoded.
- `SpeechRecognition` needs Settings → General → Keyboard → **Dictation** on
  iOS. Firefox has none, so the server route is the only path there.
- `navigator.vibrate` does not exist on iOS; the guards return silently.
- A denied microphone permission is sticky per origin — the error copy says to
  change it in browser settings rather than just retrying.

## Deployment

Two shapes from one source tree, selected by environment variable.

**GitHub Pages** (`.github/workflows/pages.yml`, on every push to the
development branch): `STATIC_EXPORT=1 PAGES_BASE_PATH=/CBT npm run build`
produces `out/`, served at `https://johnpbell7.github.io/CBT/`. The workflow
removes `app/api` first, because a static host has no server to run the Whisper
proxy on — the Saved tab detects this (`NEXT_PUBLIC_STATIC`) and hides the
Transcribe button rather than offering one that can only fail. Live dictation
still works, because that runs in the browser.

**Vercel**: no configuration, no flags — import the repo and it builds the
server shape with `/api/transcribe` live. Set `OPENAI_API_KEY` and
`TRANSCRIBE_MAX_MB` for Preview and Production.

Both are driven from `next.config.ts`; `lib/base.ts` carries the base path and
static flag into the client so the manifest, icons and service worker resolve
correctly under a subpath.
