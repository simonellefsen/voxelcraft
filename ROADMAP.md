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
- [ ] Commit & push.

## Milestone 3 — Rendering upgrade (PLANNED)
- [ ] Procedural canvas texture atlas + material/shader manager (`assets/textures`).
- [ ] Day/night cycle with sky color + ambient light changes.
- [ ] Greedy meshing (benchmark vs naive face culling first).
- [ ] Render-distance-based `updateVisibleChunks` streaming (infinite terrain).

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
