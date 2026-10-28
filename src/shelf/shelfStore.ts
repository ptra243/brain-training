import { DEFAULT_TAB, parseTab, type NotebookTab } from './notebook.ts';

// The things the shelf remembers, in their own keys. They are not the game save (`storage.ts`):
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

const NOTEBOOK_TAB = 'brain-training:shelf:notebook-tab';

/** The notebook tab she last used; Clues when none is saved. */
export function loadNotebookTab(): NotebookTab {
  try {
    return parseTab(localStorage.getItem(NOTEBOOK_TAB));
  } catch {
    return DEFAULT_TAB;
  }
}

export function saveNotebookTab(tab: NotebookTab) {
  try {
    localStorage.setItem(NOTEBOOK_TAB, tab);
  } catch {
    // Not remembered; the notebook opens on Clues next time.
  }
}
