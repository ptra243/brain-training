// Saved progress lives in this browser only. Storage can be unavailable
// (private mode, blocked site data), so every access is guarded and the game
// still works without it, just without remembering.

import type { QuickRef } from '../engine/caseRef.ts';
import { emptyProgress, type Progress } from './state.ts';

// v3: games now rotate per case and interrogations were added, so old saves no longer match.
const PREFIX = 'brain-training:v3:';

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

/** Where she was: the home screen or inside her case, so reopening the app goes back there. */
export type Screen = 'home' | 'case';

export const loadScreen = (): Screen => (read<Screen>('screen') === 'case' ? 'case' : 'home');

export const saveScreen = (s: Screen) => write('screen', s);
