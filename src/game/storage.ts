// Saved progress lives in this browser only. Storage can be unavailable
// (private mode, blocked site data), so every access is guarded and the game
// still works without it, just without remembering.

import type { QuickRef } from '../engine/caseRef.ts';
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

/** The Quick start case in progress (there is only ever one) and her moves in it. */
export interface QuickSave {
  ref: QuickRef;
  progress: Progress;
}

export function loadQuick(): QuickSave | null {
  const saved = read<QuickSave>('quick');
  if (!saved?.ref || typeof saved.ref.code !== 'string' || !saved.ref.difficulty || !saved.ref.length) return null;
  return { ref: saved.ref, progress: { ...emptyProgress(), ...saved.progress } };
}

export const saveQuick = (q: QuickSave) => write('quick', q);

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
export type Screen = 'home' | 'case' | 'campaign' | 'campaign-setup';

export const loadScreen = (): Screen => {
  const s = read<Screen>('screen');
  // 'campaign-setup' is never restored: reopening the app lands on home.
  return s === 'case' || s === 'campaign' ? s : 'home';
};

export const saveScreen = (s: Screen) => write('screen', s);

/** Forget the Quick start case, the campaign and where she was (the error screen's way out of a bad save). */
export function clearSaves() {
  try {
    for (const key of ['quick', 'campaign', 'screen']) localStorage.removeItem(PREFIX + key);
  } catch {
    // Nothing to clear.
  }
}
