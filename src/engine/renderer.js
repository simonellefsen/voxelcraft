// engine/renderer.js
// Owns the Three.js scene, camera, WebGL renderer, chunk meshes, and the
// block highlight. Rebuilds chunk meshes on edits. No game logic here.

import { SX, SZ, CHUNK, SCALE } from '../core/config.js';
import { getTHREE } from '../core/three.js';
import { buildChunk } from '../world/meshing.js';

export const scene = { current: null };
export const camera = { current: null };
export const renderer = { current: null };

/** Map of "cx,cz" -> { opaque, transparent } meshes. */
export const chunks = new Map();
/** Flat list of all chunk meshes for raycasting. */
export let allMeshes = [];

const CHUNKS_X = Math.ceil(SX / CHUNK);
const CHUNKS_Z = Math.ceil(SZ / CHUNK);

export const highlight = { current: null };

/** Recomputes allMeshes from the chunk map. */
export function refreshMeshes() {
  allMeshes = [];
  chunks.forEach(c => allMeshes.push(c.opaque, c.transparent));
}

/** Creates scene, camera, renderer; builds the initial chunk set. */
export function initRenderer() {
  const THREE = getTHREE();
  const sc = new THREE.Scene();
  sc.background = new THREE.Color(0x87ceeb);
  sc.fog = new THREE.Fog(0x87ceeb, 80 * SCALE, 240 * SCALE);

  const cam = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 500);
  cam.rotation.order = 'YXZ';

  const rnd = new THREE.WebGLRenderer({ antialias: true });
  rnd.setPixelRatio(Math.min(devicePixelRatio, 2));
  rnd.setSize(innerWidth, innerHeight);
  document.getElementById('app').appendChild(rnd.domElement);

  scene.current = sc;
  camera.current = cam;
  renderer.current = rnd;

  for (let cx = 0; cx < CHUNKS_X; cx++)
    for (let cz = 0; cz < CHUNKS_Z; cz++) {
      const c = buildChunk(cx, cz);
      chunks.set(cx + ',' + cz, c);
      sc.add(c.opaque, c.transparent);
    }
  refreshMeshes();

  const h = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(SCALE * 1.002, SCALE * 1.002, SCALE * 1.002)),
    new THREE.LineBasicMaterial({ color: 0x000000 })
  );
  h.visible = false;
  sc.add(h);
  highlight.current = h;

  addEventListener('resize', () => {
    cam.aspect = innerWidth / innerHeight;
    cam.updateProjectionMatrix();
    rnd.setSize(innerWidth, innerHeight);
  });
}

/** Rebuilds every chunk overlapping the given voxel AABB. */
export function rebuildRegion(x0, x1, z0, z1) {
  const THREE = getTHREE();
  const cx0 = Math.floor(x0 / CHUNK), cx1 = Math.floor(x1 / CHUNK);
  const cz0 = Math.floor(z0 / CHUNK), cz1 = Math.floor(z1 / CHUNK);
  for (let cx = cx0; cx <= cx1; cx++)
    for (let cz = cz0; cz <= cz1; cz++) {
      if (cx < 0 || cz < 0 || cx >= CHUNKS_X || cz >= CHUNKS_Z) continue;
      const key = cx + ',' + cz;
      const old = chunks.get(key);
      if (old) {
        scene.current.remove(old.opaque, old.transparent);
        old.opaque.geometry.dispose();
        old.transparent.geometry.dispose();
      }
      const c = buildChunk(cx, cz);
      chunks.set(key, c);
      scene.current.add(c.opaque, c.transparent);
    }
  refreshMeshes();
}

/** Rebuilds the chunk(s) touched by a single block edit. */
export function rebuildAt(x, y, z) {
  rebuildRegion(
    Math.max(0, x - 1), Math.min(SX - 1, x + 1),
    Math.max(0, z - 1), Math.min(SZ - 1, z + 1)
  );
}
