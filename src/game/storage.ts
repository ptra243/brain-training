// Saved progress lives in this browser only. Storage can be unavailable
// (private mode, blocked site data), so every access is guarded and the game
// still works without it, just without remembering.

import { emptyProgress, type Progress } from './state.ts';

const PREFIX = 'brain-training:v1:';

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

export function loadProgress(caseNumber: number): Progress {
  const saved = read<Progress>(`case:${caseNumber}`);
  return saved ? { ...emptyProgress(), ...saved } : emptyProgress();
}

export const saveProgress = (caseNumber: number, p: Progress) => write(`case:${caseNumber}`, p);

export const loadCurrentCase = () => read<number>('current-case') ?? 1;

export const saveCurrentCase = (n: number) => write('current-case', n);
