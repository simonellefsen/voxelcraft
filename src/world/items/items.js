// world/items/items.js
// Data-driven item registry. Blocks double as placeable items (same id);
// tools define mining speed, durability, and the block types they are
// effective on. Keeps gameplay data out of the engine (DESIGN.md "Items and
// Tools should be data-driven whenever possible").

import { GRASS, DIRT, STONE, SAND, WOOD, LEAVES, GLASS } from '../../core/config.js';

// Tool item ids (kept clear of block ids 0..8).
export const WOOD_PICK = 20, STONE_PICK = 21, WOOD_SWORD = 22, STONE_SWORD = 23;

// Mob-drop item ids (non-placeable).
export const GUNPOWDER = 30, BONE = 31, ROTTEN_FLESH = 32, STRING = 33, SLIME_BALL = 34;

/** Base seconds to mine a block by hand (speed = 1). */
const HARDNESS = {
  [GRASS]: 0.4, [DIRT]: 0.4, [STONE]: 1.6, [SAND]: 0.5,
  [WOOD]: 1.0, [LEAVES]: 0.3, [GLASS]: 0.2,
};

/** Blocks that are very slow (and drop nothing-worthy) without the right tool. */
const NEEDS_TOOL = new Set([STONE]);

/**
 * @typedef {Object} ItemDef
 * @property {string} name
 * @property {number} stack
 * @property {number|null} placeBlock  block id placed, or null
 * @property {Object|null} tool  { type, material, speed, durability, effective, damage }
 */

/** @type {Object<number, ItemDef>} */
export const ITEMS = {
  // Blocks are placeable items (id == block id).
  [GRASS]: { name: 'Grass', stack: 64, placeBlock: GRASS, tool: null },
  [DIRT]:  { name: 'Dirt', stack: 64, placeBlock: DIRT, tool: null },
  [STONE]: { name: 'Stone', stack: 64, placeBlock: STONE, tool: null },
  [SAND]:  { name: 'Sand', stack: 64, placeBlock: SAND, tool: null },
  [WOOD]:  { name: 'Wood', stack: 64, placeBlock: WOOD, tool: null },
  [LEAVES]:{ name: 'Leaves', stack: 64, placeBlock: LEAVES, tool: null },
  [GLASS]: { name: 'Glass', stack: 64, placeBlock: GLASS, tool: null },
  // Tools
  [WOOD_PICK]:  { name: 'Wooden Pickaxe', stack: 1, placeBlock: null,
    tool: { type: 'pickaxe', material: 'wood', speed: 2, durability: 60, effective: new Set([STONE]), damage: 2 } },
  [STONE_PICK]: { name: 'Stone Pickaxe', stack: 1, placeBlock: null,
    tool: { type: 'pickaxe', material: 'stone', speed: 4, durability: 130, effective: new Set([STONE]), damage: 3 } },
  [WOOD_SWORD]: { name: 'Wooden Sword', stack: 1, placeBlock: null,
    tool: { type: 'sword', material: 'wood', speed: 1, durability: 60, effective: new Set(), damage: 4 } },
  [STONE_SWORD]:{ name: 'Stone Sword', stack: 1, placeBlock: null,
    tool: { type: 'sword', material: 'stone', speed: 1, durability: 130, effective: new Set(), damage: 5 } },
  // Mob drops (non-placeable)
  [GUNPOWDER]:   { name: 'Gunpowder', stack: 64, placeBlock: null, tool: null },
  [BONE]:        { name: 'Bone', stack: 64, placeBlock: null, tool: null },
  [ROTTEN_FLESH]:{ name: 'Rotten Flesh', stack: 64, placeBlock: null, tool: null },
  [STRING]:      { name: 'String', stack: 64, placeBlock: null, tool: null },
  [SLIME_BALL]:  { name: 'Slime Ball', stack: 64, placeBlock: null, tool: null },
};

export function getItem(id) { return ITEMS[id] || null; }
export function isTool(id) { return !!(ITEMS[id] && ITEMS[id].tool); }
export function placeBlockOf(id) { return ITEMS[id] ? ITEMS[id].placeBlock : null; }

function effective(tool, blockId) {
  return !!(tool && tool.effective && tool.effective.has(blockId));
}

/** Seconds required to mine `blockId` with the selected item `itemId`. */
export function miningTime(itemId, blockId) {
  const h = HARDNESS[blockId] != null ? HARDNESS[blockId] : 1;
  const tool = ITEMS[itemId] && ITEMS[itemId].tool;
  let speed = 1;
  if (tool) speed = effective(tool, blockId) ? tool.speed : 1;
  let t = h / speed;
  if (NEEDS_TOOL.has(blockId) && (!tool || !effective(tool, blockId))) t *= 3;
  return t;
}

/** Maximum durability for a tool item (per-instance durability lives in the inventory slot). */
export function getMaxDurability(itemId) {
  const def = ITEMS[itemId];
  return def && def.tool ? def.tool.durability : 0;
}
