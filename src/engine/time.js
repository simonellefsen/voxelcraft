// engine/time.js
// Day/night cycle. Computes sky colour, sun direction, and a brightness
// factor from a normalized time t in [0,1). Renderer applies brightness as a
// material tint and sets sky/fog colour (MeshBasicMaterial has no lighting).

const DAY = [0.53, 0.81, 0.92];    // #87ceeb
const NIGHT = [0.04, 0.05, 0.12];
const DUSK = [0.95, 0.55, 0.35];

function lerp3(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function smooth(t) { return t * t * (3 - 2 * t); }

export class TimeOfDay {
  /** @param {number} dayLength seconds for a full cycle */
  constructor(dayLength = 180) {
    this.t = 0.30;            // start mid-morning
    this.dayLength = dayLength;
  }

  update(dt) { this.t = (this.t + dt / this.dayLength) % 1; }

  /** Sun elevation in [-1, 1]; >0 = day, <0 = night. */
  get elevation() {
    // t=0.25 sunrise, 0.5 noon, 0.75 sunset, 1.0 midnight
    return Math.sin((this.t - 0.25) * Math.PI * 2);
  }

  /** Brightness multiplier: ~0.22 at night, 1.0 at noon. */
  get brightness() {
    return 0.22 + 0.78 * Math.max(0, this.elevation);
  }

  /** Sky/fog RGB in [0,1]. */
  get skyColor() {
    const e = this.elevation;
    if (e >= 0) return lerp3(DUSK, DAY, smooth(Math.min(1, e * 1.6)));
    return lerp3(NIGHT, DUSK, smooth(Math.min(1, -e * 1.6)));
  }

  /** Unit sun direction (for a future sun mesh / shadows). */
  get sunDirection() {
    const a = (this.t - 0.25) * Math.PI * 2;
    return [Math.cos(a), Math.sin(a), 0.35];
  }
}
