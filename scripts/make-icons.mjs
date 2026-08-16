/**
 * Renders the app icons with no image dependencies — a tiny PNG encoder over
 * a hand-rasterised clock face in the mint tint.
 *
 *   node scripts/make-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

const BG = [251, 250, 252];
const TINT = [76, 192, 172];
const INK = [30, 132, 116];

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** 4× supersampled coverage of a shape function, so edges read as smooth. */
function render(size, { maskable }) {
  const buf = Buffer.alloc(size * size * 4);
  const S = 4;
  const c = size / 2;
  // Maskable icons lose the outer ~10%, so the art sits inside a safe circle.
  const scale = maskable ? 0.62 : 0.78;
  const rOuter = (size * scale) / 2;
  const ring = Math.max(1, size * 0.052);
  const rInner = rOuter - ring;
  const corner = size * 0.22;

  // Hands at four o'clock — an unmistakable clock at 32px, unlike the
  // symmetric 10:10 of watch photography.
  const hands = [
    { a: -Math.PI / 2 + (Math.PI * 2 * 4) / 12, len: rInner * 0.52, w: size * 0.048 },
    { a: -Math.PI / 2, len: rInner * 0.74, w: size * 0.042 },
  ];
  const dot = size * 0.038;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bgHit = 0;
      let ringHit = 0;
      let handHit = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const px = x + (sx + 0.5) / S;
          const py = y + (sy + 0.5) / S;

          // Background: full bleed for maskable, rounded square otherwise.
          if (maskable) bgHit++;
          else if (inRoundRect(px, py, size, corner)) bgHit++;

          const d = Math.hypot(px - c, py - c);
          if (d <= rOuter && d >= rInner) ringHit++;

          if (Math.hypot(px - c, py - c) <= dot) {
            handHit++;
          } else {
            for (const h of hands) {
              const hx = c + Math.cos(h.a) * h.len;
              const hy = c + Math.sin(h.a) * h.len;
              if (distToSegment(px, py, c, c, hx, hy) <= h.w / 2) {
                handHit++;
                break;
              }
            }
          }
        }
      }
      const n = S * S;
      const i = (y * size + x) * 4;
      const bgA = bgHit / n;
      let r = BG[0];
      let g = BG[1];
      let b = BG[2];
      r = mix(r, TINT[0], ringHit / n);
      g = mix(g, TINT[1], ringHit / n);
      b = mix(b, TINT[2], ringHit / n);
      r = mix(r, INK[0], handHit / n);
      g = mix(g, INK[1], handHit / n);
      b = mix(b, INK[2], handHit / n);
      buf[i] = Math.round(r);
      buf[i + 1] = Math.round(g);
      buf[i + 2] = Math.round(b);
      buf[i + 3] = Math.round(255 * Math.max(bgA, Math.max(ringHit / n, handHit / n)));
    }
  }
  return buf;
}

const mix = (a, b, t) => a + (b - a) * t;

function inRoundRect(x, y, size, r) {
  if (x < 0 || y < 0 || x > size || y > size) return false;
  const cx = Math.min(Math.max(x, r), size - r);
  const cy = Math.min(Math.max(y, r), size - r);
  return Math.hypot(x - cx, y - cy) <= r;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

mkdirSync(OUT, { recursive: true });
const jobs = [
  ["icon-192.png", 192, { maskable: false }],
  ["icon-512.png", 512, { maskable: false }],
  ["icon-512-maskable.png", 512, { maskable: true }],
  ["apple-touch-icon.png", 180, { maskable: true }],
];
for (const [name, size, opts] of jobs) {
  writeFileSync(join(OUT, name), png(size, render(size, opts)));
  console.log("wrote", name, `${size}×${size}`);
}
