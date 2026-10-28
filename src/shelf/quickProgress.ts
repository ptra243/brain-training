// How #shelf writes her Quick save: the same `reduce` the Casebook uses, then `saveQuick` with her
// full ref and run-history id kept. Plain TS so it is tested without React.

import type { Case } from '../engine/types.ts';
import type { CaseRef } from '../engine/caseRef.ts';
import { emptyProgress, reduce, type Action, type Progress } from '../game/state.ts';
import type { QuickSave } from '../game/storage.ts';

/** The Quick save for a case just built by Play: her ref, no moves, no history row yet (as `App`'s `startCase`). */
export function startNewQuick(made: { ref: CaseRef }): QuickSave {
  return { ref: made.ref, progress: emptyProgress() };
}

/** What `loadQuick` gave back, apart from her moves: kept so each write puts it back unchanged. */
export type SaveKey = Pick<QuickSave, 'ref' | 'historyId'> & { ref: CaseRef };

/**
 * Applies one action to her progress and, when there is a save to write to, writes it. `write` is
 * `saveQuick` on the real page; the dev preview passes no key, so nothing is ever written.
 */
export function advance(c: Case, base: Progress, action: Action, key: SaveKey | null, write: (q: QuickSave) => void): Progress {
  const progress = reduce(c, base, action);
  if (key) write({ ref: key.ref, progress, historyId: key.historyId });
  return progress;
}
