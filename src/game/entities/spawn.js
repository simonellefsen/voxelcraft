// game/entities/spawn.js
// Spawn manager: per-type population caps with day/night gating. Hostile mobs
// only spawn at night; passive mobs spawn any time. Spawns happen in a ring
// around the player on valid surface columns, budgeted to one pass per
// interval so it never blocks the frame (DESIGN: streaming, non-blocking).

import { SX, SZ, SY } from '../../core/config.js';
import { solidAt } from '../../physics/collision.js';
import { entities, surfaceY } from './entity.js';
import { createMob } from './mobs.js';
import { MOBS } from './mobs.js';

/** Max simultaneous mobs per type (keeps entity counts bounded). */
export const CAPS = {
  sheep: 24, creeper: 10, zombie: 10, skeleton: 8, spider: 8, slime: 8,
};

export class SpawnManager {
  constructor() { this.timer = 0; this.interval = 2; }

  /** Counts living mobs of a type. */
  count(type) {
    let n = 0;
    for (const e of entities) if (e.alive && e.type === type) n++;
    return n;
  }

  /** Attempts one spawn of `type` in a ring around the player. */
  trySpawnOne(type, px, pz) {
    const ang = Math.random() * Math.PI * 2;
    const r = 10 + Math.random() * 30;
    const x = Math.floor(px + Math.cos(ang) * r);
    const z = Math.floor(pz + Math.sin(ang) * r);
    if (x < 1 || z < 1 || x >= SX - 1 || z >= SZ - 1) return false;
    const y = surfaceY(x, z);
    if (y >= SY) return false;
    if (solidAt(x, y, z) || solidAt(x, y + 1, z) || solidAt(x, y + 2, z)) return false;
    const e = createMob(type, x + 0.5, y, z + 0.5);
    if (e) { entities.push(e); return true; }
    return false;
  }

  /** Fills the world up to caps once (used at boot). */
  fill(px, pz) {
    for (const type of Object.keys(CAPS)) {
      const cap = CAPS[type];
      let placed = 0, attempts = 0;
      while (placed < cap && attempts < cap * 8) {
        attempts++;
        if (this.trySpawnOne(type, px, pz)) placed++;
      }
    }
  }

  /**
   * Periodic spawn pass. Hostile types are skipped during daytime.
   * @param {number} dt
   * @param {number} px player x (voxels)
   * @param {number} pz player z (voxels)
   * @param {boolean} isNight
   */
  update(dt, px, pz, isNight) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = this.interval;
    for (const type of Object.keys(CAPS)) {
      if (MOBS[type].hostile && !isNight) continue;
      if (this.count(type) >= CAPS[type]) continue;
      this.trySpawnOne(type, px, pz);
    }
  }
}
