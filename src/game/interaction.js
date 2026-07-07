// game/interaction.js
// Raycast targeting, block break/place, hotbar UI, and input bindings. The
// hotbar is backed by the player's inventory; mining is tool-aware (speed +
// durability + progress). All input arrives via the unified command layer.

import { SCALE, EYE, AIR, BLOCK_SWATCH } from '../core/config.js';
import { getTHREE } from '../core/three.js';
import { getBlock, setBlock } from '../world/world.js';
import { allMeshes, highlight } from '../engine/renderer.js';
import { camera } from '../engine/renderer.js';
import { input } from '../engine/input.js';
import { commands, consumeActions, consumeSelect } from '../engine/input/commands.js';
import { player, triggerSwing, setHeldItem } from './player.js';
import { playMine, playPlace } from '../engine/audio.js';
import { showError, toggleCraft } from './ui.js';
import { inventory, HOTBAR } from './inventory/playerInventory.js';
import { ITEMS, isTool, placeBlockOf, miningTime } from '../world/items/items.js';
import { spawnDrop } from './entities/drops.js';
import { entities } from './entities.js';
import { playHit } from '../engine/audio.js';

let selected = 0;
let target = null;
let raycaster = null;
let center = null;
let cursorNDC = null;
let breaking = null;       // { x, y, z, progress, toolId }
let hotbarEls = [];

const hotbar = document.getElementById('hotbar');

/** Recomputes the targeted block (break + place cells) from the camera. */
export function updateTarget() {
  const THREE = getTHREE();
  const ndc = commands.aimCenter ? center : cursorNDC;
  if (!commands.aimCenter) { cursorNDC.x = commands.cursorX; cursorNDC.y = commands.cursorY; }
  raycaster.setFromCamera(ndc, camera.current);
  raycaster.ray.origin.set(player.pos.x * SCALE, (player.pos.y + EYE) * SCALE, player.pos.z * SCALE);
  const hits = raycaster.intersectObjects(allMeshes, false);
  if (hits.length && hits[0].distance < 8) {
    const h = hits[0];
    const d = raycaster.ray.direction;
    const px = h.point.x / SCALE, py = h.point.y / SCALE, pz = h.point.z / SCALE;
    const breakB = new THREE.Vector3(
      Math.floor(px + d.x * 0.5), Math.floor(py + d.y * 0.5), Math.floor(pz + d.z * 0.5));
    const place = new THREE.Vector3(
      Math.floor(px - d.x * 0.5), Math.floor(py - d.y * 0.5), Math.floor(pz - d.z * 0.5));
    target = { place, breakB };
    highlight.current.position.set((breakB.x + 0.5) * SCALE, (breakB.y + 0.5) * SCALE, (breakB.z + 0.5) * SCALE);
    highlight.current.visible = true;
  } else {
    target = null;
    highlight.current.visible = false;
  }
}

export function getSelectedName() {
  const s = inventory.get(selected);
  return s ? (ITEMS[s.id] && ITEMS[s.id].name) || 'Item' : 'Empty';
}
export function getTargetLabel() {
  if (!target) return 'none';
  const { x, y, z } = target.breakB;
  const id = getBlock(x, y, z);
  const name = (ITEMS[id] && ITEMS[id].name) || 'Air';
  return `${name} @ (${x}, ${y}, ${z})`;
}

export function selectSlot(i) {
  selected = Math.max(0, Math.min(HOTBAR - 1, i));
  hotbarEls.forEach((el, k) => el.classList.toggle('active', k === selected));
}

function inPlayer(x, y, z) {
  const p = player.pos;
  return (x >= Math.floor(p.x - 0.3) && x <= Math.floor(p.x + 0.3) &&
          z >= Math.floor(p.z - 0.3) && z <= Math.floor(p.z + 0.3) &&
          y >= Math.floor(p.y) && y <= Math.floor(p.y + 1.8));
}

function renderHotbarUI() {
  for (let i = 0; i < HOTBAR; i++) {
    const el = hotbarEls[i];
    if (!el) continue;
    const s = inventory.get(i);
    if (!s) { el.innerHTML = `<span class="num">${i + 1}</span>`; continue; }
    const def = ITEMS[s.id];
    if (def && def.placeBlock != null) {
      el.innerHTML = `<span class="num">${i + 1}</span><span class="sw" style="background:${BLOCK_SWATCH[s.id] || '#888'}"></span>`;
    } else {
      const label = def ? def.name.slice(0, 2) : '?';
      el.innerHTML = `<span class="num">${i + 1}</span><span class="lbl">${label}</span>`;
    }
    el.classList.toggle('active', i === selected);
  }
  setHeldItem(inventory.get(selected) ? inventory.get(selected).id : 0);
}

function finalizeBreak(b) {
  const id = getBlock(b.x, b.y, b.z);
  if (id === AIR) return;
  setBlock(b.x, b.y, b.z, AIR);
  spawnDrop(b.x + 0.5, b.y + 0.5, b.z + 0.5, id, 1);
  const slot = inventory.get(selected);
  if (slot && isTool(slot.id)) inventory.damageSlot(selected);
  playMine();
  triggerSwing();
}

let attackCd = 0;

/** Left-click attack on a mob under the crosshair. Returns true if a mob was
 * hit this frame (so block mining is suppressed). */
function tryAttack(dt) {
  attackCd = Math.max(0, attackCd - dt);
  if (!commands.break || !input.playing) return false;
  if (attackCd > 0) return false;
  const models = [];
  for (const e of entities) if (e.alive && !e.dead && e.model && e.takeDamage) models.push(e.model);
  if (!models.length) return false;
  const hits = raycaster.intersectObjects(models, true);
  if (!hits.length || hits[0].distance >= 0.4) return false; // ~6 blocks (voxel-scaled)
  let o = hits[0].object, ent = null;
  while (o) { if (o.userData && o.userData.entity) { ent = o.userData.entity; break; } o = o.parent; }
  if (!ent || !ent.takeDamage) return false;
  const slot = inventory.get(selected);
  const itemId = slot && slot.id ? slot.id : 0;
  const dmg = (ITEMS[itemId] && ITEMS[itemId].tool) ? ITEMS[itemId].tool.damage : 1;
  ent.takeDamage(dmg);
  attackCd = 0.4;
  triggerSwing();
  playHit();
  if (slot && ITEMS[itemId] && ITEMS[itemId].tool) inventory.damageSlot(selected);
  return true;
}

/** Tool-aware mining progress while the break command is held. */
function updateMining(dt) {
  if (!commands.break || !input.playing || !target) { breaking = null; return; }
  const b = target.breakB;
  const id = getBlock(b.x, b.y, b.z);
  if (id === AIR) { breaking = null; return; }
  const slot = inventory.get(selected);
  const toolId = slot && slot.id ? slot.id : 0;
  if (!breaking || breaking.x !== b.x || breaking.y !== b.y || breaking.z !== b.z || breaking.toolId !== toolId) {
    breaking = { x: b.x, y: b.y, z: b.z, toolId, progress: 0 };
  }
  breaking.progress += dt / miningTime(toolId, id);
  if (breaking.progress >= 1) { finalizeBreak(b); breaking = null; }
}

export function placeBlock() {
  if (!target) { showError('place: no target'); return; }
  const { x, y, z } = target.place;
  const slot = inventory.get(selected);
  if (!slot) return;
  const bid = placeBlockOf(slot.id);
  if (bid == null) return; // selected item isn't placeable
  if (getBlock(x, y, z) === AIR && !inPlayer(x, y, z)) {
    setBlock(x, y, z, bid);
    playPlace();
  }
}

/** Per-frame interaction tick: target, mining, actions, hotbar UI. */
export function tickInteractions(dt) {
  updateTarget();
  if (input.playing) {
    if (!tryAttack(dt)) updateMining(dt);
    const a = consumeActions();
    if (a.place) placeBlock();
    if (a.interact) { /* TODO: contextual interact */ }
    if (a.openInventory) toggleCraft();
  }
  renderHotbarUI();
  const s = consumeSelect();
  if (s >= 0) selectSlot(s);
}

/** Wires input listeners + builds the hotbar. Call once after renderer/init. */
export function initInteraction() {
  const THREE = getTHREE();
  raycaster = new THREE.Raycaster();
  center = new THREE.Vector2(0, 0);
  cursorNDC = new THREE.Vector2(0, 0);

  hotbarEls = [];
  for (let i = 0; i < HOTBAR; i++) {
    const s = document.createElement('div');
    s.className = 'slot';
    s.dataset.i = i;
    s.addEventListener('click', () => selectSlot(i));
    hotbar.appendChild(s);
    hotbarEls.push(s);
  }
  renderHotbarUI();
  selectSlot(8); // start holding the wooden sword so the player can defend

  addEventListener('keydown', e => {
    if (e.key >= '1' && e.key <= '9') commands.selectSlot = +e.key - 1;
    if (e.code === 'KeyE') commands.break = true;
    if (e.code === 'KeyF') commands.place = true;
  });
  addEventListener('keyup', e => { if (e.code === 'KeyE') commands.break = false; });

  addEventListener('mousedown', e => {
    if (e.target && e.target.closest && e.target.closest('#hotbar, #overlay')) return;
    if (!input.playing) return;
    if (e.button === 0) { input.mouseDown = true; commands.break = true; }
    else if (e.button === 2) { commands.place = true; }
  });
  addEventListener('mouseup', e => { if (e.button === 0) { input.mouseDown = false; commands.break = false; } });
  addEventListener('contextmenu', e => {
    if (!e.target.closest || !e.target.closest('#hotbar, #overlay')) e.preventDefault();
  });
}
