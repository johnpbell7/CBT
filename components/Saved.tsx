"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/components/Store";
import MoodFace, { moodLabel } from "@/components/MoodFace";
import { useDictation } from "@/components/useDictation";
import type { Clip, TreeKind } from "@/lib/db";
import { at, STATIC } from "@/lib/base";
import { extFor } from "@/lib/recorder";
import { download, mmss, stamp, when } from "@/lib/format";
import { buzz, TAP } from "@/lib/haptics";
import { zip } from "@/lib/zip";

const KIND_LABEL: Record<TreeKind, string> = {
  "let-go": "Hypothetical — let go",
  "do-now": "Acted on it",
  plan: "Made a plan",
};

const SENSE_LABEL = ["See", "Feel", "Hear", "Smell", "Taste"];

export default function Saved({ active }: { active: boolean }) {
  const { clips, tree, ground, diary, drop, wipe, setTranscript, settings, saveSettings } = useStore();

  const [busy, setBusy] = useState<number | null>(null);
  const [failed, setFailed] = useState<Record<number, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [exporting, setExporting] = useState(false);

  const liveDictation = useDictation();

  /* One object URL per clip, revoked when the clip goes or the tab unmounts. */
  const urls = useRef(new Map<number, string>());
  const [, forceUrls] = useState(0);
  useEffect(() => {
    const map = urls.current;
    let changed = false;
    const keep = new Set(clips.map((c) => c.ts));
    for (const [ts, url] of map) {
      if (!keep.has(ts)) {
        URL.revokeObjectURL(url);
        map.delete(ts);
        changed = true;
      }
    }
    for (const c of clips) {
      if (!map.has(c.ts)) {
        map.set(c.ts, URL.createObjectURL(c.blob));
        changed = true;
      }
    }
    if (changed) forceUrls((n) => n + 1);
  }, [clips]);

  useEffect(() => {
    const map = urls.current;
    return () => {
      for (const url of map.values()) URL.revokeObjectURL(url);
      map.clear();
    };
  }, []);

  const transcribe = useCallback(
    async (clip: Clip) => {
      setBusy(clip.ts);
      setFailed((f) => {
        const next = { ...f };
        delete next[clip.ts];
        return next;
      });
      try {
        const form = new FormData();
        form.append("audio", clip.blob, `clip.${extFor(clip.mime)}`);
        const res = await fetch(at("/api/transcribe"), { method: "POST", body: form });
        const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
        if (!res.ok) throw new Error(data.error || `Transcription failed (${res.status})`);
        await setTranscript(clip, (data.text || "").trim() || "(nothing audible)");
      } catch (err) {
        setFailed((f) => ({ ...f, [clip.ts]: err instanceof Error ? err.message : "Transcription failed" }));
      } finally {
        setBusy(null);
      }
    },
    [setTranscript],
  );

  /* Opt-in only. Nothing leaves the device unless it was asked for. */
  const attempted = useRef(new Set<number>());
  useEffect(() => {
    if (!active || liveDictation !== false || !settings.autoTranscribe) return;
    const next = clips.find((c) => !c.transcript && !attempted.current.has(c.ts));
    if (!next || busy !== null) return;
    attempted.current.add(next.ts);
    void transcribe(next);
  }, [active, busy, clips, liveDictation, settings.autoTranscribe, transcribe]);

  const exportAll = useCallback(async () => {
    setExporting(true);
    try {
      const files = clips.map((c) => ({
        name: `audio/${stamp(c.ts)}-${c.ts}.${extFor(c.mime)}`,
        blob: c.blob,
      }));
      const text = {
        exported: new Date().toISOString(),
        recordings: clips.map((c) => ({
          at: new Date(c.ts).toISOString(),
          tag: c.tag,
          seconds: c.secs,
          file: `audio/${stamp(c.ts)}-${c.ts}.${extFor(c.mime)}`,
          transcript: c.transcript,
        })),
        worryTree: tree.map((t) => ({
          at: new Date(t.ts).toISOString(),
          worry: t.text,
          outcome: KIND_LABEL[t.kind],
          plan: t.plan,
          when: t.planWhen,
        })),
        diary: diary.map((d) => ({
          at: new Date(d.ts).toISOString(),
          mood: `${d.mood}/5 — ${moodLabel(d.mood)}`,
          feelings: d.feelings,
          note: d.note,
        })),
        grounding: ground.map((g) => ({
          at: new Date(g.ts).toISOString(),
          items: Object.fromEntries(SENSE_LABEL.map((label, i) => [label, g.items[i] ?? []])),
          spoken: g.said,
        })),
      };
      files.push({
        name: "worry-time.json",
        blob: new Blob([JSON.stringify(text, null, 2)], { type: "application/json" }),
      });
      download(await zip(files), `worry-time-${stamp(Date.now())}.zip`);
    } finally {
      setExporting(false);
    }
  }, [clips, diary, ground, tree]);

  const nothingSaved =
    clips.length === 0 && tree.length === 0 && ground.length === 0 && diary.length === 0;

  return (
    <section className={`view${active ? " on" : ""}`} id="v-saved" aria-labelledby="t-saved" role="tabpanel">
      <h1 id="t-saved">Saved</h1>
      <p className="lede">Sessions you&apos;ve logged, plans you&apos;ve made, and anything you&apos;ve recorded.</p>

      <h2>Recordings</h2>
      <div className="card tight">
        {clips.length === 0 ? (
          <div className="empty">
            <strong>No recordings yet</strong>
            Anything you record on the worry time tab shows up here.
          </div>
        ) : (
          clips.map((c) => (
            <div className="clip" key={c.ts}>
              <div className="clip-body">
                <div className="row" style={{ padding: 0, border: "none" }}>
                  <div className="grow">
                    <div style={{ fontSize: "15.5px" }}>{when(c.ts)}</div>
                    <div className="tiny num">
                      {c.tag} · {mmss(c.secs, false)} · {extFor(c.mime).toUpperCase()}
                    </div>
                  </div>
                  <button
                    className="del"
                    aria-label="Delete recording"
                    onClick={() => {
                      buzz(TAP);
                      void drop("clips", c.ts);
                    }}
                  >
                    ×
                  </button>
                </div>

                <audio controls preload="none" src={urls.current.get(c.ts)} />

                {c.transcript && <p className="transcript">{c.transcript}</p>}
                {failed[c.ts] && <div className="err">{failed[c.ts]}</div>}

                <div className="btn-row" style={{ marginTop: 10 }}>
                  {/* No server on a static host, so don't offer a button that
                      can only fail. */}
                  {!STATIC && (
                    <button
                      className="btn plain sm"
                      disabled={busy === c.ts}
                      onClick={() => void transcribe(c)}
                    >
                      {busy === c.ts ? <span className="spin" /> : null}
                      {busy === c.ts ? "Transcribing" : c.transcript ? "Transcribe again" : "Transcribe"}
                    </button>
                  )}
                  <button
                    className="btn plain sm"
                    onClick={() => download(c.blob, `worry-time-${stamp(c.ts)}.${extFor(c.mime)}`)}
                  >
                    Download
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {clips.length > 0 && (
        <p className="tiny" style={{ margin: "8px 6px 0" }}>
          {STATIC
            ? "This build has no server, so recordings can't be sent off for transcription — anything spoken while your browser was listening is kept, and everything stays on this device."
            : "Transcribing sends that one clip to the server, which passes it straight to the speech service and keeps nothing — it isn't written to disk or logged. Everything else stays on this device."}
        </p>
      )}

      {!STATIC && liveDictation === false && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="row" style={{ padding: 0, border: "none" }}>
            <div className="grow">
              <div style={{ fontSize: "15.5px" }}>Transcribe new recordings automatically</div>
              <div className="tiny">
                This browser has no live dictation. Turning this on sends each new clip for transcription as
                soon as you finish it. Off by default.
              </div>
            </div>
            <button
              className="check"
              data-done={Boolean(settings.autoTranscribe)}
              role="switch"
              aria-checked={Boolean(settings.autoTranscribe)}
              aria-label="Transcribe new recordings automatically"
              onClick={() => {
                buzz(TAP);
                void saveSettings({ ...settings, autoTranscribe: !settings.autoTranscribe });
              }}
            >
              {settings.autoTranscribe && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12.5 9.5 18 20 6.5" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      <h2>Daily diary</h2>
      <div className="card tight">
        {diary.length === 0 ? (
          <div className="empty">
            <strong>No check-ins yet</strong>
            How you felt each day collects here.
          </div>
        ) : (
          diary.map((d) => (
            <div className="row" key={d.ts}>
              <div className="entry grow">
                <span className="face">
                  <MoodFace level={d.mood} />
                </span>
                <div className="grow">
                  <div style={{ fontSize: "15.5px" }}>{moodLabel(d.mood)}</div>
                  <div className="tiny">{when(d.ts)}</div>
                  {d.feelings.length > 0 && (
                    <div className="muted" style={{ marginTop: 4 }}>
                      {d.feelings.join(", ")}
                    </div>
                  )}
                  {d.note && (
                    <p className="transcript" style={{ marginTop: 6 }}>
                      {d.note}
                    </p>
                  )}
                </div>
              </div>
              <button
                className="del"
                aria-label="Delete check-in"
                onClick={() => {
                  buzz(TAP);
                  void drop("diary", d.ts);
                }}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      <h2>Worry tree</h2>
      <div className="card tight">
        {tree.length === 0 ? (
          <div className="empty">
            <strong>Nothing worked through yet</strong>
            Outcomes from the worry tree collect here.
          </div>
        ) : (
          tree.map((t) => (
            <div className="row" key={t.ts}>
              <div className="grow">
                <div style={{ fontSize: "15.5px" }}>{t.text}</div>
                <div className="tiny">
                  {when(t.ts)} · {KIND_LABEL[t.kind]}
                </div>
                {t.plan && (
                  <div className="muted" style={{ marginTop: 4 }}>
                    {t.plan}
                    {t.planWhen ? ` — ${t.planWhen}` : ""}
                  </div>
                )}
              </div>
              <button
                className="del"
                aria-label="Delete entry"
                onClick={() => {
                  buzz(TAP);
                  void drop("tree", t.ts);
                }}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      <h2>Grounding</h2>
      <div className="card tight">
        {ground.length === 0 ? (
          <div className="empty">
            <strong>No rounds yet</strong>
            Finish a 5–4–3–2–1 round and it lands here.
          </div>
        ) : (
          ground.map((g) => (
            <div className="row" key={g.ts}>
              <div className="grow">
                <div style={{ fontSize: "15.5px" }}>
                  {g.items.reduce((n, row) => n + row.length, 0)} things named
                </div>
                <div className="tiny">{when(g.ts)}</div>
                <div className="muted" style={{ marginTop: 4 }}>
                  {g.items
                    .map((row, i) => (row.length ? `${SENSE_LABEL[i]}: ${row.join(", ")}` : ""))
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              <button
                className="del"
                aria-label="Delete round"
                onClick={() => {
                  buzz(TAP);
                  void drop("ground", g.ts);
                }}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      <div className="btn-row" style={{ marginTop: 20 }}>
        <button className="btn plain" onClick={() => void exportAll()} disabled={nothingSaved || exporting}>
          {exporting ? "Preparing…" : "Export everything"}
        </button>
      </div>

      {confirming ? (
        <div className="card" style={{ marginTop: 12 }}>
          <p className="muted" style={{ margin: "0 0 12px" }}>
            This deletes every recording, plan and grounding round on this device. It can&apos;t be undone.
          </p>
          <div className="btn-row">
            <button
              className="btn"
              onClick={() => {
                buzz(TAP);
                void wipe();
                setConfirming(false);
              }}
            >
              Delete everything
            </button>
            <button className="btn plain sm" style={{ flex: "none" }} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          className="btn plain"
          style={{ marginTop: 10 }}
          disabled={nothingSaved}
          onClick={() => {
            buzz(TAP);
            setConfirming(true);
          }}
        >
          Clear saved data
        </button>
      )}

      <p className="foot">
        Recordings are kept on this device only. Export or download one to keep it somewhere else.
      </p>
    </section>
  );
}
