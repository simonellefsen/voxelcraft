// Minimal three.js stub — enough API surface for VoxelCraft to init in Node.
const V3 = class {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  clone() { return new V3(this.x, this.y, this.z); }
  normalize() { const l = Math.hypot(this.x, this.y, this.z) || 1; this.x /= l; this.y /= l; this.z /= l; return this; }
  lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
  distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
};
export const Vector3 = V3;
export class Vector2 { constructor(x = 0, y = 0) { this.x = x; this.y = y; } }
export const DoubleSide = 2;
export class Color { constructor() {} }
export class Scene {
  constructor() { this.children = []; this.background = null; this.fog = null; }
  add(...o) { this.children.push(...o); }
  remove(...o) { this.children = this.children.filter(c => !o.includes(c)); }
}
export class Fog { constructor() {} }
export class PerspectiveCamera {
  constructor() { this.rotation = { order: 'XYZ', set() {} }; this.position = new V3(); this.aspect = 1; }
  updateProjectionMatrix() {}
  lookAt() {}
}
export class WebGLRenderer {
  constructor() {
    this.domElement = {
      requestPointerLock() {}, focus() {}, setAttribute() {}, tabIndex: 0, style: {},
    };
  }
  setPixelRatio() {} setSize() {} render() {}
}
export class Raycaster {
  constructor() { this.ray = { origin: new V3(), direction: new V3(0, 0, -1) }; }
  setFromCamera() {}
  intersectObjects() { return []; }
}
class Geom { setAttribute() {} setIndex() {} dispose() {} }
export class BufferGeometry extends Geom {}
export class BoxGeometry extends Geom {}
export class EdgesGeometry extends Geom {}
export class Float32BufferAttribute { constructor() {} }
export class MeshBasicMaterial { constructor() {} }
export class LineBasicMaterial { constructor() {} }
export class Mesh { constructor() { this.position = new V3(); this.rotation = { x: 0, y: 0, z: 0 }; this.scale = { setScalar() {} }; this.geometry = new Geom(); } }
export class LineSegments { constructor() { this.position = new V3(); this.visible = true; } }
export class Group { constructor() { this.children = []; this.position = new V3(); this.rotation = { x: 0, y: 0, z: 0 }; this.scale = { setScalar() {} }; } add(...o) { this.children.push(...o); } }
export class Clock { getDelta() { return 0.016; } }
