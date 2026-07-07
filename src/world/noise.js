// world/noise.js
// Seeded 2D Perlin noise + fractal helper. No external dependencies.

const perm = new Uint8Array(512);
(function buildPerm() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let seed = 1337;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
})();

const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + t * (b - a);

function grad(h, x, y) {
  const u = (h & 1) ? x : y;
  const v = (h & 2) ? y : x;
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}

/** Classic 2D Perlin noise in roughly [-1, 1]. */
export function perlin2(x, y) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
  x -= Math.floor(x); y -= Math.floor(y);
  const u = fade(x), v = fade(y);
  const aa = perm[perm[X] + Y], ab = perm[perm[X] + Y + 1];
  const ba = perm[perm[X + 1] + Y], bb = perm[perm[X + 1] + Y + 1];
  return lerp(lerp(grad(aa, x, y), grad(ba, x - 1, y), u),
              lerp(grad(ab, x, y - 1), grad(bb, x - 1, y - 1), u), v);
}

/** Fractal (octave) Perlin noise, normalised to ~[-1, 1]. */
export function fractal(x, y) {
  let amp = 1, freq = 0.045, sum = 0, norm = 0;
  for (let o = 0; o < 4; o++) {
    sum += perlin2(x * freq, y * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}
