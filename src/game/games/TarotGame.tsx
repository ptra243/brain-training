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
import styles from './TarotGame.module.css';
import type { GameProps } from './types.ts';

export interface TarotPuzzle {
  board: TarotBoard;
  /** The spec's seed: the cat's hints and the joker's peeks are drawn from it. */
  seed: number;
}

const JOKER_TEXT = 'The joker turns one card face up for free. Find its partner to match it, and another card turns up.';

function JokerIcon() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <path d={TAROT_JOKER_ART.path} fill={TAROT_JOKER_ART.colour} fillRule="evenodd" stroke="#7a5f1c" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/** How long two mismatched cards stay up so she can see both. */
const LOOK_MS = 900;

function CardBack() {
  return (
    <svg className={styles.back} viewBox="0 0 30 40" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <pattern id="tarot-back-pattern" width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M3 0.6L5.4 3L3 5.4L0.6 3Z" className={styles.backDiamond} />
          <circle cx="0" cy="0" r="0.7" className={styles.backDot} />
          <circle cx="6" cy="6" r="0.7" className={styles.backDot} />
        </pattern>
      </defs>
      <rect x="0" y="0" width="30" height="40" className={styles.backField} />
      <rect x="2" y="2" width="26" height="36" rx="1.5" className={styles.backFrame} />
      <rect x="4" y="4" width="22" height="32" fill="url(#tarot-back-pattern)" />
      <rect x="4" y="4" width="22" height="32" className={styles.backInner} />
    </svg>
  );
}

function CardFace({ id }: { id: string }) {
  const art = id === JOKER ? TAROT_JOKER_ART : tarotArt(id);
  return (
    <svg className={styles.symbol} viewBox="0 0 40 40" aria-hidden="true">
      <path d={art.path} fill={art.colour} fillRule="evenodd" stroke="rgba(30, 42, 47, 0.7)" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

export function TarotGame({ puzzle, data, finished, helper = 'The cat', onChange, onFinish }: GameProps<TarotPuzzle, TarotState>) {
  const { board, seed } = puzzle;
  const [note, setNote] = useState<string | null>(null);
  const [ghost, setGhost] = useState<number | null>(null);
  const [jokerNote, setJokerNote] = useState(false);
  const pairs = (board.length - 1) / 2;
  const found = data.matched.length / 2;

  const commit = (next: TarotState) => {
    if (tarotSolved(board, next)) onFinish('won', next);
    else onChange(next);
  };

  // Two cards are up: pause so she sees both, then judge them.
  const ready = !finished && turnReady(board, data);
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
    setJokerNote(false);
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
    <div>
      <p className="hint dark">
        Turn two cards over to find a pair. A match stays face up; a miss turns back, and it costs you nothing. Find the joker for a free card: it leaves the table and turns one card face up. Find that card's partner to match it.
      </p>
      {!finished && (
        <div className="hint-bar">
          <div className={styles.tools}>
            {data.jokerGone !== null && (
              <button
                className={`hint-button ${styles.jokerButton} ${data.peek !== null ? styles.lit : ''}`}
                aria-label={data.peek !== null ? 'Joker: you have a free peek card up' : 'Joker: waiting for a card to match'}
                title={JOKER_TEXT}
                onClick={() => {
                  setNote(null);
                  setJokerNote((v) => !v);
                }}
              >
                <JokerIcon />
                Joker
              </button>
            )}
            <HintButton helper={helper} onAsk={askHint} />
          </div>
          {jokerNote && data.jokerGone !== null && (
            <div className="hint-note" role="status">
              <JokerIcon />
              <p>{JOKER_TEXT}</p>
              <button className="hint-note-close" aria-label="Close the joker note" onClick={() => setJokerNote(false)}>
                ×
              </button>
            </div>
          )}
          {note && <HintNote text={note} onClose={() => setNote(null)} />}
        </div>
      )}
      <div className={styles.board} role="group" aria-label="Tarot cards">
        {board.map((id, i) => {
          // The joker has left the table: keep its place so the other cards don't move.
          if (data.jokerGone === i) return <span key={i} className={`${styles.card} ${styles.gone}`} aria-hidden="true" />;
          const up = !!finished || isFaceUp(data, i);
          const matched = data.matched.includes(i);
          const peeking = data.peek === i && !matched;
          const showGhost = !up && ghost === i;
          const label = up
            ? `Card ${i + 1}, ${id === JOKER ? 'the joker' : tarotArt(id).label}${matched ? ', matched' : peeking ? ', your free card' : ''}`
            : `Card ${i + 1}, face down${showGhost ? `, ${helper} is showing a faint ${tarotArt(id).label}` : ''}`;
          return (
            <button
              key={i}
              className={`${styles.card} ${up ? styles.up : ''} ${matched ? styles.matched : ''} ${peeking ? styles.peek : ''}`}
              aria-label={label}
              aria-disabled={peeking ? 'true' : undefined}
              onClick={() => tap(i)}
            >
              <span className={styles.inner}>
                <span className={`${styles.side} ${styles.down}`}>
                  <CardBack />
                  {showGhost && (
                    <span className={styles.ghost}>
                      <CardFace id={id} />
                    </span>
                  )}
                </span>
                <span className={`${styles.side} ${styles.front}`}>
                  <CardFace id={id} />
                </span>
              </span>
              {peeking && (
                <span className={styles.tag} aria-hidden="true">
                  Free
                </span>
              )}
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
