import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/* Recorded clips and the browser's "tap first" rule (autoplay policy). */
let listeners;
let allowed;
let played;

class FakeAudio {
  play() {
    played.push(this.src);
    if (!allowed) { const e = new Error('blocked'); e.name = 'NotAllowedError'; return Promise.reject(e); }
    setTimeout(() => { this.onplaying?.(); setTimeout(() => this.onended?.(), 10); }, 1);
    return Promise.resolve();
  }
  pause() {}
}

let audio;
beforeEach(async () => {
  vi.resetModules();
  listeners = {}; allowed = false; played = [];
  vi.stubGlobal('window', {
    speechSynthesis: { speak() { throw new Error('device voice should not be tried'); }, cancel() {}, getVoices: () => [] },
    addEventListener: (t, fn) => { (listeners[t] ||= new Set()).add(fn); },
    removeEventListener: (t, fn) => listeners[t]?.delete(fn),
  });
  vi.stubGlobal('Audio', FakeAudio);
  audio = await import('../../src/core/audio.js');
});
afterEach(() => vi.unstubAllGlobals());

const tap = () => { allowed = true; [...(listeners.pointerdown || [])].forEach((fn) => fn()); };

describe('recorded clips before and after the first tap', () => {
  it("resolves 'blocked' (and doesn't fall back to the device voice) before any tap", async () => {
    expect(await audio.speak('Hi', { audioSrc: 'a.mp3' })).toBe('blocked');
  });
  it('plays after a tap, on the same shared element the tap unlocked', async () => {
    tap();
    expect(played[0]).toMatch(/^data:audio\/wav/); // silent unlock clip
    const started = vi.fn();
    expect(await audio.speak('Hi', { audioSrc: 'a.mp3', onStart: started })).toBeUndefined();
    expect(played.at(-1)).toBe('a.mp3');
    expect(started).toHaveBeenCalledWith('audio');
  });
  it('onNextTap runs once, on the next tap', () => {
    const fn = vi.fn();
    audio.onNextTap(fn);
    tap(); tap();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
