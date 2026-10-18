import { useState } from 'react';
import { DIFFICULTIES, LENGTHS, type Length } from '../engine/settings.ts';
import type { QuickRef } from '../engine/caseRef.ts';
import type { Case, Difficulty } from '../engine/types.ts';
import { Picker } from './AccusePanel.tsx';
import { DIFFICULTY_LABEL } from './Casebook.tsx';
import { Dialog } from './Dialog.tsx';
import { puzzlesDone, type Progress } from './state.ts';

const LENGTH_LABEL: Record<Length, string> = { short: 'Short', normal: 'Normal', long: 'Long' };
const LENGTH_HINT: Record<Length, string> = {
  short: 'One puzzle besides the word game.',
  normal: 'Two puzzles besides the word game.',
  long: 'Three puzzles besides the word game.',
};

interface Props {
  current: { ref: QuickRef; c: Case; progress: Progress } | null;
  onContinue: () => void;
  onStart: (difficulty: Difficulty, length: Length) => void;
}

/** Where she starts: her case in progress, a new Quick start case, and the campaign to come. */
export function Home({ current, onContinue, onStart }: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>(current?.ref.difficulty ?? 'medium');
  const [length, setLength] = useState<Length>(current?.ref.length ?? 'normal');
  const [confirming, setConfirming] = useState(false);
  const unfinished = current !== null && !current.progress.solved;
  const done = current && puzzlesDone(current.c, current.progress);

  return (
    <div className="home">
      <header className="home-header">
        <h1>Casebook</h1>
        <p>Solve a murder, one puzzle at a time.</p>
      </header>

      {current && done && (
        <article className="card">
          <h2>Your case</h2>
          <p className="home-case">Case {current.c.code}</p>
          <p className="muted">
            {DIFFICULTY_LABEL[current.ref.difficulty]}, {LENGTH_LABEL[current.ref.length].toLowerCase()} length ·{' '}
            {current.progress.solved ? 'solved' : `${done.done} of ${done.total} puzzles done`}
          </p>
          <button className={unfinished ? 'primary' : 'secondary'} onClick={onContinue}>
            {unfinished ? 'Continue' : 'Look back at it'}
          </button>
        </article>
      )}

      <article className="card">
        <h2>Quick start</h2>
        <p className="muted home-lead">A new case, as often as you like.</p>
        <Picker
          legend="Difficulty"
          options={DIFFICULTIES}
          value={difficulty}
          onChange={(d) => setDifficulty(d as Difficulty)}
          name={(d) => DIFFICULTY_LABEL[d as Difficulty]}
        />
        <Picker legend="Length" options={LENGTHS} value={length} onChange={(l) => setLength(l as Length)} name={(l) => LENGTH_LABEL[l as Length]} />
        <p className="muted home-lead">{LENGTH_HINT[length]}</p>
        <button className={unfinished ? 'secondary' : 'primary'} onClick={() => (unfinished ? setConfirming(true) : onStart(difficulty, length))}>
          Start a new case
        </button>
      </article>

      <article className="card home-soon">
        <h2>Campaign</h2>
        <p className="muted">One long mystery over a whole night. Coming soon.</p>
      </article>

      {confirming && current && (
        <Dialog placement="center" labelId="new-case-title" onClose={() => setConfirming(false)}>
          <h2 id="new-case-title">Start a new case?</h2>
          <p className="dialog-text">Case {current.c.code} isn't solved yet. A new case replaces it.</p>
          <div className="dialog-actions">
            <button data-autofocus className="secondary" onClick={() => setConfirming(false)}>
              Keep playing
            </button>
            <button
              className="primary"
              onClick={() => {
                setConfirming(false);
                onStart(difficulty, length);
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
