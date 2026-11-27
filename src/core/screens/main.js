/** Home, module menu, play, results, scores, install and help screens. */
import { el, button, screen, loader, stars, confetti, confirmDialog, toast, clear, preloadImages, animate } from '../ui.js';
import { t, tx, getLang } from '../i18n/index.js';
import { speak, sfx } from '../audio.js';
import { session, setActiveProfile } from '../session.js';
import { navigate } from '../router.js';
import { show } from '../shell.js';
import { percent, starsFor, buildAttempt, formatDuration } from '../scoring.js';
import { loadEngine } from '../../games/index.js';
import { canPrompt, promptInstall, isIOS, isStandalone, onInstallAvailable } from '../install.js';
import { whatsappLink } from '../config.js';

const findModule = (id) => session.app.modules.find((m) => m.id === id);

/* ---------------- home ---------------- */
export function homeScreen() {
  const p = session.profile;
  const app = session.app;
  show(el('section.screen.home', {},
    el('div.home-hello', {},
      el('span.avatar.big', { 'aria-hidden': 'true' }, p.avatar),
      el('div', {},
        el('h1', { tabindex: '-1' }, t('home.hello', { name: p.name })),
        el('p.muted', t('home.pick'))),
      el('a.btn.secondary.small', { href: '#/profiles' }, el('span.btn-icon', { 'aria-hidden': 'true' }, '🔄'), t('profiles.switch'))),
    el('ul.module-grid', {}, app.modules.map((m) => el('li', {}, moduleTile(m, app))))));
}

/** Home tile: a picture tile when the module has an image, else the emoji card. */
function moduleTile(m, app) {
  const sub = m.comingSoon ? t('home.comingSoon')
    : m.subtitle ? tx(m.subtitle) : (m.activities.length > 1 ? t('home.activities', { n: m.activities.length }) : '');
  if (m.image) {
    const body = [
      el('img.module-img', { src: m.image, alt: '', decoding: 'async', draggable: 'false' }),
      m.comingSoon ? el('span.soon-ribbon', { 'aria-hidden': 'true' }, t('home.comingSoon')) : null,
      // The picture already shows the English name; show the title in other languages.
      el('span.module-caption', {}, el(`span.module-title${getLang() === 'en' ? '.sr-only' : ''}`, tx(m.title)), sub ? el('span.module-sub', sub) : null),
    ];
    if (m.comingSoon) {
      return el('button.module-card.pic.soon', {
        type: 'button', style: { '--tint': m.tint || m.color }, 'aria-label': `${tx(m.title)}, ${t('home.comingSoon')}`,
        onclick: (e) => { sfx.pop(); animate(e.currentTarget, 'shake', 500); speak(`${tx(m.title)}. ${t('home.comingSoon')}!`); },
      }, ...body);
    }
    return el('a.module-card.pic', {
      style: { '--tint': m.tint || m.color },
      href: m.direct ? `#/play/${m.id}/${m.direct}` : `#/m/${m.id}`,
      'aria-label': sub ? `${tx(m.title)}, ${sub}` : tx(m.title),
      onclick: () => { sfx.tap(); if (app.bilingual) speak(tx(m.title)); },
    }, ...body);
  }
  return el('a.module-card', {
    href: m.direct ? `#/play/${m.id}/${m.direct}` : `#/m/${m.id}`,
    style: { '--card': m.color },
    onclick: () => { sfx.tap(); if (app.bilingual) speak(tx(m.title)); },
  },
  el('span.module-emoji', { 'aria-hidden': 'true' }, m.emoji),
  el('span.module-title', tx(m.title)),
  sub ? el('span.module-sub', sub) : null);
}

/* ---------------- module (activity list) ---------------- */
export function moduleScreen({ params }) {
  const m = findModule(params.module);
  if (!m || m.comingSoon) return navigate('/home', { replace: true });
  show(screen(tx(m.title), { back: '#/home', cls: 'module' },
    el('ul.activity-grid', {}, m.activities.map((a) => el('li', {},
      el('a.activity-card', {
        href: `#/play/${m.id}/${a.id}`,
        style: { '--card': m.color },
        onclick: () => { sfx.tap(); speak(tx(a.title)); },
      },
      el('span.activity-emoji', { 'aria-hidden': 'true' }, a.emoji || m.emoji),
      el('span.activity-title', tx(a.title))))))));
}

/* ---------------- play ---------------- */
let lastResult = null;

export async function playScreen({ params, query }) {
  const m = findModule(params.module);
  const a = m?.comingSoon ? null : m?.activities.find((x) => x.id === params.activity);
  if (!a) return navigate('/home', { replace: true });
  const back = m.direct ? '#/home' : `#/m/${m.id}`;
  const stage = el('div.play-stage');
  const title = tx(a.title);
  show(screen(title, { back, cls: `play engine-${a.engine}` }, stage));
  stage.append(loader());

  let config;
  let start;
  try {
    const ctx = { lang: getLang(), profile: session.profile, query, module: m, activity: a };
    [config, start] = await Promise.all([a.build(ctx), loadEngine(a.engine)]);
    const imgs = collectImages(config);
    if (imgs.length) await preloadImages(imgs);
  } catch (e) {
    console.error(e);
    clear(stage).append(el('div.card.error-card', {}, el('p', t('error.load')),
      button(t('error.retry'), { onClick: () => playScreen({ params, query }) })));
    return;
  }

  const begin = (cfg) => {
    clear(stage);
    const startedAt = Date.now();
    start(stage, cfg, {
      t, tx, speak, sfx, lang: getLang(), app: session.app,
      title,
      kids: !!session.app.kids,
      navigate,
      finish: async ({ correct, total, save = true }) => {
        const attempt = buildAttempt({
          profileId: session.profile.id, app: session.app.id, module: m.id, activity: a.id,
          title: m.direct ? tx(a.title, 'en') : `${tx(m.title, 'en')} – ${tx(a.title, 'en')}`, correct, total, startedAt,
        });
        if (save) {
          try { await session.backend.addAttempt(session.user.uid, session.profile.id, attempt); } catch (e) { console.warn(e); }
        }
        lastResult = { ...attempt, displayTitle: title, retry: location.hash, back };
        navigate('/results');
      },
    });
  };

  // Optional "How many questions?" step (Grammar Hub quizzes, spelling).
  if (config.countOptions && !query.n) {
    const available = config.questions?.length ?? Infinity;
    clear(stage).append(el('div.card.count-pick', {},
      el('h2', t('game.howMany')),
      el('div.count-options', {}, config.countOptions.filter((n, i) => i === 0 || n <= available).map((n) => button(String(Math.min(n, available)), {
        variant: 'choice', onClick: () => begin({ ...config, count: n }),
      })))));
    if (session.app.kids) speak(t('game.howMany'));
    return;
  }
  begin({ ...config, count: Number(query.n) || config.count });
}

function collectImages(config) {
  const out = new Set();
  JSON.stringify(config, (k, v) => { if (k === 'img' && typeof v === 'string') out.add(v); return v; });
  return [...out];
}

/* ---------------- results ---------------- */
export function resultsScreen() {
  const r = lastResult;
  if (!r) return navigate('/home', { replace: true });
  const pct = percent(r.correct, r.total);
  const n = starsFor(pct);
  const good = pct >= 50;
  show(el('section.screen.results', {},
    el('div.card.results-card', {},
      el('h1', { tabindex: '-1' }, good ? t('results.title') : t('results.titleTry')),
      el('p.results-topic', r.displayTitle),
      stars(n),
      el('p.results-pct', { 'aria-label': `${pct}%` }, `${pct}%`),
      el('p', t('results.correct', { correct: r.correct, total: r.total })),
      el('p.muted', `${new Date(r.timestamp).toLocaleString(getLang() === 'ms' ? 'ms-MY' : 'en-MY')} · ${t('results.time', { time: formatDuration(r.duration) })}`),
      el('div.results-actions', {},
        button(t('results.retry'), { icon: '🔁', variant: 'secondary', onClick: () => { location.hash = r.retry; } }),
        el('a.btn.primary', { href: r.back }, el('span.btn-icon', { 'aria-hidden': 'true' }, '📚'), t('results.back'))))));
  sfx.win();
  confetti({ count: n * 60 });
  if (session.app.kids) speak(good ? t('results.title') : t('results.titleTry'));
}

/* ---------------- scores ---------------- */
export async function scoresScreen({ query }) {
  const pid = query.p || session.profile?.id || session.profiles[0]?.id;
  const profile = session.profiles.find((p) => p.id === pid);
  const select = el('select#score-profile', {
    onchange: (e) => navigate(`/scores?p=${e.target.value}`, { replace: true }),
  }, session.profiles.map((p) => el('option', { value: p.id, selected: p.id === pid }, `${p.avatar} ${p.name}`)));
  const body = el('div.card.scores-card', {}, loader(t('app.loading')));
  const clearBtn = button(t('scores.clear'), {
    variant: 'danger small', icon: '🗑️',
    onClick: async () => {
      if (!profile || !(await confirmDialog(t('scores.confirmClear', { name: profile.name })))) return;
      await session.backend.clearAttempts(session.user.uid, profile.id);
      toast(t('scores.cleared'));
      scoresScreen({ query });
    },
  });
  show(screen(t('scores.title'), { actions: [clearBtn] },
    el('div.row.score-filter', {}, el('label', { for: 'score-profile' }, t('scores.profile')), select),
    body));
  if (!profile) { clear(body).append(el('p.empty', t('profiles.empty'))); return; }
  let rows = [];
  try { rows = await session.backend.listAttempts(session.user.uid, profile.id); } catch (e) { console.warn(e); }
  rows = rows.filter((r) => !r.app || r.app === session.app.id);
  clearBtn.disabled = !rows.length;
  if (!rows.length) { clear(body).append(el('p.empty', t('scores.empty'))); return; }
  const fmt = new Intl.DateTimeFormat(getLang() === 'ms' ? 'ms-MY' : 'en-MY', { dateStyle: 'medium', timeStyle: 'short' });
  clear(body).append(el('div.table-wrap', el('table.scores-table', {},
    el('thead', el('tr', {}, ['scores.no', 'scores.topic', 'scores.score', 'scores.date'].map((k) => el('th', { scope: 'col' }, t(k))))),
    el('tbody', {}, rows.map((r, i) => el('tr', {},
      el('td', String(i + 1)),
      el('td', r.title),
      el('td', el(`span.score-pill.${r.score >= 80 ? 'hi' : r.score >= 50 ? 'mid' : 'lo'}`, `${r.score}%`)),
      el('td', fmt.format(new Date(r.timestamp)), r.pending ? el('small.pending', ` (${t('scores.pending')})`) : null)))))));
}

/* ---------------- install ---------------- */
export function installScreen() {
  const btnWrap = el('div');
  const renderBtn = () => {
    clear(btnWrap);
    if (isStandalone()) btnWrap.append(el('p.form-msg.success', t('install.installed')));
    else if (canPrompt()) btnWrap.append(button(t('install.button'), { icon: '📲', onClick: () => promptInstall().then(renderBtn) }));
  };
  renderBtn();
  onInstallAvailable(renderBtn);
  const step = (n, icon, text) => el('li.install-step', {}, el('span.step-num', { 'aria-hidden': 'true' }, String(n)), el('span.step-icon', { 'aria-hidden': 'true' }, icon), el('span', text));
  const ios = el('div.card', { id: 'ios' },
    el('h2', '🍎 ', t('install.ios')),
    el('ol.install-steps', {},
      step(1, '🧭', t('install.ios1')),
      step(2, el('svg', { html: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="4" y="11" width="16" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>' }), t('install.ios2')),
      step(3, '➕', t('install.ios3')),
      step(4, '✅', t('install.ios4'))));
  const android = el('div.card', {},
    el('h2', '🤖 ', t('install.android')),
    el('p', t('install.androidSteps')));
  show(screen(t('install.title'), {}, el('p', t('install.intro')), btnWrap, isIOS() ? [ios, android] : [android, ios]));
}

/* ---------------- help ---------------- */
export function helpScreen() {
  show(screen(t('help.title'), { back: session.user ? '#/home' : '#/login' }, el('div.card', {},
    ['help.body1', 'help.body2', 'help.body3', 'help.body4'].map((k) => el('p', t(k))),
    el('a.btn.whatsapp', { href: whatsappLink(`Hi ${session.app.name}`), target: '_blank', rel: 'noopener' },
      el('span.btn-icon', { 'aria-hidden': 'true' }, '💬'), t('nav.whatsapp')))));
}

export { setActiveProfile };
