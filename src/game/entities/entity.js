// game/entities/entity.js
// Base entity classes. `Entity` owns position/velocity, an optional 3D model,
// and shared voxel AABB physics. `LivingEntity` adds health, damage, and
// death drops. Mob behaviors (see mobs.js) are driven by a behavior tree and
// implemented in `behave()`, keeping per-mob logic out of the physics core.

import { SCALE, SY } from '../../core/config.js';
import { getTHREE } from '../../core/three.js';
import { scene } from '../../engine/renderer.js';
import { solidAt } from '../../physics/collision.js';
import { player } from '../player.js';
import { spawnDrop } from './drops.js';

export const GRAVITY = -28;

/** Active entity list (mobs + any non-item entities). */
export const entities = [];

/**
 * True if an axis-aligned box centred at (x,z) with half-width `w` and
 * height `h` anchored at `y` (feet) overlaps any solid voxel.
 */
export function boxCollides(x, y, z, w, h) {
  const minx = Math.floor(x - w), maxx = Math.floor(x + w);
  const miny = Math.floor(y), maxy = Math.floor(y + h);
  const minz = Math.floor(z - w), maxz = Math.floor(z + w);
  for (let ix = minx; ix <= maxx; ix++)
    for (let iy = miny; iy <= maxy; iy++)
      for (let iz = minz; iz <= maxz; iz++)
        if (solidAt(ix, iy, iz)) return true;
  return false;
}

export class Entity {
  /**
   * @param {import('three').Vector3} pos
   * @param {import('three').Object3D} model
   */
  constructor(pos, model) {
    this.pos = pos;
    this.vel = new (getTHREE().Vector3)();
    this.model = model;
    this.alive = true;
    this.onGround = false;
    this.w = 0.25;
    this.h = 1.0;
    this.heading = Math.random() * Math.PI * 2;
    scene.current.add(model);
  }

  /** Integrates gravity + AABB collision along each axis. */
  step(dt) {
    this.vel.y += GRAVITY * dt;
    const nx = this.pos.x + this.vel.x * dt;
    if (!boxCollides(nx, this.pos.y, this.pos.z, this.w, this.h)) this.pos.x = nx; else this.vel.x = 0;
    const nz = this.pos.z + this.vel.z * dt;
    if (!boxCollides(this.pos.x, this.pos.y, nz, this.w, this.h)) this.pos.z = nz; else this.vel.z = 0;
    const ny = this.pos.y + this.vel.y * dt;
    if (this.vel.y <= 0) {
      if (solidAt(this.pos.x, ny - 0.05, this.pos.z) || ny < 0) {
        this.pos.y = Math.floor(ny) + 1; this.vel.y = 0; this.onGround = true;
      } else { this.pos.y = ny; this.onGround = false; }
    } else {
      if (solidAt(this.pos.x, ny + this.h, this.pos.z)) this.vel.y = 0; else this.pos.y = ny;
      this.onGround = false;
    }
  }

  /** Removes the entity from the scene. */
  remove() {
    if (!this.alive) return;
    this.alive = false;
    scene.current.remove(this.model);
  }
}

export class LivingEntity extends Entity {
  /**
   * @param {import('three').Vector3} pos
   * @param {import('three').Object3D} model
   * @param {{health:number, drops?:Array<{id:number,count:number}>}} opts
   */
  constructor(pos, model, opts = {}) {
    super(pos, model);
    this.health = opts.health || 10;
    this.maxHealth = this.health;
    this.drops = opts.drops || [];
    this.dead = false;
    this.bt = null; // behavior tree, set by the mob factory
  }

  /** Applies damage; triggers death on reaching zero. */
  takeDamage(amt) {
    if (this.dead || amt <= 0) return;
    this.health -= amt;
    if (this.health <= 0) { this.dead = true; this.onDeath(); }
  }

  /** Drops loot and removes the mob. */
  onDeath() {
    for (const d of this.drops) {
      spawnDrop(this.pos.x, this.pos.y + 0.5, this.pos.z, d.id, d.count);
    }
    this.remove();
  }

  /** Builds the per-tick context and ticks the behavior tree (if any). */
  behave(dt) {
    if (!this.bt) return;
    const p = player.pos;
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    this.bt.tick({ self: this, dt, player: p, dx, dz, dist });
  }

  /** Per-frame update: AI, physics, and model transform. */
  update(dt) {
    if (this.dead) return;
    this.behave(dt);
    this.step(dt);
    if (this.model) {
      this.model.position.set(this.pos.x * SCALE, this.pos.y * SCALE, this.pos.z * SCALE);
      this.model.rotation.y = this.heading;
    }
  }
}

/** Finds the surface voxel height (feet) at a column, or SY if none. */
export function surfaceY(x, z) {
  for (let y = SY - 1; y > 0; y--) if (solidAt(x, y, z)) return y + 1;
  return SY;
}
