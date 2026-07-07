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

--

These sections fit naturally after the "Future Systems" or "Gameplay" section of the specification.

# Core Gameplay

The game is a sandbox survival experience inspired by Minecraft, where the player explores a procedurally generated voxel world, gathers resources, crafts tools, builds structures, and survives against environmental hazards and hostile creatures.

The initial gameplay loop is:

1. Spawn into a randomly generated world.
2. Gather wood and basic resources.
3. Craft primitive tools.
4. Mine stone and ores.
5. Build shelter before nightfall.
6. Defend against hostile mobs.
7. Explore caves and distant biomes.
8. Progress toward stronger equipment and larger construction projects.

---

# Player Character

The player is a first-person character with the following capabilities:

Movement

* Walking
* Sprinting
* Jumping
* Crouching
* Swimming
* Climbing ladders
* Flying (creative/debug mode)

Interaction

* Break blocks
* Place blocks
* Open containers
* Use tools
* Craft items
* Interact with NPCs
* Pick up dropped items
* Sleep in beds

Player Statistics

* Health
* Hunger
* Saturation (optional)
* Experience
* Armor
* Air (underwater)

Inventory

* Hotbar
* Main inventory
* Armor slots
* Off-hand slot (optional)

---

# Items and Tools

Items should be data-driven rather than hardcoded whenever possible.

Basic Tool Categories

* Wooden tools
* Stone tools
* Iron tools
* Gold tools
* Diamond tools
* Netherite-equivalent (future)

Tool Types

* Pickaxe
* Axe
* Shovel
* Hoe
* Sword
* Bow
* Crossbow (future)
* Fishing Rod
* Shears
* Flint and Steel
* Bucket
* Compass
* Clock
* Shield

Each tool defines:

* Durability
* Mining speed
* Damage
* Effective block types
* Enchantability (future)

---

# Resources

Common Resources

* Wood
* Stone
* Dirt
* Sand
* Gravel
* Clay

Ores

* Coal
* Iron
* Copper
* Gold
* Redstone
* Lapis
* Diamond
* Emerald

Crafting Materials

* Sticks
* Planks
* String
* Leather
* Wool
* Bones
* Feathers
* Gunpowder

Food

* Apples
* Bread
* Meat
* Fish
* Eggs
* Carrots
* Potatoes
* Berries

---

# Living Creatures

Every creature should inherit from a common Entity class.

Example hierarchy:

Entity
↓
LivingEntity
↓
Animal / Monster / NPC

Each entity contains:

* Position
* Rotation
* Velocity
* Health
* AI state
* Collision bounds
* Animation state
* Inventory (optional)

---

# Passive Animals

Initial passive creatures:

* Sheep
* Cow
* Pig
* Chicken
* Rabbit
* Horse
* Wolf
* Cat
* Bee
* Fish

Behaviors:

* Wander randomly
* Avoid danger
* Eat or graze (optional)
* Breed
* Follow food when appropriate
* Drop resources on death

---

# Hostile Creatures

Initial hostile mobs:

* Zombie
* Skeleton
* Creeper
* Spider
* Slime
* Enderman (later)
* Witch (later)

Typical behaviors:

* Spawn in darkness
* Detect nearby players
* Navigate around obstacles
* Attack when in range
* Burn in daylight where appropriate
* Drop loot

Special behaviors:

Creeper

* Moves quietly
* Explodes after a fuse when close to the player
* Damages terrain (configurable)

Zombie

* Walks toward players
* Can break simple obstacles in harder difficulties (future)

Skeleton

* Uses ranged attacks
* Attempts to maintain distance

Spider

* Climbs walls
* More aggressive at night

Slime

* Splits into smaller slimes when defeated

---

# NPCs

Initial NPC types:

Villager

* Lives in villages
* Wanders during the day
* Sleeps at night
* Trades items
* Uses profession-specific workstations

Future NPCs:

* Wandering Trader
* Iron Golem
* Custom villagers
* Quest givers (optional)

Villagers should use a schedule-based AI system rather than scripted paths.

---

# World Spawning

Spawn rules should be configurable.

Passive mobs:

* Spawn in daylight
* Prefer grass blocks
* Require sufficient space

Hostile mobs:

* Spawn below a configurable light level
* Spawn outside a safe radius around the player
* Limited by a population cap

Ambient entities:

* Bats
* Fish
* Butterflies (optional)
* Fireflies (optional)

Spawn manager responsibilities:

* Population limits
* Biome restrictions
* Spawn weighting
* Despawn rules
* Performance budgeting

---

# Day and Night Cycle

The world runs on a configurable day/night cycle.

Example:

* Sunrise
* Morning
* Noon
* Afternoon
* Sunset
* Night
* Midnight
* Dawn

The cycle affects:

* Sky color
* Ambient light
* Shadows
* Mob spawning
* Animal behavior
* Villager schedules
* Player visibility

Optional weather system:

* Clear
* Rain
* Thunderstorm
* Snow (biome dependent)

Weather influences:

* Lighting
* Ambient sounds
* Visibility
* Crop growth (future)

---

# Artificial Intelligence

NPC AI should use modular behavior trees or utility AI rather than large conditional blocks.

Typical behaviors include:

* Idle
* Wander
* Follow
* Flee
* Search
* Attack
* Trade
* Sleep
* Work
* Eat
* Patrol

Every behavior should be independently testable.

---

# Biomes

Initial biome set:

* Plains
* Forest
* Birch Forest
* Desert
* Taiga
* Mountains
* Ocean
* River
* Swamp
* Beach

Future biomes:

* Jungle
* Savanna
* Badlands
* Snow
* Mushroom Island

Each biome specifies:

* Terrain generation
* Surface blocks
* Vegetation
* Trees
* Weather
* Spawn tables
* Ambient colors
* Music
* Structures

---

# Structures

World generation should support procedurally placed structures.

Examples:

* Villages
* Mineshafts
* Caves
* Ruined portals
* Dungeons
* Strongholds (future)
* Temples
* Shipwrecks

Structure generation should occur after terrain generation and before chunk finalization.

---

# Gameplay Progression

Progression is driven by exploration, crafting, and resource acquisition rather than levels.

Typical progression:

Wood
→ Stone
→ Iron
→ Diamond
→ Advanced equipment

Each progression tier unlocks:

* Faster tools
* Stronger weapons
* Better armor
* New crafting recipes
* Access to more dangerous environments

These additions give the coding LLM a much richer understanding of the intended gameplay while still keeping the specification modular and implementation-oriented.

--

This is worth specifying in much more detail because it defines the primary interaction model of the game. I'd describe it almost like a technical design document so the coding LLM understands both **what the player experiences** and **how the engine should implement it**.

# Player Character and World Interaction

The player is represented in the world as a first-person entity occupying physical space. The player is not simply a camera; instead, the camera is attached to a simulated character with collision, physics, inventory, and state.

---

# Player Representation

The player consists of several components:

* Physics body
* Camera
* Inventory
* Equipment
* Health
* Hunger
* Input controller
* Interaction controller
* Animation state (for multiplayer or third-person)
* Audio listener

Example:

Player
├── Transform
├── Camera
├── PhysicsBody
├── Inventory
├── Equipment
├── HealthComponent
├── HungerComponent
├── InteractionComponent
├── MovementController
└── PlayerState

---

# Position

The player always has:

Position

* X
* Y
* Z

Rotation

* Yaw
* Pitch

Velocity

* X
* Y
* Z

Example

Position:
(125.3, 68.0, -42.7)

Rotation:
Yaw = 135°
Pitch = -18°

Velocity:
(0.0, -0.3, 4.5)

The camera is positioned slightly above the center of the player's collision body to simulate eye height.

---

# Physical Body

Recommended collision shape:

Capsule

or

Axis-Aligned Bounding Box (AABB)

Approximate dimensions:

Width:
0.6 blocks

Height:
1.8 blocks

Eye height:
1.62 blocks

The player cannot pass through solid blocks.

The physics system handles:

* Gravity
* Jumping
* Sliding
* Collision detection
* Walking up small steps
* Falling damage
* Swimming
* Climbing ladders

---

# Camera

The camera rotates independently of movement.

Mouse movement:

Horizontal movement
→ adjusts yaw

Vertical movement
→ adjusts pitch

Pitch should be clamped to prevent looking completely backwards.

Movement direction is computed relative to camera yaw.

---

# Movement

Supported movement states:

* Standing
* Walking
* Sprinting
* Sneaking
* Jumping
* Falling
* Swimming
* Flying (Creative Mode)

Movement is continuous rather than grid-based.

Movement keys apply acceleration, while friction and gravity influence final velocity.

---

# Looking at the World

The player interacts with the world using a raycast extending from the camera.

Typical ray length:

5 blocks

Every frame:

Camera
↓

Raycast

↓

Nearest solid block

↓

Interaction Target

The targeted block should be highlighted visually.

---

# Breaking Blocks

Breaking uses the currently equipped tool.

Process:

1. Raycast identifies the targeted block.
2. Verify the block is breakable.
3. Determine tool effectiveness.
4. Apply mining progress over time.
5. Play particles and sound.
6. Remove the block.
7. Spawn dropped item entities.
8. Mark the containing chunk as dirty.
9. Rebuild the chunk mesh.

Mining speed depends on:

* Tool type
* Tool material
* Block hardness
* Player effects (future)

Breaking progress should be interruptible if the player changes target.

---

# Placing Blocks

When holding a placeable block:

1. Perform a raycast.
2. Determine the face that was hit.
3. Calculate the adjacent empty position.
4. Validate placement.
5. Ensure the block does not intersect the player.
6. Place the block.
7. Update chunk mesh.
8. Play placement sound.

Placement rules:

Cannot place inside:

* Player
* Solid entities

May require support depending on block type.

---

# Using Tools

Every tool defines:

* Durability
* Mining speed
* Damage
* Reach
* Effective materials

Examples

Pickaxe

Efficient on:

* Stone
* Ore
* Metal

Axe

Efficient on:

* Wood
* Logs
* Leaves

Shovel

Efficient on:

* Dirt
* Sand
* Gravel

Hoe

Used for:

* Farming
* Soil preparation

Sword

Used for:

* Combat

Bow

Used for:

* Ranged attacks

Bucket

Used for:

* Water
* Lava
* Milk

---

# Picking Up Items

Dropped items exist as independent world entities.

Properties:

* Position
* Velocity
* Rotation
* Lifetime
* Stack count
* Item type

When the player moves within the pickup radius:

Player

↓

Pickup detection

↓

Inventory insertion

↓

Play pickup sound

↓

Remove world entity

Nearby items of the same type may merge into stacks to reduce entity count.

---

# Opening Containers

Containers include:

* Chest
* Barrel
* Furnace
* Crafting Table
* Hopper
* Future storage blocks

Interaction flow:

Player

↓

Raycast

↓

Container

↓

Open UI

↓

Transfer items

The world simulation continues while container interfaces are open unless the game is paused.

---

# Crafting

Crafting can occur using:

Player inventory

or

Crafting Table

Crafting process:

Collect resources

↓

Open crafting interface

↓

Arrange ingredients

↓

Recipe validation

↓

Create output item

↓

Consume ingredients

Recipes should be defined in external JSON or data files rather than hardcoded, making them easy to extend or modify.

---

# Sleeping

Requirements:

* Bed exists
* Night time
* No nearby hostile mobs

Interaction:

Player

↓

Use Bed

↓

Sleep animation

↓

Advance time to sunrise

↓

Restore player state

The player wakes at the assigned bed location.

The bed becomes the player's respawn point.

---

# Building Structures

Building is one of the primary gameplay activities.

The player constructs structures by repeatedly placing blocks into the world.

Every placed block permanently modifies the voxel terrain.

Example workflow:

Choose a location.

↓

Flatten the ground.

↓

Gather wood and stone.

↓

Craft tools.

↓

Craft a crafting table.

↓

Craft a door.

↓

Craft a bed.

↓

Craft chests.

↓

Begin construction.

---

# Example: Building a Starter House

Step 1

Clear a flat area approximately:

7 × 7 blocks

Step 2

Create a stone foundation.

Step 3

Build walls four blocks high using wooden planks.

Step 4

Leave openings for:

* Front door
* Windows

Step 5

Construct a sloped or flat roof using wood or stone slabs.

Step 6

Install a wooden door.

Step 7

Place windows using glass blocks.

Step 8

Create an interior.

Interior example:

* Bed
* Crafting table
* Furnace
* Two chests
* Torches
* Simple table
* Decorative blocks

Example layout:

#########
#.......#
#.B...C.#
#.......#
#.F.T...#
#.......#
#...D...#
#########

Legend:

# = Wall

B = Bed

C = Chest

F = Furnace

T = Crafting Table

D = Door

Step 9

Place torches on walls to maintain sufficient light and prevent hostile mob spawning inside.

Step 10

Expand the shelter over time by adding:

* Additional storage
* Second floor
* Farm
* Animal pen
* Mine entrance
* Defensive wall
* Watchtower
* Decorative furniture

---

# Interaction Philosophy

The player should always feel physically connected to the world.

Every interaction follows the same general pattern:

Player Input

↓

Camera Raycast

↓

Target Identification

↓

Interaction Validation

↓

Game Logic

↓

World Update

↓

Chunk Update

↓

Physics Update

↓

Rendering Update

This consistent interaction pipeline ensures all gameplay systems—breaking blocks, placing blocks, opening containers, using tools, interacting with NPCs, sleeping, or activating mechanisms—share a predictable and maintainable implementation model.

This level of detail gives a coding LLM enough information to implement the player controller, interaction system, and core gameplay loop without having to infer how a Minecraft-like game is supposed to behave.

--

# MOBILE

What works well

A browser-based voxel game can support:

Walking around a 3D world
Looking around with touch gestures
Breaking and placing blocks
Building structures
Opening inventories and containers
Basic crafting
Single-player worlds
Moderate render distances (e.g. 4–8 chunks)

With a well-optimized engine (greedy meshing, frustum culling, asynchronous chunk generation, texture atlases), modern iPhones can provide a smooth experience.

The biggest challenge: controls

Desktop Minecraft effectively uses:

WASD
Mouse movement
Left click
Right click
Shift
Space
Number keys
E
Q
F
Scroll wheel

None of those exist on an iPhone.

Instead, use a touch-first control scheme:

Left thumb

Virtual joystick for movement

Right thumb

Swipe to look around

Context buttons

Jump
Sneak
Sprint
Interact
Inventory

Tap on a block

Select it

Hold on a block

Break it

Tap an adjacent face

Place the selected block

A bottom hotbar (8–10 slots) works well, with tap-to-select and long-press for additional options.

Interaction design

Avoid mapping every desktop action directly. Instead, make interactions contextual.

For example:

Looking at a chest + tapping "Interact" opens it.
Looking at a bed + tapping "Interact" sleeps.
Looking at a villager + tapping "Interact" starts trading.
Looking at a crafting table + tapping "Interact" opens the crafting UI.

The player doesn't need separate keys for every action.

Performance considerations

Mobile browsers have tighter CPU, GPU, and memory budgets. Design with these in mind:

Keep chunk sizes modest (e.g. 16×16×128).
Generate terrain in background workers.
Use greedy meshing to minimize geometry.
Batch draw calls aggressively.
Limit render distance on mobile.
Pause or reduce updates for distant entities.
Mobile-specific UI

The UI should adapt to touch:

Larger buttons and touch targets.
Simplified inventory grids.
Drag-and-drop item movement.
Crafting recipes selectable with taps rather than arranging every ingredient manually (optionally offering both modes).
Browser limitations

The main limitations are browser APIs rather than hardware:

Persistent storage quotas vary by browser.
Background execution is limited.
Memory limits are lower than on desktop.
Some advanced graphics features may not be available uniformly across browsers.

Despite that, a browser game can still provide a substantial experience.

Recommended architecture

Treat mobile as a first-class platform rather than an afterthought. Structure input like this:

Input Layer
    │
    ├── Keyboard + Mouse
    ├── Touch
    ├── Gamepad
    └── Future XR
           │
           ▼
Unified Player Commands
    ├── Move
    ├── Look
    ├── Jump
    ├── Break Block
    ├── Place Block
    ├── Interact
    ├── Open Inventory
    └── Select Hotbar Slot

The rest of the game should only consume these high-level commands, making it easy to support desktop, mobile, and game controllers without changing gameplay logic.

Overall, a browser-based Minecraft-like game can absolutely run meaningfully on iPhone Safari or Chrome, but it should feel like a touch-native voxel game rather than a desktop game squeezed onto a phone. Designing the input and UI around touch from the outset will produce a much better experience than trying to emulate keyboard-and-mouse controls.

--

I actually think this is one of the most important things to explain to the coding LLM. Since it can't "see" the screenshot, you want to describe **why the current implementation feels wrong** and **what the expected player experience should be**.

I'd add something like this to your design document:

---

# Camera Modes and Player Visibility

The game supports both first-person and third-person camera modes.

## First-Person Mode (Default)

First-person is the primary gameplay mode.

The player's body is **not rendered** (or only the held item/tool is rendered).

The player sees:

* World
* Crosshair
* Held tool or block
* HUD
* Hotbar

The player should **never see their own torso, head, or legs** in normal gameplay.

Reason:

Building, mining, placing blocks, and interacting with the world require an unobstructed view.

Example:

The player looks directly at a dirt block.

The center crosshair is positioned on the block.

Only the currently equipped pickaxe or block appears in the lower-right portion of the screen.

Nothing blocks the center of the screen.

This is the preferred mode for:

* Mining
* Building
* Combat
* Exploring caves
* Opening containers
* Crafting

---

## Third-Person Mode

Third-person is optional.

It is intended for:

* Watching the character
* Taking screenshots
* Multiplayer
* Navigation
* Admiring skins

The camera is positioned approximately:

* 3–5 blocks behind the player
* 1–2 blocks above the player

The player model is fully visible.

The camera automatically moves closer if an obstacle blocks the view.

The player may switch between:

* First-person
* Third-person behind
* Third-person front (optional)

---

# Current Issue

The current implementation places the camera behind the player by default.

This causes the player's body to occupy approximately 20–30% of the screen.

The body blocks the crosshair area while:

* Breaking blocks
* Placing blocks
* Looking downward
* Building walls
* Mining

This makes precise interaction difficult.

This is **not** the desired default gameplay experience.

---

# Desired Camera Behavior

Default camera:

```text
Camera (eye position)
      |
      V
+----------------------+
|                      |
|        Crosshair     |
|                      |
|                      |
|                      |
|    Pickaxe only      |
+----------------------+
```

The player should not see:

* Head
* Shoulders
* Torso
* Legs

Only the held tool should be visible.

---

# Held Item Rendering

Instead of rendering the entire player model, render only the equipped item.

Examples:

Holding nothing

Nothing appears.

Holding a pickaxe

The pickaxe appears in the lower-right corner.

Holding a torch

The torch appears in the lower-right corner.

Holding dirt

A dirt block appears in the lower-right corner.

The held item:

* Is not part of the world
* Is rendered in screen space
* Uses a slightly different field of view
* Does not collide with the environment
* Has simple swing animations

---

# Breaking Blocks

The player aims using a fixed crosshair at the center of the screen.

Interaction sequence:

Player rotates camera

↓

Crosshair points at a block

↓

Raycast identifies the block

↓

Block outline is displayed

↓

Player holds Break

↓

Mining progress increases

↓

Block breaks

↓

Item drops

↓

Held tool plays a swing animation

The player's body should never obscure the targeted block.

---

# Placing Blocks

The player selects a block from the hotbar.

The raycast determines which face of the targeted block is selected.

A placement preview may optionally be shown.

When Place is pressed:

* The adjacent empty voxel is filled.
* The new block appears immediately.
* The chunk mesh updates.
* A placement sound plays.

Again, only the held block/tool animates—the player's body remains hidden in first-person.

---

# Mobile Considerations

On mobile, first-person is even more important because the screen is smaller.

Any body geometry in the center of the screen significantly reduces precision.

Therefore:

* First-person should be the default.
* Third-person should be available as a toggle.
* All building and mining interactions should be optimized for first-person.

---

### Looking at your screenshot specifically

From your screenshot, I'd tell the coding LLM:

> The player camera is currently positioned behind the player model, creating a third-person view. This is incorrect for the default gameplay. The player's torso occupies the center of the screen and obstructs interaction with the world. Change the default to a first-person camera positioned at the player's eye height (approximately 1.62 blocks above the feet). Do not render the player body in first-person. Instead, render only the currently equipped item (pickaxe, axe, block, torch, etc.) in the lower-right corner with a simple swing animation. Keep the third-person camera as an optional mode that can be toggled for exploration or viewing the character.

I think this single change would make your prototype immediately feel much closer to Minecraft and much more comfortable for building and mining.

