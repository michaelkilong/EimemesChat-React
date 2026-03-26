import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { AppProvider } from './context/AppContext';
import './styles/globals.css';

// ── OS Font Detection ─────────────────────────────────────────────
// Apply font class to html element so CSS can target it
const ua = navigator.userAgent;
if (/android/i.test(ua)) {
  document.documentElement.classList.add('os-android');
} else if (/iphone|ipad|ipod/i.test(ua)) {
  document.documentElement.classList.add('os-ios');
} else if (/macintosh|mac os/i.test(ua)) {
  document.documentElement.classList.add('os-mac');
} else {
  document.documentElement.classList.add('os-other');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// ── Service Worker — auto-reload on new deployment ────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(reg => {
    // Check for updates every time the page loads
    reg.update();

    // When a new SW is waiting, activate it immediately and reload
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New version available — tell SW to skip waiting then reload
          newWorker.postMessage('skipWaiting');
          window.location.reload();
        }
      });
    });
  });

  // Reload when SW takes control (after skipWaiting)
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) { refreshing = true; window.location.reload(); }
  });
}
