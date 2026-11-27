/** Entry point. __APP__ is injected by vite.config.js (kiddora | grammarhub). */
import './core/styles/base.css';

// The constant condition lets the bundler drop the other app's code entirely.
const appConfig = __APP__ === 'grammarhub'
  ? import('./apps/grammarhub/config.js')
  : import('./apps/kiddora/config.js');

Promise.all([appConfig, import('./core/app.js')]).then(([cfg, app]) => app.boot(cfg.default));
