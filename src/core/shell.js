/**
 * App shell: header (logo, menu, sound, language, help), slide-in menu,
 * offline banner, and the <main> outlet screens render into.
 */
import { el, clear } from './ui.js';
import { t, getLang, setLang, onLangChange } from './i18n/index.js';
import { isSoundOn, setSound, onSoundChange, stopSpeaking } from './audio.js';
import { session } from './session.js';
import { whatsappLink, DEMO_MODE, STAGE } from './config.js';
import { navigate, resolve } from './router.js';

let outlet;
let header;
let menu;

export function getOutlet() { return outlet; }

export function mountShell(root) {
  clear(root);
  header = el('header.app-header');
  menu = el('nav#app-menu.app-menu', { 'aria-label': t('nav.menu'), hidden: true });
  outlet = el('main#main.app-main', { tabindex: '-1' });
  const banner = el('div.net-banner', { role: 'status', hidden: navigator.onLine });
  banner.textContent = t('app.offline');
  window.addEventListener('offline', () => { banner.hidden = false; banner.textContent = t('app.offline'); });
  window.addEventListener('online', () => {
    banner.textContent = t('app.backOnline');
    setTimeout(() => { banner.hidden = true; }, 2500);
  });
  const stage = STAGE ? el('div.stage-banner', { role: 'note' }, t('app.stageBanner')) : null;
  root.append(...[header, banner, stage, DEMO_MODE ? el('div.demo-banner', { role: 'note' }, t('app.demoBanner')) : null, menu, outlet].filter(Boolean));
  renderHeader();
  onLangChange(() => { renderHeader(); resolve(); });
  onSoundChange(renderHeader);
}

export function renderHeader() {
  const app = session.app;
  const signedIn = !!session.user;
  clear(header).append(
    signedIn
      ? el('button.icon-btn.menu-toggle', { 'aria-label': t('nav.menu'), 'aria-controls': 'app-menu', 'aria-expanded': 'false', onclick: toggleMenu }, '☰')
      : el('span.icon-spacer'),
    el('a.logo', { href: signedIn ? '#/home' : '#/login', 'aria-label': app.name },
      el('img', { src: `./icons/${app.id}-192.png`, alt: '', width: 36, height: 36 }),
      el('span.logo-text', app.name)),
    el('div.header-actions', {},
      el('button.icon-btn', {
        'aria-label': isSoundOn() ? t('nav.soundOff') : t('nav.soundOn'),
        'aria-pressed': String(isSoundOn()),
        title: isSoundOn() ? t('nav.soundOff') : t('nav.soundOn'),
        onclick: () => setSound(!isSoundOn()),
      }, isSoundOn() ? '🔊' : '🔇'),
      app.bilingual
        ? el('button.icon-btn.lang-btn', {
          'aria-label': `${getLang() === 'en' ? 'BM' : 'EN'} – ${t('nav.language')}`,
          title: t('nav.language'),
          onclick: () => setLang(getLang() === 'en' ? 'ms' : 'en'),
        }, getLang() === 'en' ? 'BM' : 'EN')
        : null,
      el('a.icon-btn', { href: '#/help', 'aria-label': t('nav.help'), title: t('nav.help') }, '?')),
  );
  renderMenu();
}

function renderMenu() {
  if (session.app.menuArt) { renderArtMenu(); return; }
  const items = [
    ['🏠', 'nav.home', '#/home'],
    ['👧', 'nav.profiles', '#/profiles'],
    ['🏆', 'nav.scores', '#/scores'],
    ['📲', 'nav.install', '#/install'],
    ['🔑', 'nav.password', '#/password'],
    session.role === 'admin' ? ['🛡️', 'nav.admin', '#/admin'] : null,
  ].filter(Boolean);
  clear(menu).append(
    el('div.menu-head', {},
      el('strong', session.user?.email || ''),
      el('button.icon-btn', { 'aria-label': t('nav.close'), onclick: closeMenu }, '✕')),
    el('ul', {}, items.map(([icon, key, href]) => el('li', el('a.menu-item', { href, onclick: closeMenu },
      el('span', { 'aria-hidden': 'true' }, icon), t(key))))),
    el('ul', {},
      el('li', el('a.menu-item', { href: whatsappLink(`Hi ${session.app.name}`), target: '_blank', rel: 'noopener' },
        el('span', { 'aria-hidden': 'true' }, '💬'), t('nav.whatsapp'))),
      el('li', el('button.menu-item', { onclick: logout }, el('span', { 'aria-hidden': 'true' }, '🚪'), t('nav.logout')))),
  );
}

/** Illustrated menu (apps with `menuArt`): brand header with the mascot, coloured "Explore" items, account tools. */
function renderArtMenu() {
  const app = session.app;
  const icon = (ch) => el('span.mi-icon', { 'aria-hidden': 'true' }, ch);
  const link = (cls, ch, key, href) => el('li', el(`a.mi.${cls}`, { href, onclick: closeMenu, 'data-route': href }, icon(ch), el('span.mi-label', t(key)), el('span.mi-dot', { 'aria-hidden': 'true' })));
  const tool = (ch, key, attrs, cls = '') => el('li', el(`${attrs.href ? 'a' : 'button'}.mi.tool${cls}`, { ...attrs, ...(attrs.href ? {} : { type: 'button' }) }, icon(ch), el('span.mi-label', t(key))));
  clear(menu).append(
    el('div.mh', {},
      el('div.mh-brand', {},
        el('div.mh-logo', {}, el('img', { src: `./icons/${app.id}-192.png`, alt: '', width: 44, height: 44 }), el('span', app.name)),
        el('span.mh-sub', t('nav.learningMenu'))),
      el('img.mh-art', { src: app.menuArt, alt: '', draggable: 'false' }),
      el('button.mh-close', { type: 'button', 'aria-label': t('nav.close'), onclick: closeMenu }, '✕')),
    el('div.mb', {},
      el('p.mb-label', t('nav.explore')),
      el('ul.mb-list', {},
        link('home', '🏠', 'nav.home', '#/home'),
        link('profiles', '👧', 'nav.profiles', '#/profiles'),
        link('scores', '🏆', 'nav.scores', '#/scores')),
      el('p.mb-label', t('nav.accountTools')),
      session.user?.email ? el('p.mb-account', session.user.email) : null,
      el('ul.mb-list.tools', {},
        tool('📲', 'nav.install', { href: '#/install', onclick: closeMenu }),
        tool('🔑', 'nav.password', { href: '#/password', onclick: closeMenu }),
        session.role === 'admin' ? tool('🛡️', 'nav.admin', { href: '#/admin', onclick: closeMenu }) : null),
      el('hr.mb-rule'),
      el('ul.mb-list.tools', {},
        tool('💬', 'nav.whatsapp', { href: whatsappLink(`Hi ${app.name}`), target: '_blank', rel: 'noopener' }, '.wa'),
        tool('🚪', 'nav.logout', { onclick: logout }))),
  );
}

/** Mark the menu item for the current page. */
function markActive() {
  const here = location.hash.split('?')[0] || '#/home';
  menu.querySelectorAll('[data-route]').forEach((a) => {
    const on = here === a.dataset.route || (a.dataset.route === '#/home' && /^#\/(m|play)\//.test(here));
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

function toggleMenu() { if (menu.hidden) openMenu(); else closeMenu(); }
function openMenu() {
  menu.hidden = false;
  markActive();
  header.querySelector('.menu-toggle')?.setAttribute('aria-expanded', 'true');
  menu.querySelector('a, button')?.focus();
  document.addEventListener('keydown', escClose);
}
export function closeMenu() {
  if (!menu || menu.hidden) return;
  menu.hidden = true;
  header.querySelector('.menu-toggle')?.setAttribute('aria-expanded', 'false');
  document.removeEventListener('keydown', escClose);
}
function escClose(e) { if (e.key === 'Escape') { closeMenu(); header.querySelector('.menu-toggle')?.focus(); } }

async function logout() {
  closeMenu();
  stopSpeaking();
  await session.backend.signOut();
  navigate('/login');
}

/** Render a screen node into the outlet and move focus to its heading. */
export function show(node) {
  stopSpeaking();
  closeMenu();
  clear(outlet).append(node);
  window.scrollTo(0, 0);
  (outlet.querySelector('h1') || outlet).focus({ preventScroll: true });
}
