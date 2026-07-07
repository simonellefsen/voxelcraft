// engine/renderer.js
// Owns the Three.js scene, camera, and WebGL renderer. It does NOT own voxel
// data — each frame it reconciles the scene with the World's chunk meshes
// (adding new, removing unloaded, and rebuilding dirty chunks) and applies
// the day/night state. Rendering is decoupled from world storage.

import { SCALE, CHUNK } from '../core/config.js';
import { getTHREE } from '../core/three.js';
import { buildChunk, buildChunkGreedy } from '../world/meshing.js';
import { ChunkState } from '../world/chunks/chunk.js';
import {
  initMaterials, getOpaqueMaterial, getTransparentMaterial, setDaylight,
} from './materials.js';
import { getAtlas } from '../assets/textures/atlas.js';

export const scene = { current: null };
export const camera = { current: null };
export const renderer = { current: null };
export const highlight = { current: null };

/** Flat list of all chunk meshes (for raycasting). Refreshed in sync(). */
export let allMeshes = [];

/** Map of "cx,cz" -> { opaque, transparent } meshes currently in the scene. */
const inScene = new Map();

let USE_GREEDY = false; // face culling is the proven default; greedy is benchmarked

/** Creates scene, camera, renderer, atlas materials, and the highlight box. */
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

function wrap(geom, transparent) {
  if (!geom) return null;
  const THREE = getTHREE();
  const mat = transparent ? getTransparentMaterial() : getOpaqueMaterial();
  return new THREE.Mesh(geom, mat);
}

function rebuild(sc, chunk) {
  const key = chunk.cx + ',' + chunk.cz;
  const old = inScene.get(key);
  if (old) {
    sc.remove(old.opaque, old.transparent);
    if (old.opaque) old.opaque.geometry.dispose();
    if (old.transparent) old.transparent.geometry.dispose();
  }
  const geoms = USE_GREEDY ? buildChunkGreedy(worldRef, chunk) : buildChunk(worldRef, chunk);
  const meshes = { opaque: wrap(geoms.opaque, false), transparent: wrap(geoms.transparent, true) };
  chunk.meshes = geoms;       // store geometry; inScene holds the Mesh objects
  chunk.dirty = false;
  if (meshes.opaque) sc.add(meshes.opaque);
  if (meshes.transparent) sc.add(meshes.transparent);
  inScene.set(key, meshes);
}

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
      const m = { opaque: wrap(chunk.meshes.opaque, false), transparent: wrap(chunk.meshes.transparent, true) };
      if (m.opaque) sc.add(m.opaque);
      if (m.transparent) sc.add(m.transparent);
      inScene.set(key, m);
    } else if (chunk.dirty) {
      rebuild(sc, chunk);
    }
  }

  for (const key of [...inScene.keys()]) {
    if (!seen.has(key)) {
      const m = inScene.get(key);
      sc.remove(m.opaque, m.transparent);
      if (m.opaque) m.opaque.geometry.dispose();
      if (m.transparent) m.transparent.geometry.dispose();
      inScene.delete(key);
    }
  }

  allMeshes = [];
  inScene.forEach(m => { if (m.opaque) allMeshes.push(m.opaque); if (m.transparent) allMeshes.push(m.transparent); });
}

/** Applies the day/night state: sky/fog colour + brightness tint. */
export function applyTime(time) {
  const THREE = getTHREE();
  const [r, g, b] = time.skyColor;
  scene.current.background = new THREE.Color(r, g, b);
  if (scene.current.fog) scene.current.fog.color.setRGB(r, g, b);
  setDaylight(time.brightness);
}
