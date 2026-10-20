// Saved progress lives in this browser only. Storage can be unavailable
// (private mode, blocked site data), so every access is guarded and the game
// still works without it, just without remembering.

import { PICK_ORDER, pickedInOrder, type CaseRef, type PickedGame } from '../engine/caseRef.ts';
import type { CampaignSave } from './campaign.ts';
import { emptyProgress, type Progress } from './state.ts';

// v5: the case board puzzle stands in for a game in some cases, which changes those cases.
const PREFIX = 'brain-training:v5:';

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
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
}

// Bumped when Play cases change, so a saved one isn't replayed against a different case.
// 2: Play cases draw 3 to 5 games and share clues by level.
const PLAY_VERSION = 3;

export function loadQuick(): QuickSave | null {
  const saved = read<QuickSave>('quick');
  if (!saved?.ref || typeof saved.ref.code !== 'string') return null;
  // A Play case is just its code; an old Quick start also needs its levels.
  if (saved.ref.mode !== 'play' && (!saved.ref.difficulty || !saved.ref.length)) return null;
  if (saved.ref.mode === 'play' && saved.ref.games !== undefined && !Array.isArray(saved.ref.games)) return null;
  if (saved.ref.mode === 'play' && (saved as { playVersion?: number }).playVersion !== PLAY_VERSION) return null;
  return { ref: saved.ref, progress: { ...emptyProgress(), ...saved.progress } };
}

export const saveQuick = (q: QuickSave) => write('quick', { ...q, playVersion: PLAY_VERSION });

/** The campaign she's on (one at a time). */
export function loadCampaign(): CampaignSave | null {
  const saved = read<CampaignSave>('campaign');
  if (!saved?.ref || typeof saved.ref.code !== 'string' || !Array.isArray(saved.rounds) || !saved.rounds.length) return null;
  return {
    ...saved,
    victims: saved.victims ?? [],
    rounds: saved.rounds.map((p) => ({ ...emptyProgress(), ...p })),
    picked: saved.rounds.map((_, i) => saved.picked?.[i] ?? []),
    outcome: saved.outcome ?? 'playing',
  };
}

export const saveCampaign = (c: CampaignSave) => write('campaign', c);

/** Where she was: the home screen, her Quick start case or her campaign, so reopening the app goes back there. */
export type Screen = 'home' | 'case' | 'campaign' | 'campaign-setup' | 'pick';

export const loadScreen = (): Screen => {
  const s = read<Screen>('screen');
  // 'campaign-setup' and 'pick' are never restored: reopening the app lands on home.
  return s === 'case' || s === 'campaign' ? s : 'home';
};

export const saveScreen = (s: Screen) => write('screen', s);

/** The games she last ticked in "Choose games", so the picker starts there. */
export function loadPicks(): PickedGame[] {
  const saved = read<unknown>('picks');
  if (!Array.isArray(saved)) return [];
  return pickedInOrder(saved.filter((g): g is PickedGame => PICK_ORDER.includes(g)));
}

export const savePicks = (games: readonly PickedGame[]) => write('picks', games);

/** Forget the Quick start case, the campaign and where she was (the error screen's way out of a bad save). */
export function clearSaves() {
  try {
    for (const key of ['quick', 'campaign', 'screen']) localStorage.removeItem(PREFIX + key);
  } catch {
    // Nothing to clear.
  }
}
