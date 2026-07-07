// game/ui.js
// Menu overlay, error reporting, HUD, music toggle, crafting menu, and the
// textual diagnostics overlay (the LLM's "eyes" — see DESIGN.md).

import { input, requestLock, positionCrosshair } from '../engine/input.js';
import { toggleCameraMode, getCameraMode } from '../game/player.js';
import { commands } from '../engine/input/commands.js';
import { highlight } from '../engine/renderer.js';
import {
  initAudio, startMusic, stopMusic, isMusicOn, toggleMusic,
} from '../engine/audio.js';
import { inventory } from './inventory/playerInventory.js';
import { ITEMS } from '../world/items/items.js';
import { RECIPES, canCraft, craft, recipeSummary } from '../world/items/recipes.js';

const overlay = document.getElementById('overlay');
const errEl = document.getElementById('err');
const hudEl = document.getElementById('hud');
const musicToggleEl = document.getElementById('musicToggle');

let debugEl = null;

/** Reports an error both on screen and to the console. */
export function showError(msg) {
  errEl.textContent = 'Error: ' + msg;
  console.error(msg);
}

/** Shows the pause menu. */
export function showMenu() {
  input.playing = false;
  if (highlight.current) highlight.current.visible = false;
  overlay.style.display = 'flex';
  positionCrosshair();
}

function play() {
  input.playing = true;
  overlay.style.display = 'none';
  try {
    window.focus();
    const c = document.querySelector('#app canvas');
    if (c) { c.setAttribute('tabindex', '0'); c.focus(); }
  } catch (e) {}
  initAudio();
  if (isMusicOn()) startMusic();
  positionCrosshair();
  try { requestLock(); } catch (e) { /* fall back to drag-to-look */ }
}

function updateMusicLabel() {
  musicToggleEl.textContent = (isMusicOn() ? '🔊' : '🔇') + ' Music: ' + (isMusicOn() ? 'ON' : 'OFF');
}

export function initUI() {
  overlay.addEventListener('click', play);
  musicToggleEl.addEventListener('click', e => {
    e.stopPropagation();
    initAudio();
    toggleMusic();
    updateMusicLabel();
    if (isMusicOn()) startMusic(); else stopMusic();
  });
  updateMusicLabel();

  // Crafting menu: I toggles, Esc closes (when open). These are handled here
  // so the in-game pause (overlay) and the crafting sub-menu don't conflict.
  addEventListener('keydown', e => {
    if (craftOpen && e.code === 'Escape') { e.preventDefault(); hideCraftMenu(); return; }
    if (e.code === 'KeyI' && input.playing && !craftOpen) { e.preventDefault(); commands.openInventory = true; }
    if (e.code === 'KeyV' && input.playing) { e.preventDefault(); toggleCameraMode(); }
  });

  // Diagnostics overlay (textual vision for non-vision tooling)
  debugEl = document.createElement('div');
  debugEl.id = 'debug';
  debugEl.style.cssText =
    'position:fixed;right:10px;top:8px;color:#fff;font:11px/1.4 monospace;' +
    'text-shadow:0 1px 2px #000;z-index:10;pointer-events:none;white-space:pre;text-align:right;';
  document.body.appendChild(debugEl);
}

/** Sets the bottom-left HUD text. */
export function updateHud(text) {
  hudEl.textContent = text;
}

/** Renders the frame-debug diagnostics block. */
export function updateDiagnostics(d) {
  if (!debugEl) return;
  debugEl.textContent =
    `FPS: ${d.fps}\n` +
    `Cam: (${d.camX.toFixed(1)}, ${d.camY.toFixed(1)}, ${d.camZ.toFixed(1)})\n` +
    `Player: (${d.px.toFixed(1)}, ${d.py.toFixed(1)}, ${d.pz.toFixed(1)})\n` +
    `Chunks: ${d.chunks}\n` +
    `Mobs: ${d.mobs || 0}\n` +
    `Biome: ${d.biome || 'Plains'}\n` +
    `Target: ${d.target || 'none'}`;
}

// ---- Crafting menu (Milestone 4) ----
let craftEl = null;
let craftOpen = false;

/** Builds the (hidden) crafting overlay once. */
function buildCraftUI() {
  if (craftEl) return;
  craftEl = document.createElement('div');
  craftEl.id = 'craftOverlay';
  craftEl.style.cssText =
    'position:fixed;inset:0;z-index:25;display:none;align-items:center;' +
    'justify-content:center;background:rgba(0,0,0,0.6);color:#fff;' +
    'font-family:system-ui,sans-serif;';
  document.body.appendChild(craftEl);
}

/** Re-renders the recipe list, reflecting current inventory availability. */
function renderCraft() {
  if (!craftEl) return;
  const rows = RECIPES.map(r => {
    const ok = canCraft(inventory, r);
    const out = ITEMS[r.out.id] ? ITEMS[r.out.id].name : r.out.id;
    return `<div class="crow ${ok ? '' : 'disabled'}" data-id="${r.id}">` +
      `<div class="cname">${r.name}</div>` +
      `<div class="cmeta">${recipeSummary(r)} → ${out} ×${r.out.count}</div>` +
      `</div>`;
  }).join('');
  craftEl.innerHTML =
    `<div class="cpanel"><h2>Crafting</h2>` +
    `<div class="clist">${rows}</div>` +
    `<div class="chint">Click a recipe to craft • <b>Esc</b>/<b>I</b> to close</div></div>`;
  craftEl.querySelectorAll('.crow').forEach(row => {
    if (row.classList.contains('disabled')) return;
    row.addEventListener('click', () => {
      const r = RECIPES.find(x => x.id === row.dataset.id);
      if (r && craft(inventory, r)) renderCraft();
    });
  });
}

/** Opens the crafting menu (pauses the game). */
export function showCraftMenu() {
  if (!input.playing) return; // only from active play
  buildCraftUI();
  craftOpen = true;
  input.playing = false;
  if (highlight.current) highlight.current.visible = false;
  renderCraft();
  craftEl.style.display = 'flex';
}

/** Closes the crafting menu and resumes play. */
export function hideCraftMenu() {
  if (!craftOpen) return;
  craftOpen = false;
  if (craftEl) craftEl.style.display = 'none';
  input.playing = true;
  positionCrosshair();
  try { requestLock(); } catch (e) { /* drag-to-look fallback */ }
}

/** Toggles the crafting menu. */
export function toggleCraft() {
  if (craftOpen) hideCraftMenu(); else showCraftMenu();
}

/** True while the crafting menu is open. */
export function isCraftOpen() { return craftOpen; }
