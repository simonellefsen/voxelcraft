// main.js
// Bootstrap: loads three.js, builds the world (spawn area sync, rest streamed),
// wires subsystems, runs the loop. Render loop is never blocked by generation
// because chunk building is budgeted via world.processQueue().

import { initThree, getTHREE } from './core/three.js';
import { SX, SZ } from './core/config.js';
import { world } from './world/world.js';
import { initRenderer, camera, renderer, scene, sync } from './engine/renderer.js';
import { initInput } from './engine/input.js';
import { initPlayer, player, move, updateCharacter } from './game/player.js';
import { spawnEntities, updateEntities } from './game/entities.js';
import {
  initInteraction, updateTarget, getSelectedName, getTargetLabel,
} from './game/interaction.js';
import { initUI, showError, updateHud, updateDiagnostics } from './game/ui.js';
import { input } from './engine/input.js';

window.addEventListener('error', e => showError(e.message || e.error || e));
window.addEventListener('unhandledrejection', e => showError((e.reason && e.reason.message) || e.reason));

(async () => {
  try {
    await initThree();

    // Load the spawn region synchronously so the player has ground; stream the rest.
    world.loadArea(SX / 2, SZ / 2, 4);
    const CX = Math.ceil(SX / 16), CZ = Math.ceil(SZ / 16);
    for (let cx = 0; cx < CX; cx++)
      for (let cz = 0; cz < CZ; cz++) world.queueChunk(cx, cz);

    initRenderer();
    initInput();
    initPlayer();
    initInteraction();
    initUI();
    spawnEntities();
    startLoop();
  } catch (e) {
    showError((e && e.message) || e);
    throw e;
  }
})();

function startLoop() {
  const THREE = getTHREE();
  const clock = new THREE.Clock();
  let fps = 0, acc = 0, frames = 0;

  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);

    // Stream chunk generation in a per-frame budget (non-blocking).
    world.processQueue(6);
    sync(world);

    if (input.playing) {
      move(dt);
      updateTarget();
      updateEntities(dt);
    }
    updateCharacter(dt);

    updateHud(
      `HP: ${Math.max(0, Math.round(player.health))}  •  ` +
      `XYZ: ${player.pos.x.toFixed(1)} / ${player.pos.y.toFixed(1)} / ${player.pos.z.toFixed(1)}  •  ` +
      getSelectedName()
    );

    acc += dt; frames++;
    if (acc >= 0.5) { fps = Math.round(frames / acc); acc = 0; frames = 0; }
    const c = camera.current.position;
    updateDiagnostics({
      fps,
      camX: c.x, camY: c.y, camZ: c.z,
      px: player.pos.x, py: player.pos.y, pz: player.pos.z,
      chunks: world.chunks.size,
      target: getTargetLabel(),
    });

    renderer.current.render(scene.current, camera.current);
  }
  loop();
}
