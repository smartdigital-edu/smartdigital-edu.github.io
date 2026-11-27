/** "Who is Learning?" – select / add / edit / delete child profiles. */
import { el, button, screen, confirmDialog, toast, dialog } from '../ui.js';
import { t, tx } from '../i18n/index.js';
import { session, setActiveProfile, saveProfile, deleteProfile } from '../session.js';
import { navigate } from '../router.js';
import { show } from '../shell.js';

let managing = false;

const TILE_COLOURS = ['#fdf0c2', '#dff3e6', '#e3e8fb', '#fde3ea', '#dcf0fb', '#efe5fb'];

export function profilesScreen() {
  const app = session.app;
  if (app.mascotFly) { kidProfilesScreen(); return; }
  const cards = session.profiles.map((p) => el('li', {},
    el('button.profile-card', {
      'aria-label': `${p.name}, ${levelLabel(p.level)}`,
      'aria-pressed': String(session.profile?.id === p.id),
      onclick: () => {
        if (managing) { editProfile(p); return; }
        setActiveProfile(p);
        session.greetOnHome = true; // the home mascot says hello every time a learner is picked
        navigate('/home');
      },
    },
    el('span.avatar', { 'aria-hidden': 'true' }, p.avatar),
    el('span.profile-name', p.name),
    el('span.profile-level', levelLabel(p.level))),
    managing ? el('div.profile-tools', {},
      button(t('profiles.edit'), { variant: 'secondary small', onClick: () => editProfile(p) }),
      button(t('profiles.delete'), {
        variant: 'danger small',
        onClick: async () => {
          if (!(await confirmDialog(t('profiles.confirmDelete', { name: p.name })))) return;
          await deleteProfile(p.id);
          profilesScreen();
        },
      })) : null));

  const actions = session.profiles.length
    ? [button(managing ? t('profiles.done') : t('profiles.manage'), { variant: 'ghost small', icon: managing ? '✔' : '✏️', onClick: () => { managing = !managing; profilesScreen(); } })]
    : [];

  show(screen(t('profiles.title'), { back: false, actions, cls: 'profiles' },
    session.profiles.length ? null : el('p.empty', t('profiles.empty')),
    el('ul.profile-grid', {}, cards,
      el('li', el('button.profile-card.add', { onclick: () => editProfile(null) },
        el('span.avatar', { 'aria-hidden': 'true' }, '➕'),
        el('span.profile-name', t('profiles.add')))))));

  function levelLabel(level) {
    const l = app.levels.find((x) => String(x.value) === String(level));
    return l ? tx(l.label) : '';
  }
}

/** Illustrated version (apps with a flying mascot): banner, big learner cards with pastel avatar tiles. */
function kidProfilesScreen() {
  const app = session.app;
  const levelLabel = (level) => { const l = app.levels.find((x) => String(x.value) === String(level)); return l ? tx(l.label) : ''; };
  const cards = session.profiles.map((p, i) => {
    const current = session.profile?.id === p.id;
    return el('li', {},
      el('button.profile-card.pf-card', {
        'aria-label': `${p.name}, ${levelLabel(p.level)}`,
        'aria-pressed': String(current),
        onclick: () => {
          if (managing) { editProfile(p); return; }
          setActiveProfile(p);
          session.greetOnHome = true; // the home mascot says hello every time a learner is picked
          navigate('/home');
        },
      },
      current ? el('span.pf-check', { 'aria-hidden': 'true' }, '✓') : null,
      el('span.pf-avatar', { 'aria-hidden': 'true', style: { '--tile': TILE_COLOURS[i % TILE_COLOURS.length] } }, p.avatar),
      el('span.profile-name', p.name),
      el('span.profile-level', levelLabel(p.level))),
      managing ? el('div.profile-tools', {},
        button(t('profiles.edit'), { variant: 'secondary small', onClick: () => editProfile(p) }),
        button(t('profiles.delete'), {
          variant: 'danger small',
          onClick: async () => {
            if (!(await confirmDialog(t('profiles.confirmDelete', { name: p.name })))) return;
            await deleteProfile(p.id);
            profilesScreen();
          },
        })) : null);
  });
  show(el('section.screen.profiles.kid-profiles', {},
    el('div.pf-hero', {},
      el('div.pf-text', {},
        el('h1', { tabindex: '-1' }, t('profiles.heroTitle')),
        el('p', t('profiles.heroSub'))),
      el('span.pf-sparkle', { 'aria-hidden': 'true' }, '✦'),
      el('img.pf-cici', { src: app.mascotFly, alt: '', draggable: 'false' })),
    session.profiles.length ? null : el('p.empty', t('profiles.empty')),
    el('ul.profile-grid.pf-grid', {}, cards,
      el('li', el('button.profile-card.pf-card.add', { onclick: () => editProfile(null) },
        el('span.pf-avatar.plus', { 'aria-hidden': 'true' }, '+'),
        el('span.profile-name', t('profiles.add'))))),
    session.profiles.length
      ? el('div.pf-actions', {}, button(managing ? t('profiles.done') : t('profiles.manage'), {
        variant: 'ghost small', icon: managing ? '✔' : '✏️', onClick: () => { managing = !managing; profilesScreen(); },
      }))
      : null));
}

/** Add/edit form inside a dialog. */
async function editProfile(p) {
  const app = session.app;
  let avatar = p?.avatar || app.avatars[0];
  const name = el('input#pf-name', { type: 'text', value: p?.name || '', maxlength: 20, required: true, autocomplete: 'off' });
  const level = el('select#pf-level', {}, app.levels.map((l) => el('option', { value: l.value, selected: String(l.value) === String(p?.level ?? app.levels[0].value) }, tx(l.label))));
  const avatars = el('div.avatar-pick', { role: 'radiogroup', 'aria-label': t('profiles.avatar') },
    app.avatars.map((a) => el('button.avatar-opt', {
      type: 'button', role: 'radio', 'aria-checked': String(a === avatar), 'aria-label': a,
      onclick: (e) => {
        avatar = a;
        avatars.querySelectorAll('.avatar-opt').forEach((b) => b.setAttribute('aria-checked', String(b === e.currentTarget)));
      },
    }, a)));
  const body = el('div.profile-form', {},
    el('label', { for: 'pf-name' }, t('profiles.name')), name,
    el('p.label', t('profiles.avatar')), avatars,
    el('label', { for: 'pf-level' }, t('profiles.level')), level);
  const res = await dialog({
    title: p ? t('profiles.edit') : t('profiles.add'),
    body,
    buttons: [{ label: t('profiles.cancel'), value: false }, { label: t('profiles.save'), value: true, variant: 'primary' }],
  });
  if (!res) return;
  const nm = name.value.trim();
  if (!nm) { toast(t('profiles.nameRequired'), { type: 'error' }); return editProfile(p); }
  const saved = await saveProfile({ ...(p || {}), name: nm, avatar, level: Number(level.value) });
  if (!p && session.profiles.length === 1) setActiveProfile(saved);
  profilesScreen();
}
