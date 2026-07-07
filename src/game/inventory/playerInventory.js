// game/inventory/playerInventory.js
// The player's inventory singleton. The hotbar is the first `HOTBAR` slots,
// shared by the UI and gameplay. Seeded with building blocks + a starter tool.

import { Inventory } from './inventory.js';
import { GRASS, DIRT, STONE, SAND, WOOD, LEAVES, GLASS } from '../../core/config.js';
import { WOOD_PICK, getMaxDurability } from '../../world/items/items.js';

export const HOTBAR = 9;

export const inventory = new Inventory(36, HOTBAR);

function seed() {
  const blocks = [GRASS, DIRT, STONE, SAND, WOOD, LEAVES, GLASS];
  blocks.forEach((b, i) => inventory.set(i, { id: b, count: 64, dmg: 0 }));
  inventory.set(7, { id: WOOD_PICK, count: 1, dmg: getMaxDurability(WOOD_PICK) });
}
seed();
