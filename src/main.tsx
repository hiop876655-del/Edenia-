import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { APP_BUILD_VERSION } from './version';

// Auto-purge stale browser cache on new build version release
try {
  const LAST_STORED_VER_KEY = 'idenia_app_build_version';
  const storedVer = localStorage.getItem(LAST_STORED_VER_KEY);
  if (storedVer !== APP_BUILD_VERSION) {
    localStorage.setItem(LAST_STORED_VER_KEY, APP_BUILD_VERSION);
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => caches.delete(key).catch(() => {}));
      }).catch(() => {});
    }
  }
} catch {}

// Actively purge any legacy service workers & caches to ensure 100% live updates on Netlify and browsers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().catch(() => {});
    }
  }).catch(() => {});
}

if (typeof window !== 'undefined' && 'caches' in window) {
  caches.keys().then((keys) => {
    keys.forEach((key) => {
      caches.delete(key).catch(() => {});
    });
  }).catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
