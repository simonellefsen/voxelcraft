// game/entities.js
// Facade over the entity subsystem (base classes, mobs, spawning, projectiles).
// Keeps the original public API (`entities`, `spawnEntities`, `updateEntities`,
// `addEntity`, `removeEntity`) so main.js is unchanged.

import { entities } from './entities/entity.js';
import { SpawnManager } from './entities/spawn.js';
import { updateArrows } from './entities/projectile.js';
import { createMob } from './entities/mobs.js';
import { player } from './player.js';

const manager = new SpawnManager();

/** Seeds the initial mob population around the player. */
export function spawnEntities() {
  manager.fill(player.pos.x, player.pos.z);
}

/**
 * Advances all entity AI/physics + projectiles by dt seconds.
 * @param {number} dt
 * @param {boolean} isNight  gate for hostile (re)spawning
 */
export function updateEntities(dt, isNight = false) {
  for (const e of entities) e.update(dt);
  // Drop dead mobs from the active list.
  for (let i = entities.length - 1; i >= 0; i--) if (!entities[i].alive) entities.splice(i, 1);
  manager.update(dt, player.pos.x, player.pos.z, isNight);
  updateArrows(dt);
}

/** Adds a pre-built mob instance (or creates one from `type`). */
export function addEntity(type, x, y, z) {
  const e = typeof type === 'string' ? createMob(type, x, y, z) : type;
  if (e) entities.push(e);
  return e;
}

/** Removes a mob from the world. */
export function removeEntity(e) { if (e) e.remove(); }

export { entities };
