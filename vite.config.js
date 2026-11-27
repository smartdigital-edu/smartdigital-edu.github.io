import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import { APPS } from './src/apps/meta.js';

/**
 * One codebase, two build targets. Pick the app with the APP env variable:
 *   APP=kiddora vite build      -> dist/kiddora
 *   APP=grammarhub vite build   -> dist/grammarhub
 * `base: './'` keeps every URL relative so the output works under any
 * GitHub Pages sub-path (e.g. /KIDDORA/ or /Grammarhub./).
 */
export default defineConfig(({ mode }) => {
  const app = process.env.APP || 'kiddora';
  const stage = loadEnv(mode, process.cwd(), 'VITE_').VITE_STAGE || '';
  const meta = APPS[app];
  if (!meta) throw new Error(`Unknown APP "${app}". Use one of: ${Object.keys(APPS).join(', ')}`);
  return {
    base: './',
    define: { __APP__: JSON.stringify(app) },
    build: { outDir: `dist/${app}`, emptyOutDir: true, target: 'es2020', chunkSizeWarningLimit: 900 },
    plugins: [
      {
        name: 'app-html',
        // Replace %APP_XXX% placeholders in index.html with app metadata.
        transformIndexHtml(html) {
          return html.replace(/%APP_([A-Z]+)%/g, (_, k) => meta[k.toLowerCase()] ?? '');
        },
      },
      {
        name: 'sw-precache',
        apply: 'build',
        // Inject the app id, a content-based version and the list of built files
        // into the copied public/sw.js so every chunk is cached on install.
        writeBundle({ dir }, bundle) {
          const files = Object.keys(bundle)
            .filter((f) => f !== 'index.html')
            // Fonts ship many unicode subsets; precache only basic Latin, the rest load on demand.
            .filter((f) => !/\.woff2?$/.test(f) || (/-latin-\d+-normal/.test(f) && f.endsWith('.woff2')))
            .sort();
          files.push(`manifest-${app}.webmanifest`, `icons/${app}-180.png`, `icons/${app}-192.png`, `icons/${app}-512.png`);
          // This app's images and audio (public/images|audio/<app>/, e.g. home tiles, Cici's greeting) so it works fully offline.
          const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
          for (const kind of ['images', 'audio']) {
            try { files.push(...walk(join(dir, kind, app)).map((f) => f.slice(dir.length + 1).split('\\').join('/'))); } catch { /* none for this app */ }
          }
          const version = createHash('sha256').update(files.join('\n')).digest('hex').slice(0, 10);
          const swPath = join(dir, 'sw.js');
          const sw = readFileSync(swPath, 'utf8')
            .replace("const APP = 'dev';", `const APP = ${JSON.stringify(stage ? `${app}-${stage}` : app)};`)
            .replace("const VERSION = 'dev';", `const VERSION = ${JSON.stringify(version)};`)
            .replace('const PRECACHE = [];', `const PRECACHE = ${JSON.stringify(files.map((f) => `./${f}`))};`);
          if (!sw.includes(`const VERSION = "${version}"`)) throw new Error('sw-precache: placeholders not found in sw.js');
          writeFileSync(swPath, sw);
        },
      },
    ],
    test: {
      include: ['tests/unit/**/*.test.js'],
      environment: 'node',
    },
  };
});
