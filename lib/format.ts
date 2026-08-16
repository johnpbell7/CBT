export const pad = (n: number) => String(n).padStart(2, "0");

/** Seconds → m:ss for the recorder, mm:ss for the clock. */
export function mmss(total: number, padMinutes = true): string {
  const s = Math.max(0, Math.round(total));
  const m = Math.floor(s / 60);
  return `${padMinutes ? pad(m) : m}:${pad(s % 60)}`;
}

export function minutesLabel(mins: number): string {
  return `${mins} minute${mins === 1 ? "" : "s"}`;
}

export function when(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const sameDay =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  const time = `${d.getHours()}:${pad(d.getMinutes())}`;
  if (sameDay) return `Today, ${time}`;
  const yesterday = new Date(today.getTime() - 86400000);
  const wasYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();
  if (wasYesterday) return `Yesterday, ${time}`;
  return `${d.getDate()} ${d.toLocaleString(undefined, { month: "short" })}, ${time}`;
}

export function stamp(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

/** Push a Blob at the browser as a download. */
export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
