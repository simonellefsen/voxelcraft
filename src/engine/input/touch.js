// engine/input/touch.js
// Touch-first input source for mobile. Writes the same unified `commands`
// the keyboard/mouse source does, so gameplay logic is identical.
//   • Left-thumb virtual joystick  -> move (forward/strafe)
//   • Right-side swipe              -> look
//   • Tap on world                  -> break (same as left click)
//   • Context buttons               -> jump / sneak / sprint / place / interact
// See DESIGN.md "MOBILE".

import { commands } from './commands.js';

/** True on touch-capable devices. */
export function isTouch() {
  return (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
    ('ontouchstart' in (typeof window !== 'undefined' ? window : {}));
}

/** Builds the on-screen controls and wires them to commands. */
export function initTouch() {
  if (!isTouch()) return false;
  commands.aimCenter = true; // touch aims from the screen centre
  buildStyles();
  buildJoystick();
  buildLookLayer();
  buildButtons();
  return true;
}

function el(tag, cls, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  (parent || document.body).appendChild(e);
  return e;
}

let styleAdded = false;
function buildStyles() {
  if (styleAdded) return; styleAdded = true;
  const s = document.createElement('style');
  s.textContent = `
  #touchUI { position: fixed; inset: 0; z-index: 12; pointer-events: none; touch-action: none; }
  #touchUI > * { pointer-events: auto; }
  #joystick { position: fixed; left: 22px; bottom: 22px; width: 120px; height: 120px;
    border-radius: 50%; background: rgba(255,255,255,0.12); border: 2px solid rgba(255,255,255,0.35); }
  #joyKnob { position: absolute; left: 40px; top: 40px; width: 40px; height: 40px;
    border-radius: 50%; background: rgba(255,255,255,0.55); }
  #touchLook { position: fixed; inset: 0; z-index: 11; touch-action: none; }
  .touchBtn { position: fixed; width: 64px; height: 64px; border-radius: 14px;
    background: rgba(255,255,255,0.18); border: 2px solid rgba(255,255,255,0.4);
    color: #fff; font-size: 13px; display: flex; align-items: center; justify-content: center;
    user-select: none; }
  .touchBtn:active { background: rgba(255,255,255,0.4); }
  `;
  document.head.appendChild(s);
}

function buildJoystick() {
  const ui = el('div', '', document.body); ui.id = 'touchUI';
  const base = el('div', '', ui); base.id = 'joystick';
  const knob = el('div', '', base); knob.id = 'joyKnob';
  const R = 40;
  let activeId = null;

  base.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    activeId = t.identifier;
    base.setPointerCapture && base.setPointerCapture(t.identifier);
  }, { passive: false });

  base.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = [...e.changedTouches].find(c => c.identifier === activeId);
    if (!t) return;
    const r = base.getBoundingClientRect();
    let dx = t.clientX - (r.left + r.width / 2);
    let dy = t.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > R) { dx = dx / len * R; dy = dy / len * R; }
    knob.style.left = (40 + dx) + 'px';
    knob.style.top = (40 + dy) + 'px';
    commands.moveX = dx / R;
    commands.moveZ = -dy / R; // up = forward
  }, { passive: false });

  const end = e => {
    e.preventDefault();
    activeId = null;
    knob.style.left = '40px'; knob.style.top = '40px';
    commands.moveX = 0; commands.moveZ = 0;
  };
  base.addEventListener('touchend', end, { passive: false });
  base.addEventListener('touchcancel', end, { passive: false });
}

function buildLookLayer() {
  const layer = el('div', '', document.body); layer.id = 'touchLook';
  let id = null, lastX = 0, lastY = 0, start = 0, move = 0;
  layer.addEventListener('touchstart', e => {
    const t = e.changedTouches[0];
    id = t.identifier; lastX = t.clientX; lastY = t.clientY;
    start = performance.now(); move = 0;
    commands.break = true; // hold to mine
  }, { passive: false });
  layer.addEventListener('touchmove', e => {
    const t = [...e.changedTouches].find(c => c.identifier === id);
    if (!t) return;
    const dx = t.clientX - lastX, dy = t.clientY - lastY;
    lastX = t.clientX; lastY = t.clientY;
    commands.lookDX -= dx * 0.005;
    commands.lookDY -= dy * 0.005;
    move += Math.abs(dx) + Math.abs(dy);
  }, { passive: false });
  layer.addEventListener('touchend', e => {
    commands.break = false;
    id = null;
  }, { passive: false });
}

function buildButtons() {
  const ui = document.getElementById('touchUI') || el('div', '', document.body);
  ui.id = 'touchUI';
  const mk = (label, x, y, onDown, onUp) => {
    const b = el('div', 'touchBtn', ui);
    b.textContent = label; b.style.left = x + 'px'; b.style.top = y + 'px';
    b.addEventListener('touchstart', e => { e.preventDefault(); onDown && onDown(); }, { passive: false });
    if (onUp) b.addEventListener('touchend', e => { e.preventDefault(); onUp(); }, { passive: false });
    return b;
  };
  const W = innerWidth;
  mk('⤒', W - 90, innerHeight - 190, () => commands.jump = true, () => commands.jump = false);
  mk('⇧', W - 90, innerHeight - 110, () => commands.sneak = true, () => commands.sneak = false);
  mk('»', W - 170, innerHeight - 110, () => commands.sprint = true, () => commands.sprint = false);
  mk('Place', W - 170, innerHeight - 190, () => commands.place = true);
  mk('Use', W - 250, innerHeight - 190, () => commands.interact = true);
  mk('Craft', W - 250, innerHeight - 110, () => commands.openInventory = true);
}
