import { useMemo, useState } from 'react';
import { cats } from '../../content/index.ts';
import { isSceneGame } from '../../engine/gameKinds.ts';
import type { Case, GameSpec } from '../../engine/types.ts';
import { ClueCard } from '../ClueCard.tsx';
import { Dialog } from '../Dialog.tsx';
import type { Action, Progress } from '../state.ts';
import { GAMES, titlesOf } from './registry.tsx';

interface Props {
  c: Case;
  spec: GameSpec;
  progress: Progress;
  dispatch: (a: Action) => void;
  onBack: () => void;
}

export function GameScreen({ c, spec, progress, dispatch, onBack }: Props) {
  const [confirming, setConfirming] = useState(false);
  const entry = GAMES[spec.kind];
  const record = progress.games[spec.kind];
  const finished = record && record.status !== 'playing' ? record.status : null;

  const save = (data: unknown) => dispatch({ type: 'game-save', kind: spec.kind, data });
  const finish = (status: 'won' | 'revealed', data: unknown) => {
    dispatch({ type: 'game-finish', kind: spec.kind, status, data });
    window.scrollTo({ top: 0 });
  };

  // The puzzle is rebuilt from the seed once per game; only her moves are saved.
  const puzzle = useMemo(() => entry.build(c, spec), [entry, c, spec]);
  const { view, solved } = entry.play(puzzle, {
    c,
    progress,
    dispatch,
    saved: record?.data,
    finished,
    helper: cats[c.number % cats.length],
    onChange: save,
    onFinish: finish,
  });

  // Play word games: the clue this game hides, half heard until she wins.
  const halfHeard = isSceneGame(spec) ? c.clues.find((cl) => cl.blank?.game === spec.kind) : undefined;
  const unlocked = c.clues.filter((cl) => spec.clues.includes(cl.id));
  const titles = titlesOf(entry);

  return (
    <div className="game-screen">
      <header className="game-header">
        <button className="step" aria-label="Back to the casebook" onClick={onBack}>
          ‹
        </button>
        <h1>{entry.name}</h1>
        {!finished ? (
          <button className="solve-link" onClick={() => setConfirming(true)}>
            Solve
          </button>
        ) : (
          <span />
        )}
      </header>

      {finished && (
        <section className="unlocked card" aria-live="polite">
          <h2>{titles[finished]}</h2>
          <ul>
            {isSceneGame(spec) && !c.sceneGiven && (
              <li className="scene-line" style={{ animationDelay: '120ms' }}>
                {spec.scene.text}
              </li>
            )}
            {unlocked.map((u, i) => (
              <li key={u.id} style={{ animationDelay: `${120 + (i + 1) * 140}ms` }}>
                <ClueCard clue={u} compact />
              </li>
            ))}
          </ul>
          <button className="primary" onClick={onBack}>
            Back to the casebook
          </button>
        </section>
      )}

      {halfHeard?.blank && !finished && (
        <div className="half-heard">
          <ClueCard clue={{ ...halfHeard, body: halfHeard.blank.teaser }} compact />
          <p className="muted small">Half-heard. Solve the puzzle to hear the room.</p>
        </div>
      )}

      <div className="game-body">{view}</div>

      {confirming && (
        <Dialog placement="center" labelId="solve-title" onClose={() => setConfirming(false)}>
          <h2 id="solve-title">Solve this puzzle?</h2>
          <p className="dialog-text">Are you sure? This can't be undone. You'll see the answer and still get the clues.</p>
          <div className="dialog-actions">
            <button data-autofocus className="secondary" onClick={() => setConfirming(false)}>
              Keep playing
            </button>
            <button
              className="primary"
              onClick={() => {
                setConfirming(false);
                finish('revealed', solved());
              }}
            >
              Solve it
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
