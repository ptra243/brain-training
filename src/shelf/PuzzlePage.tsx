import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { cats } from '../content/index.ts';
import { isSceneGame } from '../engine/gameKinds.ts';
import type { Case, Difficulty, GameSpec } from '../engine/types.ts';
import { ClueCard } from '../game/ClueCard.tsx';
import { Dialog } from '../game/Dialog.tsx';
import { GAMES, titlesOf } from '../game/games/registry.tsx';
import { DIFFICULTY_LABEL } from '../game/labels.ts';
import type { Action, Progress } from '../game/state.ts';
import { plural } from './findAClue.ts';
import book from './OpenBook.module.css';
import styles from './PuzzlePage.module.css';
import { turnLeaf } from './ribbonMotion.ts';

interface Props {
  c: Case;
  spec: GameSpec;
  progress: Progress;
  dispatch: (a: Action) => void;
  /** The page number printed on its line in the list. */
  page: number;
  level: Difficulty | undefined;
  /** Turn a leaf when it opens (false: it is simply there, as in the dev preview). */
  turn: boolean;
  /** The Case page the leaf is cut from. */
  turnSource: () => HTMLElement | null;
  /** Called when the turned-back leaf has landed and the book should be showing again. */
  onClose: () => void;
}

const LEAF = { leaf: book.leaf, page: book.page, back: book.back, shade: book.shade };

/**
 * One minigame on its own full-width paper page, over the open book. It repeats `GameScreen`'s glue
 * (build the puzzle once, play it, Solve with its confirm, the clues when she finishes) so that
 * screen is untouched. It is rendered on `document.body` to escape the book's transform and clipping.
 */
export function PuzzlePage({ c, spec, progress, dispatch, page, level, turn, turnSource, onClose }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const entry = GAMES[spec.kind];
  const record = progress.games[spec.kind];
  const finished = record && record.status !== 'playing' ? record.status : null;
  const cat = cats[c.number % cats.length];
  const cluesRef = useRef<HTMLElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);

  // The leaf lifts off the Case page onto this one. The page is already here, so it shows under the leaf.
  useLayoutEffect(() => {
    const source = turn ? turnSource() : null;
    if (source) void turnLeaf({ source, dir: 'forward', classes: LEAF });
    backRef.current?.focus({ preventScroll: true });
    // Once, when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = (data: unknown) => dispatch({ type: 'game-save', kind: spec.kind, data });
  const finish = (status: 'won' | 'revealed', data: unknown) => dispatch({ type: 'game-finish', kind: spec.kind, status, data });

  // When she finishes, scroll down to the clues once (not when it opens already finished).
  const wasFinished = useRef(finished);
  useEffect(() => {
    if (!wasFinished.current && finished) {
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      cluesRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    }
    wasFinished.current = finished;
  }, [finished]);

  // The puzzle is rebuilt from the seed once per game; only her moves are saved.
  const puzzle = useMemo(() => entry.build(c, spec), [entry, c, spec]);
  const { view, solved, solveStep } = entry.play(puzzle, {
    c,
    progress,
    dispatch,
    saved: record?.data,
    finished,
    helper: cat,
    onChange: save,
    onFinish: finish,
  });
  const step = solveStep && solveStep !== 'hidden' ? solveStep : null;

  const halfHeard = isSceneGame(spec) ? c.clues.find((cl) => cl.blank?.game === spec.kind) : undefined;
  const unlocked = c.clues.filter((cl) => spec.clues.includes(cl.id));
  const titles = titlesOf(entry);

  // The page turns back to the Case page. This page stays under the leaf until it lands, then goes
  // in the same frame the leaf is removed, so the Case page never shows twice.
  const turnBack = () => {
    if (leaving) return;
    setLeaving(true);
    const source = turnSource();
    if (source) void turnLeaf({ source, dir: 'back', classes: LEAF, onLanded: () => flushSync(onClose) });
    else onClose();
  };

  return createPortal(
    <div className={styles.page} inert={leaving} data-testid="puzzle-page">
      <div className={styles.paper} role="region" aria-label={entry.name}>
        <span className={styles.spine} aria-hidden="true" />
        <span className={styles.edge} aria-hidden="true" />
        <header className={styles.head}>
          <div className={styles.running}>
            <span>
              <span className={styles.num}>p. {page}</span>
              <span className={styles.level}>{[level ? DIFFICULTY_LABEL[level] : null, plural(spec.clues.length, 'clue')].filter(Boolean).join(' · ')}</span>
            </span>
            <span className={styles.aside}>Find a clue</span>
          </div>
          <h1 className={styles.name}>{entry.name}</h1>
          {!finished && solveStep !== 'hidden' ? (
            <button type="button" className={styles.solve} onClick={() => setConfirming(true)}>
              Solve
            </button>
          ) : null}
          <button ref={backRef} type="button" className={styles.ribbon} aria-label="Turn back to page 3" onClick={turnBack}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
        </header>

        <main className={styles.main}>
          <p className={styles.rule}>{entry.rule}</p>

          {halfHeard?.blank && !finished ? (
            <div className={styles.halfHeard}>
              <ClueCard clue={{ ...halfHeard, body: halfHeard.blank.teaser }} guests={c.guests} compact />
              <p className={styles.pencil}>Half-heard. Solve the puzzle to hear the room.</p>
            </div>
          ) : null}

          <div className="game-body">{view}</div>

          {finished ? (
            <section ref={cluesRef} className={styles.won} aria-live="polite">
              <h2 className={styles.wonTitle}>{titles[finished]}</h2>
              {finished === 'revealed' ? <p className={styles.by}>Solved by {cat}</p> : null}
              <ul className={styles.clues}>
                {isSceneGame(spec) && !c.sceneGiven && (
                  <li className={styles.scene} style={{ animationDelay: '120ms' }}>
                    {spec.scene.text}
                  </li>
                )}
                {unlocked.map((u, i) => (
                  <li key={u.id} style={{ animationDelay: `${120 + (i + 1) * 140}ms` }}>
                    <ClueCard clue={u} guests={c.guests} compact />
                  </li>
                ))}
              </ul>
              <button type="button" className={styles.turnBack} onClick={turnBack}>
                Turn back to page 3
              </button>
            </section>
          ) : null}
        </main>

        {confirming && (
          <Dialog placement="center" labelId="solve-title" onClose={() => setConfirming(false)}>
            <h2 id="solve-title">{step ? step.title : 'Solve this puzzle?'}</h2>
            <p className="dialog-text">{step ? step.text : "Are you sure? This can't be undone. You'll see the answer and still get the clues."}</p>
            <div className="dialog-actions">
              <button data-autofocus className="secondary" onClick={() => setConfirming(false)}>
                Keep playing
              </button>
              <button
                className="primary"
                onClick={() => {
                  setConfirming(false);
                  if (step) step.run();
                  else finish('revealed', solved());
                }}
              >
                {step ? 'Solve this step' : 'Solve it'}
              </button>
            </div>
          </Dialog>
        )}
      </div>
    </div>,
    document.body,
  );
}
