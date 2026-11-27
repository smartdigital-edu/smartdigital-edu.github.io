/**
 * Tiny i18n layer. UI strings live in en.json / ms.json.
 * Content items may be plain strings or { en, ms } objects -> use tx().
 */
import en from './en.json';
import ms from './ms.json';
import { store } from '../storage.js';

const DICTS = { en, ms };
const listeners = new Set();
let lang = store.get('lang', 'en');

export const getLang = () => lang;

export function setLang(next) {
  if (!DICTS[next] || next === lang) return;
  lang = next;
  store.set('lang', next);
  document.documentElement.lang = next;
  listeners.forEach((fn) => fn(next));
}

/** Subscribe to language changes. Returns an unsubscribe function. */
export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Translate a UI key, filling {placeholders} from vars. */
export function t(key, vars = {}) {
  const raw = DICTS[lang][key] ?? DICTS.en[key] ?? key;
  return raw.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
}

/** Localise a content value: string | {en, ms}. */
export function tx(value, forceLang) {
  if (value == null) return '';
  if (typeof value !== 'object') return String(value);
  const l = forceLang || lang;
  return value[l] ?? value.en ?? value.ms ?? '';
}

/** BCP-47 voice language for speech synthesis. */
export const speechLang = (l = lang) => (l === 'ms' ? 'ms-MY' : 'en-GB');
