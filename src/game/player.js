// game/player.js
// Player state, third-person blocky avatar (with pickaxe), movement,
// collision, and the third-person camera rig.

import { SX, SY, SZ, SCALE, EYE, SOLID } from '../core/config.js';
import { getTHREE } from '../core/three.js';
import { getBlock } from '../world/world.js';
import { scene, camera } from '../engine/renderer.js';
import { input, setLook } from '../engine/input.js';
import { solidAt } from '../physics/collision.js';
import { flashScreen } from '../engine/audio.js';

const GRAVITY = -28, JUMP = 9, SPEED = 5, SPRINT = 8;
const TURN = 2.4; // radians/sec for A/D

export const player = {
  pos: null,
  vel: null,
  onGround: false,
  health: 100,
};
export let spawnPos = null;

let swing = 0, walkPhase = 0;
let character = null;
let rArm = null;

/** Player AABB overlaps any solid voxel? */
function collides() {
  const p = player.pos;
  const minx = Math.floor(p.x - 0.3), maxx = Math.floor(p.x + 0.3);
  const miny = Math.floor(p.y),       maxy = Math.floor(p.y + 1.8);
  const minz = Math.floor(p.z - 0.3), maxz = Math.floor(p.z + 0.3);
  for (let x = minx; x <= maxx; x++)
    for (let y = miny; y <= maxy; y++)
      for (let z = minz; z <= maxz; z++) {
        if (x < 0 || z < 0 || x >= SX || z >= SZ) return true;
        if (y < 0) return true;
        if (SOLID.has(getBlock(x, y, z))) return true;
      }
  return false;
}

function makeCharacter() {
  const THREE = getTHREE();
  const g = new THREE.Group();
  const mat = c => new THREE.MeshBasicMaterial({ color: new THREE.Color(c[0], c[1], c[2]), side: THREE.DoubleSide });
  const box = (w, h, d, col, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(col));
    m.position.set(x, y, z); g.add(m); return m;
  };
  const skin = [0.78, 0.58, 0.45], shirt = [0.27, 0.52, 0.85],
        pants = [0.22, 0.27, 0.42], boot = [0.15, 0.15, 0.15],
        woodC = [0.55, 0.40, 0.25], ironC = [0.72, 0.72, 0.78];
  box(0.25, 0.8, 0.25, pants, -0.14, 0.4, 0);
  box(0.25, 0.8, 0.25, pants, 0.14, 0.4, 0);
  box(0.27, 0.15, 0.27, boot, -0.14, 0.075, 0.02);
  box(0.27, 0.15, 0.27, boot, 0.14, 0.075, 0.02);
  box(0.5, 0.7, 0.3, shirt, 0, 1.15, 0);
  box(0.5, 0.5, 0.5, skin, 0, 1.75, 0);
  box(0.18, 0.7, 0.18, skin, -0.34, 1.15, 0);
  const rArmG = new THREE.Group(); rArmG.position.set(0.34, 1.5, 0); g.add(rArmG);
  const rArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18), mat(skin));
  rArmMesh.position.set(0, -0.35, 0); rArmG.add(rArmMesh);
  const pick = new THREE.Group(); pick.position.set(0, -0.7, 0.08); rArmG.add(pick);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.06), mat(woodC));
  handle.position.set(0, -0.1, 0); pick.add(handle);
  const headp = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.13, 0.13), mat(ironC));
  headp.position.set(0.13, -0.38, 0); pick.add(headp);
  g.scale.setScalar(SCALE);
  return { group: g, rArm: rArmG };
}

/** Creates the player, drops them to the surface, builds the avatar. */
export function initPlayer() {
  const THREE = getTHREE();
  player.pos = new THREE.Vector3(SX / 2, SY, SZ / 2);
  player.vel = new THREE.Vector3();
  player.onGround = false;
  player.health = 100;

  for (let y = SY - 1; y > 0; y--) {
    if (SOLID.has(getBlock(Math.floor(player.pos.x), y, Math.floor(player.pos.z)))) {
      player.pos.y = y + 1; break;
    }
  }
  spawnPos = player.pos.clone();

  const c = makeCharacter();
  character = c.group;
  rArm = c.rArm;
  scene.current.add(character);
  updateCameraTransform();
}

/** Triggers the pickaxe swing animation. */
export function triggerSwing() { swing = 1; }

/** Moves the third-person camera behind the player, pulling in near walls. */
export function updateCameraTransform() {
  const fx = -Math.sin(input.yaw), fz = -Math.cos(input.yaw);
  const headX = player.pos.x * SCALE, headY = (player.pos.y + EYE) * SCALE, headZ = player.pos.z * SCALE;
  const dist = 0.45;
  let ox = -fx * dist * Math.cos(input.pitch);
  let oy = 0.2 - Math.sin(input.pitch) * dist;
  let oz = -fz * dist * Math.cos(input.pitch);
  let len = Math.hypot(ox, oy, oz), tries = 0;
  while (solidAt(headX + ox, headY + oy, headZ + oz) && len > 0.12 && tries < 12) {
    ox *= 0.7; oy *= 0.7; oz *= 0.7; len *= 0.7; tries++;
  }
  camera.current.position.set(headX + ox, headY + oy, headZ + oz);
  camera.current.lookAt(headX, headY, headZ);
}

export function updateCharacter(dt) {
  character.position.set(player.pos.x * SCALE, player.pos.y * SCALE, player.pos.z * SCALE);
  character.rotation.y = input.yaw;
  const moving = (Math.abs(player.vel.x) + Math.abs(player.vel.z)) > 0.1;
  if (moving) walkPhase += dt * 10; else walkPhase *= 0.9;
  if (swing > 0) swing = Math.max(0, swing - dt * 3);
  character.position.y += (moving ? Math.sin(walkPhase) * 0.04 : 0) * SCALE;
  rArm.rotation.x = -swing * 1.8 + (moving ? Math.sin(walkPhase) * 0.3 : 0);
}

/** Advances player physics by dt seconds. */
export function move(dt) {
  if (input.keys['KeyA']) input.yaw += TURN * dt;
  if (input.keys['KeyD']) input.yaw -= TURN * dt;
  setLook();

  const fx = -Math.sin(input.yaw), fz = -Math.cos(input.yaw);
  const dir = new (getTHREE().Vector3)();
  if (input.keys['KeyW']) { dir.x += fx; dir.z += fz; }
  if (input.keys['KeyS']) { dir.x -= fx; dir.z -= fz; }
  if (dir.lengthSq() > 0) dir.normalize();
  const spd = (input.keys['ShiftLeft'] || input.keys['ShiftRight']) ? SPRINT : SPEED;
  player.vel.x = dir.x * spd; player.vel.z = dir.z * spd;

  player.vel.y += GRAVITY * dt;
  if (input.keys['Space'] && player.onGround) { player.vel.y = JUMP; player.onGround = false; }

  const p = player.pos;
  player.onGround = false;
  const step = (axis, v) => {
    p[axis] += v;
    if (collides()) {
      p[axis] -= v;
      if (axis === 'y') { if (v < 0) player.onGround = true; player.vel[axis] = 0; }
    }
  };
  step('x', player.vel.x * dt);
  step('z', player.vel.z * dt);
  step('y', player.vel.y * dt);
  updateCameraTransform();
}

/** Applies fall/explosion damage; respawns at spawn on death. */
export function damagePlayer(amt) {
  if (amt <= 0) return;
  player.health -= amt;
  flashScreen();
  if (player.health <= 0) {
    player.pos.copy(spawnPos);
    player.vel.set(0, 0, 0);
    player.health = 100;
  }
}
