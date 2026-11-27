/**
 * Firebase backend: Auth (email/password) + Firestore with offline
 * persistence. Writes made offline are queued by Firestore in IndexedDB
 * and synced automatically when the connection returns.
 *
 * Data model
 *   allowedEmails/{emailLowercase}            { role: 'user' | 'admin', addedAt }
 *   users/{uid}                               { email, lastLogin }
 *   users/{uid}/profiles/{profileId}          { name, avatar, level, app, createdAt }
 *   users/{uid}/profiles/{pid}/attempts/{id}  { app, module, activity, score, ... }
 */
import { initializeApp } from 'firebase/app';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut,
  sendPasswordResetEmail, EmailAuthProvider, reauthenticateWithCredential, updatePassword,
  setPersistence, browserLocalPersistence,
} from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, getDoc, setDoc, deleteDoc, collection, getDocs, addDoc, query, orderBy,
  writeBatch, serverTimestamp, getDocsFromCache,
} from 'firebase/firestore';
import { firebaseConfig } from '../config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

const key = (email) => String(email || '').trim().toLowerCase();
const mapUser = (u) => (u ? { uid: u.uid, email: u.email } : null);

/** Read from server, fall back to the offline cache. */
async function readDocs(q) {
  try { return await getDocs(q); } catch (e) {
    try { return await getDocsFromCache(q); } catch { throw e; }
  }
}

export const backend = {
  name: 'firebase',

  onAuth(cb) { return onAuthStateChanged(auth, (u) => cb(mapUser(u))); },
  async signIn(email, password) {
    const cred = await signInWithEmailAndPassword(auth, key(email), password);
    return mapUser(cred.user);
  },
  signOut() { return fbSignOut(auth); },
  resetPassword(email) { return sendPasswordResetEmail(auth, key(email)); },
  async changePassword(current, next) {
    const u = auth.currentUser;
    if (!u) throw Object.assign(new Error('not signed in'), { code: 'auth/no-user' });
    await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, current));
    await updatePassword(u, next);
  },

  /** Returns { allowed, role } for the signed-in user's email. */
  async access(email) {
    const snap = await getDoc(doc(db, 'allowedEmails', key(email)));
    return snap.exists() ? { allowed: true, role: snap.data().role || 'user' } : { allowed: false, role: null };
  },
  async touchUser(user) {
    setDoc(doc(db, 'users', user.uid), { email: key(user.email), lastLogin: serverTimestamp() }, { merge: true }).catch(() => {});
  },

  /* admin */
  async listAllowed() {
    const snap = await getDocs(collection(db, 'allowedEmails'));
    return snap.docs.map((d) => ({ email: d.id, ...d.data() })).sort((a, b) => a.email.localeCompare(b.email));
  },
  addAllowed(email, role = 'user') {
    return setDoc(doc(db, 'allowedEmails', key(email)), { role, addedAt: serverTimestamp() });
  },
  removeAllowed(email) { return deleteDoc(doc(db, 'allowedEmails', key(email))); },

  /* profiles */
  async listProfiles(uid) {
    const snap = await readDocs(query(collection(db, 'users', uid, 'profiles'), orderBy('createdAt')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
  async saveProfile(uid, profile) {
    const { id, ...data } = profile;
    if (id) {
      setDoc(doc(db, 'users', uid, 'profiles', id), data, { merge: true });
      return { id, ...data };
    }
    const ref = doc(collection(db, 'users', uid, 'profiles'));
    const full = { ...data, createdAt: Date.now() };
    setDoc(ref, full); // not awaited: resolves only after server ack when offline
    return { id: ref.id, ...full };
  },
  async deleteProfile(uid, pid) {
    await this.clearAttempts(uid, pid);
    deleteDoc(doc(db, 'users', uid, 'profiles', pid));
  },

  /* attempts */
  async addAttempt(uid, pid, attempt) {
    // Fire-and-forget: Firestore queues the write while offline.
    addDoc(collection(db, 'users', uid, 'profiles', pid, 'attempts'), attempt).catch((e) => console.warn('attempt sync failed', e));
    return attempt;
  },
  async listAttempts(uid, pid) {
    const snap = await readDocs(query(collection(db, 'users', uid, 'profiles', pid, 'attempts'), orderBy('timestamp', 'desc')));
    return snap.docs.map((d) => ({ id: d.id, pending: d.metadata.hasPendingWrites, ...d.data() }));
  },
  async clearAttempts(uid, pid) {
    const snap = await readDocs(collection(db, 'users', uid, 'profiles', pid, 'attempts'));
    // Batches are limited to 500 writes.
    for (let i = 0; i < snap.docs.length; i += 450) {
      const b = writeBatch(db);
      snap.docs.slice(i, i + 450).forEach((d) => b.delete(d.ref));
      b.commit().catch(() => {});
    }
  },
};
