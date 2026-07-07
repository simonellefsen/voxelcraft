// game/entities/projectile.js
// Lightweight arrows fired by skeletons (and potentially the player later).
// They travel in a straight line, hit the player or terrain, and expire.

import { SCALE, SY } from '../../core/config.js';
import { getTHREE } from '../../core/three.js';
import { scene } from '../../engine/renderer.js';
import { solidAt } from '../../physics/collision.js';
import { player, damagePlayer } from '../player.js';
import { playHit } from '../../engine/audio.js';

const arrows = [];

/** Spawns an arrow from `from` toward unit `dir` at `speed`. */
export function spawnArrow(from, dir, speed, damage) {
  const THREE = getTHREE();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.06, 0.3),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 0.3, 0.2) })
  );
  mesh.position.set(from.x * SCALE, from.y * SCALE, from.z * SCALE);
  scene.current.add(mesh);
  arrows.push({
    pos: new THREE.Vector3(from.x, from.y, from.z),
    vel: dir.clone().normalize().multiplyScalar(speed),
    mesh, life: 4, damage,
  });
}

/** Advances all arrows; returns hits to the player. */
export function updateArrows(dt) {
  const THREE = getTHREE();
  for (let i = arrows.length - 1; i >= 0; i--) {
    const a = arrows[i];
    a.life -= dt;
    a.pos.addScaledVector(a.vel, dt);
    a.mesh.position.set(a.pos.x * SCALE, a.pos.y * SCALE, a.pos.z * SCALE);
    a.mesh.lookAt(a.mesh.position.x + a.vel.x, a.mesh.position.y + a.vel.y, a.mesh.position.z + a.vel.z);

    let hit = false;
    if (solidAt(a.pos.x, a.pos.y, a.pos.z)) hit = true;
    const dp = Math.hypot(a.pos.x - player.pos.x, a.pos.y - (player.pos.y + 0.9), a.pos.z - player.pos.z);
    if (dp < 0.6) { damagePlayer(a.damage); hit = true; }

    if (hit || a.life <= 0 || a.pos.y < 0 || a.pos.y > SY) {
      scene.current.remove(a.mesh); a.mesh.geometry.dispose();
      arrows.splice(i, 1);
      if (hit) playHit();
    }
  }
}
