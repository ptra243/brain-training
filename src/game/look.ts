/** Her look: the classic casebook or the #shelf library. Its own key, so it is not part of any case save. */
export type Look = 'classic' | 'shelf';

export const LOOK_KEY = 'brain-training-look';

export function loadLook(): Look {
  try {
    return localStorage.getItem(LOOK_KEY) === 'shelf' ? 'shelf' : 'classic';
  } catch {
    return 'classic';
  }
}

export function saveLook(look: Look): void {
  try {
    localStorage.setItem(LOOK_KEY, look);
  } catch {
    // Storage is blocked or full; she keeps the look for this visit only.
  }
}

/** Does this address open the shelf? `#shelf...` always; the address with no hash when she chose Shelf. Everything else is not the shelf. */
export function opensShelf(hash: string, look: Look): boolean {
  if (hash === '#shelf' || hash.startsWith('#shelf/')) return true;
  return (hash === '' || hash === '#') && look === 'shelf';
}

/** Saves the look and loads that shell: the address with no hash is where each look decides (see `main.tsx`). */
export function chooseLook(look: Look): void {
  saveLook(look);
  window.location.assign(window.location.pathname + window.location.search);
}
