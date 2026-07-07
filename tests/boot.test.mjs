// Boot test: boots the whole game with a stubbed three.js + DOM to catch
// wiring/runtime errors without a browser. Run: node --loader ./tests/loader.mjs ./tests/boot.test.mjs
const noop = () => {};
function fakeEl() {
  return {
    style: {}, dataset: {}, children: [],
    appendChild() {}, addEventListener() {}, removeEventListener() {},
    setAttribute() {}, focus() {}, classList: { toggle() {}, add() {}, remove() {} },
    set textContent(v) {}, get textContent() { return ''; },
    set innerHTML(v) {}, closest() { return null; },
  };
}
function makeCanvas() {
  const ctx = new Proxy({}, { get: () => (() => {}), set: () => true });
  return { width: 0, height: 0, style: {}, getContext: () => ctx };
}
global.document = {
  getElementById: () => fakeEl(),
  querySelector: () => fakeEl(),
  createElement: (tag) => (tag === 'canvas' ? makeCanvas() : fakeEl()),
  body: fakeEl(),
  addEventListener: noop,
};
global.window = { addEventListener: noop, focus: noop, AudioContext: function () { return fakeAudio(); } };
global.addEventListener = noop;
global.innerWidth = 1280; global.innerHeight = 720; global.devicePixelRatio = 1;
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = noop;

function fakeAudio() {
  return {
    currentTime: 0, sampleRate: 44100, destination: {},
    resume() {}, createGain() { return { gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; },
    createOscillator() { return { type: '', frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; },
    createBuffer() { return { getChannelData: () => new Float32Array(16) }; },
    createBufferSource() { return { buffer: null, connect() {}, start() {}, stop() {} }; },
    createBiquadFilter() { return { type: '', frequency: { value: 0 }, connect() {} }; },
  };
}

try {
  await import('../src/main.js');
  await new Promise(r => setTimeout(r, 50));
  console.log('BOOT OK');

  // Exercise the World edit path: setBlock marks dirty, sync() rebuilds.
  const { world } = await import('../src/world/world.js');
  const { sync } = await import('../src/engine/renderer.js');
  world.loadChunk(0, 0);
  sync(world);
  const before = world.getBlock(10, 10, 10);
  world.setBlock(10, 10, 10, 3);
  if (world.getBlock(10, 10, 10) !== 3) throw new Error('setBlock failed');
  world.setBlock(10, 10, 10, before);
  world.processQueue(8);
  sync(world);
  console.log('WORLD EDIT + STREAM SYNC OK');

  // Benchmark: greedy meshing should produce <= naive triangle count.
  const { buildChunk, buildChunkGreedy } = await import('../src/world/meshing.js');
  world.loadChunk(0, 0);
  const chunk = world.getChunk(0, 0);
  const g1 = buildChunk(world, chunk);
  const g2 = buildChunkGreedy(world, chunk);
  const tris = g => (g && g.index ? g.index.count / 3 : 0);
  const nN = tris(g1.opaque) + tris(g1.transparent);
  const nG = tris(g2.opaque) + tris(g2.transparent);
  console.log(`faces  naive=${nN}  greedy=${nG}`);
  if (nN === 0) throw new Error('naive mesher produced no faces');
  if (nG > nN) throw new Error('greedy produced MORE faces than naive');
  console.log('GREEDY BENCHMARK OK');

  // Crafting: a recipe that needs Wood must succeed when Wood is present and
  // fail when it isn't, consuming inputs and producing the output.
  const { inventory } = await import('../src/game/inventory/playerInventory.js');
  const { RECIPES, canCraft, craft } = await import('../src/world/items/recipes.js');
  const { WOOD } = await import('../src/core/config.js');
  const { WOOD_PICK } = await import('../src/world/items/items.js');
  const woodPick = RECIPES.find(r => r.id === 'wood_pick');
  const countPick = () => inventory.slots.filter(s => s && s.id === WOOD_PICK).length;
  inventory.slots.forEach((_, i) => inventory.clearAt(i));
  const pickBefore = countPick();
  if (canCraft(inventory, woodPick)) throw new Error('should not craft without wood');
  inventory.add(WOOD, 3);
  if (!canCraft(inventory, woodPick)) throw new Error('should craft with wood');
  if (!craft(inventory, woodPick)) throw new Error('craft() failed');
  if (countPick() !== pickBefore + 1) throw new Error('craft did not produce a pickaxe');
  console.log('CRAFTING OK');
} catch (e) {
  console.error('BOOT FAIL:', e);
  process.exit(1);
}
