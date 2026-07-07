// game/entities/mobs.js
// Mob model builders, the data-driven mob registry, and behavior-tree AI for
// each mob type. `createMob` returns a configured LivingEntity whose `bt` is
// ticked every frame by LivingEntity.update(). Spawn gating/caps live in
// spawn.js; this file only defines *what* a mob is and *how* it acts.

import { SX, SY, SZ, SCALE, AIR, GRASS } from '../../core/config.js';
import { getTHREE } from '../../core/three.js';
import { getBlock, setBlock } from '../../world/world.js';
import { player, damagePlayer } from '../player.js';
import {
  playHiss, playExplosion, flashScreen, playHit, playShoot,
} from '../../engine/audio.js';
import { LivingEntity, boxCollides } from './entity.js';
import { spawnArrow } from './projectile.js';
import { SUCCESS, RUNNING, sel, seq, cond, act } from './bt.js';
import { GUNPOWDER, BONE, ROTTEN_FLESH, STRING, SLIME_BALL } from '../../world/items/items.js';

const mat = (c) => {
  const THREE = getTHREE();
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(c[0], c[1], c[2]), side: THREE.DoubleSide });
};
const box = (g, w, h, d, col, x, y, z) => {
  const THREE = getTHREE();
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(col));
  m.position.set(x, y, z); g.add(m); return m;
};

// ---- Model builders (each returns a Group already scaled to world units) ----
function makeCreeper() {
  const THREE = getTHREE(); const g = new THREE.Group();
  const green = [0.24, 0.55, 0.20];
  box(g, 0.5, 0.9, 0.3, green, 0, 0.85, 0);
  box(g, 0.5, 0.5, 0.5, green, 0, 1.5, 0);
  for (const [sx, sz] of [[-0.15, 0.08], [0.15, 0.08], [-0.15, -0.08], [0.15, -0.08]])
    box(g, 0.2, 0.5, 0.2, green, sx, 0.25, sz);
  box(g, 0.06, 0.18, 0.06, [0.5, 0.4, 0.2], 0, 1.85, 0);
  g.scale.setScalar(SCALE); return g;
}
function makeSheep() {
  const THREE = getTHREE(); const g = new THREE.Group();
  const wool = [0.92, 0.92, 0.95], dark = [0.25, 0.25, 0.28];
  box(g, 0.6, 0.5, 0.9, wool, 0, 0.7, 0);
  box(g, 0.35, 0.35, 0.35, wool, 0, 0.95, 0.55);
  for (const [sx, sz] of [[-0.18, 0.3], [0.18, 0.3], [-0.18, -0.3], [0.18, -0.3]])
    box(g, 0.12, 0.4, 0.12, dark, sx, 0.2, sz);
  g.scale.setScalar(SCALE); return g;
}
function makeZombie() {
  const THREE = getTHREE(); const g = new THREE.Group();
  const skin = [0.35, 0.55, 0.30];
  box(g, 0.5, 0.7, 0.3, skin, 0, 1.15, 0);
  box(g, 0.5, 0.5, 0.5, skin, 0, 1.75, 0);
  box(g, 0.18, 0.7, 0.18, skin, -0.34, 1.15, 0);
  box(g, 0.18, 0.7, 0.18, skin, 0.34, 1.15, 0);
  for (const sx of [-0.14, 0.14]) box(g, 0.25, 0.8, 0.25, skin, sx, 0.4, 0);
  g.scale.setScalar(SCALE); return g;
}
function makeSkeleton() {
  const THREE = getTHREE(); const g = new THREE.Group();
  const bone = [0.92, 0.92, 0.86];
  box(g, 0.4, 0.7, 0.25, bone, 0, 1.15, 0);
  box(g, 0.45, 0.45, 0.45, bone, 0, 1.75, 0);
  box(g, 0.14, 0.7, 0.14, bone, -0.3, 1.2, 0);
  box(g, 0.14, 0.7, 0.14, bone, 0.3, 1.2, 0);
  box(g, 0.5, 0.06, 0.06, [0.4, 0.3, 0.2], 0.4, 1.2, 0.1); // bow
  for (const sx of [-0.14, 0.14]) box(g, 0.2, 0.8, 0.2, bone, sx, 0.4, 0);
  g.scale.setScalar(SCALE); return g;
}
function makeSpider() {
  const THREE = getTHREE(); const g = new THREE.Group();
  const body = [0.18, 0.16, 0.22];
  box(g, 0.7, 0.35, 0.9, body, 0, 0.5, 0);
  box(g, 0.4, 0.3, 0.4, body, 0, 0.7, 0.5);
  for (const [sx, sz] of [[-0.4, 0.4], [0.4, 0.4], [-0.4, -0.4], [0.4, -0.4]])
    box(g, 0.1, 0.1, 0.5, body, sx, 0.4, sz);
  g.scale.setScalar(SCALE); return g;
}
function makeSlime() {
  const THREE = getTHREE(); const g = new THREE.Group();
  box(g, 1.0, 0.8, 1.0, [0.35, 0.75, 0.30], 0, 0.5, 0);
  g.scale.setScalar(SCALE); return g;
}

// ---- Behavior helpers (operate on the per-tick context `c`) ----
function chase(self, dt, speed) {
  const p = player.pos;
  const dx = p.x - self.pos.x, dz = p.z - self.pos.z;
  const d = Math.hypot(dx, dz) || 1;
  self.vel.x = dx / d * speed; self.vel.z = dz / d * speed;
  self.heading = Math.atan2(dx, dz);
}
function flee(self, dt, speed) {
  const p = player.pos;
  const dx = self.pos.x - p.x, dz = self.pos.z - p.z;
  const d = Math.hypot(dx, dz) || 1;
  self.vel.x = dx / d * speed; self.vel.z = dz / d * speed;
  self.heading = Math.atan2(dx, dz);
}
function wander(self, dt, speed) {
  self.wanderT = (self.wanderT || 0) - dt;
  if (self.wanderT <= 0) { self.wanderT = 1 + Math.random() * 2; self.wanderAng = Math.random() * Math.PI * 2; }
  self.vel.x = Math.sin(self.wanderAng) * speed;
  self.vel.z = Math.cos(self.wanderAng) * speed;
  self.heading = self.wanderAng;
}
function melee(self, dt, dmg, cd, range) {
  self.atkCd = (self.atkCd || 0) - dt;
  const p = player.pos;
  const d = Math.hypot(p.x - self.pos.x, p.z - self.pos.z);
  if (d < range && self.atkCd <= 0) { damagePlayer(dmg); self.atkCd = cd; playHit(); }
}
function shoot(self, dt, dmg, cd, speed) {
  self.shootCd = (self.shootCd || 0) - dt;
  if (self.shootCd <= 0) {
    const THREE = getTHREE();
    const from = { x: self.pos.x, y: self.pos.y + self.h * 0.6, z: self.pos.z };
    const dir = new THREE.Vector3(player.pos.x - from.x, (player.pos.y + 0.9) - from.y, player.pos.z - from.z);
    spawnArrow(from, dir, speed, dmg);
    self.shootCd = cd; playShoot();
  }
}
function explode(self) {
  const R = 3;
  const cx = Math.floor(self.pos.x), cy = Math.floor(self.pos.y + 0.8), cz = Math.floor(self.pos.z);
  for (let x = Math.max(0, cx - R); x <= Math.min(SX - 1, cx + R); x++)
    for (let y = Math.max(1, cy - R); y <= Math.min(SY - 1, cy + R); y++)
      for (let z = Math.max(0, cz - R); z <= Math.min(SZ - 1, cz + R); z++)
        if (Math.hypot(x - cx, y - cy, z - cz) <= R + 0.5 && getBlock(x, y, z) !== AIR) setBlock(x, y, z, AIR);
  playExplosion(); flashScreen();
  const d = self.pos.distanceTo(player.pos);
  if (d < R + 2.5) damagePlayer(Math.round(45 * (1 - d / (R + 2.5))));
  self.remove();
}

// ---- Behavior trees ----
const creeperBT = () => sel(
  seq(cond(c => c.self.fuse > 0),
    act(c => {
      c.self.fuse -= c.dt;
      c.self.model.scale.setScalar(SCALE * (1 + 0.18 * Math.abs(Math.sin(performance.now() * 0.02))));
      if (c.self.fuse <= 0) explode(c.self);
      return RUNNING;
    })),
  seq(cond(c => c.dist < 26),
    act(c => { chase(c.self, c.dt, 2.6); if (c.dist < 2.2) { c.self.fuse = 1.5; playHiss(); } return SUCCESS; })),
  act(c => { wander(c.self, c.dt, 1.2); return SUCCESS; }),
);

const sheepBT = () => sel(
  seq(cond(c => c.dist < 5), act(c => { flee(c.self, c.dt, 2.4); return SUCCESS; })),
  act(c => { wander(c.self, c.dt, 1.0); return SUCCESS; }),
);

const zombieBT = () => sel(
  seq(cond(c => c.dist < 16),
    act(c => { chase(c.self, c.dt, 2.2); melee(c.self, c.dt, 6, 1.0, 1.6); return SUCCESS; })),
  act(c => { wander(c.self, c.dt, 0.8); return SUCCESS; }),
);

const skeletonBT = () => sel(
  seq(cond(c => c.dist < 14),
    act(c => {
      if (c.dist > 8) chase(c.self, c.dt, 2.0);
      else if (c.dist < 5) { flee(c.self, c.dt, 1.6); }
      else { c.self.vel.x = 0; c.self.vel.z = 0; }
      if (c.dist < 12) shoot(c.self, c.dt, 5, 1.6, 18);
      return SUCCESS;
    })),
  act(c => { wander(c.self, c.dt, 0.8); return SUCCESS; }),
);

const spiderBT = () => sel(
  seq(cond(c => c.dist < 20),
    act(c => {
      chase(c.self, c.dt, 3.2);
      melee(c.self, c.dt, 5, 1.0, 1.6);
      if (c.self.onGround && Math.random() < 0.02) c.self.vel.y = 7;
      return SUCCESS;
    })),
  act(c => { wander(c.self, c.dt, 1.6); return SUCCESS; }),
);

const slimeBT = () => sel(
  seq(cond(c => c.dist < 14),
    act(c => {
      if (c.self.onGround) { c.self.vel.y = 6; chase(c.self, c.dt, 2.4); }
      else { c.self.vel.x *= 0.9; c.self.vel.z *= 0.9; }
      melee(c.self, c.dt, 4, 0.8, 1.6);
      return SUCCESS;
    })),
  act(c => { if (c.self.onGround && Math.random() < 0.02) { c.self.vel.y = 6; wander(c.self, c.dt, 1.5); } return SUCCESS; }),
);

/**
 * @typedef {Object} MobDef
 * @property {boolean} hostile
 * @property {number} health
 * @property {number} w  half-width
 * @property {number} h  height
 * @property {Array<{id:number,count:number}>} drops
 * @property {()=>import('three').Group} build
 * @property {()=>import('./bt.js').Node} makeBT
 */

/** Data-driven mob registry. */
export const MOBS = {
  sheep:    { hostile: false, health: 8,  w: 0.3,  h: 1.1, drops: [{ id: GRASS, count: 2 }], build: makeSheep, makeBT: sheepBT },
  creeper:  { hostile: true,  health: 20, w: 0.25, h: 1.7, drops: [{ id: GUNPOWDER, count: 1 }], build: makeCreeper, makeBT: creeperBT },
  zombie:   { hostile: true,  health: 20, w: 0.3,  h: 1.8, drops: [{ id: ROTTEN_FLESH, count: 2 }], build: makeZombie, makeBT: zombieBT },
  skeleton: { hostile: true,  health: 16, w: 0.25, h: 1.8, drops: [{ id: BONE, count: 2 }, { id: STRING, count: 1 }], build: makeSkeleton, makeBT: skeletonBT },
  spider:   { hostile: true,  health: 16, w: 0.4,  h: 1.0, drops: [{ id: STRING, count: 2 }], build: makeSpider, makeBT: spiderBT },
  slime:    { hostile: true,  health: 14, w: 0.45, h: 1.0, drops: [{ id: SLIME_BALL, count: 2 }], build: makeSlime, makeBT: slimeBT },
};

/**
 * Creates a fully configured mob instance at (x,y,z) voxel coords.
 * @returns {LivingEntity|null}
 */
export function createMob(type, x, y, z) {
  const def = MOBS[type];
  if (!def) return null;
  const THREE = getTHREE();
  const e = new LivingEntity(new THREE.Vector3(x, y, z), def.build(), { health: def.health, drops: def.drops });
  e.type = type;
  e.hostile = def.hostile;
  e.w = def.w; e.h = def.h;
  e.fuse = 0; e.wanderT = 0; e.wanderAng = 0; e.atkCd = 0; e.shootCd = 0;
  e.bt = def.makeBT();
  let guard = 0;
  while (boxCollides(e.pos.x, e.pos.y, e.pos.z, e.w, e.h) && e.pos.y < SY - 2 && guard++ < 40) e.pos.y += 1;
  return e;
}
