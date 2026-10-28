import { useEffect, useRef, useState } from 'react';
import { caseCode } from '../engine/caseRef.ts';
import type { CaseRef } from '../engine/caseRef.ts';
import type { Case, GameKind } from '../engine/types.ts';
import { generate } from '../game/caseClient.ts';
import type { Action, Progress } from '../game/state.ts';
import { loadQuick, saveQuick } from '../game/storage.ts';
import { advance, planNewCase, startNewQuick, withEndBoard, type SaveKey } from './quickProgress.ts';
import type { Subject } from '../game/state.ts';
import { hasJigsaw, type NotebookTab } from './notebook.ts';

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
  notebook?: { open?: boolean; half?: boolean; tab?: NotebookTab; subject?: Subject };
  /** Turn the book to this section (an index into SECTIONS) once it is open. Sample only; with `startOpen`. */
  section?: number;
  /** Sample only: pretend the ref chose the Jigsaw finish (a sample has no ref). */
  endBoard?: boolean;
}

/** Her Quick case, rebuilt, with her moves and a way to make one (saved to the shared Quick save). */
export interface QuickBook {
  c: Case;
  progress: Progress;
  ref: string;
  dispatch: (a: Action) => void;
  /** The save's own ref, for the title; none for a sample. */
  fullRef: CaseRef | null;
  /** The notebook shows Jigsaw in place of Grid (`hasJigsaw`). */
  jigsaw: boolean;
}

interface Loaded {
  c: Case;
  progress: Progress;
  ref: string;
  /** Her save's own ref and history id, to write back; none for a sample. */
  key: SaveKey | null;
}

/** Where the case comes from: her Quick save, or a new Play case built now and saved at once. */
export type BookMode = 'saved' | 'new';

/**
 * Rebuilds her saved Quick case, or (mode 'new') builds a Play case and saves it as the Quick save.
 * Null while it builds, false when there is none or it failed. The effect's `live` flag drops a build
 * that StrictMode's first run started: only the surviving run saves, so one save is written.
 */
function useQuickCase(sample: SampleCase | undefined, mode: BookMode): Loaded | null | false {
  // Her save is read once; with none, there is nothing to build.
  const [saved] = useState(() => (sample || mode === 'new' ? null : loadQuick()));
  const [built, setBuilt] = useState<Loaded | false | null>(null);
  useEffect(() => {
    if (sample) return;
    let live = true;
    if (mode === 'new') {
      // Her last settings, as the Casebook's New case does.
      const plan = planNewCase(loadQuick());
      (plan.job.kind === 'quick' ? generate(plan.job) : generate({ kind: 'play' })).then(
        (built) => {
          if (!live) return;
          const made = { c: built.c, ref: withEndBoard(built.ref, plan.endBoard) };
          const save = startNewQuick(made);
          saveQuick(save);
          setBuilt({ c: made.c, progress: save.progress, ref: caseCode(made.ref), key: { ref: made.ref, historyId: undefined } });
        },
        (err) => {
          console.error(err);
          if (live) setBuilt(false);
        },
      );
    } else if (saved) {
      generate({ kind: 'case', ref: saved.ref }).then(
        (c) => live && setBuilt({ c, progress: saved.progress, ref: caseCode(saved.ref), key: { ref: saved.ref, historyId: saved.historyId } }),
        () => live && setBuilt(false),
      );
    }
    return () => {
      live = false;
    };
  }, [saved, mode, sample]);
  if (sample) return { ...sample, key: null };
  return mode === 'new' || saved ? built : false;
}

/**
 * Her Quick case and her progress, shared by the Case page and the notebook. Null while it builds,
 * false when there is none (or it failed to build, in the New case book). Her moves are written
 * to the Quick save (the Casebook sees them); a sample case never writes.
 */
export function useQuickBook(sample: SampleCase | undefined, mode: BookMode): QuickBook | null | false {
  const loaded = useQuickCase(sample, mode);
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
  return { c, ref, progress: moves ?? loaded.progress, dispatch, fullRef: key?.ref ?? null, jigsaw: hasJigsaw(c, key?.ref ?? null, sample?.endBoard) };
}
