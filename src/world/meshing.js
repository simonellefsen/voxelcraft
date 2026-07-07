// world/meshing.js
// Builds Three.js meshes for a 16x16 chunk column from the voxel store.
// Pure geometry generation — no scene/render concerns live here.

import {
  SCALE, CHUNK, SY, OPAQUE, WATER, GLASS,
  GRASS, DIRT, STONE, SAND, WOOD, LEAVES,
} from '../core/config.js';
import { getBlock } from './world.js';
import { getTHREE } from '../core/three.js';

const FACES = [
  { dir: [ 1, 0, 0], corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]] },
  { dir: [-1, 0, 0], corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]] },
  { dir: [ 0, 1, 0], corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]] },
  { dir: [ 0,-1, 0], corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]] },
  { dir: [ 0, 0, 1], corners: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]] },
  { dir: [ 0, 0,-1], corners: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]] },
];

/** Vertex colour (with simple face shading) for a block id + face direction. */
export function colorFor(id, dir) {
  let c;
  switch (id) {
    case GRASS:  c = dir[1] === 1 ? [0.42, 0.72, 0.30] : dir[1] === -1 ? [0.50, 0.36, 0.24] : [0.50, 0.38, 0.25]; break;
    case DIRT:   c = [0.50, 0.36, 0.24]; break;
    case STONE:  c = [0.56, 0.56, 0.60]; break;
    case SAND:   c = [0.86, 0.80, 0.56]; break;
    case WOOD:   c = dir[1] !== 0 ? [0.70, 0.55, 0.35] : [0.42, 0.30, 0.17]; break;
    case LEAVES: c = [0.27, 0.55, 0.23]; break;
    case GLASS:  c = [0.72, 0.86, 0.92]; break;
    case WATER:  c = [0.25, 0.50, 0.92]; break;
    default:     c = [1, 0, 1];
  }
  const shade = dir[1] === 1 ? 1.0 : dir[1] === -1 ? 0.5 : (dir[0] !== 0 ? 0.7 : 0.85);
  return [c[0] * shade, c[1] * shade, c[2] * shade];
}

function makeMesh(THREE, positions, colors, index, transparent) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(index);
  const m = new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.DoubleSide,
    transparent: transparent, opacity: transparent ? 0.6 : 1.0,
  });
  return new THREE.Mesh(g, m);
}

/**
 * Builds { opaque, transparent } meshes for chunk column (cx, cz).
 * @returns {{opaque: THREE.Mesh, transparent: THREE.Mesh}}
 */
export function buildChunk(cx, cz) {
  const THREE = getTHREE();
  const op = [], oc = [], oi = [];
  const tr = [], tc = [], ti = [];
  const x0 = cx * CHUNK, z0 = cz * CHUNK;
  for (let z = z0; z < z0 + CHUNK; z++)
    for (let y = 0; y < SY; y++)
      for (let x = x0; x < x0 + CHUNK; x++) {
        const id = getBlock(x, y, z);
        if (id === 0) continue;
        const transparent = (id === WATER || id === GLASS);
        const arr = transparent ? tr : op, carr = transparent ? tc : oc, iarr = transparent ? ti : oi;
        for (const f of FACES) {
          const nb = getBlock(x + f.dir[0], y + f.dir[1], z + f.dir[2]);
          const visible = transparent ? (nb === 0) : !OPAQUE.has(nb);
          if (!visible) continue;
          const col = colorFor(id, f.dir);
          const base = arr.length / 3;
          for (let i = 0; i < 4; i++) {
            arr.push((x + f.corners[i][0]) * SCALE, (y + f.corners[i][1]) * SCALE, (z + f.corners[i][2]) * SCALE);
            carr.push(col[0], col[1], col[2]);
          }
          iarr.push(base, base + 1, base + 2, base, base + 2, base + 3);
        }
      }

  return {
    opaque: makeMesh(THREE, op, oc, oi, false),
    transparent: makeMesh(THREE, tr, tc, ti, true),
  };
}

export { FACES };
