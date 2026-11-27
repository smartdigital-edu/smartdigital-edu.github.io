import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/*
 * Fake speech engine that behaves like Chrome on macOS:
 *  - an utterance takes START_MS to start, then SPEAK_MS to finish
 *  - cancel() before the current utterance has started JAMS the engine
 *    (speaking stays true, nothing is ever heard again) – the real bug
 *  - speak() within 100 ms of a cancel() is silently dropped
 */
const START_MS = 600;
const SPEAK_MS = 800;

function fakeEngine() {
  const engine = {
    heard: [], jammed: false, speaking: false, pending: false, paused: false,
    queue: [], current: null, lastCancel: -1e9,
    getVoices: () => [{ name: 'Daniel', lang: 'en-GB' }],
    resume() { engine.paused = false; },
    speak(u) {
      if (engine.jammed) return;
      if (Date.now() - engine.lastCancel < 100) return; // dropped
      engine.queue.push(u);
      engine.next();
    },
    next() {
      if (engine.current || !engine.queue.length) return;
      const u = engine.queue.shift();
      engine.current = { u, started: false };
      engine.speaking = true;
      const c = engine.current;
      c.t1 = setTimeout(() => {
        c.started = true;
        c.t2 = setTimeout(() => {
          engine.heard.push(u.text);
          engine.current = null; engine.speaking = false;
          u.onend?.();
          engine.next();
        }, SPEAK_MS);
        u.onstart?.(); // may cancel right here
      }, START_MS);
    },
    cancel() {
      engine.lastCancel = Date.now();
      const c = engine.current;
      if (c && !c.started) { engine.jammed = true; clearTimeout(c.t1); return; } // the Chrome bug
      if (c) { clearTimeout(c.t2); engine.current = null; engine.speaking = false; c.u.onerror?.({ error: 'interrupted' }); }
      engine.queue.forEach((u) => u.onerror?.({ error: 'canceled' }));
      engine.queue = [];
    },
  };
  return engine;
}

let engine;
let audio;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  engine = fakeEngine();
  vi.stubGlobal('window', { speechSynthesis: engine, addEventListener() {} });
  vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(text) { this.text = text; } });
  audio = await import('../../src/core/audio.js');
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('speech queue (Chrome jam protection)', () => {
  it('speaks a single phrase', async () => {
    audio.speak('A for Apple', { lang: 'en' });
    await vi.advanceTimersByTimeAsync(3000);
    expect(engine.heard).toEqual(['A for Apple']);
  });

  it('tile title then card speech (the Learn ABC case) never jams', async () => {
    audio.speak('Learn ABC', { lang: 'en' });          // tap on the activity tile
    await vi.advanceTimersByTimeAsync(20);
    audio.speak('A for Apple', { lang: 'en' });        // card opens and speaks at once
    await vi.advanceTimersByTimeAsync(4000);
    expect(engine.jammed).toBe(false);
    expect(engine.heard.at(-1)).toBe('A for Apple');
  });

  it('rapid Listen taps never jam and the last one is heard', async () => {
    for (let i = 0; i < 5; i += 1) {
      audio.speak('A for Apple', { lang: 'en' });
      await vi.advanceTimersByTimeAsync(90);
    }
    await vi.advanceTimersByTimeAsync(4000);
    expect(engine.jammed).toBe(false);
    expect(engine.heard).toContain('A for Apple');
  });

  it('Next during speech replaces it with the new card', async () => {
    audio.speak('A for Apple', { lang: 'en' });
    await vi.advanceTimersByTimeAsync(START_MS + 100);  // A has started
    audio.speak('B for Ball', { lang: 'en' });
    await vi.advanceTimersByTimeAsync(4000);
    expect(engine.jammed).toBe(false);
    expect(engine.heard).toEqual(['B for Ball']);
  });

  it('stopSpeaking during start-up does not jam; later speech still works', async () => {
    audio.speak('A for Apple', { lang: 'en' });
    await vi.advanceTimersByTimeAsync(50);
    audio.stopSpeaking();                                // e.g. leaving the screen
    await vi.advanceTimersByTimeAsync(2000);
    expect(engine.jammed).toBe(false);
    audio.speak('B for Ball', { lang: 'en' });
    await vi.advanceTimersByTimeAsync(3000);
    expect(engine.heard).toEqual(['B for Ball']);
  });

  it('speaks synchronously when idle (iOS needs speak() inside the tap)', () => {
    const spy = vi.spyOn(engine, 'speak');
    audio.speak('A for Apple', { lang: 'en' });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('promises resolve even when superseded', async () => {
    const first = audio.speak('one', { lang: 'en' });
    const second = audio.speak('two', { lang: 'en' });
    await vi.advanceTimersByTimeAsync(5000);
    await expect(first).resolves.toBeUndefined();
    await expect(second).resolves.toBeUndefined();
  });
});
