// engine/audio.js
// Procedural Web Audio: ambient music, mining/placing SFX, creeper hiss and
// explosion, plus the red damage flash. No external audio files.

let audioCtx = null, musicGain = null, sfxGain = null;
let musicOn = true, musicRunning = false, musicTimer = null, musicStep = 0;

/** Lazily creates / resumes the AudioContext (must follow a user gesture). */
export function initAudio() {
  if (audioCtx) { audioCtx.resume && audioCtx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AC();
  musicGain = audioCtx.createGain(); musicGain.gain.value = 0.22; musicGain.connect(audioCtx.destination);
  sfxGain = audioCtx.createGain(); sfxGain.gain.value = 0.5; sfxGain.connect(audioCtx.destination);
}

export function isMusicOn() { return musicOn; }
export function setMusicOn(v) { musicOn = v; }
export function toggleMusic() { musicOn = !musicOn; return musicOn; }

const PENTA = [0, 2, 4, 7, 9]; // major pentatonic

function playTone(freq, time, dur, gainNode) {
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'triangle'; o.frequency.value = freq;
  o.connect(g); g.connect(gainNode);
  g.gain.setValueAtTime(0.0001, time);
  g.gain.linearRampToValueAtTime(0.9, time + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  o.start(time); o.stop(time + dur + 0.05);
}

function musicTick() {
  if (!musicOn || !audioCtx) { musicRunning = false; return; }
  const t = audioCtx.currentTime + 0.06;
  const beat = musicStep % 8;
  const deg = PENTA[(musicStep * 3) % PENTA.length];
  const oct = (beat % 2 === 0) ? 1 : 0.5;
  playTone(220 * Math.pow(2, deg / 12) * oct, t, 0.42, musicGain);
  if (beat % 4 === 0) playTone(110, t, 0.9, musicGain); // soft bass
  musicStep++;
  musicTimer = setTimeout(musicTick, 300);
}

export function startMusic() { if (musicRunning) return; musicRunning = true; musicTick(); }
export function stopMusic() { musicRunning = false; if (musicTimer) clearTimeout(musicTimer); }

export function playMine() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const n = Math.floor(audioCtx.sampleRate * 0.15);
  const buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
  const src = audioCtx.createBufferSource(); src.buffer = buf;
  const bp = audioCtx.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 1400;
  const g = audioCtx.createGain(); g.gain.value = 0.7;
  src.connect(bp); bp.connect(g); g.connect(sfxGain);
  src.start(t); src.stop(t + 0.15);
  const o = audioCtx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.12);
  const og = audioCtx.createGain(); og.gain.setValueAtTime(0.5, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
  o.connect(og); og.connect(sfxGain); o.start(t); o.stop(t + 0.16);
}

export function playPlace() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator(); o.type = 'square';
  o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(180, t + 0.07);
  const g = audioCtx.createGain(); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t + 0.1);
}

export function playHiss() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const n = Math.floor(audioCtx.sampleRate * 0.4);
  const buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = audioCtx.createBufferSource(); src.buffer = buf;
  const bp = audioCtx.createBiquadFilter(); bp.type = 'highpass'; bp.frequency.value = 3000;
  const g = audioCtx.createGain(); g.gain.value = 0.3;
  src.connect(bp); bp.connect(g); g.connect(sfxGain);
  src.start(t); src.stop(t + 0.4);
}

export function playExplosion() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const n = Math.floor(audioCtx.sampleRate * 0.6);
  const buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 1.5);
  const src = audioCtx.createBufferSource(); src.buffer = buf;
  const lp = audioCtx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 800;
  const g = audioCtx.createGain(); g.gain.value = 0.9;
  src.connect(lp); lp.connect(g); g.connect(sfxGain);
  src.start(t); src.stop(t + 0.6);
  const o = audioCtx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.5);
  const og = audioCtx.createGain(); og.gain.setValueAtTime(0.8, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  o.connect(og); og.connect(sfxGain); o.start(t); o.stop(t + 0.6);
}

const flashEl = document.getElementById('flash');
/** Briefly flashes the screen red (used by damage and explosions). */
export function flashScreen() {
  if (!flashEl) return;
  flashEl.style.opacity = '0.55';
  setTimeout(() => { flashEl.style.opacity = '0'; }, 120);
}

/** Short percussive "hit" used for melee mob attacks. */
export function playHit() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator(); o.type = 'square';
  o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.12);
  const g = audioCtx.createGain(); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t + 0.15);
}

/** Soft "twang" for a bow/arrow shot. */
export function playShoot() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator(); o.type = 'triangle';
  o.frequency.setValueAtTime(600, t); o.frequency.exponentialRampToValueAtTime(200, t + 0.1);
  const g = audioCtx.createGain(); g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t + 0.13);
}
