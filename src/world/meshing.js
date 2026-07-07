// world/meshing.js
// Builds Three.js geometry for a chunk from the World store. Two strategies:
//   buildChunk      — face culling (default, proven)
//   buildChunkGreedy — greedy meshing (benchmarked; fewer triangles)
// Both emit positions + UVs + a per-vertex light color (from world.getLight)
// so caves are dark and torches glow without per-light uniforms. Neighbour
// lookups use world.getBlock so chunk borders cull correctly.

import { SCALE, CHUNK, SY } from '../core/config.js';
import { getTHREE } from '../core/three.js';
import { isOpaque, isTransparent } from './blocks/block.js';
import { tileFor, getAtlas } from '../assets/textures/atlas.js';

const FACES = [
  { dir: [ 1, 0, 0], corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]] },
  { dir: [-1, 0, 0], corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]] },
  { dir: [ 0, 1, 0], corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]] },
  { dir: [ 0,-1, 0], corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]] },
  { dir: [ 0, 0, 1], corners: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]] },
  { dir: [ 0, 0,-1], corners: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]] },
];

/** Maps a 0..15 light level to a [0.3,1] grayscale vertex color. */
function lightBrightness(world, x, y, z) {
  const L = world.getLight(x, y, z);
  return 0.3 + 0.7 * (L / 15);
}

function makeGeometry(THREE, positions, uvs, colors, indices) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  return g;
}

/** @returns {{opaque: any|null, transparent: any|null}} geometry (or null) */
export function buildChunk(world, chunk) {
  const THREE = getTHREE();
  const atlas = getAtlas();
  const x0 = chunk.cx * CHUNK, z0 = chunk.cz * CHUNK;
  const op = [], oc = [], ol = [], oi = [];   // ol = light colors, oc = uvs
  const tr = [], tc = [], tl = [], ti = [];

  for (let z = 0; z < CHUNK; z++)
    for (let y = 0; y < SY; y++)
      for (let x = 0; x < CHUNK; x++) {
        const id = chunk.get(x, y, z);
        if (id === 0) continue;
        const gx = x0 + x, gz = z0 + z;
        const transparent = isTransparent(id);
        const arr = transparent ? tr : op, uar = transparent ? tc : oc,
              lar = transparent ? tl : ol, iarr = transparent ? ti : oi;
        const b = lightBrightness(world, gx, y, gz);
        for (const f of FACES) {
          const nb = world.getBlock(gx + f.dir[0], y + f.dir[1], gz + f.dir[2]);
          const visible = transparent ? (nb === 0) : !isOpaque(nb);
          if (!visible) continue;
          const uv = atlas.uv(tileFor(id, f.dir));
          const base = arr.length / 3;
          for (let i = 0; i < 4; i++) {
            arr.push((gx + f.corners[i][0]) * SCALE, (y + f.corners[i][1]) * SCALE, (gz + f.corners[i][2]) * SCALE);
            uar.push(i === 0 ? uv[0] : i === 1 ? uv[2] : uv[2],
                     i === 0 ? uv[1] : i === 1 ? uv[1] : uv[3]);
            lar.push(b, b, b);
          }
          iarr.push(base, base + 1, base + 2, base, base + 2, base + 3);
        }
      }

  const opaque = op.length ? makeGeometry(THREE, op, oc, ol, oi) : null;
  const transparent = tr.length ? makeGeometry(THREE, tr, tc, tl, ti) : null;
  return { opaque, transparent };
}

// ---- Greedy meshing (benchmarked alternative) ----

const DIRS = [
  { n: [ 1, 0, 0], u: 'z', v: 'y' }, // +X
  { n: [-1, 0, 0], u: 'z', v: 'y' }, // -X
  { n: [ 0, 1, 0], u: 'x', v: 'z' }, // +Y
  { n: [ 0,-1, 0], u: 'x', v: 'z' }, // -Y
  { n: [ 0, 0, 1], u: 'x', v: 'y' }, // +Z
  { n: [ 0, 0,-1], u: 'x', v: 'y' }, // -Z
];

function rangeOf(axis) { return axis === 'y' ? SY : CHUNK; }

function coordAt(dir, L, iu, iv, x0, z0) {
  const n = dir.n, u = dir.u, v = dir.v;
  let x = x0, y = 0, z = z0;
  if (n[0] !== 0) x += L;
  if (n[1] !== 0) y += L;
  if (n[2] !== 0) z += L;
  if (u === 'x') x += iu; else if (u === 'y') y += iu; else z += iu;
  if (v === 'x') x += iv; else if (v === 'y') y += iv; else z += iv;
  return [x, y, z];
}

function anchor(dir, L, iu, iv, x0, z0) {
  const n = dir.n, u = dir.u, v = dir.v;
  let ox = x0, oy = 0, oz = z0;
  if (n[0] !== 0) ox = x0 + L + (n[0] > 0 ? 1 : 0);
  if (n[1] !== 0) oy = L + (n[1] > 0 ? 1 : 0);
  if (n[2] !== 0) oz = z0 + L + (n[2] > 0 ? 1 : 0);
  if (u === 'x') ox += iu; else if (u === 'y') oy += iu; else oz += iu;
  if (v === 'x') ox += iv; else if (v === 'y') oy += iv; else oz += iv;
  return [ox, oy, oz];
}

function emitQuad(pos, uvs, cols, idx, u, v, ox, oy, oz, su, sv, uvTile, b) {
  const corner = (ku, kv) => {
    let x = ox, y = oy, z = oz;
    if (u === 'x') x += ku; else if (u === 'y') y += ku; else z += ku;
    if (v === 'x') x += kv; else if (v === 'y') y += kv; else z += kv;
    return [x * SCALE, y * SCALE, z * SCALE];
  };
  const c0 = corner(0, 0), c1 = corner(su, 0), c2 = corner(su, sv), c3 = corner(0, sv);
  const base = pos.length / 3;
  pos.push(...c0, ...c1, ...c2, ...c3);
  uvs.push(uvTile[0], uvTile[1], uvTile[2], uvTile[1], uvTile[2], uvTile[3], uvTile[0], uvTile[3]);
  cols.push(b, b, b, b, b, b, b, b, b, b, b, b);
  idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

/** @returns {{opaque: any|null, transparent: any|null}} geometry (or null) */
export function buildChunkGreedy(world, chunk) {
  const THREE = getTHREE();
  const atlas = getAtlas();
  const x0 = chunk.cx * CHUNK, z0 = chunk.cz * CHUNK;

  const op = { pos: [], uv: [], col: [], idx: [] };
  const tr = { pos: [], uv: [], col: [], idx: [] };

  for (const dir of DIRS) {
    const n = dir.n, u = dir.u, v = dir.v;
    const mu = rangeOf(u), mv = rangeOf(v);
    const normalAxis = n[0] ? 'x' : n[1] ? 'y' : 'z';
    const nRange = rangeOf(normalAxis);

    for (let L = 0; L < nRange; L++) {
      const mask = Array.from({ length: mv }, () => new Array(mu).fill(0));
      for (let iv = 0; iv < mv; iv++)
        for (let iu = 0; iu < mu; iu++) {
          const coord = coordAt(dir, L, iu, iv, x0, z0);
          const id = world.getBlock(coord[0], coord[1], coord[2]);
          if (id === 0) continue;
          const nb = world.getBlock(coord[0] + n[0], coord[1] + n[1], coord[2] + n[2]);
          const vis = isTransparent(id) ? (nb === 0) : !isOpaque(nb);
          if (vis) mask[iv][iu] = id;
        }

      for (let vv = 0; vv < mv; ) {
        for (let uu = 0; uu < mu; ) {
          const id = mask[vv][uu];
          if (!id) { uu++; continue; }
          let w = 1; while (uu + w < mu && mask[vv][uu + w] === id) w++;
          let h = 1;
          grow: while (vv + h < mv) {
            for (let k = 0; k < w; k++) if (mask[vv + h][uu + k] !== id) break grow;
            h++;
          }
          const tgt = isTransparent(id) ? tr : op;
          const uvTile = atlas.uv(tileFor(id, n));
          const a = anchor(dir, L, uu, vv, x0, z0);
          // Use the light of the representative block for the whole quad.
          const b = lightBrightness(world, a[0], a[1], a[2]);
          emitQuad(tgt.pos, tgt.uv, tgt.col, tgt.idx, u, v, a[0], a[1], a[2], w, h, uvTile, b);
          for (let dv = 0; dv < h; dv++) for (let du = 0; du < w; du++) mask[vv + dv][uu + du] = 0;
          uu += w;
        }
        vv++;
      }
    }
  }

  const opaque = op.pos.length ? makeGeometry(THREE, op.pos, op.uv, op.col, op.idx) : null;
  const transparent = tr.pos.length ? makeGeometry(THREE, tr.pos, tr.uv, tr.col, tr.idx) : null;
  return { opaque, transparent };
}
