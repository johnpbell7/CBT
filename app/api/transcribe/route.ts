import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_MB = Number(process.env.TRANSCRIBE_MAX_MB || 20);
const MAX_BYTES = Math.max(1, MAX_MB) * 1024 * 1024;

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;

/* Best-effort throttle. Serverless instances are not shared, so this bounds a
   single warm instance rather than the fleet — enough to stop a hot loop. */
const hits = new Map<string, number[]>();

function limited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 500) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return recent.length > MAX_PER_WINDOW;
}

function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : "") || req.headers.get("x-real-ip") || "anon";
}

/**
 * Forwards one audio blob to Whisper and returns the text.
 *
 * The audio is held in memory for the life of the request and nothing else:
 * it is never written to disk, never logged, never persisted. Errors are
 * reported without echoing any part of the body.
 */
export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Transcription isn't configured on this deployment." },
      { status: 503 },
    );
  }

  if (limited(clientKey(req))) {
    return NextResponse.json(
      { error: "Too many transcription requests. Wait a minute and try again." },
      { status: 429 },
    );
  }

  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > MAX_BYTES) {
    return NextResponse.json({ error: `That clip is over the ${MAX_MB} MB limit.` }, { status: 413 });
  }

  let audio: File;
  try {
    const form = await req.formData();
    const value = form.get("audio");
    if (!(value instanceof File)) {
      return NextResponse.json({ error: "No audio was attached." }, { status: 400 });
    }
    audio = value;
  } catch {
    return NextResponse.json({ error: "That upload couldn't be read." }, { status: 400 });
  }

  if (audio.size === 0) {
    return NextResponse.json({ error: "That clip is empty." }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: `That clip is over the ${MAX_MB} MB limit.` }, { status: 413 });
  }

  const upstream = new FormData();
  upstream.append("file", audio, audio.name || "clip.webm");
  upstream.append("model", "whisper-1");
  upstream.append("response_format", "json");

  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: upstream,
    });

    if (!res.ok) {
      // Status only — the upstream body can quote the audio's filename.
      return NextResponse.json(
        { error: `The speech service refused that clip (${res.status}).` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { text?: string };
    return NextResponse.json(
      { text: (data.text || "").trim() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Couldn't reach the speech service." }, { status: 502 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "POST an audio file." }, { status: 405 });
}
