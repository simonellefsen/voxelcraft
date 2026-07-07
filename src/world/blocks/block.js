// world/blocks/block.js
// Data-driven block registry. Each block declares its physical/render
// properties; colors keep the original per-face (top/side/bottom) shading.
//
// No rendering code lives here — only data + a color lookup the mesher uses.

export const AIR = 0, GRASS = 1, DIRT = 2, STONE = 3, SAND = 4,
  WOOD = 5, LEAVES = 6, GLASS = 7, WATER = 8, TORCH = 9;

/**
 * @typedef {Object} BlockDef
 * @property {number} id
 * @property {string} name
 * @property {boolean} solid
 * @property {boolean} opaque   fully occludes neighbour faces
 * @property {boolean} transparent  rendered in the transparent pass
 * @property {[number,number,number]} color  base RGB (0..1)
 */

/** @type {BlockDef[]} indexed by id */
export const BLOCK_DEFS = [
  { id: AIR,   name: 'Air',   solid: false, opaque: false, transparent: false, color: [0, 0, 0] },
  { id: GRASS, name: 'Grass', solid: true,  opaque: true,  transparent: false, color: [0.50, 0.38, 0.25] },
  { id: DIRT,  name: 'Dirt',  solid: true,  opaque: true,  transparent: false, color: [0.50, 0.36, 0.24] },
  { id: STONE, name: 'Stone', solid: true,  opaque: true,  transparent: false, color: [0.56, 0.56, 0.60] },
  { id: SAND,  name: 'Sand',  solid: true,  opaque: true,  transparent: false, color: [0.86, 0.80, 0.56] },
  { id: WOOD,  name: 'Wood',  solid: true,  opaque: true,  transparent: false, color: [0.70, 0.55, 0.35] },
  { id: LEAVES,name: 'Leaves',solid: true,  opaque: true,  transparent: false, color: [0.27, 0.55, 0.23] },
  { id: GLASS, name: 'Glass', solid: true,  opaque: false, transparent: true,  color: [0.72, 0.86, 0.92] },
  { id: WATER, name: 'Water', solid: false, opaque: false, transparent: true,  color: [0.25, 0.50, 0.92] },
  { id: TORCH, name: 'Torch', solid: true,  opaque: true,  transparent: false, color: [1.00, 0.80, 0.35], emits: 15 },
];

/** True if the block id is solid (blocks movement). */
export function isSolid(id) { return !!BLOCK_DEFS[id] && BLOCK_DEFS[id].solid; }

/** True if the block fully occludes adjacent faces. */
export function isOpaque(id) { return !!BLOCK_DEFS[id] && BLOCK_DEFS[id].opaque; }

/** True if the block renders in the transparent pass. */
export function isTransparent(id) { return !!BLOCK_DEFS[id] && BLOCK_DEFS[id].transparent; }

/** Light level (0..15) emitted by a block, for the lighting subsystem. */
export function emits(id) { return (BLOCK_DEFS[id] && BLOCK_DEFS[id].emits) || 0; }

/** Display name for a block id. */
export function blockName(id) { return (BLOCK_DEFS[id] && BLOCK_DEFS[id].name) || 'Air'; }

const SHADE = { top: 1.0, bottom: 0.5, x: 0.7, z: 0.85 };

/**
 * Vertex colour (with simple face shading) for a block id + face direction.
 * @param {number} id
 * @param {[number,number,number]} dir face normal
 * @returns {[number,number,number]}
 */
export function blockColor(id, dir) {
  let base;
  switch (id) {
    case GRASS:  base = dir[1] === 1 ? [0.42, 0.72, 0.30] : dir[1] === -1 ? [0.50, 0.36, 0.24] : [0.50, 0.38, 0.25]; break;
    case WOOD:   base = dir[1] !== 0 ? [0.70, 0.55, 0.35] : [0.42, 0.30, 0.17]; break;
    default:     base = BLOCK_DEFS[id] ? BLOCK_DEFS[id].color : [1, 0, 1];
  }
  const key = dir[1] === 1 ? 'top' : dir[1] === -1 ? 'bottom' : (dir[0] !== 0 ? 'x' : 'z');
  const s = SHADE[key];
  return [base[0] * s, base[1] * s, base[2] * s];
}
