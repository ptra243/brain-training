import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { DevPage } from './dev/DevPage.tsx';
import { App } from './game/App.tsx';
import { ErrorBoundary } from './game/ErrorBoundary.tsx';
import { loadLook, opensShelf } from './game/look.ts';
import { ShelfRoute } from './shelf/ShelfRoute.tsx';
import './styles.css';

// The dev index lives at #dev, the case inspector at #dev/cases and the previews at #dev/<id>, in their own chunks; everything else is the game.
const isDev = window.location.hash === '#dev' || window.location.hash.startsWith('#dev/');
if (isDev) document.body.classList.add('dev');

// The second shell lives at #shelf and #shelf/..., in its own chunk; the address with no hash is still the game.
// With no hash it is whichever look she chose in Options.
const isShelf = !isDev && opensShelf(window.location.hash, loadLook());
if (isShelf) document.body.classList.add('shelf');
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDev ? (
      <DevPage />
    ) : isShelf ? (
      <ShelfRoute />
    ) : (
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    )}
  </StrictMode>,
);

window.addEventListener('hashchange', () => window.location.reload());

// Her progress lives only in localStorage, and Chrome may evict it under storage
// pressure. Ask to keep it; the browser may say no, and that is fine.
try {
  const storage = navigator.storage;
  if (storage?.persist && storage.persisted) {
    storage
      .persisted()
      .then((already) => (already ? true : storage.persist()))
      .catch(() => {});
  }
} catch {
  // Not available here; nothing to do.
}

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
