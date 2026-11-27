/** Runtime configuration read from Vite env variables (see .env.example). */
const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

/** Demo mode = no Firebase keys, or explicitly forced. Data stays on device. */
export const DEMO_MODE = env.VITE_DEMO_MODE === 'true' || !firebaseConfig.apiKey || !firebaseConfig.projectId;

/** Deployment stage: '' for production, 'staging' for the test site (set by the workflow). */
export const STAGE = env.VITE_STAGE || '';

export const WHATSAPP_NUMBER = (env.VITE_WHATSAPP_NUMBER || '').replace(/\D/g, '');

export function whatsappLink(message = '') {
  const text = encodeURIComponent(message);
  return WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}?text=${text}` : `https://wa.me/?text=${text}`;
}
