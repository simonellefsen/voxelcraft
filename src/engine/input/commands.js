// engine/input/commands.js
// Unified, device-independent Player Commands. Low-level input sources
// (keyboard/mouse, touch, future gamepad) write here; the rest of the game
// only ever reads these. This lets desktop, mobile, and controllers share the
// same gameplay logic (see DESIGN.md "MOBILE — Recommended architecture").

export const commands = {
  // Movement intent in the player's local frame:
  //   moveZ = forward (+)/back (−), moveX = strafe right (+)/left (−), each −1..1
  moveX: 0,
  moveZ: 0,
  // Turn intent from A/D (desktop): −1 left, +1 right, 0 none
  turn: 0,
  // Accumulated look delta (radians) since last consumed — from mouse or swipe
  lookDX: 0,
  lookDY: 0,
  // Held states
  jump: false,
  sneak: false,
  sprint: false,
  // Edge-triggered actions (set by a source, consumed once by gameplay)
  break: false,
  place: false,
  interact: false,
  openInventory: false,
  // Hotbar selection request: slot index 0..n, or −1 if none
  selectSlot: -1,
  // Aim mode: true => ray from screen centre (pointer-lock / touch);
  // false => ray from the desktop cursor (free-look)
  aimCenter: false,
  // Desktop free-look cursor position in NDC (−1..1)
  cursorX: 0,
  cursorY: 0,
};

/** Reads and clears the accumulated look delta. */
export function consumeLook() {
  const dx = commands.lookDX, dy = commands.lookDY;
  commands.lookDX = 0; commands.lookDY = 0;
  return [dx, dy];
}

/** Reads and clears the edge-triggered actions. `break` is a held state
 * (see updateMining) and is intentionally NOT cleared here. */
export function consumeActions() {
  const a = {
    place: commands.place,
    interact: commands.interact, openInventory: commands.openInventory,
  };
  commands.place = commands.interact = commands.openInventory = false;
  return a;
}

/** Reads and clears a pending hotbar selection. */
export function consumeSelect() {
  const s = commands.selectSlot;
  commands.selectSlot = -1;
  return s;
}

/** Clears per-frame continuous intent (call after the frame consumes it). */
export function resetFrame() {
  commands.moveX = 0; commands.moveZ = 0; commands.turn = 0;
  commands.lookDX = 0; commands.lookDY = 0;
}
