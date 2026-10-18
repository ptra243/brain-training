import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { CaseInspector } from './dev/CaseInspector.tsx';
import { Casebook } from './game/Casebook.tsx';
import './styles.css';

// The dev case inspector lives at #dev; everything else is the game.
const isDev = window.location.hash === '#dev';
if (isDev) document.body.classList.add('dev');

createRoot(document.getElementById('root')!).render(<StrictMode>{isDev ? <CaseInspector /> : <Casebook />}</StrictMode>);

window.addEventListener('hashchange', () => window.location.reload());

// Pick up new deploys without a hard refresh. The service worker only looks for
// a new version when a page loads, and on her phone the app stays open in the
// background, so also check whenever she comes back to it and once an hour.
// A new version takes over and reloads the page; her moves are already saved.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    const check = () => {
      if (navigator.onLine) registration.update().catch(() => {});
    };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
    setInterval(check, 60 * 60 * 1000);
  },
});
