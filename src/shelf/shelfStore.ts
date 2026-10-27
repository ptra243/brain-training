// The two things the shelf remembers, in their own keys. They are not the game save (`storage.ts`):
// losing them only shows the opening again or the finished lines again. Every access is guarded.

const OPENED = 'brain-training:shelf:opened:';
const HIDE = 'brain-training:shelf:hide-finished';

export function openingSeen(ref: string): boolean {
  try {
    return localStorage.getItem(OPENED + ref) === '1';
  } catch {
    return false;
  }
}

export function markOpeningSeen(ref: string) {
  try {
    localStorage.setItem(OPENED + ref, '1');
  } catch {
    // Not remembered; the opening shows again next time.
  }
}

export function loadHideFinished(): boolean {
  try {
    return localStorage.getItem(HIDE) === '1';
  } catch {
    return false;
  }
}

export function saveHideFinished(hide: boolean) {
  try {
    localStorage.setItem(HIDE, hide ? '1' : '0');
  } catch {
    // Not remembered.
  }
}
