# VoxelCraft — Roadmap & Milestones

Progress is tracked with `[x]` (done) / `[ ]` (todo). Each milestone follows the
DESIGN.md workflow: implement the smallest working version, test it, document the
public API, then wait for review before expanding.

---

## Milestone 0 — Foundations (shipped)
- [x] Single-file voxel game (index.html) with terrain, mining/building, mobs, audio, third-person character.
- [x] CDN three.js loader with fallbacks; drag-to-look fallback for iframes.
- [x] Debug console logs removed; `rebuildAt` fixed.
- [x] GitHub repo + Vercel static deploy.

## Milestone 1 — Modular ES-module split (shipped)
- [x] Split into `src/` ES modules (core/world/engine/game/physics), no build step.
- [x] `three.js` CDN loader via `getTHREE()`; no hidden globals.
- [x] Textual diagnostics overlay (FPS, camera/player, chunks, target block).
- [x] Node boot-test harness (stubbed three.js + DOM) catches runtime wiring errors.
- [x] `package.json` with ESM marker + `check` script.

## Milestone 2 — Architecture: Chunk / World (IN PROGRESS)
Goal: spec-aligned data-oriented world. Gameplay behavior unchanged; enables
streaming, save, biomes, lighting later.
- [x] Data-driven block registry (`src/world/blocks/block.js`): id, name, solid,
      opaque, transparent, color; `blockColor(id, dir)` keeps per-face shading.
- [x] `Chunk` class (`src/world/chunks/chunk.js`): `Uint16Array`, `get/set`, `markDirty`, states.
- [x] `World` class (`src/world/world.js`): `getBlock/setBlock`, `loadChunk`,
      `unloadChunk`, `updateVisibleChunks`, spawn-area sync load + async build queue.
- [x] `meshing.buildChunk(world, chunk)` uses `world.getBlock` for correct cross-border face culling.
- [x] `terrain.generate(world)` fills chunks (per-column, deterministic).
- [x] `renderer.sync(world)` reconciles scene with chunk meshes; rebuilds dirty chunks.
- [x] Bootstrap: load spawn area synchronously, stream the rest without blocking the loop.
- [x] Boot-test passes; rebuild path (`setBlock` -> dirty -> rebuild) verified.
- [x] Commit & push.

## Milestone 3 — Rendering upgrade (IN PROGRESS)
- [x] Procedural canvas texture atlas (`assets/textures/atlas.js`) — 16×16 tiles, no external files.
- [x] Material manager (`engine/materials.js`) sharing the atlas; opaque + transparent passes.
- [x] Day/night cycle (`engine/time.js`): sky/fog colour + brightness tint applied each frame.
- [x] `meshing.buildChunk` now emits UVs (face culling) and uses the atlas; vertex colors removed.
- [x] `meshing.buildChunkGreedy` implemented + benchmarked (fewer triangles than naive).
- [x] Render-distance streaming via `world.updateVisibleChunks` + `processQueue` budget in the loop.
- [ ] Flip `USE_GREEDY = true` once verified in-browser (currently default OFF per DESIGN "benchmark before replacing").
- [x] Commit & push Milestone 3.

## Milestone 7 — Mobile (PLANNED)
Per DESIGN.md "MOBILE": treat mobile as a first-class platform; structure input as a
unified command layer so desktop/touch/gamepad share gameplay logic.

### Input layer (unified Player Commands)
- [ ] `engine/input/` split into low-level sources (keyboard/mouse, touch) + a
      `commands` module emitting high-level: Move, Look, Jump, Break, Place,
      Interact, OpenInventory, SelectSlot.
- [ ] Touch controls: left-thumb virtual joystick (Move), right-thumb swipe (Look).
- [ ] Context buttons: Jump, Sneak, Sprint, Interact, Inventory.
- [ ] Tap block = select/break; tap adjacent face = place selected block.
- [ ] Hotbar tap-to-select; long-press for extra options.

### Mobile UI
- [ ] Detect touch / small screens; enlarge buttons + touch targets.
- [ ] Simplified inventory grid; drag-and-drop item movement.
- [ ] Crafting recipes selectable by tap (keep manual mode optional).

### Performance for mobile
- [ ] Auto-reduce render distance on touch devices (4–8 chunks).
- [ ] Pause / throttle updates for distant entities.
- [ ] Generate terrain in a Web Worker (background, non-blocking).
- [ ] Aggressive draw-call batching (already share atlas materials; verify counts).

## Milestone 4 — Gameplay depth (PLANNED)
- [ ] Data-driven items/tools; inventory module (hotbar backed by inventory).
- [ ] Crafting recipes (JSON) + crafting table UI.
- [ ] Tool mining speed + durability; block hardness.
- [ ] Item drops + pickup entities.

## Milestone 5 — Entities & AI (PLANNED)
- [ ] `Entity`/`LivingEntity` base classes; mob hierarchy.
- [ ] More mobs (zombie, skeleton, spider, slime) with behavior-tree AI.
- [ ] Spawn manager (light level, caps, biomes).

## Milestone 6 — World systems (PLANNED)
- [ ] Biomes (plains, forest, desert, ocean, …) with surface/vegetation/spawn tables.
- [ ] Lighting (block light + sky light propagation).
- [ ] Save system: binary, compressed, chunk-indexed.

## Conventions
- One responsibility per file; ≤400 lines (prefer 150–250).
- Public APIs documented with JSDoc.
- Unit/boot tests where applicable (Node stub harness under `tests/`).
- Textual diagnostics are the LLM's "eyes" — keep `ROADMAP` + frame-debug in sync.
