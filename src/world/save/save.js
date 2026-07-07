// world/save/save.js
// Binary, chunk-indexed save system (DESIGN.md "Save System"). Each chunk is
// run-length encoded into a single ArrayBuffer (blocks + sky + block light),
// so saving/loading is a map of "cx,cz" -> buffer. Browser persistence uses
// IndexedDB (feature-detected); the encode/decode core is pure and unit-tested
// in Node without a browser.

import { CHUNK, SY } from '../../core/config.js';
import { Chunk, ChunkState, World } from '../world.js';

const SIZE = CHUNK * SY * CHUNK;
const MAGIC0 = 0x56, MAGIC1 = 0x43, VERSION = 1;

/** RLE-encodes an integer array into a flat [value, count, value, count, ...] list. */
function rle(arr) {
  const out = [];
  let i = 0;
  while (i < arr.length) {
    const v = arr[i];
    let c = 1;
    while (i + c < arr.length && arr[i + c] === v && c < 65535) c++;
    out.push(v, c);
    i += c;
  }
  return out;
}

/**
 * Serialises a chunk to a binary ArrayBuffer.
 * @param {Chunk} chunk
 * @returns {ArrayBuffer}
 */
export function encodeChunk(chunk) {
  const bPairs = rle(chunk.data);
  const sPairs = rle(chunk.sky || new Uint8Array(SIZE));
  const lPairs = rle(chunk.blk || new Uint8Array(SIZE));
  const header = 2 + 1 + 2 + 2 + 4 + 4 + 4; // magic, version, cx, cz, 3x lengths
  const byteLen = header + (bPairs.length + sPairs.length + lPairs.length) * 2;
  const buf = new ArrayBuffer(byteLen);
  const dv = new DataView(buf);
  let o = 0;
  dv.setUint8(o, MAGIC0); o += 1;
  dv.setUint8(o, MAGIC1); o += 1;
  dv.setUint8(o, VERSION); o += 1;
  dv.setInt16(o, chunk.cx, true); o += 2;
  dv.setInt16(o, chunk.cz, true); o += 2;
  dv.setUint32(o, bPairs.length / 2, true); o += 4;
  dv.setUint32(o, sPairs.length / 2, true); o += 4;
  dv.setUint32(o, lPairs.length / 2, true); o += 4;

  const writePairs = (pairs, isByte) => {
    for (let i = 0; i < pairs.length; i += 2) {
      if (isByte) dv.setUint8(o, pairs[i]); else dv.setUint16(o, pairs[i], true);
      o += isByte ? 1 : 2;
      dv.setUint16(o, pairs[i + 1], true); o += 2;
    }
  };
  writePairs(bPairs, false);
  writePairs(sPairs, true);
  writePairs(lPairs, true);
  return buf;
}

/**
 * Decodes a chunk ArrayBuffer produced by encodeChunk.
 * @returns {{cx:number, cz:number, data:Uint16Array, sky:Uint8Array, blk:Uint8Array}}
 */
export function decodeChunk(buf) {
  const dv = new DataView(buf);
  let o = 0;
  const m0 = dv.getUint8(o); o += 1;
  const m1 = dv.getUint8(o); o += 1;
  if (m0 !== MAGIC0 || m1 !== MAGIC1) throw new Error('bad chunk magic');
  o += 1; // version
  const cx = dv.getInt16(o, true); o += 2;
  const cz = dv.getInt16(o, true); o += 2;
  const bLen = dv.getUint32(o, true); o += 4;
  const sLen = dv.getUint32(o, true); o += 4;
  const lLen = dv.getUint32(o, true); o += 4;

  const data = new Uint16Array(SIZE);
  const sky = new Uint8Array(SIZE);
  const blk = new Uint8Array(SIZE);

  const readPairs = (count, target, isByte) => {
    for (let i = 0; i < count; i++) {
      const v = isByte ? dv.getUint8(o) : dv.getUint16(o, true); o += isByte ? 1 : 2;
      const c = dv.getUint16(o, true); o += 2;
      for (let k = 0; k < c && oIdx < target.length; k++) target[oIdx++] = v;
    }
  };
  let oIdx = 0;
  readPairs(bLen, data, false);
  oIdx = 0; readPairs(sLen, sky, true);
  oIdx = 0; readPairs(lLen, blk, true);
  return { cx, cz, data, sky, blk };
}

function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open('voxelcraft', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('chunks', { keyPath: 'key' });
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

/**
 * Persists all loaded chunks to IndexedDB. No-op outside the browser.
 * @param {World} world
 * @returns {Promise<boolean>} true if anything was saved
 */
export async function persistWorld(world) {
  if (typeof indexedDB === 'undefined') return false;
  const db = await openDB();
  await new Promise((res, rej) => {
    const tx = db.transaction('chunks', 'readwrite');
    const store = tx.objectStore('chunks');
    for (const c of world.chunks.values()) {
      store.put({ key: World.key(c.cx, c.cz), buf: encodeChunk(c) });
    }
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  db.close();
  return true;
}

/**
 * Restores previously saved chunks into `world` (skipping regeneration).
 * @param {World} world
 * @returns {Promise<number>} count of chunks restored (0 if none / no browser)
 */
export async function restoreWorld(world) {
  if (typeof indexedDB === 'undefined') return 0;
  const db = await openDB();
  const records = await new Promise((res, rej) => {
    const tx = db.transaction('chunks', 'readonly');
    const req = tx.objectStore('chunks').getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror = () => rej(req.error);
  });
  db.close();
  let n = 0;
  for (const rec of records) {
    const d = decodeChunk(rec.buf);
    const c = new Chunk(d.cx, d.cz);
    c.data.set(d.data);
    c.sky = d.sky; c.blk = d.blk;
    c.state = ChunkState.GENERATED;
    world.chunks.set(World.key(d.cx, d.cz), c);
    n++;
  }
  return n;
}
