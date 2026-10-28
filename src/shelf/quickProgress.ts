// How #shelf writes her Quick save: the same `reduce` the Casebook uses, then `saveQuick` with her
// full ref and run-history id kept. Plain TS so it is tested without React.

import type { Case } from '../engine/types.ts';
import type { CaseRef } from '../engine/caseRef.ts';
import { emptyProgress, reduce, type Action, type Progress } from '../game/state.ts';
import type { QuickSave } from '../game/storage.ts';
import type { CaseJob } from '../game/caseJobs.ts';

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

/** What New case builds: the job, and whether the new ref keeps the end board (as `App`'s New case). */
export interface NewCasePlan {
  job: CaseJob;
  endBoard: boolean;
}

/** The same kind of case as her Quick save (a Play case, or a Quick start one with its settings); Play with none. */
export function planNewCase(saved: Pick<QuickSave, 'ref'> | null): NewCasePlan {
  const ref = saved?.ref;
  if (!ref || ref.mode === 'play') return { job: { kind: 'play' }, endBoard: false };
  return { job: { kind: 'quick', difficulty: ref.difficulty, length: ref.length, cast: ref.cast ?? 'classic' }, endBoard: !!ref.endBoard };
}

/** The built case's ref, with the end board carried over when her last case had it. */
export function withEndBoard(ref: CaseRef, endBoard: boolean): CaseRef {
  return endBoard && ref.mode === 'quick' ? { ...ref, endBoard } : ref;
}
