/**
 * Session state: signed-in user, role, active profile, and the app config.
 * Screens read from here instead of passing state around.
 */
import { getBackend } from './backend/index.js';
import { store } from './storage.js';

export const session = {
  app: null,        // app config (kiddora / grammarhub)
  user: null,       // { uid, email }
  role: null,       // 'user' | 'admin'
  profiles: [],
  profile: null,    // active child profile
  backend: null,
  ready: false,
};

export async function initBackend() {
  session.backend = await getBackend();
  return session.backend;
}

/** Map Firebase auth error codes to i18n keys. */
export function authErrorKey(e) {
  const code = e?.code || '';
  if (/invalid-credential|wrong-password|user-not-found|invalid-email|invalid-login/.test(code)) return 'login.wrong';
  if (/too-many-requests/.test(code)) return 'login.tooMany';
  if (/network/.test(code)) return 'login.network';
  return 'login.error';
}

/**
 * Called on every auth state change. Verifies the allowlist; users who are
 * not on it are signed out immediately. Returns 'ok' | 'denied' | 'signed-out'.
 */
export async function establish(user) {
  const b = session.backend;
  if (!user) {
    Object.assign(session, { user: null, role: null, profiles: [], profile: null });
    return 'signed-out';
  }
  let access;
  try {
    access = await b.access(user.email);
  } catch (e) {
    // Offline with a cached session: trust the last verified role for this email.
    const cached = store.get('access');
    if (cached?.email === user.email) access = { allowed: true, role: cached.role };
    else throw e;
  }
  if (!access.allowed) {
    store.remove('access');
    await b.signOut();
    Object.assign(session, { user: null, role: null });
    return 'denied';
  }
  store.set('access', { email: user.email, role: access.role });
  session.user = user;
  session.role = access.role;
  b.touchUser(user);
  await loadProfiles();
  return 'ok';
}

const profileKey = () => `activeProfile:${session.user?.uid}`;

export async function loadProfiles() {
  const all = await session.backend.listProfiles(session.user.uid);
  // Profiles are per app: a Kivokid child does not appear in Grammar Hub.
  session.profiles = all.filter((p) => !p.app || p.app === session.app.id);
  const activeId = store.get(profileKey());
  session.profile = session.profiles.find((p) => p.id === activeId) || null;
  return session.profiles;
}

export function setActiveProfile(p) {
  session.profile = p;
  if (p) store.set(profileKey(), p.id); else store.remove(profileKey());
}

export async function saveProfile(data) {
  const saved = await session.backend.saveProfile(session.user.uid, { ...data, app: session.app.id });
  const i = session.profiles.findIndex((p) => p.id === saved.id);
  if (i >= 0) session.profiles[i] = saved; else session.profiles.push(saved);
  if (session.profile?.id === saved.id) session.profile = saved;
  return saved;
}

export async function deleteProfile(pid) {
  await session.backend.deleteProfile(session.user.uid, pid);
  session.profiles = session.profiles.filter((p) => p.id !== pid);
  if (session.profile?.id === pid) setActiveProfile(null);
}
