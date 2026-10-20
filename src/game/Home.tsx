import { useState, type ReactNode } from 'react';
import { caseCode, type CaseRef } from '../engine/caseRef.ts';
import type { Case } from '../engine/types.ts';
import { DIFFICULTY_LABEL } from './Casebook.tsx';
import { Dialog } from './Dialog.tsx';
import { caseTitle } from './names.ts';
import { puzzlesDone, type Progress } from './state.ts';

const LENGTH_LABEL = { short: 'Short', normal: 'Normal', long: 'Long' } as const;

/** The final puzzle before she accuses: the grid alone, or the jigsaw (the end board) as well. Campaigns pick one. */
export type Finish = 'grid' | 'jigsaw';
export const FINISHES: readonly Finish[] = ['grid', 'jigsaw'];
export const FINISH_LABEL: Record<Finish, string> = { grid: 'Grid', jigsaw: 'Jigsaw' };
export const FINISH_HINT: Record<Finish, string> = {
  grid: 'Work out who was where on the map and grid, then accuse.',
  jigsaw: 'A Jigsaw tab instead of the grid: fit your clues together as pieces to see who is still unaccounted for before you accuse.',
};

interface Props {
  current: { ref: CaseRef; c: Case; progress: Progress } | null;
  onContinue: () => void;
  /** Start a new Play case. */
  onStart: () => void;
  /** The campaign card, below Quick play. */
  campaign: ReactNode;
}

/** The line under her case's name. Old Quick start saves keep their own wording. */
function caseLine(ref: CaseRef, c: Case, progress: Progress) {
  const { done, total } = puzzlesDone(c, progress);
  const code = `case code ${caseCode(ref)}`;
  if (ref.mode === 'play') {
    return `${DIFFICULTY_LABEL[c.difficulty]} · ${progress.solved ? 'solved' : `${done} of ${total} games played`} · ${code}`;
  }
  return `${DIFFICULTY_LABEL[ref.difficulty]}, ${LENGTH_LABEL[ref.length].toLowerCase()} length${ref.cast === 'big' ? ', 7 guests' : ''} · ${
    progress.solved ? 'solved' : `${done} of ${total} puzzles done`
  } · ${code}`;
}

/** Where she starts: her case in progress, a new Quick play case, and the campaign. */
export function Home({ current, onContinue, onStart, campaign }: Props) {
  const [confirming, setConfirming] = useState(false);
  const unfinished = current !== null && !current.progress.solved;

  return (
    <div className="home">
      <header className="home-header">
        <h1>Casebook</h1>
        <p>Solve a murder, one puzzle at a time.</p>
      </header>

      {current && (
        <article className="card">
          <h2>Your case</h2>
          <p className="home-case">{caseTitle(current.ref)}</p>
          <p className="muted">{caseLine(current.ref, current.c, current.progress)}</p>
          <button className={unfinished ? 'primary' : 'secondary'} onClick={onContinue}>
            {unfinished ? 'Continue' : 'Look back at it'}
          </button>
        </article>
      )}

      <article className="card">
        <h2>Quick play</h2>
        <p className="muted home-lead">A new case, with a mix of puzzles.</p>
        <button className={unfinished ? 'secondary' : 'primary'} onClick={() => (unfinished ? setConfirming(true) : onStart())}>
          New case
        </button>
      </article>

      {campaign}

      {confirming && current && (
        <Dialog placement="center" labelId="new-case-title" onClose={() => setConfirming(false)}>
          <h2 id="new-case-title">Start a new case?</h2>
          <p className="dialog-text">{caseTitle(current.ref)} isn't solved yet. A new case replaces it.</p>
          <div className="dialog-actions">
            <button data-autofocus className="secondary" onClick={() => setConfirming(false)}>
              Keep playing
            </button>
            <button
              className="primary"
              onClick={() => {
                setConfirming(false);
                onStart();
              }}
            >
              Start new
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
