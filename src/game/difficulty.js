// game/difficulty.js
// Player-selectable difficulty. Governs whether hostile mobs spawn at all,
// how many/where they appear, how much damage they deal, and the player's
// starting kit. A single module so spawn/player/UI all read one source of
// truth (DESIGN.md: one responsibility per file).

export const DIFFICULTIES = {
  peaceful: {
    label: 'Peaceful',
    hostile: false,     // no hostile mobs ever spawn
    capMul: 0,          // hostile population cap multiplier
    minRadius: 0,       // (unused — no hostiles)
    dmgMul: 0,          // player takes no damage
    grace: Infinity,    // never spawn hostiles
    kit: [],
  },
  easy: {
    label: 'Easy',
    hostile: true,
    capMul: 0.5,        // half as many hostiles
    minRadius: 18,      // spawn farther from the player
    dmgMul: 0.5,        // mobs hit half as hard
    grace: 30,          // calm first 30s after spawn
    kit: ['sword'],
  },
  normal: {
    label: 'Normal',
    hostile: true,
    capMul: 1,
    minRadius: 14,
    dmgMul: 1,
    grace: 15,
    kit: ['sword'],
  },
  hard: {
    label: 'Hard',
    hostile: true,
    capMul: 1.6,        // more hostiles
    minRadius: 10,      // spawn closer
    dmgMul: 1.5,        // mobs hit harder
    grace: 0,           // hostiles from the first night
    kit: ['sword', 'pick'],
  },
};

let current = 'easy';

export function getDifficulty() { return DIFFICULTIES[current]; }
export function getDifficultyKey() { return current; }
export function setDifficulty(key) {
  if (DIFFICULTIES[key]) current = key;
}
