// world/world.js
// The World owns all chunks and the block access API. It is data-oriented:
// chunks store voxels; the mesher/renderer read them. Generation can be
// synchronous (generateAll) or streamed (queueChunk/processQueue), so the
// render loop is never blocked (see DESIGN.md "Chunk Streaming").
//
// A singleton `world` plus delegating getBlock/setBlock are exported for
// backwards compatibility with call sites that haven't migrated yet.

import { SX, SY, SZ, CHUNK, AIR } from '../core/config.js';
import { Chunk, ChunkState } from './chunks/chunk.js';
import { buildChunk } from './meshing.js';
import { generateTerrain } from './terrain.js';
import { computeChunkLight, getCombinedLight } from './lighting/lighting.js';

export { Chunk, ChunkState };

export class World {
  /**
   * @param {number} [seed]
   */
  constructor(seed = 1337) {
    this.seed = seed;
    /** @type {Map<string, Chunk>} */
    this.chunks = new Map();
    /** Async generation queue of "cx,cz" awaiting load. */
    this.pending = [];
  }

  static key(cx, cz) { return cx + ',' + cz; }

  getChunk(cx, cz) { return this.chunks.get(World.key(cx, cz)); }

  /** Global block id (AIR out of bounds / unloaded). */
  getBlock(x, y, z) {
    if (x < 0 || y < 0 || z < 0 || x >= SX || y >= SY || z >= SZ) return AIR;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const c = this.getChunk(cx, cz);
    if (!c) return AIR;
    return c.get(x - cx * CHUNK, y, z - cz * CHUNK);
  }

  /** Combined light (0..15) at a world coordinate; 15 if light is uncomputed. */
  getLight(x, y, z) { return getCombinedLight(this, x, y, z); }

  /** Sets a block globally, creating its chunk if needed, and marks it dirty. */
  setBlock(x, y, z, v) {
    if (x < 0 || y < 0 || z < 0 || x >= SX || y >= SY || z >= SZ) return;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const c = this.getChunk(cx, cz) || this.ensureChunk(cx, cz);
    c.set(x - cx * CHUNK, y, z - cz * CHUNK, v);
    this.markNeighboursDirty(cx, cz);
    // Only relight on edits to already-generated chunks; during initial
    // generation (state EMPTY) light is computed once in loadChunk.
    if (c.state !== ChunkState.EMPTY) this.recomputeLightAround(cx, cz);
  }

  /** Recomputes light for a chunk and its 4 neighbours after an edit. */
  recomputeLightAround(cx, cz) {
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = this.getChunk(cx + dx, cz + dz);
      if (c) computeChunkLight(this, c);
    }
  }

  /** Creates an empty chunk if absent. */
  ensureChunk(cx, cz) {
    const k = World.key(cx, cz);
    let c = this.chunks.get(k);
    if (!c) { c = new Chunk(cx, cz); this.chunks.set(k, c); }
    return c;
  }

  /** Neighbours become dirty so their shared border faces refresh. */
  markNeighboursDirty(cx, cz) {
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = this.getChunk(cx + dx, cz + dz);
      if (n) n.dirty = true;
    }
  }

  /** Generates + meshes one chunk (idempotent). */
  loadChunk(cx, cz) {
    const c = this.ensureChunk(cx, cz);
    if (c.state === ChunkState.MESHED) return c;
    if (c.state === ChunkState.EMPTY) { generateTerrain(this, c); c.state = ChunkState.GENERATED; }
    computeChunkLight(this, c);
    c.meshes = buildChunk(this, c);
    c.state = ChunkState.MESHED;
    c.dirty = false;
    this.markNeighboursDirty(cx, cz);
    return c;
  }

  /** Disposes + forgets a chunk. */
  unloadChunk(cx, cz) {
    const c = this.getChunk(cx, cz);
    if (!c) return;
    c.dispose();
    this.chunks.delete(World.key(cx, cz));
  }

  /** Generates + meshes the entire fixed world (synchronous). */
  generateAll() {
    const CX = Math.ceil(SX / CHUNK), CZ = Math.ceil(SZ / CHUNK);
    for (let cx = 0; cx < CX; cx++)
      for (let cz = 0; cz < CZ; cz++) this.ensureChunk(cx, cz);
    generateTerrain(this, null);
    for (let cx = 0; cx < CX; cx++)
      for (let cz = 0; cz < CZ; cz++) this.loadChunk(cx, cz);
  }

  /** Queues a chunk for asynchronous generation (streaming). */
  queueChunk(cx, cz) {
    const c = this.getChunk(cx, cz);
    if (c && c.state === ChunkState.MESHED) return;
    this.pending.push([cx, cz]);
  }

  /** Processes up to `budget` queued chunks (call once per frame). */
  processQueue(budget) {
    let n = 0;
    while (this.pending.length && n < budget) {
      const [cx, cz] = this.pending.shift();
      this.loadChunk(cx, cz);
      n++;
    }
  }

  /** Synchronously loads a square region around a world position (spawn). */
  loadArea(px, pz, radius) {
    const ccx = Math.floor(px / CHUNK), ccz = Math.floor(pz / CHUNK);
    const CX = Math.ceil(SX / CHUNK), CZ = Math.ceil(SZ / CHUNK);
    for (let cx = ccx - radius; cx <= ccx + radius; cx++)
      for (let cz = ccz - radius; cz <= ccz + radius; cz++)
        if (cx >= 0 && cz >= 0 && cx < CX && cz < CZ) this.loadChunk(cx, cz);
  }

  /** Streaming visibility: load chunks within `dist`, unload the rest. */
  updateVisibleChunks(px, pz, dist) {
    const CX = Math.ceil(SX / CHUNK), CZ = Math.ceil(SZ / CHUNK);
    const ccx = Math.floor(px / CHUNK), ccz = Math.floor(pz / CHUNK);
    for (let cx = ccx - dist; cx <= ccx + dist; cx++)
      for (let cz = ccz - dist; cz <= ccz + dist; cz++) {
        if (cx < 0 || cz < 0 || cx >= CX || cz >= CZ) continue;
        if (!this.getChunk(cx, cz)) this.queueChunk(cx, cz);
      }
    for (const c of this.chunks.values()) {
      if (c.state !== ChunkState.MESHED) continue;
      const d = Math.max(Math.abs(c.cx - ccx), Math.abs(c.cz - ccz));
      if (d > dist + 2) this.unloadChunk(c.cx, c.cz);
    }
  }
}

// ---- Singleton + legacy delegators (kept for call-site compatibility) ----
export const world = new World(1337);
export const getBlock = (x, y, z) => world.getBlock(x, y, z);
export const setBlock = (x, y, z, v) => world.setBlock(x, y, z, v);
export function clearWorld() {
  for (const c of world.chunks.values()) { c.data.fill(AIR); c.dirty = true; }
}
export const idx = (x, y, z) => x + SX * (y + SY * z);
