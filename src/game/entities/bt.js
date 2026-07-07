// game/entities/bt.js
// A tiny behavior tree. Each node returns one of: 'success', 'failure', or
// 'running'. Mobs (see mobs.js) compose these into decision logic. This is a
// deliberately minimal, dependency-free BT — enough to express conditional
// AI without a flat wall of if/else in each mob.

/** Status constants returned by node ticks. */
export const SUCCESS = 'success', FAILURE = 'failure', RUNNING = 'running';

/** Base node. */
export class Node {
  /** @param {object} ctx shared per-tick context (the entity + world facts). */
  tick() { return FAILURE; }
}

/** Leaf: runs a function; return value is used as status. */
export class Action extends Node {
  /** @param {(ctx:object)=>string} fn */
  constructor(fn) { super(); this.fn = fn; }
  tick(ctx) { return this.fn(ctx); }
}

/** Leaf: true/false predicate -> success/failure. */
export class Condition extends Node {
  /** @param {(ctx:object)=>boolean} fn */
  constructor(fn) { super(); this.fn = fn; }
  tick(ctx) { return this.fn(ctx) ? SUCCESS : FAILURE; }
}

/** Tries children in order; returns the first non-failure result. */
export class Selector extends Node {
  /** @param {Node[]} children */
  constructor(children) { super(); this.children = children; }
  tick(ctx) {
    for (const c of this.children) {
      const r = c.tick(ctx);
      if (r !== FAILURE) return r;
    }
    return FAILURE;
  }
}

/** Runs children in order; stops at the first non-success result. */
export class Sequence extends Node {
  /** @param {Node[]} children */
  constructor(children) { super(); this.children = children; }
  tick(ctx) {
    for (const c of this.children) {
      const r = c.tick(ctx);
      if (r !== SUCCESS) return r;
    }
    return SUCCESS;
  }
}

/** Inverts a child's status (success<->failure). */
export class Inverter extends Node {
  /** @param {Node} child */
  constructor(child) { super(); this.child = child; }
  tick(ctx) {
    const r = this.child.tick(ctx);
    return r === SUCCESS ? FAILURE : r === FAILURE ? SUCCESS : RUNNING;
  }
}

/** Helpers for terse tree construction. */
export const sel = (...c) => new Selector(c);
export const seq = (...c) => new Sequence(c);
export const act = (fn) => new Action(fn);
export const cond = (fn) => new Condition(fn);
export const not = (c) => new Inverter(c);
