// physics/collision.js
// Voxel collision helpers shared by the player and entities.

import { SOLID } from '../core/config.js';
import { getBlock } from '../world/world.js';

/** True if the voxel at world coordinates (x,y,z) is solid. */
export function solidAt(x, y, z) {
  return SOLID.has(getBlock(Math.floor(x), Math.floor(y), Math.floor(z)));
}
