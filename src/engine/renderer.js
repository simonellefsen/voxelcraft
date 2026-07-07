// engine/renderer.js
// Owns the Three.js scene, camera, and WebGL renderer. It does NOT own voxel
// data — each frame it reconciles the scene with the World's chunk meshes
// (adding new, removing unloaded, and rebuilding dirty chunks). This keeps
// rendering decoupled from world storage and supports streaming.

import { SCALE, CHUNK } from '../core/config.js';
import { getTHREE } from '../core/three.js';
import { buildChunk } from '../world/meshing.js';
import { ChunkState } from '../world/chunks/chunk.js';

export const scene = { current: null };
export const camera = { current: null };
export const renderer = { current: null };
export const highlight = { current: null };

/** Flat list of all chunk meshes (for raycasting). Refreshed in sync(). */
export let allMeshes = [];

/** Map of "cx,cz" -> { opaque, transparent } currently in the scene. */
const inScene = new Map();

/** Creates scene, camera, renderer; builds the highlight box. */
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

/** Rebuilds a chunk's meshes in place and swaps them in the scene. */
function rebuild(sc, chunk) {
  const key = chunk.cx + ',' + chunk.cz;
  const old = inScene.get(key);
  if (old) {
    sc.remove(old.opaque, old.transparent);
    old.opaque.geometry.dispose();
    old.transparent.geometry.dispose();
  }
  const meshes = buildChunk(worldRef, chunk);
  chunk.meshes = meshes;
  chunk.dirty = false;
  sc.add(meshes.opaque, meshes.transparent);
  inScene.set(key, meshes);
}

// Reference to the world, set in sync(); used by rebuild().
let worldRef = null;

/**
 * Reconciles the scene with the World: uploads new chunks, removes unloaded
 * ones, and rebuilds any chunk flagged dirty by an edit.
 * @param {import('../world/world.js').World} world
 */
export function sync(world) {
  worldRef = world;
  const sc = scene.current;
  const seen = new Set();

  for (const [key, chunk] of world.chunks) {
    if (chunk.state !== ChunkState.MESHED || !chunk.meshes) continue;
    seen.add(key);
    if (!inScene.has(key)) {
      sc.add(chunk.meshes.opaque, chunk.meshes.transparent);
      inScene.set(key, chunk.meshes);
    } else if (chunk.dirty) {
      rebuild(sc, chunk);
    }
  }

  // Remove chunks that were unloaded from the world.
  for (const key of [...inScene.keys()]) {
    if (!seen.has(key)) {
      const m = inScene.get(key);
      sc.remove(m.opaque, m.transparent);
      m.opaque.geometry.dispose();
      m.transparent.geometry.dispose();
      inScene.delete(key);
    }
  }

  allMeshes = [];
  inScene.forEach(m => allMeshes.push(m.opaque, m.transparent));
}
