// main.js
// Bootstrap: loads three.js, builds the world, wires subsystems, runs loop.

import { initThree, getTHREE } from './core/three.js';
import { generate } from './world/terrain.js';
import { initRenderer, camera, chunks, renderer, scene } from './engine/renderer.js';
import { initInput } from './engine/input.js';
import {
  initPlayer, player, move, updateCharacter,
} from './game/player.js';
import { spawnEntities, updateEntities } from './game/entities.js';
import {
  initInteraction, updateTarget, getSelectedName, getTargetLabel,
} from './game/interaction.js';
import {
  initUI, showError, updateHud, updateDiagnostics,
} from './game/ui.js';
import { input } from './engine/input.js';

window.addEventListener('error', e => showError(e.message || e.error || e));
window.addEventListener('unhandledrejection', e => showError((e.reason && e.reason.message) || e.reason));

(async () => {
  try {
    await initThree();
    generate();
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

    if (input.playing) {
      move(dt);
      updateTarget();
      updateEntities(dt);
    }
    updateCharacter(dt);

    // HUD
    updateHud(
      `HP: ${Math.max(0, Math.round(player.health))}  •  ` +
      `XYZ: ${player.pos.x.toFixed(1)} / ${player.pos.y.toFixed(1)} / ${player.pos.z.toFixed(1)}  •  ` +
      getSelectedName()
    );

    // Diagnostics (textual vision)
    acc += dt; frames++;
    if (acc >= 0.5) { fps = Math.round(frames / acc); acc = 0; frames = 0; }
    const c = camera.current.position;
    updateDiagnostics({
      fps,
      camX: c.x, camY: c.y, camZ: c.z,
      px: player.pos.x, py: player.pos.y, pz: player.pos.z,
      chunks: chunks.size,
      target: getTargetLabel(),
    });

    const r = renderer.current;
    r.render(scene.current, camera.current);
  }
  loop();
}
