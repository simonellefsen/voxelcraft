// assets/textures/atlas.js
// Procedurally generates a texture atlas on a <canvas> (no external files, so
// it works on a static Vercel deploy). One 16×16 tile per block face; the
// mesher maps each (block, face) to a tile and writes UVs.
//
// Exports generateAtlas() -> { texture, uv(index) -> [u0,v0,u1,v1], TILES }.

import { getTHREE } from '../../core/three.js';

const TILE = 16;          // pixels per tile
const GRID = 4;           // 4×4 tiles -> 16 slots
const ATLAS = TILE * GRID; // 64×64 px

// Tile indices
export const TILES = {
  GRASS_TOP: 0, GRASS_SIDE: 1, DIRT: 2, STONE: 3, SAND: 4,
  WOOD_TOP: 5, WOOD_SIDE: 6, LEAVES: 7, GLASS: 8, WATER: 9, TORCH: 10,
};

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function shade(hex, amt) {
  const r = Math.max(0, Math.min(255, Math.round(((hex >> 16) & 255) * amt)));
  const g = Math.max(0, Math.min(255, Math.round(((hex >> 8) & 255) * amt)));
  const b = Math.max(0, Math.min(255, Math.round((hex & 255) * amt)));
  return `rgb(${r},${g},${b})`;
}

function noiseTile(ctx, base, variant, seed) {
  const rand = rng(seed);
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      const n = 0.82 + rand() * 0.18;
      ctx.fillStyle = shade(base, n);
      ctx.fillRect(x, y, 1, 1);
    }
}

function drawTile(ctx, index, draw) {
  const col = index % GRID, row = Math.floor(index / GRID);
  ctx.save();
  ctx.translate(col * TILE, row * TILE);
  draw(ctx);
  ctx.restore();
}

/** @returns {{texture: any, uv: (i:number)=>[number,number,number,number], TILES: typeof TILES}} */
export function generateAtlas() {
  const THREE = getTHREE();
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS; canvas.height = ATLAS;
  const ctx = canvas.getContext('2d');

  // GRASS_TOP
  drawTile(ctx, TILES.GRASS_TOP, c => noiseTile(c, 0x6cba4d, 0, 11));
  // GRASS_SIDE (grass band over dirt)
  drawTile(ctx, TILES.GRASS_SIDE, c => {
    noiseTile(c, 0x80603d, 0, 12);
    for (let y = 0; y < 5; y++) for (let x = 0; x < TILE; x++) {
      const n = 0.85 + Math.random() * 0.15;
      c.fillStyle = shade(0x6cba4d, n); c.fillRect(x, y, 1, 1);
    }
  });
  // DIRT
  drawTile(ctx, TILES.DIRT, c => noiseTile(c, 0x80603d, 0, 13));
  // STONE
  drawTile(ctx, TILES.STONE, c => noiseTile(c, 0x8f8f99, 0, 14));
  // SAND
  drawTile(ctx, TILES.SAND, c => noiseTile(c, 0xdcc88f, 0, 15));
  // WOOD_TOP (rings)
  drawTile(ctx, TILES.WOOD_TOP, c => {
    noiseTile(c, 0xb08d57, 0, 16);
    c.strokeStyle = 'rgba(80,55,30,0.7)'; c.lineWidth = 1;
    c.beginPath(); c.arc(8, 8, 4, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(8, 8, 7, 0, Math.PI * 2); c.stroke();
  });
  // WOOD_SIDE (bark)
  drawTile(ctx, TILES.WOOD_SIDE, c => {
    for (let x = 0; x < TILE; x++) {
      const base = x % 4 === 0 ? 0x5a3f22 : 0x6b4d2b;
      noiseTileCol(c, x, base, 17 + x);
    }
  });
  // LEAVES
  drawTile(ctx, TILES.LEAVES, c => {
    const rand = rng(18);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const n = 0.7 + rand() * 0.4;
      c.fillStyle = shade(0x3da636, n); c.fillRect(x, y, 1, 1);
    }
  });
  // GLASS (light blue with frame)
  drawTile(ctx, TILES.GLASS, c => {
    c.fillStyle = 'rgba(180,220,235,0.35)'; c.fillRect(0, 0, TILE, TILE);
    c.strokeStyle = 'rgba(120,150,170,0.9)'; c.lineWidth = 1;
    c.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
  });
  // WATER
  drawTile(ctx, TILES.WATER, c => noiseTile(c, 0x3f80d0, 0, 19));
  // TORCH (stick + flame), emissive
  drawTile(ctx, TILES.TORCH, c => {
    c.fillStyle = '#5a3f22'; c.fillRect(7, 7, 2, 8);
    c.fillStyle = '#ffd24d'; c.fillRect(6, 3, 4, 5);
    c.fillStyle = '#ff8a1f'; c.fillRect(7, 4, 2, 4);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace || texture.colorSpace;

  /** Returns [u0, v0, u1, v1] for a tile (V flipped for WebGL). */
  function uv(index) {
    const col = index % GRID, row = Math.floor(index / GRID);
    const u0 = col / GRID, u1 = (col + 1) / GRID;
    const v0 = 1 - (row + 1) / GRID, v1 = 1 - row / GRID;
    return [u0, v0, u1, v1];
  }

  current = { texture, uv, TILES };
  return current;
}

/** Holds the most recently generated atlas so meshing can reuse the same UV map. */
let current = null;

/** Returns the active atlas instance (set by generateAtlas). */
export function getAtlas() { return current; }

function noiseTileCol(ctx, x, base, seed) {
  const rand = rng(seed);
  for (let y = 0; y < TILE; y++) {
    const n = 0.85 + rand() * 0.15;
    ctx.fillStyle = shade(base, n); ctx.fillRect(x, y, 1, 1);
  }
}

/**
 * Maps a (block id, face direction) to an atlas tile index.
 * @param {number} id
 * @param {[number,number,number]} dir
 * @returns {number}
 */
export function tileFor(id, dir) {
  switch (id) {
    case 1: return dir[1] === 1 ? TILES.GRASS_TOP : dir[1] === -1 ? TILES.DIRT : TILES.GRASS_SIDE;
    case 2: return TILES.DIRT;
    case 3: return TILES.STONE;
    case 4: return TILES.SAND;
    case 5: return dir[1] !== 0 ? TILES.WOOD_TOP : TILES.WOOD_SIDE;
    case 6: return TILES.LEAVES;
    case 7: return TILES.GLASS;
    case 8: return TILES.WATER;
    case 9: return TILES.TORCH;
    default: return TILES.DIRT;
  }
}
