// core/three.js
// Robust dynamic loader for three.js from CDN, with fallbacks.
// Exposes the loaded module through getTHREE() so other modules never
// reference an implicit global.

let _THREE = null;

async function loadModule(url) {
  return await import(url);
}

async function loadThree() {
  const cdns = [
    'https://esm.sh/three@0.160.0',
    'https://cdn.jsdelivr.net/npm/three@0.160.0/+esm',
    'https://unpkg.com/three@0.160.0/build/three.module.js',
  ];
  let THREE = null, lastErr;
  for (const u of cdns) {
    try {
      THREE = await loadModule(u);
      if (THREE && THREE.Scene) break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (!THREE || !THREE.Scene) {
    throw new Error('Could not load three.js from any CDN (network blocked?). ' + (lastErr || ''));
  }
  return THREE;
}

/** Load three.js and cache it. Call once during bootstrap. */
export async function initThree() {
  if (_THREE) return _THREE;
  _THREE = await loadThree();
  return _THREE;
}

/** Returns the cached three.js module (throws if not yet initialised). */
export function getTHREE() {
  if (!_THREE) throw new Error('three.js not initialised — call initThree() first');
  return _THREE;
}
