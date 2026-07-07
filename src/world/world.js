// world/world.js
// Dense voxel storage and block accessors.
// Stored as a flat Uint8Array for cache friendliness (see DESIGN.md).

import { SX, SY, SZ, AIR } from '../core/config.js';

const world = new Uint8Array(SX * SY * SZ);

/** Flat index for voxel coordinates. */
export function idx(x, y, z) {
  return x + SX * (y + SY * z);
}

/** Returns the block id at (x,y,z), or AIR for out-of-bounds. */
export function getBlock(x, y, z) {
  if (x < 0 || y < 0 || z < 0 || x >= SX || y >= SY || z >= SZ) return AIR;
  return world[idx(x, y, z)];
}

/** Sets the block id at (x,y,z). No-op out-of-bounds. */
export function setBlock(x, y, z, v) {
  if (x < 0 || y < 0 || z < 0 || x >= SX || y >= SY || z >= SZ) return;
  world[idx(x, y, z)] = v;
}

/** Clears all voxels to AIR. */
export function clearWorld() {
  world.fill(AIR);
}
