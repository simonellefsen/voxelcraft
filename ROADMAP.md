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
- [x] `engine/input/commands.js` — unified state (Move/Look/Jump/Break/Place/Interact/SelectSlot).
- [x] Keyboard/mouse source writes commands; `engine/input.js` refactored.
- [x] `engine/input/touch.js` — virtual joystick, swipe-look, context buttons.
- [ ] Gamepad source (future).

### Mobile UI
- [x] Detect touch / small screens; enlarge buttons + touch targets.
- [x] Simplified inventory grid; drag-and-drop item movement.
- [x] Crafting recipes selectable by tap (keep manual mode optional).

### Performance for mobile
- [x] Auto-reduce render distance on touch devices (4–8 chunks).
- [x] Pause / throttle updates for distant entities.
- [ ] Generate terrain in a Web Worker (background, non-blocking).
- [ ] Aggressive draw-call batching (already share atlas materials; verify counts).

## Milestone 4 — Gameplay depth (shipped)
- [x] Data-driven items/tools; inventory module (hotbar backed by inventory).
- [x] Crafting recipes (data-driven) + crafting menu UI (toggle with `I`).
- [x] Tool mining speed + durability; block hardness.
- [x] Item drops + pickup entities.

## Milestone 5 — Entities & AI (shipped)
- [x] `Entity`/`LivingEntity` base classes; mob hierarchy (game/entities/entity.js).
- [x] Behavior-tree AI (game/entities/bt.js) driving creeper, sheep, zombie, skeleton, spider, slime.
- [x] More mobs with distinct behaviors: zombie (melee), skeleton (ranged arrow), spider (leaper), slime (hopper).
- [x] Spawn manager (game/entities/spawn.js): per-type caps + day/night gating; mob-drop items.

## Milestone 6 — World systems (shipped)
- [x] Biomes (`world/biomes/biomes.js`): plains-dominant, deterministic; terrain uses surface/subsurface/tree density.
- [x] Lighting (`world/lighting/lighting.js`): sky + block-light propagation stored per chunk, applied as per-vertex light in meshing.
- [x] Torch block (emissive) to demonstrate block light; added to inventory + atlas.
- [x] Save system (`world/save/save.js`): binary RLE chunk serialization + IndexedDB persistence (feature-detected), restored on boot.
- [x] Boot-test assertions: biomes vary, torch emits light, save round-trips.

## Conventions
- One responsibility per file; ≤400 lines (prefer 150–250).
- Public APIs documented with JSDoc.
- Unit/boot tests where applicable (Node stub harness under `tests/`).
- Textual diagnostics are the LLM's "eyes" — keep `ROADMAP` + frame-debug in sync.
