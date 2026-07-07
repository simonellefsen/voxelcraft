// world/biomes/biomes.js
// Data-driven biome selection. `biomeAt(x,z)` is deterministic (pure Perlin
// temperature field), so the same world coordinates always map to the same
// biome. Plains is the most common biome to honour the "open plains" brief;
// forest, desert, and mountains add variety. Each biome declares its surface
// block, subsurface block, tree density, and terrain height contribution so
// terrain.js stays generic.

import { GRASS, DIRT, SAND, STONE } from '../../core/config.js';
import { fractal } from '../noise.js';

export const BIOME = {
  PLAINS: 0,
  FOREST: 1,
  DESERT: 2,
  MOUNTAINS: 3,
  OCEAN: 4,
};

/** @typedef {Object} BiomeDef
 * @property {number} id
 * @property {string} name
 * @property {number} surface  block id for the top layer
 * @property {number} sub      block id for the layers beneath the surface
 * @property {number} tree     per-column tree probability [0,1)
 * @property {number} hill     extra terrain height amplitude
 * @property {string} color    hex tint for diagnostics/ambient
 */

/** @type {Object<number, BiomeDef>} */
export const BIOMES = {
  [BIOME.PLAINS]:    { id: BIOME.PLAINS,    name: 'Plains',    surface: GRASS, sub: DIRT, tree: 0.004, hill: 4,  color: '#7ec46b' },
  [BIOME.FOREST]:    { id: BIOME.FOREST,    name: 'Forest',    surface: GRASS, sub: DIRT, tree: 0.030, hill: 6,  color: '#5fa84f' },
  [BIOME.DESERT]:    { id: BIOME.DESERT,    name: 'Desert',    surface: SAND,  sub: SAND, tree: 0,     hill: 4,  color: '#d9c27a' },
  [BIOME.MOUNTAINS]: { id: BIOME.MOUNTAINS, name: 'Mountains', surface: GRASS, sub: DIRT, tree: 0.002, hill: 16, color: '#8a8f7a' },
  [BIOME.OCEAN]:     { id: BIOME.OCEAN,     name: 'Ocean',     surface: SAND,  sub: SAND, tree: 0,     hill: 0,  color: '#3a6ea5' },
};

/**
 * Returns the biome for a world column. Uses a low-frequency temperature
 * field so biomes form large contiguous regions. Plains dominates the mid
 * range, ocean is assigned by terrain.js when the surface sinks below water.
 * @param {number} x
 * @param {number} z
 * @returns {BiomeDef}
 */
export function biomeAt(x, z) {
  const t = fractal(x * 0.1 + 13.7, z * 0.1 + 91.3); // ~[-0.15,0.1]
  if (t > 0.04) return BIOMES[BIOME.DESERT];
  if (t > -0.02) return BIOMES[BIOME.PLAINS];
  if (t > -0.08) return BIOMES[BIOME.FOREST];
  return BIOMES[BIOME.MOUNTAINS];
}

/** Human-readable biome name for diagnostics. */
export function biomeName(id) {
  return (BIOMES[id] && BIOMES[id].name) || 'Unknown';
}
