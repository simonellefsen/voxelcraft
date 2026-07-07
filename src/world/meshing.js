// world/meshing.js
// Builds Three.js meshes for a chunk from the World store. Uses
// world.getBlock for neighbour lookups so faces on chunk borders are culled
// correctly. Pure geometry generation — no scene/render concerns here.

import { SCALE, CHUNK, SY } from '../core/config.js';
import { getTHREE } from '../core/three.js';
import { isOpaque, isTransparent, blockColor } from './blocks/block.js';

const FACES = [
  { dir: [ 1, 0, 0], corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]] },
  { dir: [-1, 0, 0], corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]] },
  { dir: [ 0, 1, 0], corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]] },
  { dir: [ 0,-1, 0], corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]] },
  { dir: [ 0, 0, 1], corners: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]] },
  { dir: [ 0, 0,-1], corners: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]] },
];

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
 * Builds { opaque, transparent } meshes for a chunk.
 * @param {import('./world.js').World} world  source of voxel data
 * @param {import('./chunks/chunk.js').Chunk} chunk
 * @returns {{opaque: any, transparent: any}}
 */
export function buildChunk(world, chunk) {
  const THREE = getTHREE();
  const x0 = chunk.cx * CHUNK, z0 = chunk.cz * CHUNK;
  const op = [], oc = [], oi = [];
  const tr = [], tc = [], ti = [];

  for (let z = 0; z < CHUNK; z++)
    for (let y = 0; y < SY; y++)
      for (let x = 0; x < CHUNK; x++) {
        const id = chunk.get(x, y, z);
        if (id === 0) continue;
        const gx = x0 + x, gz = z0 + z;
        const transparent = isTransparent(id);
        const arr = transparent ? tr : op, carr = transparent ? tc : oc, iarr = transparent ? ti : oi;
        for (const f of FACES) {
          const nb = world.getBlock(gx + f.dir[0], y + f.dir[1], gz + f.dir[2]);
          const visible = transparent ? (nb === 0) : !isOpaque(nb);
          if (!visible) continue;
          const col = blockColor(id, f.dir);
          const base = arr.length / 3;
          for (let i = 0; i < 4; i++) {
            arr.push((gx + f.corners[i][0]) * SCALE, (y + f.corners[i][1]) * SCALE, (gz + f.corners[i][2]) * SCALE);
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
