// game/entities/spawn.js
// Spawn manager: per-type population caps with day/night gating. Hostile mobs
// only spawn at night (and never during a difficulty grace period); passive
// mobs spawn any time. Spawns happen in a ring around the player on valid
// surface columns, budgeted to one pass per interval so it never blocks the
// frame (DESIGN: streaming, non-blocking). Difficulty (see game/difficulty.js)
// scales caps, spawn distance, and whether hostiles appear at all.

import { SX, SZ, SY } from '../../core/config.js';
import { solidAt } from '../../physics/collision.js';
import { entities, surfaceY } from './entity.js';
import { createMob, MOBS } from './mobs.js';
import { getDifficulty } from '../difficulty.js';

/** Base max simultaneous mobs per type (keeps entity counts bounded). */
const BASE_CAPS = {
  sheep: 24, creeper: 10, zombie: 10, skeleton: 8, spider: 8, slime: 8,
};

export class SpawnManager {
  constructor() { this.timer = 0; this.interval = 2; this.elapsed = 0; }

  /** Effective cap for a type given the current difficulty. */
  capFor(type) {
    const d = getDifficulty();
    const base = BASE_CAPS[type];
    if (base == null) return 0;
    return MOBS[type].hostile ? Math.round(base * d.capMul) : base;
  }

  /** Counts living mobs of a type. */
  count(type) {
    let n = 0;
    for (const e of entities) if (e.alive && e.type === type) n++;
    return n;
  }

  /** Attempts one spawn of `type` in a ring around the player. */
  trySpawnOne(type, px, pz) {
    const d = getDifficulty();
    const minR = d.minRadius || 10;
    const maxR = 40;
    const ang = Math.random() * Math.PI * 2;
    const r = minR + Math.random() * (maxR - minR);
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

  /** Fills the world up to caps once (used at boot). Hostiles are skipped
   * during daytime so the player never spawns into an ambush. */
  fill(px, pz, isNight) {
    for (const type of Object.keys(BASE_CAPS)) {
      if (MOBS[type].hostile && !isNight) continue;
      const cap = this.capFor(type);
      let placed = 0, attempts = 0;
      while (placed < cap && attempts < cap * 8) {
        attempts++;
        if (this.trySpawnOne(type, px, pz)) placed++;
      }
    }
  }

  /**
   * Periodic spawn pass. Hostile types are skipped during daytime or within
   * the difficulty grace window.
   * @param {number} dt
   * @param {number} px player x (voxels)
   * @param {number} pz player z (voxels)
   * @param {boolean} isNight
   */
  update(dt, px, pz, isNight) {
    this.elapsed += dt;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = this.interval;
    const d = getDifficulty();
    for (const type of Object.keys(BASE_CAPS)) {
      if (this.count(type) >= this.capFor(type)) continue;
      if (MOBS[type].hostile) {
        if (!d.hostile || !isNight || this.elapsed < d.grace) continue;
      }
      this.trySpawnOne(type, px, pz);
    }
  }
}
