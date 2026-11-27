/** Login, change password and admin (allowlist) screens. */
import { el, button, screen, toast, confirmDialog, clear } from '../ui.js';
import { t } from '../i18n/index.js';
import { session, authErrorKey } from '../session.js';
import { whatsappLink } from '../config.js';
import { show } from '../shell.js';

let pendingMessage = null;
/** Message shown on the next login render (e.g. "not allowed"). */
export const setLoginMessage = (m) => { pendingMessage = m; };

export function loginScreen() {
  const msg = el('p.form-msg', { role: 'alert' });
  if (pendingMessage) { msg.textContent = pendingMessage; msg.className = 'form-msg error'; pendingMessage = null; }
  const email = el('input#email', { type: 'email', name: 'email', autocomplete: 'username', required: true, inputmode: 'email' });
  const pass = el('input#password', { type: 'password', name: 'password', autocomplete: 'current-password', required: true, minlength: 6 });
  const submit = button(t('login.submit'), { type: 'submit', icon: '➜' });
  const setMsg = (text, type = 'error') => { msg.textContent = text; msg.className = `form-msg ${type}`; };

  const onsubmit = async (e) => {
    e.preventDefault();
    if (!email.value || !pass.value) { setMsg(t('login.wrong')); return; }
    submit.disabled = true;
    setMsg('', 'info');
    try {
      await session.backend.signIn(email.value, pass.value);
      // Auth listener (app.js) verifies the allowlist and routes onward.
    } catch (err) {
      setMsg(t(authErrorKey(err)));
    } finally { submit.disabled = false; }
  };

  const form = el('form.card.auth-card', { novalidate: true, onsubmit },
  el('div.auth-hero', { 'aria-hidden': 'true' }, session.app.heroEmoji),
  el('h1', { tabindex: '-1' }, t('login.title')),
  el('p.muted', t('login.subtitle')),
  el('label', { for: 'email' }, t('login.email')), email,
  el('label', { for: 'password' }, t('login.password')), pass,
  msg,
  submit,
  el('button.link-btn', {
    type: 'button',
    onclick: async () => {
      if (!email.value.includes('@')) { setMsg(t('login.needEmail')); email.focus(); return; }
      try {
        await session.backend.resetPassword(email.value);
        setMsg(t('login.resetSent', { email: email.value }), 'success');
      } catch (err) { setMsg(t(authErrorKey(err))); }
    },
  }, t('login.forgot')),
  el('a.btn.whatsapp', { href: whatsappLink(`Hi ${session.app.name}, I need access.`), target: '_blank', rel: 'noopener' },
    el('span.btn-icon', { 'aria-hidden': 'true' }, '💬'), t('login.contact')));

  // Apps with a mascot get the split design: illustrated panel on the left, form on the right.
  const mascot = (session.app.decor || []).find((d) => d.side === 'left');
  if (mascot) { show(splitLogin({ mascot, email, pass, submit, msg, setMsg, onsubmit })); return; }
  show(el('section.screen.auth', {}, form));
}

/** Split login: brand + mascot panel, and a clean form panel. */
function splitLogin({ mascot, email, pass, submit, msg, setMsg, onsubmit }) {
  const app = session.app;
  submit.className = 'auth-submit';
  submit.textContent = t('login.signIn');
  const reveal = el('button.pass-toggle', {
    type: 'button', 'aria-controls': 'password', 'aria-pressed': 'false',
    onclick: () => {
      const showing = pass.type === 'text';
      pass.type = showing ? 'password' : 'text';
      reveal.textContent = t(showing ? 'login.show' : 'login.hide');
      reveal.setAttribute('aria-pressed', String(!showing));
    },
  }, t('login.show'));
  const forgot = el('button.auth-link', {
    type: 'button',
    onclick: async () => {
      if (!email.value.includes('@')) { setMsg(t('login.needEmail')); email.focus(); return; }
      try {
        await session.backend.resetPassword(email.value);
        setMsg(t('login.resetSent', { email: email.value }), 'success');
      } catch (err) { setMsg(t(authErrorKey(err))); }
    },
  }, t('login.forgot'));
  const sparkle = (cls, ch = '✦') => el(`span.sparkle.${cls}`, { 'aria-hidden': 'true' }, ch);
  return el('section.screen.auth.auth-split', {},
    el('div.auth-art', {},
      el('a.auth-brand', { href: '#/login', 'aria-label': app.name },
        el('img', { src: `./icons/${app.id}-192.png`, alt: '', width: 48, height: 48 }),
        el('span', app.name)),
      el('div.auth-stage', { 'aria-hidden': 'true' },
        el('span.ring.r1'), el('span.ring.r2'),
        sparkle('s1'), sparkle('s2', '✧'), sparkle('s3'),
        el('img.auth-cici', { src: mascot.src, alt: '', draggable: 'false' }))),
    el('div.auth-panel', {},
      el('form.auth-form', { novalidate: true, onsubmit },
        el('h1', { tabindex: '-1' }, t('login.welcomeBack')),
        el('p.auth-sub', t('login.subtitleKids')),
        el('label', { for: 'email' }, t('login.email')), email,
        el('label', { for: 'password' }, t('login.password')),
        el('div.pass-wrap', {}, pass, reveal),
        forgot,
        msg,
        submit,
        el('hr'),
        el('a.auth-link.center', { href: whatsappLink(`Hi ${app.name}, I need access.`), target: '_blank', rel: 'noopener' }, t('login.help')))));
}

export function passwordScreen() {
  const cur = el('input#cur', { type: 'password', autocomplete: 'current-password', required: true });
  const nw = el('input#new', { type: 'password', autocomplete: 'new-password', required: true, minlength: 6 });
  const cf = el('input#cf', { type: 'password', autocomplete: 'new-password', required: true, minlength: 6 });
  const msg = el('p.form-msg', { role: 'alert' });
  const setMsg = (text, type = 'error') => { msg.textContent = text; msg.className = `form-msg ${type}`; };
  const form = el('form.card.narrow', {
    onsubmit: async (e) => {
      e.preventDefault();
      if (nw.value.length < 6) return setMsg(t('password.min'));
      if (nw.value !== cf.value) return setMsg(t('password.mismatch'));
      try {
        await session.backend.changePassword(cur.value, nw.value);
        form.reset();
        setMsg(t('password.done'), 'success');
      } catch (err) {
        setMsg(/wrong-password|invalid-credential/.test(err.code) ? t('password.wrongCurrent') : t(authErrorKey(err)));
      }
    },
  },
  el('label', { for: 'cur' }, t('password.current')), cur,
  el('label', { for: 'new' }, t('password.new')), nw,
  el('label', { for: 'cf' }, t('password.confirm')), cf,
  msg,
  button(t('password.submit'), { type: 'submit', icon: '🔑' }));
  show(screen(t('password.title'), {}, form));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function adminScreen() {
  if (session.role !== 'admin') {
    show(screen(t('nav.admin'), {}, el('p.card', t('admin.denied'))));
    return;
  }
  const list = el('ul.admin-list', { 'aria-live': 'polite' });
  const email = el('input#adm-email', { type: 'email', required: true, placeholder: 'parent@example.com' });
  const role = el('select#adm-role', {}, el('option', { value: 'user' }, t('admin.user')), el('option', { value: 'admin' }, t('admin.admin')));
  const refresh = async () => {
    const rows = await session.backend.listAllowed();
    clear(list).append(...rows.map((r) => el('li.admin-row', {},
      el('span.admin-email', r.email),
      el('span.badge', r.role === 'admin' ? t('admin.admin') : t('admin.user')),
      r.email === session.user.email ? el('span') : button(t('admin.remove'), {
        variant: 'danger small',
        aria: `${t('admin.remove')} ${r.email}`,
        onClick: async () => {
          if (!(await confirmDialog(t('admin.confirmRemove', { email: r.email })))) return;
          await session.backend.removeAllowed(r.email);
          refresh();
        },
      }))));
  };
  const form = el('form.card.admin-form', {
    onsubmit: async (e) => {
      e.preventDefault();
      if (!EMAIL_RE.test(email.value.trim())) { toast(t('admin.invalid'), { type: 'error' }); return; }
      await session.backend.addAllowed(email.value, role.value);
      email.value = '';
      refresh();
    },
  },
  el('p.muted', t('admin.intro')),
  el('div.row', {},
    el('div.grow', el('label', { for: 'adm-email' }, t('admin.email')), email),
    el('div', el('label', { for: 'adm-role' }, t('admin.role')), role)),
  button(t('admin.add'), { type: 'submit', icon: '➕' }));
  show(screen(t('admin.title'), {}, form, el('div.card', list)));
  refresh();
}
