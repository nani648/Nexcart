import { writeFileSync } from "fs";
import { deflateSync } from "zlib";

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type), len = Buffer.alloc(4), crc = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function makePNG(size) {
  const W = size, H = size, r = Math.round(size * 0.22);
  const px = Buffer.alloc(W * H * 4);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // Rounded rect
      const dx = Math.max(r - x, 0, x - (W - 1 - r));
      const dy = Math.max(r - y, 0, y - (H - 1 - r));
      if (dx * dx + dy * dy > r * r) continue;

      // Gradient: indigo → blue → cyan
      const t = (x / W + y / H) / 2;
      let rv, gv, bv;
      if (t < 0.5) {
        const s = t * 2;
        rv = Math.round(0x4f + (0x25 - 0x4f) * s);
        gv = Math.round(0x46 + (0x63 - 0x46) * s);
        bv = Math.round(0xe5 + (0xeb - 0xe5) * s);
      } else {
        const s = (t - 0.5) * 2;
        rv = Math.round(0x25 + (0x06 - 0x25) * s);
        gv = Math.round(0x63 + (0xb6 - 0x63) * s);
        bv = Math.round(0xeb + (0xd4 - 0xeb) * s);
      }
      // Top-left highlight
      const hl = Math.max(0, 1 - (x / W * 2 + y / H * 2));
      rv = Math.min(255, rv + Math.round(55 * hl));
      gv = Math.min(255, gv + Math.round(55 * hl));
      bv = Math.min(255, bv + Math.round(55 * hl));

      const i = (y * W + x) * 4;
      px[i] = rv; px[i+1] = gv; px[i+2] = bv; px[i+3] = 255;
    }
  }

  // Draw "N"
  const sw = Math.max(2, Math.round(size * 0.08));
  const nH = Math.round(size * 0.52), nW = Math.round(size * 0.38);
  const x0 = Math.round((W - nW) / 2), x1 = x0 + nW;
  const y0 = Math.round((H - nH) / 2), y1 = y0 + nH;

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const inL = x <= x0 + sw;
      const inR = x >= x1 - sw;
      // Diagonal from (x0,y0) to (x1,y1)
      const ddx = x1 - x0, ddy = y1 - y0, len2 = ddx*ddx + ddy*ddy;
      const tp = ((x - x0) * ddx + (y - y0) * ddy) / len2;
      const tc = Math.max(0, Math.min(1, tp));
      const dist = Math.hypot(x - (x0 + tc * ddx), y - (y0 + tc * ddy));
      const inD = dist <= sw * 0.6;

      if (inL || inR || inD) {
        const i = (y * W + x) * 4;
        if (px[i+3] > 0) { px[i] = 255; px[i+1] = 255; px[i+2] = 255; px[i+3] = 240; }
      }
    }
  }

  // Encode PNG
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6;

  const raw = Buffer.alloc(H * (1 + W * 4));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 4)] = 0;
    px.copy(raw, y * (1 + W * 4) + 1, y * W * 4, (y + 1) * W * 4);
  }

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 6 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

writeFileSync("public/icon-192.png", makePNG(192));
writeFileSync("public/icon-512.png", makePNG(512));
console.log("Icons generated!");
