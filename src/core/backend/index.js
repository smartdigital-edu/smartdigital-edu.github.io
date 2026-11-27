/** Chooses the Firebase backend, or the on-device demo backend when not configured. */
import { DEMO_MODE } from '../config.js';

let backendPromise;
export function getBackend() {
  backendPromise ||= (DEMO_MODE ? import('./local.js') : import('./firebase.js')).then((m) => m.backend);
  return backendPromise;
}
