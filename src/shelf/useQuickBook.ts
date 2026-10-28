import { useEffect, useRef, useState } from 'react';
import { caseCode } from '../engine/caseRef.ts';
import type { Case, GameKind } from '../engine/types.ts';
import { generate } from '../game/caseClient.ts';
import type { Action, Progress } from '../game/state.ts';
import { loadQuick, saveQuick } from '../game/storage.ts';
import { advance, type SaveKey } from './quickProgress.ts';
import type { Subject } from '../game/state.ts';
import type { NotebookTab } from './notebook.ts';

/** A case to show without loading her save (the dev preview). */
export interface SampleCase {
  c: Case;
  progress: Progress;
  ref: string;
  /** Skip the opening and show the list. */
  seen?: boolean;
  /** Open this game's puzzle page at once, with no page turn. */
  open?: GameKind;
  /** Start the notebook open on this tab, on a subject page, or just peeking. Never saved. */
  notebook?: { open?: boolean; tab?: NotebookTab; subject?: Subject };
}

/** Her Quick case, rebuilt, with her moves and a way to make one (saved to the shared Quick save). */
export interface QuickBook {
  c: Case;
  progress: Progress;
  ref: string;
  dispatch: (a: Action) => void;
}

interface Loaded {
  c: Case;
  progress: Progress;
  ref: string;
  /** Her save's own ref and history id, to write back; none for a sample. */
  key: SaveKey | null;
}

/** Rebuilds her saved Quick case. Null while it builds, false when there is none. */
function useQuickCase(sample: SampleCase | undefined, enabled: boolean): Loaded | null | false {
  // Her save is read once; with none, there is nothing to build.
  const [saved] = useState(() => (sample || !enabled ? null : loadQuick()));
  const [built, setBuilt] = useState<Loaded | false | null>(null);
  useEffect(() => {
    if (!saved) return;
    let live = true;
    generate({ kind: 'case', ref: saved.ref }).then(
      (c) => live && setBuilt({ c, progress: saved.progress, ref: caseCode(saved.ref), key: { ref: saved.ref, historyId: saved.historyId } }),
      () => live && setBuilt(false),
    );
    return () => {
      live = false;
    };
  }, [saved]);
  if (sample) return { ...sample, key: null };
  return saved ? built : false;
}

/**
 * Her Quick case and her progress, shared by the Case page and the notebook. Null while it builds,
 * false when there is none (or when `enabled` is off, as in the New case book). Her moves are written
 * to the Quick save (the Casebook sees them); a sample case never writes.
 */
export function useQuickBook(sample: SampleCase | undefined, enabled: boolean): QuickBook | null | false {
  const loaded = useQuickCase(sample, enabled);
  // Her latest progress, so two actions in one tick (a save, then a finish) both land.
  const [moves, setMoves] = useState<Progress | null>(null);
  const latest = useRef<Progress | null>(null);
  if (!loaded) return loaded;
  const { c, ref, key } = loaded;
  const dispatch = (a: Action) => {
    const next = advance(c, latest.current ?? loaded.progress, a, key, saveQuick);
    latest.current = next;
    setMoves(next);
  };
  return { c, ref, progress: moves ?? loaded.progress, dispatch };
}
