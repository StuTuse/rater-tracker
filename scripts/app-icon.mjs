import { writeFile, copyFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

// Rasterize the same star-and-leaf artwork used by index.html at high
// resolution for email clients, Windows icon frames, and Android launch art.
const sourceSize = 1024;
const scale = sourceSize / 96;
const star = [[47, 18], [55, 38], [77, 42], [61, 57], [64, 78], [46, 67], [26, 78], [31, 56], [15, 42], [38, 38]];
const leaf = [];
const quadratic = (a, b, c, steps = 32) => {
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, u = 1 - t;
    leaf.push([u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]]);
  }
};
leaf.push([65, 77]); quadratic([65, 77], [63, 58], [83, 56]); quadratic([83, 56], [89, 75], [65, 77]);

function inside(x, y, points) {
  let value = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) value = !value;
  }
  return value;
}

function nearStroke(x, y, points, width) {
  const limit = (width / 2) ** 2;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
    const px = a[0] + t * dx, py = a[1] + t * dy;
    if ((x - px) ** 2 + (y - py) ** 2 <= limit) return true;
  }
  return false;
}

const roundedSquare = (x, y) => {
  const dx = Math.max(0, Math.abs(x - 48) - 17), dy = Math.max(0, Math.abs(y - 48) - 17);
  return x >= 4 && x <= 92 && y >= 4 && y <= 92 && dx * dx + dy * dy <= 27 * 27;
};

const pixels = Buffer.alloc(sourceSize * sourceSize * 4);
const color = (r, g, b, a = 255) => [r, g, b, a];
for (let py = 0; py < sourceSize; py++) for (let px = 0; px < sourceSize; px++) {
  const x = (px + 0.5) / scale, y = (py + 0.5) / scale;
  let rgba = roundedSquare(x, y) ? color(243, 199, 71) : color(0, 0, 0, 0);
  if (inside(x, y, star)) rgba = color(255, 249, 232);
  if (inside(x, y, leaf)) rgba = color(153, 183, 119);
  if (nearStroke(x, y, star, 3)) rgba = color(107, 89, 51);
  if (nearStroke(x, y, leaf, 2)) rgba = color(107, 89, 51);
  pixels.set(rgba, (py * sourceSize + px) * 4);
}

function downsample(size) {
  const factor = sourceSize / size, out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let oy = 0; oy < factor; oy++) for (let ox = 0; ox < factor; ox++) {
      const i = (((y * factor + oy) * sourceSize) + x * factor + ox) * 4;
      r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2]; a += pixels[i + 3];
    }
    const count = factor * factor, i = (y * size + x) * 4;
    out[i] = Math.round(r / count); out[i + 1] = Math.round(g / count); out[i + 2] = Math.round(b / count); out[i + 3] = Math.round(a / count);
  }
  return out;
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  return c >>> 0;
});
function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type), body = Buffer.concat([name, data]), result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length, 0); body.copy(result, 4); result.writeUInt32BE(crc32(body), result.length - 4);
  return result;
}
function png(size, rgba) {
  const scanlines = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) rgba.copy(scanlines, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  const header = Buffer.alloc(13); header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(scanlines, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

await writeFile('assets/app.png', png(512, downsample(512)));
await copyFile('assets/app.png', 'apps/android/android/app/src/main/res/drawable/rater_icon.png');

const sizes = [16, 24, 32, 48, 64, 128, 256];
const frames = sizes.map(size => ({ size, data: png(size, downsample(size)) }));
const header = Buffer.alloc(6 + frames.length * 16);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(frames.length, 4);
let offset = header.length;
for (let i = 0; i < frames.length; i++) {
  const { size, data } = frames[i], p = 6 + i * 16;
  header[p] = size === 256 ? 0 : size; header[p + 1] = size === 256 ? 0 : size;
  header[p + 2] = 0; header[p + 3] = 0; header.writeUInt16LE(1, p + 4); header.writeUInt16LE(32, p + 6);
  header.writeUInt32LE(data.length, p + 8); header.writeUInt32LE(offset, p + 12); offset += data.length;
}
await writeFile('assets/app.ico', Buffer.concat([header, ...frames.map(frame => frame.data)]));
console.log('Rendered the startup artwork as the 512px email/Android icon and 7-size Windows icon.');
