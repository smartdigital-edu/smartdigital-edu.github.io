import { defineConfig } from 'vite';
import { APPS } from './src/apps/meta.js';

/**
 * One codebase, two build targets. Pick the app with the APP env variable:
 *   APP=kiddora vite build      -> dist/kiddora
 *   APP=grammarhub vite build   -> dist/grammarhub
 * `base: './'` keeps every URL relative so the output works under any
 * GitHub Pages sub-path (e.g. /KIDDORA/ or /Grammarhub./).
 */
export default defineConfig(() => {
  const app = process.env.APP || 'kiddora';
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
    ],
    test: {
      include: ['tests/unit/**/*.test.js'],
      environment: 'node',
    },
  };
});
