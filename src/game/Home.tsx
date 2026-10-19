import { useState, type ReactNode } from 'react';
import { DIFFICULTIES, LENGTHS, type Length } from '../engine/settings.ts';
import { caseCode, type Cast, type QuickRef } from '../engine/caseRef.ts';
import type { Case, Difficulty } from '../engine/types.ts';
import { Picker } from './AccusePanel.tsx';
import { DIFFICULTY_LABEL } from './Casebook.tsx';
import { Dialog } from './Dialog.tsx';
import { caseTitle } from './names.ts';
import { puzzlesDone, type Progress } from './state.ts';

const LENGTH_LABEL: Record<Length, string> = { short: 'Short', normal: 'Normal', long: 'Long' };
const CASTS: readonly Cast[] = ['classic', 'big'];
const CAST_LABEL: Record<Cast, string> = { classic: '4 or 5', big: '7' };
const CAST_HINT: Record<Cast, string> = {
  classic: 'Everyone has their own room and weapon.',
  big: 'Rooms are shared and two guests have no weapon. The killer was alone with the body.',
};
type Finish = 'off' | 'on';
const FINISH_LABEL: Record<Finish, string> = { off: 'No', on: 'Yes' };
export const END_BOARD_HINT = 'A Board tab: fit your clues together as pieces to see who is still unaccounted for before you accuse.';

const LENGTH_HINT: Record<Length, string> = {
  short: 'One puzzle besides the word game.',
  normal: 'Two puzzles besides the word game.',
  long: 'Three puzzles besides the word game.',
};

interface Props {
  current: { ref: QuickRef; c: Case; progress: Progress } | null;
  onContinue: () => void;
  onStart: (difficulty: Difficulty, length: Length, cast: Cast, endBoard: boolean) => void;
  /** The campaign card, below Quick start. */
  campaign: ReactNode;
}

/** Where she starts: her case in progress, a new Quick start case, and the campaign. */
export function Home({ current, onContinue, onStart, campaign }: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>(current?.ref.difficulty ?? 'medium');
  const [length, setLength] = useState<Length>(current?.ref.length ?? 'normal');
  const [cast, setCast] = useState<Cast>(current?.ref.cast ?? 'classic');
  const [finish, setFinish] = useState<Finish>(current?.ref.endBoard ? 'on' : 'off');
  const [confirming, setConfirming] = useState(false);
  const unfinished = current !== null && !current.progress.solved;
  const begin = () => onStart(difficulty, length, cast, finish === 'on');
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
          <p className="home-case">{caseTitle(current.ref)}</p>
          <p className="muted">
            {DIFFICULTY_LABEL[current.ref.difficulty]}, {LENGTH_LABEL[current.ref.length].toLowerCase()} length{current.ref.cast === 'big' ? ', 7 guests' : ''} ·{' '}
            {current.progress.solved ? 'solved' : `${done.done} of ${done.total} puzzles done`} · case code {caseCode(current.ref)}
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
        <Picker legend="Guests" options={CASTS} value={cast} onChange={(v) => setCast(v as Cast)} name={(v) => CAST_LABEL[v as Cast]} />
        <p className="muted home-lead">{CAST_HINT[cast]}</p>
        <Picker legend="Board tab" options={['off', 'on']} value={finish} onChange={(v) => setFinish(v as Finish)} name={(v) => FINISH_LABEL[v as Finish]} />
        <p className="muted home-lead">{END_BOARD_HINT}</p>
        <button className={unfinished ? 'secondary' : 'primary'} onClick={() => (unfinished ? setConfirming(true) : begin())}>
          Start a new case
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
                begin();
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
