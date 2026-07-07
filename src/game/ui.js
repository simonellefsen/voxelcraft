// game/ui.js
// Menu overlay, error reporting, HUD, music toggle, and the textual
// diagnostics overlay (the LLM's "eyes" — see DESIGN.md).

import { input, requestLock, positionCrosshair } from '../engine/input.js';
import { highlight } from '../engine/renderer.js';
import {
  initAudio, startMusic, stopMusic, isMusicOn, toggleMusic,
} from '../engine/audio.js';

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
    `Target: ${d.target || 'none'}`;
}
