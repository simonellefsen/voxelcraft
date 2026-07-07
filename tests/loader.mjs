// ESM loader: redirect the three.js CDN URL to the local stub so the game
// can boot under Node for testing (no browser / network required).
import { pathToFileURL, fileURLToPath } from 'url';

const STUB = new URL('./three-stub.mjs', import.meta.url).href;

export async function resolve(specifier, context, next) {
  if (specifier.includes('three@0.160.0')) {
    return { url: STUB, shortCircuit: true };
  }
  return next(specifier, context);
}
