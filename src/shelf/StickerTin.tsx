import { useEffect, useMemo, useRef, useState } from 'react';
import { PICK_MAX, PICK_MIN, PICK_ORDER, playLevels, type PickedGame } from '../engine/caseRef.ts';
import { gameLevel } from '../engine/settings.ts';
import { Dialog } from '../game/Dialog.tsx';
import { GAMES } from '../game/games/registry.tsx';
import { DIFFICULTY_LABEL } from '../game/labels.ts';
import { loadPicks, savePicks } from '../game/storage.ts';
import { labelAngle } from './labels.ts';
import { PuzzleLabel } from './PuzzleLabel.tsx';
import styles from './StickerTin.module.css';
import { caseLine, dealHand, firstHand, liftedText, newCode, stickText, toggleSticker } from './tin.ts';
import { randomUnit } from './uiRandom.ts';

/** How long the tin rattles before the new hand settles (a short fade with reduced motion). */
const RATTLE_MS = 420;
const FADE_MS = 160;

interface Props {
  /** The title of her unsolved Quick case, if she has one: Stick them in asks before replacing it. */
  unsolved: string | null;
  onBack: () => void;
  /** Her picks are saved and the case is built by the book that opens. */
  onStick: (code: string, games: PickedGame[]) => void;
  /** Dev preview: start with these (no saved picks read, nothing saved). */
  sample?: { code: string; lifted: PickedGame[] };
}

/**
 * The sticker tin: every game as a label on a backing sheet; she lifts 3 to 7, shakes for a new code and
 * hand, and sticks them in. The pure rules are `tin.ts`. Picks are saved only on Stick them in.
 */
export function StickerTin({ unsolved, onBack, onStick, sample }: Props) {
  const [code, setCode] = useState(() => sample?.code ?? newCode(randomUnit));
  const [lifted, setLifted] = useState<PickedGame[]>(() => sample?.lifted ?? firstHand(loadPicks(), randomUnit));
  const [shakes, setShakes] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const backRef = useRef<HTMLButtonElement>(null);
  const levels = useMemo(() => playLevels(code), [code]);
  const enough = lifted.length >= PICK_MIN;

  useEffect(() => {
    backRef.current?.focus({ preventScroll: true });
    return () => window.clearTimeout(timer.current);
  }, []);

  const tap = (game: PickedGame) => {
    if (shaking) return;
    const next = toggleSticker(lifted, game);
    setLifted(next.lifted);
    setNote(next.note);
  };

  const shake = () => {
    if (shaking) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setShaking(true);
    setNote('');
    timer.current = window.setTimeout(
      () => {
        const hand = dealHand(randomUnit);
        setCode(newCode(randomUnit));
        setLifted(hand);
        setShakes((n) => n + 1);
        setNote(`A new hand of ${hand.length}.`);
        setShaking(false);
      },
      reduced ? FADE_MS : RATTLE_MS,
    );
  };

  const stick = () => {
    if (!enough) return;
    if (unsolved) setConfirming(true);
    else go();
  };
  const go = () => {
    if (!sample) savePicks(lifted);
    onStick(code, lifted);
  };

  return (
    <div className={styles.stage}>
      <div className={styles.screen} inert={confirming}>
        <header className={styles.head}>
          <button ref={backRef} type="button" className={styles.back} aria-label="Back to the shelf" onClick={onBack}>
            <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
              <circle cx="20" cy="20" r="18" fill="#fbf4e2" />
              <circle cx="20" cy="20" r="14.5" fill="#9a5a32" />
              <path d="M23 13l-7 7 7 7" fill="none" stroke="#fbf4e2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className={styles.titles}>
            <h1 className={styles.title}>New case</h1>
            <p className={styles.sub}>
              Lift {PICK_MIN} to {PICK_MAX} puzzles
            </p>
          </div>
          <span aria-hidden="true" />
        </header>

        <div className={`${styles.tin} ${shaking ? styles.shaking : ''}`}>
          <div aria-hidden="true" className={styles.lid}>
            PUZZLE STICKERS
          </div>
          <section aria-label="Tin of puzzle stickers" className={styles.body}>
            <div className={styles.sheet}>
              {PICK_ORDER.map((g) => {
                const on = lifted.includes(g);
                const level = gameLevel(levels, g);
                return (
                  <button
                    key={g}
                    type="button"
                    className={`${styles.sticker} ${on ? styles.on : ''}`}
                    aria-pressed={on}
                    aria-label={level ? `${GAMES[g].name}, ${DIFFICULTY_LABEL[level].toLowerCase()}` : GAMES[g].name}
                    onClick={() => tap(g)}
                  >
                    <PuzzleLabel game={g} level={shaking ? undefined : level} angle={labelAngle(code, g, shakes ? `s${shakes}` : '')} lifted={on} />
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className={styles.under}>
          <div className={styles.counts}>
            <span aria-live="polite" data-testid="tin-count">
              {liftedText(lifted.length)}
            </span>
            <span data-testid="tin-case">{shaking ? 'Logic · · ·' : caseLine(levels)}</span>
          </div>
          <p className={styles.note} role="status">
            {note}
          </p>
          <button type="button" className={styles.shake} onClick={shake}>
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" fill="none" stroke="#e8c66a" strokeWidth="1.8" strokeLinecap="round">
              <rect x="5" y="7" width="12" height="11" rx="2" />
              <path d="M4 7h14M2 5l-1 3M20 5l1 3M2 14l-1 3M20 14l1 3" />
            </svg>
            Shake the tin
          </button>
          <button type="button" className={`${styles.stick} ${enough ? '' : styles.short}`} disabled={!enough} onClick={stick}>
            {stickText(lifted.length)}
          </button>
        </div>
      </div>

      {confirming && unsolved ? (
        <Dialog placement="center" labelId="tin-new-case-title" onClose={() => setConfirming(false)}>
          <h2 id="tin-new-case-title">Start a new case?</h2>
          <p className="dialog-text">{unsolved} isn&apos;t solved yet. A new case replaces it.</p>
          <div className="dialog-actions">
            <button data-autofocus className="secondary" onClick={() => setConfirming(false)}>
              Keep playing
            </button>
            <button
              className="primary"
              onClick={() => {
                setConfirming(false);
                go();
              }}
            >
              Start new
            </button>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
