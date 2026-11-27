import { describe, it, expect, vi, beforeEach } from 'vitest';

// registerSW() is called from boot(), which runs after dynamic imports – by then
// the window 'load' event has usually fired, so it must register immediately.
describe('registerSW', () => {
  let register;
  let listeners;
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('DEV', false);
    register = vi.fn(() => Promise.resolve());
    listeners = {};
    vi.stubGlobal('navigator', { serviceWorker: { register }, userAgent: '' });
    vi.stubGlobal('window', { addEventListener: (type, fn) => { listeners[type] = fn; }, matchMedia: () => ({ matches: false }) });
  });

  it('registers immediately when the page has already loaded', async () => {
    vi.stubGlobal('document', { readyState: 'complete' });
    const { registerSW } = await import('../../src/core/install.js');
    registerSW();
    expect(register).toHaveBeenCalledWith('./sw.js');
  });

  it('waits for the load event while the page is still loading', async () => {
    vi.stubGlobal('document', { readyState: 'loading' });
    const { registerSW } = await import('../../src/core/install.js');
    registerSW();
    expect(register).not.toHaveBeenCalled();
    listeners.load();
    expect(register).toHaveBeenCalledWith('./sw.js');
  });
});
