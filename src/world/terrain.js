// world/terrain.js
// Deterministic terrain generation: gentle rolling plains with sparse
// trees, lakes, and hills. Replaces world contents in place.

import {
  SX, SY, SZ, WATER_LEVEL, AIR, GRASS, DIRT, STONE, SAND, WOOD, LEAVES, WATER,
} from '../core/config.js';
import { getBlock, setBlock, clearWorld } from './world.js';
import { fractal } from './noise.js';

/** Generates the whole world into the shared voxel store. */
export function generate() {
  clearWorld();
  for (let x = 0; x < SX; x++) {
    for (let z = 0; z < SZ; z++) {
      // Gentle, mostly-open rolling plains with occasional lakes and hills
      const h = Math.floor(WATER_LEVEL + 2 + fractal(x, z) * 6 + fractal(x * 0.5 + 100, z * 0.5 + 100) * 4);
      for (let y = 0; y <= h; y++) {
        let b;
        if (y === h) b = h <= WATER_LEVEL + 1 ? SAND : GRASS;
        else if (y >= h - 3) b = (h <= WATER_LEVEL + 1) ? SAND : DIRT;
        else b = STONE;
        setBlock(x, y, z, b);
      }
      for (let y = h + 1; y <= WATER_LEVEL; y++) setBlock(x, y, z, WATER);
      // Sparse trees on dry grassland only
      if (h > WATER_LEVEL + 2 && h < SY - 10 && Math.random() < 0.006) {
        const th = 4 + Math.floor(Math.random() * 3);
        for (let i = 1; i <= th; i++) setBlock(x, h + i, z, WOOD);
        const top = h + th;
        for (let dx = -2; dx <= 2; dx++)
          for (let dz = -2; dz <= 2; dz++)
            for (let dy = -2; dy <= 1; dy++) {
              if (Math.abs(dx) + Math.abs(dz) + Math.abs(dy) > 4) continue;
              const lx = x + dx, ly = top + dy, lz = z + dz;
              if (getBlock(lx, ly, lz) === AIR) setBlock(lx, ly, lz, LEAVES);
            }
        setBlock(x, top + 1, z, LEAVES);
      }
    }
  }
}
