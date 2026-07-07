// game/inventory/inventory.js
// Slot-based inventory. Each slot is { id, count, dmg } where `dmg` is
// remaining durability for tools (undefined/0 for stackables). The hotbar is
// simply the first `hotbarSize` slots, so UI and gameplay share one store.

import { ITEMS, getMaxDurability } from '../../world/items/items.js';

export class Inventory {
  /**
   * @param {number} size total slots
   * @param {number} hotbarSize slots treated as the hotbar
   */
  constructor(size = 36, hotbarSize = 9) {
    this.size = size;
    this.hotbarSize = hotbarSize;
    /** @type {Array<{id:number,count:number,dmg:number}|null>} */
    this.slots = new Array(size).fill(null);
  }

  /** Adds items; returns the number that didn't fit. */
  add(id, count = 1, dmg = 0) {
    const max = (ITEMS[id] && ITEMS[id].stack) || 64;
    const useDmg = dmg || (ITEMS[id] && ITEMS[id].tool ? getMaxDurability(id) : 0);
    // top up existing stacks
    for (const s of this.slots) {
      if (s && s.id === id && s.count < max && (ITEMS[id].tool ? s.dmg === useDmg : true)) {
        const space = max - s.count;
        const take = Math.min(space, count);
        s.count += take; count -= take;
        if (count <= 0) return 0;
      }
    }
    // fill empty slots
    for (let i = 0; i < this.size; i++) {
      if (!this.slots[i]) {
        const take = Math.min(max, count);
        this.slots[i] = { id, count: take, dmg: useDmg };
        count -= take;
        if (count <= 0) return 0;
      }
    }
    return count;
  }

  /** Removes up to `count` from a slot; returns actual removed. */
  removeAt(index, count = 1) {
    const s = this.slots[index];
    if (!s) return 0;
    const take = Math.min(s.count, count);
    s.count -= take;
    if (s.count <= 0) this.slots[index] = null;
    return take;
  }

  get(index) { return this.slots[index]; }
  set(index, item) { this.slots[index] = item; }
  clearAt(index) { this.slots[index] = null; }

  /** Decrements a tool's durability in the given slot; clears it if broken. */
  damageSlot(index) {
    const s = this.slots[index];
    if (!s || !ITEMS[s.id] || !ITEMS[s.id].tool) return;
    s.dmg -= 1;
    if (s.dmg <= 0) this.slots[index] = null;
  }
}
