import { useEffect, useEffectEvent, useMemo, useState, type ReactNode } from 'react';
import { Dialog } from '../Dialog.tsx';
import { loadAutoRoll, saveAutoRoll } from '../storage.ts';
import { nosingBonuses, nosingEmptyLines,nosingDog, nosingLadders, nosingObstacleStakeWrong, nosingSnakes } from '../../content/nosing.ts';
import {
  nosingHint,
  nosingLanding,
  nosingStep,
  searchLine,
  nosingView,
  type NosingHint,
  type NosingMove,
  type NosingPuzzle,
  type NosingState,
  type NosingView,
} from '../../games/nosing.ts';
import { NOSING_LEVELS } from '../../games/nosingBoard.ts';
import { HintButton, HintNote } from './Hints.tsx';
import { NosingBoardView } from './NosingBoardView.tsx';
import { NosingDog, NosingDogResult } from './NosingDog.tsx';
import { NosingKey } from './NosingKey.tsx';
import { NosingLock } from './NosingLock.tsx';
import { NosingSpeed } from './NosingSpeed.tsx';
import { NumberPad } from './NumberPad.tsx';
import { MARK_LABELS, PIPS, diceFaces, markKinds, landingLine, markLine, obstacleReason, squareName, walkSteps } from './nosingUi.ts';
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

/** A view per saved state, so a state replayed once (the commit, then the render) is never replayed again. */
const views = new WeakMap<NosingState, { puzzle: NosingPuzzle; view: NosingView }>();
function viewOf(puzzle: NosingPuzzle, state: NosingState): NosingView {
  const hit = views.get(state);
  if (hit && hit.puzzle === puzzle) return hit.view;
  const view = nosingView(puzzle, state);
  views.set(state, { puzzle, view });
  return view;
}

/** How long the cat takes over each square, in ms. */
const WALK_MS = 170;

/** How long a landing pop-up stays before it closes itself. */
const LANDING_MS = 3000;
/** Auto-roll pauses: before a roll, before a roll after messages she may read, and on the dice before the move. */
const AUTO_ROLL_MS = 600;
const AUTO_READ_MS = 2500;
const AUTO_MOVE_MS = 1200;

/** A centred pop-up that closes itself after `LANDING_MS` (or earlier through its button, Escape or the backdrop). */
function TimedDialog({ children, onClose, labelId }: { children: ReactNode; onClose: () => void; labelId: string }) {
  const close = useEffectEvent(() => onClose());
  useEffect(() => {
    const t = setTimeout(() => close(), LANDING_MS);
    return () => clearTimeout(t);
  }, []);
  return (
    <Dialog placement="center" labelId={labelId} onClose={onClose}>
      {children}
    </Dialog>
  );
}

const reducedMotion =() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

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

function lockHintText(helper: string, h: Extract<NosingHint, { kind: 'lock' }>['hint']): string {
  switch (h.kind) {
    case 'fill':
      if (h.step === 0) return `${helper} filled in the start of the way for you. Carry on from there.`;
      if (h.step === 1) return `${helper} filled in most of the way for you. One more bit to go.`;
      return `${helper} filled in the whole way for you. That is the one to try.`;
    case 'submit':
      return `${helper} sits on the number you have made. That is the one to try.`;
  }
}

export function NosingGame({ puzzle, data, finished, helper = 'The cat', onChange, onFinish, onFound }: NosingScreenProps) {
  const view = useMemo(() => viewOf(puzzle, data), [puzzle, data]);
  // A hint note belongs to the position it was asked in (a step solved from the header moves on).
  const [hintAt, setHintAt] = useState<{ hint: NosingHint; moves: number } | null>(null);
  const hint = hintAt && hintAt.moves === data.moves.length ? hintAt.hint : null;
  /** The fight's result card was dismissed at this many moves. */
  const [seenEnd, setSeenEnd] = useState(-1);
  /** The encounter card was tapped at this many moves (hints not counted); not saved, so a reload shows the card again. */
  const [started, setStarted] = useState(-1);
  /** The "nothing here" pop-up was closed at this many moves; not saved. */
  const [seenEmpty, setSeenEmpty] = useState(-1);
  const [autoRoll, setAutoRoll] = useState(loadAutoRoll);
  /** The marked square she tapped on the board. */
  const [picked, setPicked] = useState<number | null>(null);

  const jumps = useMemo(() => {
    const m = new Map<number, number>();
    puzzle.board.squares.forEach((s, i) => {
      if ((s.kind === 'ladder' || s.kind === 'snake') && s.to !== undefined) m.set(i, s.to);
    });
    return m;
  }, [puzzle]);
  const steps = useMemo(() => walkSteps(view.trail, jumps), [view.trail, jumps]);
  const { at, walking } = useWalk(steps);

  const spent = useMemo(() => new Set(view.spent), [view.spent]);
  const kinds = useMemo(() => markKinds(puzzle.board, puzzle.dogSquare, view.usedSnakes), [puzzle, view.usedSnakes]);
  const moveCount = data.moves.reduce((n, m) => n + (m.t === 'hint' ? 0 : 1), 0);

  const clearHint = () => {
    setHintAt(null);
  };

  /** Save a new state; search clues unlock at once, and a lock that opens ends the game. */
  const commit = (next: NosingState) => {
    if (next === data) return;
    clearHint();
    const v = viewOf(puzzle, next);
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
    // A lock hint has already filled her grid: replaying the hint move does it.
    setHintAt({ hint: res.hint, moves: res.state.moves.length });
    onChange(res.state);
  };

  const done = finished !== null || view.finished !== null;
  /** The fight just ended and she has not pressed Continue. */
  const showEnd = !!view.dog?.over && seenEnd !== data.moves.length;
  const level = NOSING_LEVELS[puzzle.level];
  const q = view.question;
  const held = (Object.keys(view.bonuses) as (keyof typeof view.bonuses)[]).filter((k) => view.bonuses[k] > 0);

  /** The encounter card's lines: why the square asks a question, and what is at stake. */
  const encounter = () => {
    if (!q) return null;
    const sq = puzzle.board.squares[q.square];
    if (q.kind === 'snake') {
      const snake = nosingSnakes.find((s) => s.id === sq.contentId);
      return {
        reason: `Watch out: ${snake ? snake.name.toLowerCase() : 'a slip'}.`,
        right: 'Get it right and the cat keeps its footing.',
        wrong: `Get it wrong and the cat slides back to ${squareName(q.slipTo!)}.`,
        button: 'Evade!',
      };
    }
    if (q.kind === 'ladder') {
      const ladder = nosingLadders.find((l) => l.id === sq.contentId);
      return {
        reason: `A shortcut: ${ladder ? ladder.name.toLowerCase() : 'a way ahead'}.`,
        right: `Get it right and the cat takes the shortcut to ${squareName(q.climbTo!)}.`,
        wrong: 'Get it wrong and it walks on.',
        button: 'Jump!',
      };
    }
    if (q.kind === 'search') {
      const b = q.bonus ? nosingBonuses[q.bonus] : null;
      return {
        reason: searchLine(puzzle, q.square),
        right: q.clueId ? 'Get it right and it finds a clue now.' : b ? `Get it right to win: ${b.name.toLowerCase()}. ${b.copy}` : 'Get it right and the cat finds something.',
        wrong: q.clueId ? 'Get it wrong and the clue waits for you at the lock.' : 'Get it wrong and the cat moves on.',
        button: 'Start',
      };
    }
    const b = q.bonus ? nosingBonuses[q.bonus] : null;
    return {
      reason: obstacleReason(puzzle.seed, q.square),
      right: b ? `Get it right to win: ${b.name.toLowerCase()}. ${b.copy}` : 'Get it right and the cat passes.',
      wrong: nosingObstacleStakeWrong,
      button: 'Start',
    };
  };
  const card = encounter();
  const atEncounter = !!q && started !== moveCount;

  // Nothing happened on the square she just landed on: say so, once per move.
  const lastMove = [...data.moves].reverse().find((m) => m.t !== 'hint');
  const land0 = steps[steps.length - 1] ?? 0;
  const atEmpty =
    !walking && !done && !showEnd && !q && !view.speed && view.phase === 'roll' && view.messages.length === 0 && (lastMove?.t === 'roll' || lastMove?.t === 'reroll') && seenEmpty !== moveCount;

  // Auto-roll: roll, and move after a pause, unless something is waiting for her.
  const autoPhase = view.phase === 'roll' || view.phase === 'rolled';
  const holdsReroll = view.bonuses.reroll > 0;
  const autoWaits = !autoRoll || !autoPhase || walking || done || showEnd || !!q || !!view.speed || atEmpty || (view.phase === 'rolled' && holdsReroll);
  const autoDelay = view.phase === 'rolled' ? AUTO_MOVE_MS : view.messages.length > 0 ? AUTO_READ_MS : AUTO_ROLL_MS;
  const autoPlay = useEffectEvent(() => play({ t: 'roll' }));
  useEffect(() => {
    if (autoWaits) return;
    const t = setTimeout(() => autoPlay(), autoDelay);
    return () => clearTimeout(t);
  }, [autoWaits, autoDelay, view.phase, moveCount]);

  const pickInfo = (() => {
    if (picked === null || !kinds[picked]) return null;
    const sq = puzzle.board.squares[picked];
    const kind = kinds[picked]!;
    const named = kind === 'ladder' ? nosingLadders.find((l) => l.id === sq.contentId) : kind === 'snake' ? nosingSnakes.find((l) => l.id === sq.contentId) : null;
    return markLine(named ? `${MARK_LABELS[kind]}: ${named.name.toLowerCase()}` : MARK_LABELS[kind], picked, at);
  })();
  const land = nosingLanding(puzzle, view);
  const landKind = land === null ? null : kinds[land];
  const rollLine = land === null ? '' : landingLine(view.pendingRoll!, landKind ? MARK_LABELS[landKind] : 'Nothing', land);
  const showKey = !walking && !done && !showEnd && (view.phase === 'roll' || view.phase === 'rolled' || atEncounter);

  const questionHint = hint?.kind === 'question' ? hint : null;
  const hintNote = (() => {
    if (!hint) return null;
    if (hint.kind === 'dog') {
      const h = hint.hint;
      return `${helper} ${h.step === 0 ? nosingDog.hint[h.topic](!!h.possible) : nosingDog.hint.fill}`;
    }
    if (hint.kind === 'question') {
      if (hint.step === 0) return `${helper} scratches out the first line: ${hint.text}`;
      if (hint.step === 1) return `${helper} paws at three numbers. One of them is right.`;
      return `${helper} taps out the answer: ${hint.answer}.`;
    }
    return lockHintText(helper, hint.hint);
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
    <div className={`nosing ${view.phase === 'lock' || view.phase === 'dog' ? 'tight' : ''}`}>
      <NosingBoardView puzzle={puzzle} view={view} catAt={at} spent={spent} selected={picked} onPick={(sq) => setPicked(sq === null || sq === picked ? null : sq)} compact={!walking && !done && (!!q || !!view.speed || view.phase === 'lock' || view.phase === 'dog')} />

      {showKey && <NosingKey info={pickInfo} />}

      <p className="nosing-strip">
        {view.phase !== 'lock' && view.phase !== 'dog' && (
          <span>
            Turn {view.phase === 'open' ? view.turn - 1 : view.turn} · {squareName(at)} of {puzzle.board.path.length}
          </span>
        )}
        <span>
          {held.length
            ? held.map((k) => `${nosingBonuses[k].name}${view.bonuses[k] > 1 ? ` ×${view.bonuses[k]}` : ''}`).join(', ')
            : 'No bonuses yet'}
        </span>
      </p>

      {view.messages.length > 0 && view.phase === 'lock' && !view.dog && (
        <p className="muted nosing-note" role="status">
          {view.messages.join(' ')}
        </p>
      )}

      {view.messages.length > 0 && view.phase !== 'open' && view.phase !== 'dog' && view.phase !== 'lock' && !view.dog && (
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

      {!walking && !done && view.phase === 'dog' && view.dog && (
        <div className="card nosing-dog">
          <NosingDog view={view.dog} hints={hintBlock} onMove={play} />
        </div>
      )}

      {!walking && !done && showEnd && view.dog && (
        <div className="card nosing-dog">
          <NosingDogResult view={view.dog} messages={view.messages} onContinue={() => setSeenEnd(data.moves.length)} />
        </div>
      )}

      {!walking && !done && !showEnd && (view.phase === 'roll' || view.phase === 'rolled') && (
        <div className="card nosing-roll">
          <div key={`${moveCount}-${view.pendingRoll}`} className={view.phase === 'rolled' ? 'dice tumble' : 'dice'} aria-label={view.phase === 'rolled' ? `You rolled ${view.pendingRoll}` : view.lastRoll ? `Last roll ${view.lastRoll}` : 'The dice'}>
            {diceFaces(level.dice, view.phase === 'rolled' ? view.pendingRoll! : (view.lastRoll ?? level.dice)).map((f, i) => (
              <Die key={i} face={f} />
            ))}
          </div>
          <button
            className="secondary auto-roll"
            role="switch"
            aria-checked={autoRoll}
            onClick={() => {
              saveAutoRoll(!autoRoll);
              setAutoRoll(!autoRoll);
            }}
          >
            Auto-roll: {autoRoll ? 'on' : 'off'}
          </button>
          {view.phase === 'rolled' ? (
            <>
              <p className="muted">{rollLine}</p>
              <div className="nosing-buttons">
                <button className="primary" onClick={() => play({ t: 'roll' })}>
                  Move
                </button>
                {view.bonuses.reroll > 0 && (
                  <button className="secondary" onClick={() => play({ t: 'reroll' })}>
                    Re-roll (bonus)
                  </button>
                )}
              </div>
            </>
          ) : (
            <button className="primary" onClick={() => play({ t: 'roll' })}>
              Roll
            </button>
          )}
        </div>
      )}

      {!walking && !done && !showEnd && q && card && atEncounter && (
        <TimedDialog onClose={() => setStarted(moveCount)} labelId="nosing-landing-title">
          <div className="nosing-encounter">
            <p id="nosing-landing-title" className="question-text">
              {card.reason}
            </p>
            <p className="stake">{card.right}</p>
            <p className="stake">{card.wrong}</p>
            <button className="primary" onClick={() => setStarted(moveCount)}>
              {card.button}
            </button>
          </div>
        </TimedDialog>
      )}

      {atEmpty && (
        <TimedDialog onClose={() => setSeenEmpty(moveCount)} labelId="nosing-landing-title">
          <div className="nosing-encounter">
            <p id="nosing-landing-title" className="question-text">
              {nosingEmptyLines[land0 % nosingEmptyLines.length]}
            </p>
            <button className="primary" onClick={() => setSeenEmpty(moveCount)}>
              Carry on
            </button>
          </div>
        </TimedDialog>
      )}

      {!walking && !done && !showEnd && q && !atEncounter && (
        <div className="card nosing-question">
          <div className="question-scroll">
            {hintBlock}
            <p className="question-text">{q.q.text}</p>
            {questionHint && questionHint.choices && (
              <div className="choices" role="group" aria-label="The cat's three choices">
                {questionHint.choices.map((c) => (
                  <button key={c} className="secondary" onClick={() => play({ t: 'answer', value: c })}>
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
          <NumberPad onSubmit={(value) => play({ t: 'answer', value })} />
        </div>
      )}

      {!walking && !done && !showEnd && view.speed && (
        <div className="card nosing-speed">
          <NosingSpeed
            key={view.speed.square}
            questions={view.speed.questions}
            seconds={view.speed.seconds}
            onEnd={(right) => play({ t: 'speed', right })}
          />
        </div>
      )}

      {(view.phase === 'lock' || view.phase === 'open') && !walking && !showEnd && (
        <div className="card nosing-lock">
          <NosingLock
            puzzle={puzzle}
            view={view}
            open={done}
            hints={hintBlock}
            onPlace={(slot, card) => play({ t: 'place', slot, card })}
            onClear={(slot) => play({ t: 'clear', slot })}
            onClearAll={() => play({ t: 'clearAll' })}
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
