// Saved progress lives in this browser only. Storage can be unavailable
// (private mode, blocked site data), so every access is guarded and the game
// still works without it, just without remembering.

import { PICK_ORDER, pickedInOrder, type CaseRef, type PickedGame } from '../engine/caseRef.ts';
import type { CampaignSave } from './campaignSave.ts';
import type { History } from './history.ts';
import { PLAY_VERSION, sanitizeCampaign, sanitizeHistory, sanitizeQuick } from './saveGuards.ts';
import type { Progress } from './state.ts';

// v5: the case board puzzle stands in for a game in some cases, which changes those cases.
// v6: Nosing around deals its question wordings from a shuffled deck, which changes those puzzles.
// v7: Nosing around medium and hard boards are shorter, every roll stops first, and a wrong obstacle answer backs the cat off.
// v8: the real cast of 10 guests, and every case has a named victim; seating changes every case.
// v9: cases are set in one of six houses (rotated or mirrored), which changes every case.
// v10: the lodge's Nosing around medium and hard boards are shorter (92-100 squares, was 100-110).
// v11: word searches have no blank squares (the hidden word is placed last), which changes their grids.
const PREFIX = 'brain-training:v11:';

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Not saved; nothing else to do.
  }
}

/** The Quick case in progress, Play or an old Quick start (there is only ever one) and her moves in it. */
export interface QuickSave {
  ref: CaseRef;
  progress: Progress;
  /** Id of its run-history row once recorded (`history.ts`). */
  historyId?: string;
}

// What comes back is checked in `saveGuards.ts`; a bad save is dropped or repaired there.
export const loadQuick = (): QuickSave | null => sanitizeQuick(read('quick'));

export const saveQuick = (q: QuickSave) => write('quick', { ...q, playVersion: PLAY_VERSION });

/** The campaign she's on (one at a time). */
export const loadCampaign = (): CampaignSave | null => sanitizeCampaign(read('campaign'));

export const saveCampaign = (c: CampaignSave) => write('campaign', c);

/** Finished runs (rows and running totals). Kept when the saves are cleared; a damaged one reads as empty. */
export const loadHistory = (): History => sanitizeHistory(read('history'));

export const saveHistory = (h: History) => write('history', h);

/** Where she was: the home screen, her Quick start case or her campaign, so reopening the app goes back there. */
export type Screen = 'home' | 'case' | 'campaign' | 'campaign-setup' | 'pick' | 'record';

export const loadScreen = (): Screen => {
  const s = read('screen');
  // 'campaign-setup', 'pick' and 'record' are never restored: reopening the app lands on home.
  return s === 'case' || s === 'campaign' ? s : 'home';
};

export const saveScreen = (s: Screen) => write('screen', s);

/** The games she last ticked in "Choose games", so the picker starts there. */
export function loadPicks(): PickedGame[] {
  const saved = read('picks');
  if (!Array.isArray(saved)) return [];
  return pickedInOrder(saved.filter((g): g is PickedGame => PICK_ORDER.includes(g)));
}

export const savePicks = (games: readonly PickedGame[]) => write('picks', games);

/** Nosing around's "Auto-roll" switch, remembered per device (off until she turns it on). */
export const loadAutoRoll = (): boolean => read('autoRoll') === true;

export const saveAutoRoll = (on: boolean) => write('autoRoll', on);

/** The case board's "Rooms" overlay, remembered per device (off until she turns it on). */
export const loadRoomsOverlay = (): boolean => read('roomsOverlay') === true;

export const saveRoomsOverlay = (on: boolean) => write('roomsOverlay', on);

/** Forget the Quick start case, the campaign and where she was (the error screen's way out of a bad save). */
export function clearSaves() {
  try {
    for (const key of ['quick', 'campaign', 'screen']) localStorage.removeItem(PREFIX + key);
  } catch {
    // Nothing to clear.
  }
}
