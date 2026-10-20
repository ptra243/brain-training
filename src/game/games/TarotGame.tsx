import { useEffect, useState } from 'react';
import { tarotCatLines } from '../../content/index.ts';
import { TAROT_JOKER_ART, tarotArt } from '../../content/tarotArt.ts';
import {
  JOKER,
  flip,
  isFaceUp,
  resolveTurn,
  tarotHint,
  tarotSolved,
  turnReady,
  type TarotBoard,
  type TarotState,
} from '../../games/tarot.ts';
import { HintButton, HintNote } from './Hints.tsx';
import type { GameProps } from './types.ts';

export interface TarotPuzzle {
  board: TarotBoard;
  /** The spec's seed: the cat's hints and the joker's peeks are drawn from it. */
  seed: number;
}

/** How long two mismatched cards stay up so she can see both. */
const LOOK_MS = 900;

function CardBack() {
  return (
    <svg className="tarot-back" viewBox="0 0 30 40" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <pattern id="tarot-back-pattern" width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M3 0.6L5.4 3L3 5.4L0.6 3Z" className="tarot-back-diamond" />
          <circle cx="0" cy="0" r="0.7" className="tarot-back-dot" />
          <circle cx="6" cy="6" r="0.7" className="tarot-back-dot" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="30" height="40" className="tarot-back-field" />
      <rect x="2" y="2" width="26" height="36" rx="1.5" className="tarot-back-frame" />
      <rect x="4" y="4" width="22" height="32" fill="url(#tarot-back-pattern)" />
      <rect x="4" y="4" width="22" height="32" className="tarot-back-inner" />
    </svg>
  );
}

function CardFace({ id }: { id: string }) {
  const art = id === JOKER ? TAROT_JOKER_ART : tarotArt(id);
  return (
    <svg className="tarot-symbol" viewBox="0 0 40 40" aria-hidden="true">
      <path d={art.path} fill={art.colour} fillRule="evenodd" stroke="rgba(30, 42, 47, 0.7)" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

export function TarotGame({ puzzle, data, finished, helper = 'The cat', onChange, onFinish }: GameProps<TarotPuzzle, TarotState>) {
  const { board, seed } = puzzle;
  const [note, setNote] = useState<string | null>(null);
  const [ghost, setGhost] = useState<number | null>(null);
  const pairs = (board.length - 1) / 2;
  const found = data.matched.length / 2;

  const commit = (next: TarotState) => {
    if (tarotSolved(board, next)) onFinish('won', next);
    else onChange(next);
  };

  // Two cards are up: pause so she sees both, then judge them.
  const ready = !finished && turnReady(data);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => commit(resolveTurn(board, data, seed)), LOOK_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, data.picked.join(',')]);

  const tap = (i: number) => {
    if (finished || ready) return;
    setGhost(null);
    const next = flip(board, data, seed, i);
    if (next !== data) commit(next);
  };

  const askHint = () => {
    if (finished) return;
    const h = tarotHint(board, data, seed);
    if (h.ghost === null) {
      setGhost(null);
      setNote(tarotCatLines.nothingSeen.replace('{cat}', helper));
      return;
    }
    setGhost(h.ghost);
    setNote(tarotCatLines.pawed[data.hints % tarotCatLines.pawed.length].replace('{cat}', helper));
    onChange(h.state);
  };

  return (
    <div className="tarot">
      <p className="hint dark">
        Turn two cards over to find a pair. A match stays face up; a miss turns back, and it costs you nothing. Find
        the joker for a free peek: that card stays up and counts as your first pick.
      </p>
      {!finished && (
        <div className="hint-bar">
          <HintButton helper={helper} onAsk={askHint} />
          {note && <HintNote text={note} onClose={() => setNote(null)} />}
        </div>
      )}
      <div className="tarot-board" role="group" aria-label="Tarot cards">
        {board.map((id, i) => {
          if (data.jokerGone === i) return <span key={i} className="tarot-card gone" aria-hidden="true" />;
          const up = !!finished || isFaceUp(data, i);
          const matched = data.matched.includes(i);
          const peeking = data.peek === i && !matched;
          const showGhost = !up && ghost === i;
          const label = up
            ? `Card ${i + 1}, ${id === JOKER ? 'the joker' : tarotArt(id).label}${matched ? ', matched' : ''}`
            : `Card ${i + 1}, face down${showGhost ? `, ${helper} is showing a faint ${tarotArt(id).label}` : ''}`;
          return (
            <button
              key={i}
              className={`tarot-card ${up ? 'up' : ''} ${matched ? 'matched' : ''} ${peeking ? 'peek' : ''}`}
              aria-label={label}
              onClick={() => tap(i)}
            >
              <span className="tarot-inner">
                <span className="tarot-side tarot-down">
                  <CardBack />
                  {showGhost && (
                    <span className="tarot-ghost">
                      <CardFace id={id} />
                    </span>
                  )}
                </span>
                <span className="tarot-side tarot-front">
                  <CardFace id={id} />
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="game-message" role="status">
        {finished
          ? finished === 'won'
            ? 'Every pair is found.'
            : 'Here is where the pairs are.'
          : `${found} of ${pairs} pairs found.`}
      </p>
    </div>
  );
}
