// core/config.js
// World dimensions + shared tunables. Block data is defined in
// world/blocks/block.js and re-exported here so legacy imports keep working.

import {
  AIR, GRASS, DIRT, STONE, SAND, WOOD, LEAVES, GLASS, WATER, TORCH,
  isSolid, isOpaque, isTransparent, blockName, blockColor, BLOCK_DEFS,
} from '../world/blocks/block.js';

// ---- Block ids (re-exported from the registry) ----
export {
  AIR, GRASS, DIRT, STONE, SAND, WOOD, LEAVES, GLASS, WATER, TORCH,
  isSolid, isOpaque, isTransparent, blockName, blockColor, BLOCK_DEFS,
};

// ---- Derived sets / tables (legacy API) ----
/** Blocks that block movement / entity spawning. */
export const SOLID = new Set(BLOCK_DEFS.filter(b => b.solid).map(b => b.id));
/** Blocks that fully occlude adjacent faces (used by meshing). */
export const OPAQUE = new Set(BLOCK_DEFS.filter(b => b.opaque).map(b => b.id));

/** Selectable blocks shown in the hotbar, in slot order. */
export const HOTBAR_BLOCKS = [GRASS, DIRT, STONE, SAND, WOOD, LEAVES, GLASS];

/** Display names for blocks. */
export const BLOCK_NAMES = Object.fromEntries(BLOCK_DEFS.map(b => [b.id, b.name]));
/** Hex swatches for the hotbar UI. */
export const BLOCK_SWATCH = {
  [GRASS]: '#6cb84d', [DIRT]: '#80603d', [STONE]: '#8f8f99', [SAND]: '#dcc88f',
  [WOOD]: '#6b4d2b', [LEAVES]: '#45a83b',   [GLASS]: '#b8dbe8', [TORCH]: '#ffd24d',
};

// ---- World dimensions ----
/** World size in voxels. */
export const SX = 256, SY = 64, SZ = 256;
/** Chunk columns along x and z. */
export const CHUNK = 16;
/** Water surface level in voxels. */
export const WATER_LEVEL = 22;
/** World units per voxel (smaller = finer blocks). */
export const SCALE = 1 / 16;
/** Camera eye height above the player's feet, in voxel units. */
export const EYE = 1.6;
