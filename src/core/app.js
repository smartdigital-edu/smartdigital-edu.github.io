/**
 * Boot sequence: mount shell -> init backend -> listen for auth ->
 * guard routes (login / allowlist / profile) -> render.
 */
import { mountShell, renderHeader, show } from './shell.js';
import { route, setGuard, setNotFound, startRouter, navigate, currentPath, resolve } from './router.js';
import { session, initBackend, establish } from './session.js';
import { t } from './i18n/index.js';
import { el, screen } from './ui.js';
import { registerSW } from './install.js';
import { loginScreen, passwordScreen, adminScreen, setLoginMessage } from './screens/auth.js';
import { profilesScreen } from './screens/profiles.js';
import { homeScreen, moduleScreen, playScreen, resultsScreen, scoresScreen, installScreen, helpScreen } from './screens/main.js';

const PUBLIC = new Set(['/login', '/help']);

export async function boot(appConfig) {
  session.app = appConfig;
  document.body.dataset.app = appConfig.id;
  mountShell(document.getElementById('app'));
  registerSW();
  await initBackend();

  route('/login', loginScreen);
  route('/help', helpScreen);
  route('/profiles', profilesScreen);
  route('/home', homeScreen);
  route('/m/:module', moduleScreen);
  route('/play/:module/:activity', playScreen);
  route('/results', resultsScreen);
  route('/scores', scoresScreen);
  route('/install', installScreen);
  route('/password', passwordScreen);
  route('/admin', adminScreen);
  route('/', () => navigate('/home', { replace: true }));
  setNotFound(() => show(screen(t('error.notFound'), {}, el('p', el('a', { href: '#/home' }, t('nav.home'))))));

  setGuard(({ path }) => {
    if (!session.ready) return false;
    if (!session.user) return PUBLIC.has(path) ? true : '/login';
    if (path === '/login') return '/profiles';
    const needsProfile = !['/profiles', '/help', '/install', '/password', '/admin', '/scores'].includes(path);
    if (needsProfile && !session.profile) return '/profiles';
    return true;
  });

  let started = false;
  session.backend.onAuth(async (user) => {
    let status;
    try { status = await establish(user); } catch (e) {
      console.error(e);
      status = 'signed-out';
      setLoginMessage(t('login.network'));
    }
    if (status === 'denied') setLoginMessage(t('login.notAllowed', { email: user.email }));
    session.ready = true;
    renderHeader();
    if (!started) { started = true; startRouter(); return; }
    if (status === 'ok' && currentPath() === '/login') navigate('/profiles');
    else if (status !== 'ok') navigate('/login', { replace: true });
    else resolve();
  });
}
