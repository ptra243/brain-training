import { useEffect, useMemo, useState } from 'react';
import { nosingBonuses, nosingLadders, nosingSnakes } from '../../content/nosing.ts';
import {
  nosingHint,
  nosingStep,
  nosingView,
  type NosingHint,
  type NosingMove,
  type NosingPuzzle,
  type NosingState,
  type NosingView,
} from '../../games/nosing.ts';
import { NOSING_LEVELS } from '../../games/nosingBoard.ts';
import type { Op } from '../../games/lock.ts';
import { HintButton, HintNote } from './Hints.tsx';
import { NosingBoardView } from './NosingBoardView.tsx';
import { NosingLock } from './NosingLock.tsx';
import { NosingSpeed } from './NosingSpeed.tsx';
import { NumberPad } from './NumberPad.tsx';
import { PIPS, diceFaces, squareName, stepText, walkSteps } from './nosingUi.ts';
import type { GameProps } from './types.ts';

/**
 * Props of the Nosing around screen.
 *
 * - `puzzle`: built once per game screen (`buildNosing`). Never rebuilt per render.
 * - `data`: her saved state, `{ moves, hints, solved? }`. Read with `nosingView`;
 *   change only with `nosingStep` (a move) and `nosingHint` (a cat hint).
 * - `finished`: set once the game is over. Solve lives in `GameScreen`.
 * - `onChange(next)`: save an in-progress state. When the lock opens by her own
 *   play, `onFinish(view.finished, next)` is called instead.
 * - `onFound(ids)`: search clues found so far, so they unlock at once.
 */
export interface NosingScreenProps extends GameProps<NosingPuzzle, NosingState> {
  onFound: (clueIds: string[]) => void;
}

/** How long the cat takes over each square, in ms. */
const WALK_MS = 170;

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Die({ face }: { face: number }) {
  return (
    <svg className="die" viewBox="0 0 30 30" role="img" aria-label={`A ${face}`}>
      <rect x="1.5" y="1.5" width="27" height="27" rx="5" />
      {PIPS[face].map(([c, r], i) => (
        <circle key={i} cx={7.5 + c * 7.5} cy={7.5 + r * 7.5} r="2.4" />
      ))}
    </svg>
  );
}

/** The cat's position on screen: it walks the squares of its trail one by one. */
function useWalk(steps: readonly number[]): { at: number; walking: boolean } {
  const last = steps.length - 1;
  const [idx, setIdx] = useState(last);
  useEffect(() => {
    if (idx >= last) return;
    const t = setTimeout(() => setIdx(reducedMotion() ? last : idx + 1), reducedMotion() ? 0 : WALK_MS);
    return () => clearTimeout(t);
  }, [idx, last]);
  const shown = Math.min(idx, last);
  return { at: steps[shown] ?? 0, walking: shown < last };
}

function lockHintText(helper: string, h: Extract<NosingHint, { kind: 'lock' }>['hint'], tiles: NosingView['tiles']): string {
  switch (h.kind) {
    case 'tiles':
      return `${helper} pats the ${tiles[h.a]?.value ?? '?'} and the ${tiles[h.b]?.value ?? '?'}. Try joining those two.`;
    case 'move':
      return `${helper} joined them for you: ${stepText(h.step)}.`;
    case 'way':
      return `${helper} scratches out the whole way: ${h.steps.map(stepText).join(', then ')}.`;
    case 'submit':
      return `${helper} sits on the number you have made. That is the one to try.`;
    case 'undo':
      return `${helper} shakes their head at the last step. Try undoing it.`;
  }
}

export function NosingGame({ puzzle, data, finished, helper = 'The cat', onChange, onFinish, onFound }: NosingScreenProps) {
  const view = nosingView(puzzle, data);
  const [hint, setHint] = useState<NosingHint | null>(null);
  const [pointed, setPointed] = useState<number[]>([]);
  const [pointUndo, setPointUndo] = useState(false);

  const jumps = useMemo(() => {
    const m = new Map<number, number>();
    puzzle.board.squares.forEach((s, i) => {
      if ((s.kind === 'ladder' || s.kind === 'snake') && s.to !== undefined) m.set(i, s.to);
    });
    return m;
  }, [puzzle]);
  const steps = useMemo(() => walkSteps(view.trail, jumps), [view.trail, jumps]);
  const { at, walking } = useWalk(steps);

  const clearHint = () => {
    setHint(null);
    setPointed([]);
    setPointUndo(false);
  };

  /** Save a new state; search clues unlock at once, and a lock that opens ends the game. */
  const commit = (next: NosingState) => {
    if (next === data) return;
    clearHint();
    const v = nosingView(puzzle, next);
    if (v.finished) {
      onFinish(v.finished, next);
      return;
    }
    if (v.found.length > view.found.length) onFound(v.found);
    onChange(next);
  };
  const play = (move: NosingMove) => commit(nosingStep(puzzle, data, move));

  const askHint = () => {
    const res = nosingHint(puzzle, data);
    if (!res) return;
    let next = res.state;
    setHint(res.hint);
    setPointed([]);
    setPointUndo(false);
    if (res.hint.kind === 'lock') {
      const h = res.hint.hint;
      if (h.kind === 'tiles') setPointed([h.a, h.b]);
      else if (h.kind === 'submit') setPointed([view.tiles.length - 1]);
      else if (h.kind === 'undo') setPointUndo(true);
      else if (h.kind === 'move') {
        // The cat makes this step for her.
        const moved = nosingStep(puzzle, next, { t: 'combine', a: h.move.a, b: h.move.b, op: h.move.op });
        if (moved !== next) next = moved;
      }
    }
    onChange(next);
  };

  const done = finished !== null || view.finished !== null;
  const level = NOSING_LEVELS[puzzle.level];
  const q = view.question;
  const held = (Object.keys(view.bonuses) as (keyof typeof view.bonuses)[]).filter((k) => view.bonuses[k] > 0);
  const canUndo = view.phase === 'lock' && nosingStep(puzzle, data, { t: 'undo' }) !== data;

  const stake = () => {
    if (!q) return null;
    const sq = puzzle.board.squares[q.square];
    if (q.kind === 'snake') {
      const snake = nosingSnakes.find((s) => s.id === sq.contentId);
      return `A slip here sends the cat back to ${squareName(q.slipTo!)}${snake ? ` (${snake.name.toLowerCase()})` : ''}.`;
    }
    if (q.kind === 'ladder') {
      const ladder = nosingLadders.find((l) => l.id === sq.contentId);
      return `Get it right and the cat takes a shortcut to ${squareName(q.climbTo!)}${ladder ? ` (${ladder.name.toLowerCase()})` : ''}. Get it wrong and it walks on.`;
    }
    if (q.clueId) return 'The cat is sniffing about. Get it right and it finds a clue now. Get it wrong and the clue waits for you at the lock.';
    if (q.bonus) {
      const b = nosingBonuses[q.bonus];
      return `Get it right to win: ${b.name.toLowerCase()}. ${b.copy}`;
    }
    return null;
  };

  const questionHint = hint?.kind === 'question' ? hint : null;
  const hintNote = (() => {
    if (!hint) return null;
    if (hint.kind === 'question') {
      if (hint.step === 0) return `${helper} scratches out the first line: ${hint.text}`;
      if (hint.step === 1) return `${helper} paws at three numbers. One of them is right.`;
      return `${helper} taps out the answer: ${hint.answer}.`;
    }
    return lockHintText(helper, hint.hint, view.tiles);
  })();
  const hintBlock = (
    <div className="hint-bar">
      {!done && (
        <div className="hint-row">
          <span />
          <HintButton helper={helper} onAsk={askHint} />
        </div>
      )}
      {hintNote && <HintNote text={hintNote} onClose={clearHint} />}
    </div>
  );

  return (
    <div className="nosing">
      <NosingBoardView puzzle={puzzle} view={view} catAt={at} compact={!walking && !done && (!!q || !!view.speed)} />

      <p className="nosing-strip">
        <span>
          Turn {view.phase === 'open' ? view.turn - 1 : view.turn} · {squareName(at)} of {puzzle.board.path.length}
        </span>
        <span>
          {held.length
            ? held.map((k) => `${nosingBonuses[k].name}${view.bonuses[k] > 1 ? ` ×${view.bonuses[k]}` : ''}`).join(', ')
            : 'No bonuses yet'}
        </span>
      </p>

      {view.messages.length > 0 && view.phase !== 'open' && (
        <div className="nosing-messages card" role="status">
          {view.messages.map((m, i) => (
            <p key={i}>{m}</p>
          ))}
          {view.working && (
            <ul className="working" aria-label="The working">
              {view.working.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {walking && <p className="game-message">The cat is on the move.</p>}

      {!walking && !done && (view.phase === 'roll' || view.phase === 'rolled') && (
        <div className="card nosing-roll">
          <div className="dice" aria-label={view.phase === 'rolled' ? `You rolled ${view.pendingRoll}` : view.lastRoll ? `Last roll ${view.lastRoll}` : 'The dice'}>
            {diceFaces(level.dice, view.phase === 'rolled' ? view.pendingRoll! : (view.lastRoll ?? level.dice)).map((f, i) => (
              <Die key={i} face={f} />
            ))}
          </div>
          {view.phase === 'rolled' ? (
            <>
              <p className="muted">You rolled {view.pendingRoll}.</p>
              <div className="nosing-buttons">
                <button className="primary" onClick={() => play({ t: 'roll' })}>
                  Move
                </button>
                <button className="secondary" onClick={() => play({ t: 'reroll' })}>
                  Re-roll (bonus)
                </button>
              </div>
            </>
          ) : (
            <button className="primary" onClick={() => play({ t: 'roll' })}>
              Roll
            </button>
          )}
        </div>
      )}

      {!walking && !done && q && (
        <div className="card nosing-question">
          {hintBlock}
          <p className="question-text">{q.q.text}</p>
          {stake() && <p className="stake">{stake()}</p>}
          {questionHint && questionHint.choices && (
            <div className="choices" role="group" aria-label="The cat's three choices">
              {questionHint.choices.map((c) => (
                <button key={c} className="secondary" onClick={() => play({ t: 'answer', value: c })}>
                  {c}
                </button>
              ))}
            </div>
          )}
          <NumberPad onSubmit={(value) => play({ t: 'answer', value })} />
        </div>
      )}

      {!walking && !done && view.speed && (
        <div className="card nosing-speed">
          <NosingSpeed
            key={view.speed.square}
            questions={view.speed.questions}
            seconds={view.speed.seconds}
            onEnd={(right) => play({ t: 'speed', right })}
          />
        </div>
      )}

      {(view.phase === 'lock' || view.phase === 'open') && !walking && (
        <div className="card nosing-lock">
          <NosingLock
            puzzle={puzzle}
            view={view}
            open={done}
            canUndo={canUndo}
            pointed={pointed}
            pointUndo={pointUndo}
            hints={hintBlock}
            onCombine={(a, b, op: Op) => play({ t: 'combine', a, b, op })}
            onUndo={() => play({ t: 'undo' })}
            onTry={() => play({ t: 'try' })}
          />
        </div>
      )}

      {done && (
        <p className="game-message" role="status">
          {view.messages[view.messages.length - 1] ?? 'The lock is open.'}
        </p>
      )}
    </div>
  );
}
