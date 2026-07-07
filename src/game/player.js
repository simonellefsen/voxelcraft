// game/player.js
// Player state, third-person blocky avatar (with pickaxe), movement,
// collision, and the third-person camera rig.

import { SX, SY, SZ, SCALE, EYE, SOLID, AIR, BLOCK_SWATCH, TORCH } from '../core/config.js';
import { getTHREE } from '../core/three.js';
import { getBlock } from '../world/world.js';
import { scene, camera } from '../engine/renderer.js';
import { commands, consumeLook } from '../engine/input/commands.js';
import { solidAt } from '../physics/collision.js';
import { flashScreen } from '../engine/audio.js';
import { WOOD_PICK, STONE_PICK, WOOD_SWORD, STONE_SWORD } from '../world/items/items.js';

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
let fpArm = null, fpHand = null, fpHeld = null;
let yaw = 0, pitch = 0;   // camera orientation (consumed from commands)
let cameraMode = 'first'; // 'first' (default) | 'third'
let heldId = -1;          // item id currently shown in the first-person hand
export function getYaw() { return yaw; }
export function getPitch() { return pitch; }
export function getCameraMode() { return cameraMode; }

/** Toggles between first-person (default) and third-person views. */
export function toggleCameraMode() {
  cameraMode = cameraMode === 'first' ? 'third' : 'first';
  if (character) character.visible = (cameraMode === 'third');
  refreshFpVisibility();
  updateCameraTransform();
}

/** Shows the held view-model only in first-person with a non-empty selection. */
function refreshFpVisibility() {
  const show = (cameraMode === 'first') && (heldId && heldId !== AIR);
  if (fpArm) fpArm.visible = show;
}

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

/** Builds the first-person view-model: a hand anchored to the camera plus a
 * swappable `fpHeld` group that shows the currently selected hotbar item. */
function makeFirstPersonArm() {
  const THREE = getTHREE();
  const g = new THREE.Group();
  const skin = [0.78, 0.58, 0.45];
  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.5, 0.12),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(skin[0], skin[1], skin[2]) }));
  arm.position.set(0, -0.25, 0); g.add(arm);
  const hand = new THREE.Group(); hand.position.set(0, -0.5, 0); g.add(hand);
  const held = new THREE.Group(); hand.add(held);
  g.position.set(0.34, -0.30, -0.6); // lower-right of the view
  g.visible = false;
  return { group: g, hand, held };
}

function fpMat(c) { const THREE = getTHREE(); return new THREE.MeshBasicMaterial({ color: new THREE.Color(c[0], c[1], c[2]) }); }
function fpBox(w, h, d, c, x, y, z, parent) {
  const THREE = getTHREE();
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), fpMat(c));
  m.position.set(x, y, z); parent.add(m); return m;
}
const WOOD_C = [0.55, 0.40, 0.25], IRON_C = [0.72, 0.72, 0.78], FLAME_C = [1.0, 0.82, 0.30];

function buildPick(group) {
  fpBox(0.05, 0.5, 0.05, WOOD_C, 0, -0.25, 0, group);
  fpBox(0.24, 0.09, 0.09, IRON_C, 0, -0.5, 0.04, group);
}
function buildSword(group) {
  fpBox(0.05, 0.5, 0.05, IRON_C, 0, -0.3, 0, group);
  fpBox(0.16, 0.05, 0.05, WOOD_C, 0, -0.06, 0, group);
}
function buildTorch(group) {
  fpBox(0.05, 0.4, 0.05, WOOD_C, 0, -0.2, 0, group);
  fpBox(0.12, 0.18, 0.12, FLAME_C, 0, -0.02, 0, group);
}
function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
function buildHeldBlock(group, id) {
  const c = BLOCK_SWATCH[id] ? hexToRgb(BLOCK_SWATCH[id]) : [0.6, 0.6, 0.6];
  fpBox(0.3, 0.3, 0.3, c, 0, -0.25, 0, group);
}

/** Rebuilds the first-person held model for the given item id (0 = empty). */
export function setHeldItem(id) {
  if (!fpHeld || id === heldId) return;
  heldId = id;
  while (fpHeld.children.length) fpHeld.remove(fpHeld.children[0]);
  if (id === WOOD_PICK || id === STONE_PICK) buildPick(fpHeld);
  else if (id === WOOD_SWORD || id === STONE_SWORD) buildSword(fpHeld);
  else if (id === TORCH) buildTorch(fpHeld);
  else if (id && BLOCK_SWATCH[id]) buildHeldBlock(fpHeld, id);
  else if (id) buildHeldBlock(fpHeld, 0); // generic (gray) fallback
  refreshFpVisibility();
}

/** Highest solid block in a column, or −1 if the column is empty. */
function topSolidAt(x, z) {
  for (let y = SY - 1; y >= 0; y--) if (SOLID.has(getBlock(x, y, z))) return y;
  return -1;
}

/** Would the player's AABB be free if centred at (cx,cz) with feet at footY? */
function aabbClear(cx, cz, footY) {
  const minx = Math.floor(cx - 0.3), maxx = Math.floor(cx + 0.3);
  const miny = Math.floor(footY),     maxy = Math.floor(footY + 1.8);
  const minz = Math.floor(cz - 0.3), maxz = Math.floor(cz + 0.3);
  for (let x = minx; x <= maxx; x++)
    for (let y = miny; y <= maxy; y++)
      for (let z = minz; z <= maxz; z++) {
        if (x < 0 || z < 0 || x >= SX || z >= SZ) return false;
        if (y < 0) return false;
        if (SOLID.has(getBlock(x, y, z))) return false;
      }
  return true;
}

/** Searches outward from (sx,sz) for a column whose surface + 2-block pocket
 * is clear of solids (e.g. avoids spawning inside a tree trunk). */
function findSpawn(sx, sz) {
  for (let r = 0; r <= 24; r++) {
    for (let dx = -r; dx <= r; dx++)
      for (let dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue; // ring only
        const x = sx + dx, z = sz + dz;
        const yt = topSolidAt(x, z);
        if (yt < 0) continue;
        const cx = x + 0.5, cz = z + 0.5, footY = yt + 1;
        if (aabbClear(cx, cz, footY)) return { x: cx, y: footY, z: cz };
      }
  }
  return { x: sx + 0.5, y: SY, z: sz + 0.5 };
}

/** Creates the player, drops them to the surface, builds the avatar. */
export function initPlayer() {
  const THREE = getTHREE();
  player.pos = new THREE.Vector3(SX / 2, SY, SZ / 2);
  player.vel = new THREE.Vector3();
  player.onGround = false;
  player.health = 100;

  const spot = findSpawn(Math.floor(SX / 2), Math.floor(SZ / 2));
  player.pos.set(spot.x, spot.y, spot.z);
  spawnPos = player.pos.clone();

  const c = makeCharacter();
  character = c.group;
  rArm = c.rArm;
  scene.current.add(character);

  const f = makeFirstPersonArm();
  fpArm = f.group;
  fpHand = f.hand;
  fpHeld = f.held;
  camera.current.add(fpArm);   // arm follows the camera in first-person
  refreshFpVisibility();
  character.visible = (cameraMode === 'third');

  updateCameraTransform();
}

/** Triggers the pickaxe swing animation. */
export function triggerSwing() { swing = 1; }

/** Positions the camera for the active mode (third-person orbit or
 * first-person eye view). */
export function updateCameraTransform() {
  const headX = player.pos.x * SCALE, headY = (player.pos.y + EYE) * SCALE, headZ = player.pos.z * SCALE;

  if (cameraMode === 'first') {
    const fx = -Math.sin(yaw) * Math.cos(pitch);
    const fy = Math.sin(pitch);
    const fz = -Math.cos(yaw) * Math.cos(pitch);
    camera.current.position.set(headX, headY, headZ);
    camera.current.lookAt(headX + fx, headY + fy, headZ + fz);
    return;
  }

  // Third-person: orbit camera behind the player, pulling in near walls.
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const behind = 4.0, up = 1.4; // ~4 blocks back, ~1.4 up (DESIGN: 3–5 behind)
  let ox = -fx * behind * SCALE;
  let oy = up * SCALE - Math.sin(pitch) * behind * SCALE;
  let oz = -fz * behind * SCALE;
  let len = Math.hypot(ox, oy, oz), tries = 0;
  while (solidAt(headX + ox, headY + oy, headZ + oz) && len > 0.1 && tries < 16) {
    ox *= 0.8; oy *= 0.8; oz *= 0.8; len *= 0.8; tries++;
  }
  camera.current.position.set(headX + ox, headY + oy, headZ + oz);
  camera.current.lookAt(headX, headY, headZ);
}

export function updateCharacter(dt) {
  character.position.set(player.pos.x * SCALE, player.pos.y * SCALE, player.pos.z * SCALE);
  character.rotation.y = yaw;
  const moving = (Math.abs(player.vel.x) + Math.abs(player.vel.z)) > 0.1;
  if (moving) walkPhase += dt * 10; else walkPhase *= 0.9;
  if (swing > 0) swing = Math.max(0, swing - dt * 3);
  character.position.y += (moving ? Math.sin(walkPhase) * 0.04 : 0) * SCALE;
  rArm.rotation.x = -swing * 1.8 + (moving ? Math.sin(walkPhase) * 0.3 : 0);
  if (fpArm) fpHand.rotation.x = -swing * 1.6 + (moving ? Math.sin(walkPhase) * 0.25 : 0);
}

/** Advances player physics by dt seconds. */
export function move(dt) {
  // Apply look (mouse/touch swipe + A/D turn) to camera orientation.
  const [dx, dy] = consumeLook();
  yaw += dx + commands.turn * TURN * dt;
  pitch = Math.max(-1.55, Math.min(1.55, pitch + dy));
  camera.current.rotation.set(pitch, yaw, 0);

  // Movement relative to yaw (forward + strafe).
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const dir = new (getTHREE().Vector3)();
  dir.x += fx * commands.moveZ + rx * commands.moveX;
  dir.z += fz * commands.moveZ + rz * commands.moveX;
  if (dir.lengthSq() > 0) dir.normalize();
  const spd = commands.sprint ? SPRINT : SPEED;
  player.vel.x = dir.x * spd; player.vel.z = dir.z * spd;

  player.vel.y += GRAVITY * dt;
  if (commands.jump && player.onGround) { player.vel.y = JUMP; player.onGround = false; }

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
