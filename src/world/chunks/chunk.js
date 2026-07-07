// world/chunks/chunk.js
// A 16×SY×16 column of voxels. Stored as a flat Uint16Array (see DESIGN.md).
// Holds no rendering code — it only stores data + a dirty flag. The mesher
// turns it into GPU meshes; the renderer uploads them.

import { CHUNK, SY, AIR } from '../../core/config.js';

/** Chunk lifecycle states (enables non-blocking streaming). */
export const ChunkState = {
  EMPTY: 'empty',     // allocated, not yet generated
  GENERATED: 'generated',
  MESHED: 'meshed',   // mesh built, in scene or pending upload
  UNLOADED: 'unloaded',
};

export class Chunk {
  /**
   * @param {number} cx chunk column x
   * @param {number} cz chunk column z
   */
  constructor(cx, cz) {
    this.cx = cx;
    this.cz = cz;
    /** @type {Uint16Array} */
    this.data = new Uint16Array(CHUNK * SY * CHUNK);
    this.dirty = false;          // mesh needs rebuild
    this.state = ChunkState.EMPTY;
    /** @type {{opaque: any, transparent: any} | null} */
    this.meshes = null;
  }

  /** Flat local index for (x,y,z) in [0,CHUNK)×[0,SY)×[0,CHUNK). */
  localIndex(x, y, z) {
    return x + CHUNK * (y + SY * z);
  }

  /** Block id at local coords (AIR if out of the chunk's vertical range). */
  get(x, y, z) {
    if (y < 0 || y >= SY) return AIR;
    return this.data[this.localIndex(x, y, z)];
  }

  /** Sets a block id at local coords and marks the chunk dirty. */
  set(x, y, z, v) {
    if (y < 0 || y >= SY) return;
    this.data[this.localIndex(x, y, z)] = v;
    this.dirty = true;
  }

  /** Disposes GPU meshes if present. */
  dispose() {
    if (!this.meshes) return;
    this.meshes.opaque.geometry.dispose();
    this.meshes.transparent.geometry.dispose();
    this.meshes = null;
  }
}
