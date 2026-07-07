// world/terrain.js
// Deterministic terrain generation. Fills chunks of the given World via
// world.setBlock. When `chunk` is null the whole world is generated; when a
// specific chunk is given only its columns are generated (streaming).

import {
  SX, SY, SZ, CHUNK, WATER_LEVEL,
  AIR, GRASS, DIRT, STONE, SAND, WOOD, LEAVES, WATER,
} from '../core/config.js';
import { fractal } from './noise.js';

/**
 * @param {import('./world.js').World} world
 * @param {import('./chunks/chunk.js').Chunk | null} chunk  null = whole world
 */
export function generateTerrain(world, chunk) {
  const cx0 = chunk ? chunk.cx : 0;
  const cx1 = chunk ? chunk.cx : Math.ceil(SX / CHUNK) - 1;
  const cz0 = chunk ? chunk.cz : 0;
  const cz1 = chunk ? chunk.cz : Math.ceil(SZ / CHUNK) - 1;

  for (let cx = cx0; cx <= cx1; cx++) {
    for (let cz = cz0; cz <= cz1; cz++) {
      const x0 = cx * CHUNK, z0 = cz * CHUNK;
      const x1 = chunk ? x0 + CHUNK - 1 : SX - 1;
      const z1 = chunk ? z0 + CHUNK - 1 : SZ - 1;
      for (let x = x0; x <= x1; x++) {
        for (let z = z0; z <= z1; z++) {
          generateColumn(world, x, z);
        }
      }
    }
  }
}

function generateColumn(world, x, z) {
  // Gentle, mostly-open rolling plains with occasional lakes and hills
  const h = Math.floor(WATER_LEVEL + 2 + fractal(x, z) * 6 + fractal(x * 0.5 + 100, z * 0.5 + 100) * 4);
  for (let y = 0; y <= h; y++) {
    let b;
    if (y === h) b = h <= WATER_LEVEL + 1 ? SAND : GRASS;
    else if (y >= h - 3) b = (h <= WATER_LEVEL + 1) ? SAND : DIRT;
    else b = STONE;
    world.setBlock(x, y, z, b);
  }
  for (let y = h + 1; y <= WATER_LEVEL; y++) world.setBlock(x, y, z, WATER);

  // Sparse trees on dry grassland only
  if (h > WATER_LEVEL + 2 && h < SY - 10 && Math.random() < 0.006) {
    const th = 4 + Math.floor(Math.random() * 3);
    for (let i = 1; i <= th; i++) world.setBlock(x, h + i, z, WOOD);
    const top = h + th;
    for (let dx = -2; dx <= 2; dx++)
      for (let dz = -2; dz <= 2; dz++)
        for (let dy = -2; dy <= 1; dy++) {
          if (Math.abs(dx) + Math.abs(dz) + Math.abs(dy) > 4) continue;
          const lx = x + dx, ly = top + dy, lz = z + dz;
          if (world.getBlock(lx, ly, lz) === AIR) world.setBlock(lx, ly, lz, LEAVES);
        }
    world.setBlock(x, top + 1, z, LEAVES);
  }
}
