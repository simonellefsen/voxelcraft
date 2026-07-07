// world/lighting/lighting.js
// Light propagation for the voxel world. Each chunk stores two 0..15 light
// grids: sky light (decays down through transparent blocks from the world
// top) and block light (spreads from emissive blocks like torches). The
// renderer combines them per face so caves are dark and torches glow.
//
// This is the "smallest working version": columnar sky light + iterative
// block-light relaxation within the chunk. It is fully data-oriented and
// testable without a GPU (see tests/boot.test.mjs).

import { CHUNK, SY } from '../../core/config.js';
import { isOpaque, emits } from '../blocks/block.js';

const MAX = 15;
const SIZE = CHUNK * SY * CHUNK;

/**
 * (Re)computes sky + block light for one chunk and stores the result on the
 * chunk (`chunk.sky`, `chunk.blk`). Cheap enough to run on load and after
 * edits.
 * @param {import('../world.js').World} world
 * @param {import('../chunks/chunk.js').Chunk} chunk
 */
export function computeChunkLight(world, chunk) {
  if (!chunk.sky) chunk.sky = new Uint8Array(SIZE);
  if (!chunk.blk) chunk.blk = new Uint8Array(SIZE);
  const sky = chunk.sky, blk = chunk.blk;

  // --- Sky light: flood down each column from the (open) world top. ---
  for (let x = 0; x < CHUNK; x++) {
    for (let z = 0; z < CHUNK; z++) {
      let lvl = MAX;
      for (let y = SY - 1; y >= 0; y--) {
        const li = x + CHUNK * (y + SY * z);
        const id = chunk.get(x, y, z);
        if (isOpaque(id)) { sky[li] = lvl; lvl = 0; }
        else { sky[li] = lvl; lvl = lvl > 0 ? lvl - 1 : 0; }
      }
    }
  }

  // --- Block light: seed emissive blocks, then relax (BFS-style). ---
  for (let i = 0; i < SIZE; i++) blk[i] = emits(chunk.data[i]);

  const cx0 = chunk.cx * CHUNK, cz0 = chunk.cz * CHUNK;
  const neighborLight = (x, y, z) => {
    if (x < 0 || y < 0 || z < 0 || x >= CHUNK || y >= SY || z >= CHUNK) {
      // Cross-border: any emissive neighbour acts as an external source.
      const id = world.getBlock(cx0 + x, y, cz0 + z);
      return Math.max(0, emits(id) - 1);
    }
    const li = x + CHUNK * (y + SY * z);
    return Math.max(0, blk[li] - 1);
  };

  for (let pass = 0; pass < MAX; pass++) {
    let changed = false;
    for (let z = 0; z < CHUNK; z++)
      for (let y = 0; y < SY; y++)
        for (let x = 0; x < CHUNK; x++) {
          const li = x + CHUNK * (y + SY * z);
          const cur = blk[li];
          if (cur >= MAX) continue;
          let best = cur;
          if (neighborLight(x + 1, y, z) > best) best = neighborLight(x + 1, y, z);
          if (neighborLight(x - 1, y, z) > best) best = neighborLight(x - 1, y, z);
          if (neighborLight(x, y + 1, z) > best) best = neighborLight(x, y + 1, z);
          if (neighborLight(x, y - 1, z) > best) best = neighborLight(x, y - 1, z);
          if (neighborLight(x, y, z + 1) > best) best = neighborLight(x, y, z + 1);
          if (neighborLight(x, y, z - 1) > best) best = neighborLight(x, y, z - 1);
          if (best > cur) { blk[li] = best; changed = true; }
        }
    if (!changed) break;
  }
}

/**
 * Combined light (max of sky + block) at a world coordinate, 0..15.
 * Falls back to full daylight for ungenerated chunks so meshing still works.
 * @param {import('../world.js').World} world
 * @param {number} x @param {number} y @param {number} z
 */
export function getCombinedLight(world, x, y, z) {
  const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
  const c = world.getChunk(cx, cz);
  if (!c || !c.sky) return MAX;
  const lx = x - cx * CHUNK, lz = z - cz * CHUNK;
  if (y < 0 || y >= SY || lx < 0 || lx >= CHUNK || lz < 0 || lz >= CHUNK) return MAX;
  const li = lx + CHUNK * (y + SY * lz);
  return Math.max(c.sky[li], c.blk[li]);
}

/** Sky-light channel only (0..15) at a world coordinate. */
export function getSkyLight(world, x, y, z) {
  const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
  const c = world.getChunk(cx, cz);
  if (!c || !c.sky) return MAX;
  const lx = x - cx * CHUNK, lz = z - cz * CHUNK;
  if (y < 0 || y >= SY || lx < 0 || lx >= CHUNK || lz < 0 || lz >= CHUNK) return MAX;
  return c.sky[lx + CHUNK * (y + SY * lz)];
}

/** Block-light channel only (0..15) at a world coordinate. */
export function getBlockLight(world, x, y, z) {
  const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
  const c = world.getChunk(cx, cz);
  if (!c || !c.blk) return 0;
  const lx = x - cx * CHUNK, lz = z - cz * CHUNK;
  if (y < 0 || y >= SY || lx < 0 || lx >= CHUNK || lz < 0 || lz >= CHUNK) return 0;
  return c.blk[lx + CHUNK * (y + SY * lz)];
}
