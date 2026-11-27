# Kiddora & Grammar Hub

One mobile-first codebase that powers two installable learning web apps:

| App | Who it is for | Theme |
|---|---|---|
| **Kiddora** | Ages 3–6, bilingual English / Bahasa Melayu early learning (ABC, 123, colours, shapes, animals, body parts, food, transport, jobs, colouring) | bright, playful, Fredoka font |
| **Grammar Hub** | Malaysian primary pupils, KSSR Year 1–6: 13 grammar & spelling topics, 543 questions | blue `#0B63CE`, Nunito font |

Built with **Vite + vanilla JavaScript + plain CSS**, **Firebase Auth + Cloud Firestore**, the **Web Speech API**, **Pointer Events** and **Canvas**. It is a **PWA** (offline, installable, iOS-ready) and deploys to **GitHub Pages** with GitHub Actions.

---

## 1. Run it locally

```bash
npm install
npm run dev               # Kiddora     → http://localhost:5173
npm run dev:grammarhub    # Grammar Hub → http://localhost:5174
```

With no Firebase keys the app runs in **demo mode**: everything is stored in the browser on this device and a yellow banner says so. Demo accounts:

| Email | Password | Role |
|---|---|---|
| `demo@kiddora.test` | `demo123` | user |
| `admin@kiddora.test` | `admin123` | admin (can open **Admin** in the menu) |

```bash
npm test                  # Vitest unit tests (scoring, shuffle, answer checking, content checks)
npx playwright install chromium   # once
npm run e2e               # Playwright smoke test: login → profile → quiz → score in table
npm run build             # builds both apps → dist/kiddora and dist/grammarhub
npm run preview:kiddora   # serve a production build locally (service worker active)
```

## 2. Set up Firebase (real accounts and cloud scores)

1. Go to <https://console.firebase.google.com> → **Add project**.
2. **Build → Authentication → Get started → Email/Password → Enable.**
3. **Build → Firestore Database → Create database** (production mode, region `asia-southeast1` is closest to Malaysia).
4. **Firestore → Rules**: paste the contents of [`firestore.rules`](firestore.rules) and **Publish**
   (or with the Firebase CLI: `npx firebase-tools deploy --only firestore:rules`).
5. **Project settings → Your apps → Web (`</>`)** → register an app → copy the config values into a `.env` file (copy `.env.example`):

   ```ini
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_WHATSAPP_NUMBER=60123456789
   ```

6. **Authentication → Settings → Authorised domains** → add `<your-github-username>.github.io`.
7. **Create the first admin** (one time, in the console):
   - Authentication → Users → **Add user** with your email and a password.
   - Firestore → **Start collection** `allowedEmails` → Document ID = your email **in lower case** → field `role` (string) = `admin`.
8. Log in. Open **☰ → Admin** to add parents/teachers (role `user`). For each new email, also create the account in **Authentication → Users → Add user** (any temporary password), then tell them to tap **Forgot password?** on the login screen to set their own.

> The Firebase web config is not secret – it ships to every browser. Security comes from `firestore.rules` (only allow-listed emails, only your own data, admin-only allowlist writes).

### Data model

```
allowedEmails/{email}                         { role: 'user' | 'admin', addedAt }
users/{uid}                                   { email, lastLogin }
users/{uid}/profiles/{profileId}              { name, avatar, level, app, createdAt }
users/{uid}/profiles/{profileId}/attempts/{id} { app, module, activity, title, score, correct, total, duration, timestamp }
```

Offline: Firestore's persistent cache (IndexedDB) keeps profiles and scores available offline and queues new attempts; they sync automatically when the device is back online. The service worker precaches the app shell and every activity's code and content on first visit, so the whole app works offline afterwards. Each build gets a new cache version, and old caches are deleted automatically.

## 3. Add or edit content (no code changes)

All learning content is JSON in `src/content/`.

**Kiddora** – `src/content/kiddora/*.json`. Add an item and every activity that uses that file picks it up:

```jsonc
// animals.json → appears in Learn, Match (shadows), Find, and (if listed in "halves") Complete the Animal
{ "id": "owl", "emoji": "🦉", "category": "jungle", "en": "owl", "ms": "burung hantu",
  "info": { "en": "An owl hunts at night.", "ms": "Burung hantu memburu pada waktu malam." } }
```

Other files: `alphabet.json` (letters + spelling words per language), `numbers.json`, `colours.json`, `body.json` (incl. figure label positions), `food.json`, `transport.json`, `shapes.json` (SVG paths), `jobs.json`, `syllables.json` (Bijak Suku Kata), `colouring.json` (outline SVG paths + palette).

**Grammar Hub** – one file per topic in `src/content/grammarhub/<topic>.json`:

```jsonc
{
  "id": "nouns", "title": "Nouns",
  "lesson": { "intro": "...", "points": ["..."], "examples": [{ "text": "The [[cat]] sleeps.", "note": "..." }], "tip": "..." },
  "questions": [
    { "id": "nouns-046", "type": "fill", "year": 2, "prompt": "Choose the correct word to complete the sentence.",
      "sentence": "We buy fish at the ___.", "options": ["market", "happy", "run"], "answer": "market",
      "explanation": "A market is a place, so it is a noun." }
  ]
}
```

Question types: `mc` (multiple choice), `fill` (sentence with `___`), `spot` (`sentence` + wrong word in `answer` + `correction`), `spelling` (`word`, `hint`, optional `audio`), `build` (`answer` = the full sentence). `year` (1–6) filters questions by the learner's level. `[[word]]` highlights a word.

The banks were generated from the compact tables in `scripts/build-grammar.mjs` (`npm run content:grammar`); you can keep using that script **or** edit the JSON directly – but not both, since running the script overwrites the JSON. `npm test` checks every bank (≥ 40 questions, answer in options, explanation present, no placeholder text).

## 4. Environments and deployment

| | Development / staging | Production |
|---|---|---|
| Git branch | `dev` | `main` (protected: changes arrive by pull request from `dev`, tests must pass) |
| Website | https://smartdigital-edu.github.io/staging/ (purple **TEST SITE** banner) | https://smartdigital-edu.github.io/ |
| Firebase project | `kiddora-grammarhub-dev` | `kiddora-grammarhub` |
| Local `npm run dev` | uses `.env` → dev project | never |

**Workflow for a change**

1. Commit to `dev` and push → tests run → staging site updates (~3 min).
2. Check it on staging (phone, both languages). `npm run check:staging` runs an automated end-to-end check against the deployed staging site using the dev test accounts in `.env.test` (git-ignored; `TEST_PARENT_EMAIL`, `TEST_OUTSIDER_EMAIL`, `TEST_PASSWORD`; the parent must be on the dev allowlist).
3. Release: open a pull request `dev → main` (`gh pr create -B main -H dev`), wait for the tests, merge. Production updates.

The workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds **both** branches on every push and publishes them as one Pages site (`/` + `/kiddora/` + `/grammarhub/` from `main`, `/staging/…` from `dev`). Rebuilding unchanged `main` code gives identical files, so a `dev` push never changes production; a broken `dev` build is skipped and never blocks production.

Staging is kept apart from production on the shared origin: its own Firebase project, its own localStorage namespace (`kiddora-staging:…`) and its own service-worker caches (`kiddora-staging-<hash>`).

**Configuration**

- Repository secrets: `VITE_FIREBASE_*` (production) and `STAGING_VITE_FIREBASE_*` (staging); variable `VITE_WHATSAPP_NUMBER` (optional).
- Local files (git-ignored): `.env` = dev project, `.env.prod` = backup of the production values.
- Firestore rules: `npx firebase-tools deploy --only firestore:rules -P dev` and `-P prod` (aliases in `.firebaserc`).
- Both Firebase projects list `smartdigital-edu.github.io` under **Authentication → Settings → Authorised domains**.

All asset URLs are relative (`base: './'`) and routing is hash-based, so each app works under any sub-path.

## 5. Project layout

```
index.html                 shared HTML shell (placeholders filled per app at build time)
vite.config.js             APP=kiddora|grammarhub → dist/<app>
public/                    manifests, icons, service worker, optional audio
src/main.js                entry: loads the app config + core
src/core/                  auth/session, backend (firebase.js | local.js demo), router, i18n (en/ms),
                           audio (speech + sfx), storage, scoring, ui kit, screens, styles
src/games/                 engines: learnCards, multipleChoice, findIt, matchLines, dragToSlot, dragToCount,
                           sortBuckets, swapToMatch, popBalloon, tracing, colouring, spelling, buildSentence,
                           arithmetic, lessonPage, quiz (mixed) + shared runner and drag-and-drop helper
src/apps/kiddora/          config.js (modules → activities → engines), builders.js (JSON → engine configs)
src/apps/grammarhub/       config.js (13 topics: lesson → choose 5/10/20/40 → quiz)
src/content/               JSON content for both apps
tests/unit, tests/e2e      Vitest and Playwright
firestore.rules            security rules
```

### Engine contract

Every engine is `export default function (root, config, api)`. Quiz-style engines provide a `render(question, view, ctx)` and use `runQuestions()` from `src/games/runner.js`, which handles random order, counter, stars, feedback sounds, shake/celebration, explanations, and calls `api.finish({ correct, total })` → the score is saved and the results screen opens.

## 6. Accessibility & quality notes

- Touch targets ≥ 64 px in Kiddora (≥ 52 px in Grammar Hub); everything works with touch, mouse and keyboard (drag-and-drop also supports tap-to-select / tap-to-place and Enter/Space).
- Feedback never relies on colour alone: ✔ / ✖ icons and text accompany green/red.
- `prefers-reduced-motion` disables confetti, shaking and floating balloons.
- Focus moves to each screen's heading; dialogs trap focus and close with Escape.
- Every Kiddora instruction is spoken; every Listen button works offline with the device's voices. If a phone has no Malay voice, an Indonesian voice is used, then the default voice.
