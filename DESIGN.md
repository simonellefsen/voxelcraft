If the target LLM has **no vision capabilities**, the key is to make the project highly modular and give it a textual representation of the game state. A coding LLM is excellent at implementing well-defined systems, but it struggles when it has to infer architecture or "look" at the result.

I'd structure the project as if I were writing an engineering specification rather than a game design document.

---

# Browser Minecraft Clone Specification

## Goal

Build a voxel sandbox game inspired by Minecraft that runs entirely in the browser.

Requirements:

* Playable at 60 FPS on modern desktop browsers
* Pure JavaScript/TypeScript
* WebGL/WebGPU rendering
* Infinite procedural terrain
* Chunk streaming
* Block placement/removal
* Survival mechanics later
* Modular architecture
* Every subsystem independently testable

---

# Development Philosophy

The LLM should never write "the game."

Instead it builds:

```
Foundation
    ↓
Rendering
    ↓
World
    ↓
Interaction
    ↓
Gameplay
    ↓
Optimization
```

Each stage must be fully working before the next.

---

# Folder Structure

```
src/

engine/
    renderer/
    camera/
    math/
    input/
    timing/

world/
    blocks/
    chunks/
    terrain/
    lighting/
    save/

game/
    player/
    inventory/
    crafting/
    ui/

physics/
    collision/
    raycast/

assets/
    textures/
    shaders/

tests/

docs/
```

---

# Coding Rules

Every file should:

* Have one responsibility
* Export one primary class/module
* Contain no hidden globals
* Include JSDoc comments
* Have unit tests when possible

Maximum file size:

```
400 lines
```

Preferred:

```
150–250
```

---

# Milestone 1

## Engine

Implement:

```
✓ Main loop

✓ Delta timing

✓ Resize handling

✓ Camera

✓ Keyboard

✓ Mouse

✓ FPS counter
```

Success condition:

A movable camera over an empty scene.

---

# Milestone 2

Rendering

Implement:

```
Mesh abstraction

GPU buffers

Shader manager

Texture atlas support

Material system

Chunk mesh renderer
```

Success:

Draw one cube.

Then

```
100 cubes

1000 cubes

10000 cubes
```

---

# Milestone 3

Voxel World

Create:

```
Block

Chunk

World
```

Definitions:

```
Block
{
    id
    transparent
    solid
    textureIndex
}
```

Chunk:

```
16 x 16 x 128
```

or

```
32 x 32 x 256
```

Stored as:

```
Uint16Array
```

Never objects.

---

# Chunk API

```
getBlock()

setBlock()

generate()

buildMesh()

markDirty()
```

No rendering code inside Chunk.

---

# World API

```
loadChunk()

unloadChunk()

updateVisibleChunks()

getBlock()

setBlock()
```

---

# Terrain

Noise layers:

```
continentalness

erosion

peaks

caves
```

Generated from deterministic seed.

Generation pipeline:

```
Seed

↓

Noise

↓

Heightmap

↓

Stone

↓

Dirt

↓

Grass

↓

Trees

↓

Ore
```

---

# Meshing

Support:

```
Naive meshing

↓

Face culling

↓

Greedy meshing
```

Each stage benchmarked before replacing.

---

# Camera

Supports

```
Yaw

Pitch

Movement

Jump

Gravity

Sprint

Fly mode
```

---

# Physics

Player represented as:

```
Capsule
```

or

```
AABB
```

Collision:

```
Voxel traversal

Sliding

Ground detection
```

---

# Interaction

Raycast through voxels.

Supports:

```
Break block

Place block

Highlight block
```

---

# Chunk Streaming

Maintain:

```
Loaded chunks

Generating chunks

Meshing chunks

GPU uploaded chunks
```

Separate states.

Never block the render loop.

Generation occurs asynchronously.

---

# Performance Targets

```
10 chunk render distance

60 FPS

<150 MB memory

Chunk rebuild under 10 ms

World generation under 5 ms/chunk
```

---

# Save System

Chunk serialization:

```
Binary

Compressed

Indexed by chunk coordinate
```

---

# Future Systems

```
Water

Lighting

Biomes

Animals

Hostile mobs

Inventory

Crafting

Furnaces

Redstone

Multiplayer
```

Each isolated.

---

# Coding Workflow for the LLM

For every task:

1. Restate requirements.
2. Identify dependencies.
3. Implement the smallest working version.
4. Write tests where applicable.
5. Document public APIs.
6. Explain design decisions.
7. Wait for review before expanding.

Avoid implementing adjacent features unless explicitly requested.

---

# Textual "Vision" for a Non-Vision LLM

Since the LLM cannot inspect rendered output, provide it with structured textual diagnostics after each run. For example:

```text
=== Frame Debug ===
FPS: 60
Camera: (12.5, 68.2, -3.1)
Visible Chunks: 49
Loaded Chunks: 64
Rendered Faces: 18,432
Draw Calls: 49
Triangles: 36,864
Player Grounded: true
Target Block: grass @ (15, 64, 8)
```

For chunk validation:

```text
Chunk (0,0)
Blocks:
  Air: 48,912
  Stone: 9,845
  Dirt: 1,024
  Grass: 256
Mesh:
  Vertices: 12,840
  Indices: 19,260
  Greedy Quads: 3,210
```

For terrain generation:

```text
Noise Seed: 12345
Height Range: 52–89
Caves Generated: 14
Trees: 6
Ore Veins: 19
```

These logs act as the LLM's "eyes," allowing it to reason about correctness and performance without ever seeing the rendered scene.

---

## Overall Architecture

A clean architecture for a browser-based Minecraft-like game separates concerns into five layers:

```text
Browser
    │
    ▼
Game Loop
    │
    ├── Renderer
    ├── Input
    ├── UI
    └── Audio
         │
         ▼
World
    ├── Chunks
    ├── Terrain
    ├── Lighting
    ├── Physics
    └── Entities
         │
         ▼
Core Engine
    ├── Math
    ├── ECS (optional)
    ├── Resource Manager
    ├── Event Bus
    └── Save System
```

This layered approach keeps each subsystem independently testable and understandable, making it well-suited for iterative development by a coding LLM that relies on explicit specifications and textual feedback rather than visual inspection.

