// engine/materials.js
// Material manager: one MeshBasicMaterial per render pass (opaque / transparent)
// sharing the texture atlas. Applies a daylight brightness tint for the
// day/night cycle (MeshBasicMaterial color multiplies the texture).

import { getTHREE } from '../core/three.js';
import { generateAtlas } from '../assets/textures/atlas.js';

let opaqueMat = null;
let transMat = null;
let atlas = null;

/** Builds the atlas + shared materials. Call once after initThree(). */
export function initMaterials() {
  const THREE = getTHREE();
  atlas = generateAtlas();
  opaqueMat = new THREE.MeshBasicMaterial({ map: atlas.texture, vertexColors: true });
  transMat = new THREE.MeshBasicMaterial({
    map: atlas.texture, transparent: true, opacity: 0.6, vertexColors: true,
  });
}

export function getOpaqueMaterial() { return opaqueMat; }
export function getTransparentMaterial() { return transMat; }
export function getAtlas() { return atlas; }

/** Sets the daylight brightness multiplier (1 = noon, ~0.25 = night). */
export function setDaylight(factor) {
  if (!opaqueMat) return;
  opaqueMat.color.setScalar(factor);
  transMat.color.setScalar(factor);
}
