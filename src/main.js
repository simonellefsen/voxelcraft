// main.js
// Bootstrap: loads three.js, builds the world (spawn area sync, rest streamed),
// wires subsystems, runs the loop. Render loop is never blocked by generation
// because chunk building is budgeted via world.processQueue().

import { initThree, getTHREE } from './core/three.js';
import { SX, SZ, CHUNK } from './core/config.js';
import { world } from './world/world.js';
import { initRenderer, camera, renderer, scene, sync, applyTime, allMeshes } from './engine/renderer.js';
import { initMaterials } from './engine/materials.js';
import { initInput } from './engine/input.js';
import { initTouch, isTouch } from './engine/input/touch.js';
import { TimeOfDay } from './engine/time.js';
import { initPlayer, player, move, updateCharacter } from './game/player.js';
import { spawnEntities, updateEntities, entities } from './game/entities.js';
import { updateDrops } from './game/entities/drops.js';
import { restoreWorld, persistWorld } from './world/save/save.js';
import { biomeAt, biomeName } from './world/biomes/biomes.js';
import {
  initInteraction, tickInteractions, getSelectedName, getTargetLabel,
} from './game/interaction.js';
import { initUI, showError, updateHud, updateDiagnostics } from './game/ui.js';
import { input } from './engine/input.js';

const RENDER_DIST = isTouch() ? 8 : 16; // chunks — exceeds fog; tighter on mobile

window.addEventListener('error', e => showError(e.message || e.error || e));
window.addEventListener('unhandledrejection', e => showError((e.reason && e.reason.message) || e.reason));

(async () => {
  try {
    await initThree();

    // Build the texture atlas + materials before any chunk is meshed.
    initMaterials();

    // Restore any saved chunks, then ensure the spawn region is ready. Restored
    // chunks keep their saved data (loadChunk skips generation for them); gaps
    // are generated normally. The rest streams in each frame.
    await restoreWorld(world).catch(() => 0);
    world.loadArea(SX / 2, SZ / 2, 4);

    initRenderer();
    initInput();
    initTouch();
    initPlayer();
    initInteraction();
    initUI();
    spawnEntities();

    // Manual save (O) — persists all loaded chunks to IndexedDB.
    window.addEventListener('keydown', async (e) => {
      if (e.key === 'o' || e.key === 'O') {
        const ok = await persistWorld(world).catch(() => false);
        if (ok) console.log('[save] world persisted');
      }
    });
    // Best-effort autosave when the tab is hidden/closed.
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') persistWorld(world).catch(() => {});
    });

    const time = new TimeOfDay();
    startLoop(time);
  } catch (e) {
    showError((e && e.message) || e);
    throw e;
  }
})();

function startLoop(time) {
  const THREE = getTHREE();
  const clock = new THREE.Clock();
  let fps = 0, acc = 0, frames = 0;

  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);

    time.update(dt);
    world.updateVisibleChunks(player.pos.x, player.pos.z, RENDER_DIST);
    world.processQueue(6);
    sync(world);
    applyTime(time);

    if (input.playing) {
      move(dt);
      tickInteractions();
      updateEntities(dt, time.isNight);
      updateDrops(dt);
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
    const faces = allMeshes.reduce((s, m) => s + (m.geometry.index ? m.geometry.index.count / 3 : 0), 0);
    updateDiagnostics({
      fps,
      camX: c.x, camY: c.y, camZ: c.z,
      px: player.pos.x, py: player.pos.y, pz: player.pos.z,
       chunks: world.chunks.size,
      faces,
      mobs: entities.length,
      biome: biomeName(biomeAt(player.pos.x, player.pos.z).id),
      time: formatTime(time.t),
      target: getTargetLabel(),
    });

    renderer.current.render(scene.current, camera.current);
  }
  loop();
}

/** t in [0,1) -> HH:MM string. */
function formatTime(t) {
  const total = Math.floor(t * 24 * 60);
  const h = String(Math.floor(total / 60)).padStart(2, '0');
  const m = String(total % 60).padStart(2, '0');
  return `${h}:${m}`;
}
