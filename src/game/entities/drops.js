// game/entities/drops.js
// Dropped item entities. They fall, settle, and are picked up into the
// player's inventory when the player walks near. Owned by the scene; the
// player inventory is the shared singleton.

import { SCALE } from '../../core/config.js';
import { getTHREE } from '../../core/three.js';
import { scene } from '../../engine/renderer.js';
import { player } from '../player.js';
import { inventory } from '../inventory/playerInventory.js';
import { BLOCK_DEFS } from '../../world/blocks/block.js';

const drops = [];

function dropColor(itemId) {
  const def = BLOCK_DEFS[itemId];
  if (def) return new (getTHREE().Color)(def.color[0], def.color[1], def.color[2]);
  return new (getTHREE().Color)(0.6, 0.6, 0.6); // tools
}

/** Spawns a dropped item stack at a world position (voxel coords + 0.5). */
export function spawnDrop(x, y, z, itemId, count = 1) {
  const THREE = getTHREE();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, 0.2),
    new THREE.MeshBasicMaterial({ color: dropColor(itemId) })
  );
  mesh.position.set(x * SCALE, y * SCALE, z * SCALE);
  scene.current.add(mesh);
  drops.push({
    itemId, count, mesh,
    vel: new THREE.Vector3((Math.random() - 0.5) * 2, 4, (Math.random() - 0.5) * 2),
    life: 60,
  });
}

/** Advances all drops: gravity, settle, pickup, expiry. */
export function updateDrops(dt) {
  const THREE = getTHREE();
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    d.life -= dt;
    d.vel.y -= 20 * dt;
    d.mesh.position.x += d.vel.x * dt;
    d.mesh.position.y += d.vel.y * dt;
    d.mesh.position.z += d.vel.z * dt;
    if (d.mesh.position.y < 0.12) { d.mesh.position.y = 0.12; d.vel.set(0, 0, 0); }
    d.mesh.rotation.y += dt * 2;

    const px = player.pos.x * SCALE, py = (player.pos.y + 0.9) * SCALE, pz = player.pos.z * SCALE;
    const dist = Math.hypot(d.mesh.position.x - px, d.mesh.position.y - py, d.mesh.position.z - pz);
    if (dist < 0.6) {
      inventory.add(d.itemId, d.count);
      scene.current.remove(d.mesh); d.mesh.geometry.dispose();
      drops.splice(i, 1);
      continue;
    }
    if (d.life <= 0) {
      scene.current.remove(d.mesh); d.mesh.geometry.dispose();
      drops.splice(i, 1);
    }
  }
}
