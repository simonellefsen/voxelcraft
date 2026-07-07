// game/entities.js
// Passive sheep and hostile creepers with simple flocking/chase AI.

import { SX, SY, SZ, SCALE, GRASS, DIRT, STONE, SAND, WOOD, LEAVES } from '../core/config.js';
import { getTHREE } from '../core/three.js';
import { getBlock, setBlock } from '../world/world.js';
import { scene } from '../engine/renderer.js';
import { solidAt } from '../physics/collision.js';
import { player, damagePlayer } from './player.js';
import { playHiss, playExplosion, flashScreen } from '../engine/audio.js';

const GRAVITY = -28;

export const entities = [];

function makeCreeper() {
  const THREE = getTHREE();
  const g = new THREE.Group();
  const mat = c => new THREE.MeshBasicMaterial({ color: new THREE.Color(c[0], c[1], c[2]), side: THREE.DoubleSide });
  const box = (w, h, d, col, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(col)); m.position.set(x, y, z); g.add(m); return m; };
  const green = [0.24, 0.55, 0.20];
  box(0.5, 0.9, 0.3, green, 0, 0.85, 0);
  box(0.5, 0.5, 0.5, green, 0, 1.5, 0);
  box(0.2, 0.5, 0.2, green, -0.15, 0.25, 0.08);
  box(0.2, 0.5, 0.2, green, 0.15, 0.25, 0.08);
  box(0.2, 0.5, 0.2, green, -0.15, 0.25, -0.08);
  box(0.2, 0.5, 0.2, green, 0.15, 0.25, -0.08);
  box(0.06, 0.18, 0.06, [0.5, 0.4, 0.2], 0, 1.85, 0);
  g.scale.setScalar(SCALE);
  return g;
}

function makeSheep() {
  const THREE = getTHREE();
  const g = new THREE.Group();
  const mat = c => new THREE.MeshBasicMaterial({ color: new THREE.Color(c[0], c[1], c[2]), side: THREE.DoubleSide });
  const box = (w, h, d, col, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(col)); m.position.set(x, y, z); g.add(m); return m; };
  const wool = [0.92, 0.92, 0.95], dark = [0.25, 0.25, 0.28];
  box(0.6, 0.5, 0.9, wool, 0, 0.7, 0);
  box(0.35, 0.35, 0.35, wool, 0, 0.95, 0.55);
  box(0.12, 0.4, 0.12, dark, -0.18, 0.2, 0.3);
  box(0.12, 0.4, 0.12, dark, 0.18, 0.2, 0.3);
  box(0.12, 0.4, 0.12, dark, -0.18, 0.2, -0.3);
  box(0.12, 0.4, 0.12, dark, 0.18, 0.2, -0.3);
  g.scale.setScalar(SCALE);
  return g;
}

function surfaceY(x, z) {
  for (let y = SY - 1; y > 0; y--) if (solidAt(x, y, z)) return y + 1;
  return SY;
}

function entityCollides(x, y, z, w, h) {
  const minx = Math.floor(x - w), maxx = Math.floor(x + w);
  const miny = Math.floor(y), maxy = Math.floor(y + h);
  const minz = Math.floor(z - w), maxz = Math.floor(z + w);
  for (let ix = minx; ix <= maxx; ix++)
    for (let iy = miny; iy <= maxy; iy++)
      for (let iz = minz; iz <= maxz; iz++)
        if (solidAt(ix, iy, iz)) return true;
  return false;
}

export function addEntity(type, x, y, z) {
  const THREE = getTHREE();
  const model = type === 'creeper' ? makeCreeper() : makeSheep();
  scene.current.add(model);
  const e = {
    type, pos: new THREE.Vector3(x, y, z), vel: new THREE.Vector3(),
    model, alive: true, onGround: false, fuse: 0, w: 0.25,
    h: type === 'creeper' ? 1.7 : 1.1,
    heading: Math.random() * Math.PI * 2, wanderT: 0, wanderAng: 0,
  };
  let guard = 0;
  while (entityCollides(e.pos.x, e.pos.y, e.pos.z, e.w, e.h) && e.pos.y < SY - 2 && guard++ < 40) e.pos.y += 1;
  entities.push(e);
}

function trySpawn(type, count) {
  let placed = 0, attempts = 0;
  while (placed < count && attempts < count * 40) {
    attempts++;
    const x = 2 + Math.floor(Math.random() * (SX - 4)), z = 2 + Math.floor(Math.random() * (SZ - 4));
    const y = surfaceY(x, z);
    if (y >= SY) continue;
    if (solidAt(x, y, z) || solidAt(x, y + 1, z) || solidAt(x, y + 2, z)) continue;
    addEntity(type, x + 0.5, y, z + 0.5);
    placed++;
  }
}

/** Spawns the initial sheep + creeper populations. */
export function spawnEntities() {
  trySpawn('sheep', 22);
  trySpawn('creeper', 8);
}

function stepEntity(e, dt) {
  e.vel.y += GRAVITY * dt;
  const nx = e.pos.x + e.vel.x * dt;
  if (!entityCollides(nx, e.pos.y, e.pos.z, e.w, e.h)) e.pos.x = nx; else e.vel.x = 0;
  const nz = e.pos.z + e.vel.z * dt;
  if (!entityCollides(e.pos.x, e.pos.y, nz, e.w, e.h)) e.pos.z = nz; else e.vel.z = 0;
  const ny = e.pos.y + e.vel.y * dt;
  if (e.vel.y <= 0) {
    if (solidAt(e.pos.x, ny - 0.05, e.pos.z) || ny < 0) { e.pos.y = Math.floor(ny) + 1; e.vel.y = 0; e.onGround = true; }
    else { e.pos.y = ny; e.onGround = false; }
  } else {
    if (solidAt(e.pos.x, ny + e.h, e.pos.z)) e.vel.y = 0; else e.pos.y = ny;
    e.onGround = false;
  }
}

function wander(e, dt, speed) {
  e.wanderT -= dt;
  if (e.wanderT <= 0) { e.wanderT = 1 + Math.random() * 2; e.wanderAng = Math.random() * Math.PI * 2; }
  e.vel.x = Math.sin(e.wanderAng) * speed; e.vel.z = Math.cos(e.wanderAng) * speed;
  e.heading = e.wanderAng;
}

function explode(e) {
  const R = 3;
  const cx = Math.floor(e.pos.x), cy = Math.floor(e.pos.y + 0.8), cz = Math.floor(e.pos.z);
  const x0 = Math.max(0, cx - R), x1 = Math.min(SX - 1, cx + R);
  const y0 = Math.max(1, cy - R), y1 = Math.min(SY - 1, cy + R);
  const z0 = Math.max(0, cz - R), z1 = Math.min(SZ - 1, cz + R);
  for (let x = x0; x <= x1; x++)
    for (let y = y0; y <= y1; y++)
      for (let z = z0; z <= z1; z++)
        if (Math.hypot(x - cx, y - cy, z - cz) <= R + 0.5 && getBlock(x, y, z) !== 0) setBlock(x, y, z, 0);
  playExplosion();
  flashScreen();
  const d = e.pos.distanceTo(player.pos);
  if (d < R + 2.5) damagePlayer(Math.round(45 * (1 - d / (R + 2.5))));
  removeEntity(e);
}

function removeEntity(e) { e.alive = false; scene.current.remove(e.model); }

/** Advances all entity AI + physics by dt seconds. */
export function updateEntities(dt) {
  for (const e of entities) {
    if (!e.alive) continue;
    if (e.type === 'creeper') {
      const dx = player.pos.x - e.pos.x, dz = player.pos.z - e.pos.z;
      const dist = Math.hypot(dx, dz);
      if (e.fuse > 0) {
        e.fuse -= dt;
        e.model.scale.setScalar(SCALE * (1 + 0.18 * Math.abs(Math.sin(performance.now() * 0.02))));
        if (e.fuse <= 0) { explode(e); continue; }
      } else if (dist < 26) {
        const s = 2.6;
        e.vel.x = dx / dist * s; e.vel.z = dz / dist * s; e.heading = Math.atan2(dx, dz);
        if (dist < 2.2) { e.fuse = 1.5; playHiss(); }
      } else wander(e, dt, 1.2);
    } else {
      const dx = player.pos.x - e.pos.x, dz = player.pos.z - e.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 5) { const s = 2.4; e.vel.x = -dx / dist * s; e.vel.z = -dz / dist * s; e.heading = Math.atan2(-dx, -dz); }
      else wander(e, dt, 1.0);
    }
    if (e.onGround && Math.random() < 0.02) e.vel.y = 6;
    stepEntity(e, dt);
    e.model.position.set(e.pos.x * SCALE, e.pos.y * SCALE, e.pos.z * SCALE);
    e.model.rotation.y = e.heading;
  }
}
