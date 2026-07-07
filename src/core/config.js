// core/config.js
// Static world configuration and block definitions.
// No dependencies — safe to import from any module.

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

/** Block ids. */
export const AIR = 0, GRASS = 1, DIRT = 2, STONE = 3, SAND = 4,
  WOOD = 5, LEAVES = 6, GLASS = 7, WATER = 8;

/** Blocks that block movement / entity spawning. */
export const SOLID = new Set([GRASS, DIRT, STONE, SAND, WOOD, LEAVES, GLASS]);
/** Blocks that fully occlude adjacent faces (used by meshing). */
export const OPAQUE = new Set([GRASS, DIRT, STONE, SAND, WOOD, LEAVES]);

/** Selectable blocks shown in the hotbar, in slot order. */
export const HOTBAR_BLOCKS = [GRASS, DIRT, STONE, SAND, WOOD, LEAVES, GLASS];

/** Display names for blocks. */
export const BLOCK_NAMES = {
  [GRASS]: 'Grass', [DIRT]: 'Dirt', [STONE]: 'Stone', [SAND]: 'Sand',
  [WOOD]: 'Wood', [LEAVES]: 'Leaves', [GLASS]: 'Glass', [WATER]: 'Water',
};

/** Hex swatches for the hotbar UI. */
export const BLOCK_SWATCH = {
  [GRASS]: '#6cb84d', [DIRT]: '#80603d', [STONE]: '#8f8f99', [SAND]: '#dcc88f',
  [WOOD]: '#6b4d2b', [LEAVES]: '#45a83b', [GLASS]: '#b8dbe8',
};
