/** "Add to Home Screen": captures Android's beforeinstallprompt; detects iOS. */
let deferred = null;
const listeners = new Set();

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e;
  listeners.forEach((fn) => fn(true));
});
window.addEventListener('appinstalled', () => { deferred = null; listeners.forEach((fn) => fn(false)); });

export const canPrompt = () => !!deferred;
export const onInstallAvailable = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  return outcome === 'accepted';
}

/** Register the service worker (production builds only). */
export function registerSW() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  const register = () => navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW registration failed', e));
  // boot() runs after dynamic imports, so 'load' has usually already fired.
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
