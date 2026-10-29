// One #shelf puzzle label (140 x 60): the game's drawing, its name, its level in stars, and optionally a
// page ring, a tilt and a sticker. Same in the book (page 3 rows) and the sticker tin. Drawn from the game
// registry, so a new game needs only its `label` there. Not a button: the row or sticker around it is.

import type { CSSProperties } from 'react';
import { GAMES } from '../game/games/registry.tsx';
import type { Difficulty, GameKind } from '../engine/types.ts';
import './fonts.ts';
import { FINALE_PAPER, KIND_COLOUR, labelName, starsText } from './labels.ts';
import styles from './PuzzleLabel.module.css';

export interface PuzzleLabelProps {
  game: GameKind;
  level?: Difficulty;
  /** The page number in a ring, in the book only. */
  page?: number;
  /** Degrees, -2 to 2 (`labelAngle`). */
  angle?: number;
  /** A sticker for a finished game: the green tick, or the gold cat's paw when the cat solved it. */
  sticker?: 'won' | 'revealed';
  /** Hints the cat gave, shown as a paw pill when 1 or more. */
  hints?: number;
  /** In the tin: picked up (bigger shadow, a brass tick). Replaces the finished sticker. */
  lifted?: boolean;
  /** The finale before the other games are done: "Locked" in place of the stars. */
  locked?: boolean;
}

const Paw = ({ fill, transform }: { fill: string; transform?: string }) => (
  <g fill={fill} transform={transform}>
    <ellipse cx="12" cy="15" rx="5" ry="4.2" />
    <circle cx="5" cy="9.2" r="2.1" />
    <circle cx="9.2" cy="5.2" r="2.1" />
    <circle cx="14.8" cy="5.2" r="2.1" />
    <circle cx="19" cy="9.2" r="2.1" />
  </g>
);

export function PuzzleLabel({ game, level, page, angle = 0, sticker, hints = 0, lifted = false, locked = false }: PuzzleLabelProps) {
  const entry = GAMES[game];
  const { kind, Art } = entry.label;
  const isFinal = kind === 'final';
  const classes = [styles.label, isFinal ? styles.final : '', locked ? styles.locked : '', lifted ? styles.lifted : ''].filter(Boolean).join(' ');
  const style = { '--c': KIND_COLOUR[kind], transform: angle ? `rotate(${angle}deg)` : undefined, background: isFinal ? FINALE_PAPER : undefined } as CSSProperties;
  return (
    <span className={classes} style={style} data-testid={`label-${game}`}>
      <span className={styles.art}>
        <Art />
      </span>
      <span className={styles.text}>
        <span className={styles.name}>{labelName(kind, entry.name)}</span>
        <span className={styles.foot}>
          {isFinal && locked ? <span className={styles.lockedText}>Locked</span> : <span className={styles.stars}>{starsText(level)}</span>}
          {page !== undefined && <span className={styles.ring}>{page}</span>}
        </span>
      </span>
      {lifted ? (
        <span className={styles.brass} aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M2 6.5l2.5 2.5L10 3" fill="none" stroke="#2a1d0f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      ) : sticker === 'won' ? (
        <svg className={styles.seal} width="32" height="32" viewBox="0 0 34 34" aria-hidden="true">
          <circle cx="17" cy="17" r="15.5" fill="#fffdf6" />
          <circle cx="17" cy="17" r="13" fill="#3f7a4a" />
          <circle cx="17" cy="17" r="13" fill="none" stroke="#6fa577" strokeWidth="1" strokeDasharray="2 2" />
          <path d="M10.5 17.5l4.2 4.2 8.8-9" fill="none" stroke="#fffdf6" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : sticker === 'revealed' ? (
        <svg className={styles.seal} width="32" height="32" viewBox="0 0 34 34" aria-hidden="true" style={{ transform: 'rotate(10deg)' }}>
          <circle cx="17" cy="17" r="15.5" fill="#fffdf6" />
          <circle cx="17" cy="17" r="13" fill="#d2a548" />
          <circle cx="17" cy="17" r="13" fill="none" stroke="#9a7426" strokeWidth="1" />
          <circle cx="17" cy="17" r="10.5" fill="none" stroke="#f3dc9a" strokeWidth="1" strokeDasharray="2 2" />
          <Paw fill="#5a3e10" transform="translate(5 6)" />
        </svg>
      ) : null}
      {hints >= 1 && (
        <svg className={styles.hints} width="38" height="22" viewBox="0 0 38 22" aria-hidden="true">
          <rect x="0.5" y="0.5" width="37" height="21" rx="10.5" fill="#fffdf6" />
          <rect x="2.5" y="2.5" width="33" height="17" rx="8.5" fill="#8a6a48" />
          <g fill="#fffdf6">
            <ellipse cx="12" cy="13.6" rx="3.2" ry="2.7" />
            <circle cx="7.6" cy="10" r="1.4" />
            <circle cx="10.4" cy="7.4" r="1.4" />
            <circle cx="13.6" cy="7.4" r="1.4" />
            <circle cx="16.4" cy="10" r="1.4" />
          </g>
          <text x="26.5" y="15.4" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontSize="11.5" fill="#fffdf6">
            {hints}
          </text>
        </svg>
      )}
    </span>
  );
}
