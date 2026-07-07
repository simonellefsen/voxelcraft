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
global.document = {
  getElementById: () => fakeEl(),
  querySelector: () => fakeEl(),
  createElement: () => fakeEl(),
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
} catch (e) {
  console.error('BOOT FAIL:', e);
  process.exit(1);
}
