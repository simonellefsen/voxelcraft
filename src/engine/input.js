// engine/input.js
// Keyboard state, mouse-look, and pointer-lock (with drag-to-look fallback).
// Exposes a single mutable `input` state object shared across modules.

import { getTHREE } from '../core/three.js';
import { camera, renderer } from './renderer.js';

/** Shared input state. Mutate fields directly; reads are live across modules. */
export const input = {
  keys: {},
  yaw: 0,
  pitch: 0,
  locked: false,
  playing: false,
  mouseDown: false,
  moved: 0,
  mouseNDC: null,     // THREE.Vector2 for the off-center crosshair
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

/** Applies yaw/pitch to the camera. */
export function setLook() {
  camera.current.rotation.set(input.pitch, input.yaw, 0);
}

/** Requests pointer lock on the canvas (best-effort; drag-look is the fallback). */
export function requestLock() {
  const el = renderer.current.domElement;
  const p = el.requestPointerLock && el.requestPointerLock();
  if (p && p.catch) p.catch(() => {});
}

/** Wires mouse-look + pointer-lock listeners. Call once after renderer init. */
export function initInput() {
  const THREE = getTHREE();
  input.mouseNDC = new THREE.Vector2(0, 0);
  input.mouseX = innerWidth / 2;
  input.mouseY = innerHeight / 2;

  document.addEventListener('pointerlockchange', () => {
    input.locked = (document.pointerLockElement === renderer.current.domElement);
    document.body.style.cursor = input.locked ? 'none' : 'default';
    positionCrosshair();
  });
  document.addEventListener('pointerlockerror', () => { input.locked = false; });

  addEventListener('mousemove', e => {
    if (!input.playing) return;
    if (!input.locked) {
      input.mouseX = e.clientX; input.mouseY = e.clientY;
      input.mouseNDC.x = (e.clientX / innerWidth) * 2 - 1;
      input.mouseNDC.y = -(e.clientY / innerHeight) * 2 + 1;
      positionCrosshair();
    }
    // Turn with the mouse either when pointer-locked, or by holding left button (drag-look)
    if (input.locked || input.mouseDown) {
      input.yaw -= e.movementX * 0.0022;
      input.pitch -= e.movementY * 0.0022;
      input.pitch = Math.max(-1.55, Math.min(1.55, input.pitch));
      setLook();
    }
    if (input.mouseDown) input.moved += Math.abs(e.movementX) + Math.abs(e.movementY);
  });

  addEventListener('keyup', e => { input.keys[e.code] = false; });
}
