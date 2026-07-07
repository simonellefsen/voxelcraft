// game/interaction.js
// Raycast targeting, block break/place, hotbar UI, and the input bindings
// (keys + mouse) that drive them.

import { SCALE, EYE, AIR, HOTBAR_BLOCKS, BLOCK_NAMES, BLOCK_SWATCH } from '../core/config.js';
import { getTHREE } from '../core/three.js';
import { getBlock, setBlock } from '../world/world.js';
import { allMeshes, highlight, rebuildAt } from '../engine/renderer.js';
import { camera } from '../engine/renderer.js';
import { input } from '../engine/input.js';
import { player, triggerSwing } from './player.js';
import { playMine, playPlace } from '../engine/audio.js';
import { showMenu, showError } from './ui.js';

let selected = 0;
let target = null;
let raycaster = null; // created in initInteraction (needs THREE)
let center = null;
let downTime = 0;

const hotbar = document.getElementById('hotbar');

/** Recomputes the targeted block (break + place cells) from the camera. */
export function updateTarget() {
  const THREE = getTHREE();
  raycaster.setFromCamera(input.locked ? center : input.mouseNDC, camera.current);
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

export function getSelectedName() { return BLOCK_NAMES[HOTBAR_BLOCKS[selected]]; }

/** Returns a textual label for the current break target, e.g. "Grass @ (x,y,z)". */
export function getTargetLabel() {
  if (!target) return 'none';
  const { x, y, z } = target.breakB;
  const id = getBlock(x, y, z);
  const name = BLOCK_NAMES[id] || 'Air';
  return `${name} @ (${x}, ${y}, ${z})`;
}

export function selectSlot(i) {
  selected = i;
  [...hotbar.children].forEach((c, k) => c.classList.toggle('active', k === i));
}

function inPlayer(x, y, z) {
  const p = player.pos;
  return (x >= Math.floor(p.x - 0.3) && x <= Math.floor(p.x + 0.3) &&
          z >= Math.floor(p.z - 0.3) && z <= Math.floor(p.z + 0.3) &&
          y >= Math.floor(p.y) && y <= Math.floor(p.y + 1.8));
}

export function breakBlock() {
  try {
    updateTarget();
    if (!target) { showError('break: no target'); return; }
    const { x, y, z } = target.breakB;
    if (getBlock(x, y, z) !== AIR) {
      setBlock(x, y, z, AIR);
      rebuildAt(x, y, z);
      playMine();
      triggerSwing();
    }
  } catch (err) { showError('break error: ' + (err && err.message)); console.error(err); }
}

export function placeBlock() {
  try {
    updateTarget();
    if (!target) { showError('place: no target'); return; }
    const { x, y, z } = target.place;
    if (getBlock(x, y, z) === AIR && !inPlayer(x, y, z)) {
      setBlock(x, y, z, HOTBAR_BLOCKS[selected]);
      rebuildAt(x, y, z);
      playPlace();
    }
  } catch (err) { showError('place error: ' + (err && err.message)); console.error(err); }
}

/** Wires keyboard + mouse listeners. Call once after renderer/init. */
export function initInteraction() {
  const THREE = getTHREE();
  raycaster = new THREE.Raycaster();
  center = new THREE.Vector2(0, 0);

  HOTBAR_BLOCKS.forEach((b, i) => {
    const s = document.createElement('div');
    s.className = 'slot';
    s.dataset.i = i;
    s.innerHTML = `<span class="num">${i + 1}</span><span class="sw" style="background:${BLOCK_SWATCH[b]}"></span>`;
    s.addEventListener('click', () => selectSlot(i));
    hotbar.appendChild(s);
  });
  selectSlot(0);

  addEventListener('keydown', e => {
    input.keys[e.code] = true;
    if (e.code === 'Escape') showMenu();
    if (e.key >= '1' && e.key <= '7') selectSlot(+e.key - 1);
    if (input.playing) {
      if (e.code === 'KeyE') { if (target) breakBlock(); }
      if (e.code === 'KeyF') { if (target) placeBlock(); }
    }
  });

  addEventListener('mousedown', e => {
    if (e.target && e.target.closest && e.target.closest('#hotbar, #overlay')) return;
    if (!input.playing || !target) return;
    if (e.button === 0) { input.mouseDown = true; input.moved = 0; downTime = performance.now(); }
    else if (e.button === 2) { placeBlock(); }
  });
  addEventListener('mouseup', e => {
    if (e.button === 0 && input.mouseDown) {
      input.mouseDown = false;
      if (performance.now() - downTime < 250 && target) breakBlock();
    }
  });
  addEventListener('contextmenu', e => {
    if (!e.target.closest || !e.target.closest('#hotbar, #overlay')) e.preventDefault();
  });
}
