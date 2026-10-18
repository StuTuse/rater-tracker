// Portable SHA-256 for deterministic offline report revisions (not credentials).
const K = Array.from({ length: 64 }, (_, i) => {
  let count = -1, n = 1;
  while (count < i) { n++; if (!Array.from({ length: Math.floor(Math.sqrt(n)) - 1 }, (_, j) => j + 2).some(d => n % d === 0)) count++; }
  return (Math.cbrt(n) % 1 * 0x100000000) >>> 0;
});
const rotate = (n, r) => n >>> r | n << 32 - r;
export function sha256(text) {
  const bytes = new TextEncoder().encode(text), size = Math.ceil((bytes.length + 9) / 64) * 64;
  const data = new DataView(new ArrayBuffer(size));
  bytes.forEach((b, i) => data.setUint8(i, b)); data.setUint8(bytes.length, 128);
  data.setUint32(size - 8, Math.floor(bytes.length / 0x20000000)); data.setUint32(size - 4, bytes.length * 8);
  const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  for (let offset = 0; offset < size; offset += 64) {
    const w = Array.from({ length: 64 }, (_, i) => i < 16 ? data.getUint32(offset + i * 4) : 0);
    for (let i = 16; i < 64; i++) { const a = w[i - 15], b = w[i - 2]; w[i] = ((rotate(a, 7) ^ rotate(a, 18) ^ a >>> 3) + w[i - 16] + (rotate(b, 17) ^ rotate(b, 19) ^ b >>> 10) + w[i - 7]) >>> 0; }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) + (e & f ^ ~e & g) + K[i] + w[i]) >>> 0;
      const t2 = ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + (a & b ^ a & c ^ b & c)) >>> 0;
      [a, b, c, d, e, f, g, hh] = [(t1 + t2) >>> 0, a, b, c, (d + t1) >>> 0, e, f, g];
    }
    [a, b, c, d, e, f, g, hh].forEach((n, i) => { h[i] = (h[i] + n) >>> 0; });
  }
  return h.map(n => n.toString(16).padStart(8, '0')).join('');
}
