/**
 * Audio: speech (Web Speech API), optional pre-recorded MP3s and
 * synthesised feedback sounds (Web Audio, so no sound files are required).
 */
import { store } from './storage.js';
import { speechLang, getLang } from './i18n/index.js';

let enabled = store.get('sound', true);
let ctx;
const listeners = new Set();

export const isSoundOn = () => enabled;
export function setSound(on) {
  enabled = !!on;
  store.set('sound', enabled);
  if (!enabled) stopSpeaking();
  listeners.forEach((fn) => fn(enabled));
}
export const onSoundChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

/* ---------------- speech ---------------- */
let voices = [];
function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  voices = window.speechSynthesis.getVoices();
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function pickVoice(lang) {
  const base = lang.slice(0, 2);
  return voices.find((v) => v.lang === lang)
    || voices.find((v) => v.lang?.startsWith(base))
    // Indonesian voices pronounce Malay text reasonably when no ms voice exists.
    || (base === 'ms' ? voices.find((v) => v.lang?.startsWith('id')) : null)
    || null;
}

/*
 * Speech queue. Chrome (macOS especially) jams – reports speaking=true but
 * stays silent – if cancel() hits an utterance that is still starting up, and
 * often drops a speak() issued right after cancel(). So:
 *  - never cancel an utterance before its 'start' event; a newer request waits
 *    for that start (usually < 0.5 s) and then replaces it
 *  - wait 150 ms after a cancel before speaking again
 *  - speak synchronously when nothing is playing (iOS needs the tap's call stack)
 *  - keep a reference to the utterance (Chrome can garbage-collect it mid-speech)
 */
let cur = null;      // { u, started, done, resolve, killOnStart }
let queued = null;   // newest waiting request { text, lang, rate, resolve }
let lastCancelAt = 0;
let pumpTimer = null;

function cancelCurrent() {
  if (!cur) return;
  const c = cur;
  cur = null;
  if (!c.done) { c.done = true; c.resolve(); }
  // Record the time BEFORE cancel(): it can fire onerror synchronously, re-entering pump().
  if (c.started) { lastCancelAt = Date.now(); window.speechSynthesis.cancel(); }
  else c.killOnStart = true; // cancel the moment it starts, never before
}

export function stopSpeaking() {
  if (queued) { queued.resolve(); queued = null; }
  clearTimeout(pumpTimer);
  if ('speechSynthesis' in window) cancelCurrent();
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
}

let currentAudio = null;

/**
 * Speak text aloud. If `audioSrc` is given (e.g. "audio/apple.mp3" in /public),
 * the MP3 is played instead and speech is used only if the file fails.
 * Resolves when finished, replaced, or immediately if sound is off.
 */
export function speak(text, { lang = getLang(), audioSrc, rate = 0.85 } = {}) {
  if (!enabled || !text) return Promise.resolve();
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if (audioSrc) {
    stopSpeaking();
    return new Promise((resolve) => {
      const a = new Audio(audioSrc);
      currentAudio = a;
      a.onended = () => resolve();
      a.onerror = () => { currentAudio = null; tts(text, lang, rate).then(resolve); };
      a.play().catch(() => { tts(text, lang, rate).then(resolve); });
    });
  }
  return tts(text, lang, rate);
}

function tts(text, lang, rate) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return resolve();
    if (queued) queued.resolve(); // superseded before it even started
    queued = { text, lang, rate, resolve };
    pump();
  });
}

function pump() {
  clearTimeout(pumpTimer);
  if (!queued) return;
  const s = window.speechSynthesis;
  if (cur && !cur.done && !cur.started) return; // wait for its start (see above)
  if (cur) cancelCurrent();
  const wait = 150 - (Date.now() - lastCancelAt);
  if (wait > 0) { pumpTimer = setTimeout(pump, wait); return; }

  const { text, lang, rate, resolve } = queued;
  queued = null;
  if (!voices.length) loadVoices();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = speechLang(lang);
  const v = pickVoice(u.lang);
  if (v) u.voice = v;
  u.rate = rate;
  u.pitch = 1.05;
  const c = { u, started: false, done: false, resolve, killOnStart: false };
  cur = c;
  const finish = () => {
    if (!c.done) { c.done = true; resolve(); }
    if (cur === c) cur = null;
    pump();
  };
  u.onstart = () => {
    c.started = true;
    if (c.killOnStart) { lastCancelAt = Date.now(); s.cancel(); return; }
    pump(); // a newer request may have been waiting for this start
  };
  u.onend = finish;
  u.onerror = finish;
  if (s.paused) s.resume();
  s.speak(u);
  // If it never starts, stop waiting on it (but don't cancel: that jams Chrome).
  setTimeout(() => { if (!c.started) finish(); }, 2500);
  // Safety: some browsers never fire onend.
  setTimeout(finish, 2500 + Math.min(8000, 900 + text.length * 90));
}

/* ---------------- feedback sounds ---------------- */
function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, type = 'sine', gain = 0.18) {
  const c = audioCtx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.05);
}

export const sfx = {
  correct() { if (!enabled) return; tone(660, 0, 0.12); tone(880, 0.1, 0.18); tone(1175, 0.22, 0.25); },
  wrong() { if (!enabled) return; tone(220, 0, 0.18, 'triangle', 0.2); tone(180, 0.16, 0.25, 'triangle', 0.2); },
  tap() { if (!enabled) return; tone(520, 0, 0.06, 'sine', 0.08); },
  pop() { if (!enabled) return; tone(900, 0, 0.05, 'square', 0.06); tone(400, 0.04, 0.08, 'sine', 0.1); },
  win() { if (!enabled) return; [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3)); },
};
