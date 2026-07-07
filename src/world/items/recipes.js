// world/items/recipes.js
// Data-driven crafting recipes. Each recipe is a shapeless list of required
// ingredients and a single output stack. The same logic is used by the
// crafting UI and is unit-exercised by the boot harness (DESIGN.md: "Items
// and Tools should be data-driven whenever possible").

import { WOOD, STONE, SAND, GLASS } from '../../core/config.js';
import { WOOD_PICK, STONE_PICK, WOOD_SWORD, STONE_SWORD, ITEMS } from './items.js';

/**
 * @typedef {Object} Recipe
 * @property {string} id         stable id
 * @property {string} name       display name
 * @property {{id:number,count:number}} out   output stack
 * @property {Array<{id:number,count:number}>} in  required ingredients
 */

/** @type {Recipe[]} */
export const RECIPES = [
  { id: 'wood_pick', name: 'Wooden Pickaxe', out: { id: WOOD_PICK, count: 1 },
    in: [{ id: WOOD, count: 3 }] },
  { id: 'stone_pick', name: 'Stone Pickaxe', out: { id: STONE_PICK, count: 1 },
    in: [{ id: STONE, count: 3 }] },
  { id: 'wood_sword', name: 'Wooden Sword', out: { id: WOOD_SWORD, count: 1 },
    in: [{ id: WOOD, count: 2 }] },
  { id: 'stone_sword', name: 'Stone Sword', out: { id: STONE_SWORD, count: 1 },
    in: [{ id: STONE, count: 2 }] },
  { id: 'glass', name: 'Glass', out: { id: GLASS, count: 1 },
    in: [{ id: SAND, count: 4 }] },
];

/** Counts how many of each item id the inventory currently holds. */
function countById(inv) {
  const counts = new Map();
  for (const s of inv.slots) {
    if (!s) continue;
    counts.set(s.id, (counts.get(s.id) || 0) + s.count);
  }
  return counts;
}

/** True if the inventory can satisfy every ingredient of `recipe`. */
export function canCraft(inv, recipe) {
  const have = countById(inv);
  return recipe.in.every(ing => (have.get(ing.id) || 0) >= ing.count);
}

/** Consumes the ingredients of `recipe` from the inventory. */
function consume(inv, recipe) {
  for (const ing of recipe.in) {
    let need = ing.count;
    for (let i = 0; i < inv.size && need > 0; i++) {
      const s = inv.slots[i];
      if (!s || s.id !== ing.id) continue;
      const take = Math.min(s.count, need);
      inv.removeAt(i, take);
      need -= take;
    }
  }
}

/**
 * Attempts to craft `recipe`: consumes ingredients and adds the output.
 * @returns {boolean} true if crafted, false if ingredients were missing.
 */
export function craft(inv, recipe) {
  if (!canCraft(inv, recipe)) return false;
  consume(inv, recipe);
  inv.add(recipe.out.id, recipe.out.count);
  return true;
}

/** Human-readable ingredient summary, e.g. "3 Wood". */
export function recipeSummary(recipe) {
  return recipe.in
    .map(ing => `${ing.count}× ${(ITEMS[ing.id] && ITEMS[ing.id].name) || ing.id}`)
    .join(' + ');
}
