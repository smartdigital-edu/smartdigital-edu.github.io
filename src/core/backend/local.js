/**
 * Demo backend used when Firebase is not configured. Mirrors the Firebase
 * backend API but stores everything in localStorage on this device.
 * Seeded accounts (for local development and the Playwright smoke test):
 *   demo@kiddora.test / demo123   (role: user)
 *   admin@kiddora.test / admin123 (role: admin)
 */
const KEY = 'bijak-demo-db';
const SEED = {
  accounts: { 'demo@kiddora.test': 'demo123', 'admin@kiddora.test': 'admin123' },
  allowed: { 'demo@kiddora.test': { role: 'user' }, 'admin@kiddora.test': { role: 'admin' } },
  users: {},
  session: null,
};

const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || structuredClone(SEED); } catch { return structuredClone(SEED); } };
const save = (db) => localStorage.setItem(KEY, JSON.stringify(db));
const key = (e) => String(e || '').trim().toLowerCase();
const uidFor = (email) => `demo-${key(email).replace(/[^a-z0-9]/g, '-')}`;
const err = (code) => Object.assign(new Error(code), { code });
const id = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const wait = (ms = 120) => new Promise((r) => setTimeout(r, ms));
const userData = (db, uid) => (db.users[uid] ||= { profiles: {}, attempts: {} });

let authCb = null;

export const backend = {
  name: 'demo',

  onAuth(cb) {
    authCb = cb;
    const db = load();
    setTimeout(() => cb(db.session ? { uid: uidFor(db.session), email: db.session } : null), 0);
    return () => { authCb = null; };
  },
  async signIn(email, password) {
    await wait();
    const db = load();
    const e = key(email);
    if (!db.accounts[e]) throw err('auth/invalid-credential');
    if (db.accounts[e] !== password) throw err('auth/invalid-credential');
    db.session = e;
    save(db);
    const user = { uid: uidFor(e), email: e };
    authCb?.(user);
    return user;
  },
  async signOut() {
    const db = load();
    db.session = null;
    save(db);
    authCb?.(null);
  },
  async resetPassword(email) { await wait(); if (!key(email).includes('@')) throw err('auth/invalid-email'); },
  async changePassword(current, next) {
    const db = load();
    if (db.accounts[db.session] !== current) throw err('auth/wrong-password');
    db.accounts[db.session] = next;
    save(db);
  },

  async access(email) {
    const a = load().allowed[key(email)];
    return a ? { allowed: true, role: a.role || 'user' } : { allowed: false, role: null };
  },
  async touchUser() {},

  async listAllowed() {
    return Object.entries(load().allowed).map(([email, v]) => ({ email, ...v })).sort((a, b) => a.email.localeCompare(b.email));
  },
  async addAllowed(email, role = 'user') {
    const db = load();
    db.allowed[key(email)] = { role, addedAt: Date.now() };
    // Demo convenience: a new allowed email gets the password "changeme".
    db.accounts[key(email)] ||= 'changeme';
    save(db);
  },
  async removeAllowed(email) {
    const db = load();
    delete db.allowed[key(email)];
    save(db);
  },

  async listProfiles(uid) {
    return Object.values(userData(load(), uid).profiles).sort((a, b) => a.createdAt - b.createdAt);
  },
  async saveProfile(uid, profile) {
    const db = load();
    const u = userData(db, uid);
    const p = profile.id ? { ...u.profiles[profile.id], ...profile } : { ...profile, id: id(), createdAt: Date.now() };
    u.profiles[p.id] = p;
    save(db);
    return p;
  },
  async deleteProfile(uid, pid) {
    const db = load();
    const u = userData(db, uid);
    delete u.profiles[pid];
    delete u.attempts[pid];
    save(db);
  },

  async addAttempt(uid, pid, attempt) {
    const db = load();
    const u = userData(db, uid);
    (u.attempts[pid] ||= []).push({ id: id(), ...attempt });
    save(db);
    return attempt;
  },
  async listAttempts(uid, pid) {
    return [...(userData(load(), uid).attempts[pid] || [])].sort((a, b) => b.timestamp - a.timestamp);
  },
  async clearAttempts(uid, pid) {
    const db = load();
    userData(db, uid).attempts[pid] = [];
    save(db);
  },
};
