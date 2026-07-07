// engine/input.js
// Low-level keyboard/mouse source. Writes high-level intent into `commands`
// (see commands.js). Owns pointer-lock state, the drag-to-look fallback, and
// the crosshair position. It does NOT apply look/movement — the player does,
// by consuming commands.

import { getTHREE } from '../core/three.js';
import { camera, renderer } from './renderer.js';
import { commands } from './input/commands.js';

/** Shared play/lock state still read by UI + drag-look. */
export const input = {
  playing: false,
  locked: false,
  mouseDown: false,
  moved: 0,
  mouseX: 0,
  mouseY: 0,
};

const crosshairEl = document.getElementById('crosshair');

/** Positions the crosshair at screen centre (locked) or the cursor (free). */
export function positionCrosshair() {
  if (input.locked) {
    crosshairEl.style.left = '50%';
    crosshairEl.style.top = '50%';
  } else {
    crosshairEl.style.left = input.mouseX + 'px';
    crosshairEl.style.top = input.mouseY + 'px';
  }
}

/** Requests pointer lock on the canvas (best-effort; drag-look is the fallback). */
export function requestLock() {
  const el = renderer.current.domElement;
  const p = el.requestPointerLock && el.requestPointerLock();
  if (p && p.catch) p.catch(() => {});
}

const kb = new Set();
function applyKeys() {
  commands.moveZ = (kb.has('KeyW') ? 1 : 0) - (kb.has('KeyS') ? 1 : 0);
  commands.moveX = 0;                       // desktop strafes via turn (A/D)
  commands.turn = (kb.has('KeyD') ? 1 : 0) - (kb.has('KeyA') ? 1 : 0);
  commands.jump = kb.has('Space');
  commands.sprint = kb.has('ShiftLeft') || kb.has('ShiftRight');
}

/** Wires keyboard + mouse-look + pointer-lock. Call once after renderer init. */
export function initInput() {
  input.mouseX = innerWidth / 2;
  input.mouseY = innerHeight / 2;

  document.addEventListener('pointerlockchange', () => {
    input.locked = (document.pointerLockElement === renderer.current.domElement);
    commands.aimCenter = input.locked;
    document.body.style.cursor = input.locked ? 'none' : 'default';
    positionCrosshair();
  });
  document.addEventListener('pointerlockerror', () => { input.locked = false; });

  addEventListener('mousemove', e => {
    if (!input.playing) return;
    if (!input.locked) {
      input.mouseX = e.clientX; input.mouseY = e.clientY;
      commands.cursorX = (e.clientX / innerWidth) * 2 - 1;
      commands.cursorY = -(e.clientY / innerHeight) * 2 + 1;
      commands.aimCenter = false;
      positionCrosshair();
    }
    if (input.locked || input.mouseDown) {
      commands.lookDX -= e.movementX * 0.0022;
      commands.lookDY -= e.movementY * 0.0022;
    }
    if (input.mouseDown) input.moved += Math.abs(e.movementX) + Math.abs(e.movementY);
  });

  addEventListener('keydown', e => { kb.add(e.code); applyKeys(); });
  addEventListener('keyup', e => { kb.delete(e.code); applyKeys(); });
}
