import { useMemo, useState, type ReactNode } from 'react';
import { nosingDog } from '../../content/nosing.ts';
import { tarotArt } from '../../content/tarotArt.ts';
import { CAT_LIVES, DOG_LIVES, type DogChallenge, type DogTurnResult, type DogView } from '../../games/dogFight.ts';
import { dogCoat } from '../../content/portraits.ts';
import { Dialog } from '../Dialog.tsx';
import { Portrait } from '../Portrait.tsx';
import { coatForCat, type Tint } from '../portrait.ts';
import { OP_NAME, OP_SIGN } from './nosingUi.ts';
import type { NosingMove } from '../../games/nosing.ts';
import { gridLines, type Hand, type OpRef, type Slot } from '../../games/numberGrid.ts';
import { NumberGrid } from './NumberGrid.tsx';
import { hasClearable } from './numberGridUi.ts';
import styles from './NosingDog.module.css';

/** The line about the turn just played, from the view's `last` data. */
function lastLine(last: DogTurnResult): string {
  const t = nosingDog.last;
  if (last.role === 'attack') {
    const base = last.dogLost >= 2 ? t.attackTwice(last.catValue, last.dogValue) : last.dogLost === 1 ? t.attackOnce(last.catValue, last.dogValue) : t.attackMissed(last.catValue, last.dogValue);
    return last.bonusCard ? `${base} ${t.challengeMet}` : base;
  }
  if (last.catLost) return t.defendLost(last.catValue, last.dogValue);
  return last.bonusCard ? t.defendExact(last.catValue, last.dogValue) : t.defendMet(last.catValue, last.dogValue);
}

/** The attack challenge in words. */
function challengeLine(c: DogChallenge, dog: number): string {
  const t = nosingDog.challenge;
  switch (c.kind) {
    case 'even':
      return t.line(t.even);
    case 'multiple':
      return t.line(t.multiple(c.n));
    case 'prime':
      return t.line(t.prime);
    case 'square':
      return t.line(t.square);
    case 'within':
      return t.line(t.within(c.n, dog));
    case 'minusDivide':
      return t.line(t.minusDivide);
    case 'allOps':
      return t.line(t.allOps);
  }
}

function Lives({ label, left, total }: { label: string; left: number; total: number }) {
  return (
    <div className={styles.lives} role="img" aria-label={`${label}: ${left} of ${total} lives`}>
      <span>{label}</span>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`${styles.life} ${i < left ? styles.on : ''}`} aria-hidden="true" />
      ))}
    </div>
  );
}

/** One side of the fight: a full portrait standing on the stage, its lives under it. */
function Side({ portrait, testId, intent, children }: { portrait: ReactNode; testId: string; intent?: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.side}>
      {intent}
      <span className={styles.face} data-testid={testId} aria-hidden="true">
        {portrait}
      </span>
      {children}
    </div>
  );
}

interface Props {
  view: DogView;
  /** The house cat's name; its index in `cats` picks the cat's coat. */
  helper?: string;
  /** The hint button and note. */
  hints: ReactNode;
  onMove: (move: NosingMove) => void;
}

/** The dog fight: both sides' lives, the dog's play, then her grid and cards. */
export function NosingDog({ view, helper, hints, onMove }: Props) {
  const catCoat = coatForCat(helper ?? '');
  const dogTint: Tint = view.role === 'defend' ? 'hostile' : view.last && view.last.dogLost > 0 ? 'warm' : 'none';
  const toggle = (list: number[], i: number) => (list.includes(i) ? list.filter((x) => x !== i) : [...list, i]);
  const hand = useMemo<Hand>(() => ({ numbers: view.numbers.map((c) => c.value), ops: view.ops.map((o) => o.op) }), [view.numbers, view.ops]);
  const dogLines = useMemo(() => gridLines({ numbers: view.dog.numbers, ops: view.dog.ops }, view.dog.fill), [view.dog]);
  const [picking, setPicking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pickedNums, setPickedNums] = useState<number[]>([]);
  const [pickedOps, setPickedOps] = useState<number[]>([]);
  const count = pickedNums.length + pickedOps.length;
  const stopPicking = () => {
    setPicking(false);
    setConfirming(false);
    setPickedNums([]);
    setPickedOps([]);
  };
  const face = (value: number, index: number) => {
    const card = view.numbers[index];
    const art = tarotArt(card.id);
    return (
      <span className={styles.cardFace}>
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <path d={art.path} fill={art.colour} />
        </svg>
        <span className={styles.cardValue}>{value}</span>
      </span>
    );
  };

  return (
    <div className={styles.fight} data-testid="dog-fight">
      <div className={styles.top}>
        <Side portrait={<Portrait coat={catCoat} view="full" />} testId="dog-fight-cat">
          <Lives label={nosingDog.catLives} left={view.catLives} total={CAT_LIVES} />
        </Side>
        <Side
          portrait={<Portrait dog={dogCoat} view="full" tint={dogTint} />}
          testId="dog-fight-dog"
          intent={
            <span className={`${styles.intent} ${view.role === 'defend' ? styles.intentAttack : styles.intentGuard}`} data-testid="dog-fight-intent" aria-hidden="true">
              {view.role === 'defend' ? nosingDog.intentAttack(view.dog.value) : nosingDog.intentGuard(view.dog.value)}
            </span>
          }
        >
          <Lives label={nosingDog.dogLives} left={view.dogLives} total={DOG_LIVES} />
        </Side>
      </div>
      <p className={styles.role}>{view.role === 'attack' ? nosingDog.attack(view.dog.value) : nosingDog.defend(view.dog.value)}</p>
      {view.last && (
        <p className={`${styles.last} muted`} data-testid="dog-last">
          {lastLine(view.last)}
        </p>
      )}
      <details className={styles.play} key={view.turn} data-testid="dog-fight-play">
        <summary className={styles.playTitle}>{nosingDog.dogPlays}</summary>
        {dogLines.map((line, i) => (
          <span key={i}>{line}</span>
        ))}
      </details>
      {view.role === 'attack' && view.challenge && (
        <p className={styles.challenge} data-testid="dog-challenge">
          {challengeLine(view.challenge, view.dog.value)}
        </p>
      )}
      {hints}
      {picking ? (
        <div className={`number-grid ${styles.pick}`}>
          <p className={`muted ${styles.pickHint}`}>{nosingDog.swap.pickHint}</p>
          <div className="grid-hand" role="group" aria-label="Pick cards to swap">
            {view.numbers.map((c, i) => (
              <button
                key={`n${i}`}
                className={`grid-card ${pickedNums.includes(i) ? 'selected' : ''}`}
                aria-pressed={pickedNums.includes(i)}
                aria-label={c.name}
                disabled={!pickedNums.includes(i) && count >= 2}
                onClick={() => setPickedNums(toggle(pickedNums, i))}
              >
                {face(c.value, i)}
              </button>
            ))}
          </div>
          <div className="grid-hand" role="group" aria-label="Pick signs to swap">
            {view.ops.map((o, k) => (
              <button
                key={`o${k}`}
                className={`grid-card sign ${pickedOps.includes(k) ? 'selected' : ''}`}
                aria-pressed={pickedOps.includes(k)}
                aria-label={OP_NAME[o.op]}
                disabled={!pickedOps.includes(k) && count >= 2}
                onClick={() => setPickedOps(toggle(pickedOps, k))}
              >
                {OP_SIGN[o.op]}
              </button>
            ))}
          </div>
        </div>
      ) : (
      <NumberGrid
        hand={hand}
        fill={view.fill}
        evaluation={view.eval}
        locked={[]}
        oneHand
        renderNumber={face}
        numberName={(_, i) => view.numbers[i].name}
        onPlace={(slot: Slot, card: number | OpRef) => onMove({ t: 'place', slot, card })}
        onClear={(slot: Slot) => onMove({ t: 'clear', slot })}
      />
      )}
      {picking ? (
        <div className={`lock-actions ${styles.swapActions}`}>
          <button className="secondary" onClick={stopPicking}>
            {nosingDog.swap.cancel}
          </button>
          <button className="primary" disabled={count === 0} onClick={() => setConfirming(true)}>
            {nosingDog.swap.confirm(count)}
          </button>
        </div>
      ) : (
        <>
          {view.swapAvailable && (
            <button className={`secondary ${styles.swapButton}`} onClick={() => setPicking(true)}>
              {nosingDog.swap.button}
            </button>
          )}
          <div className="lock-actions">
            <button className="secondary" disabled={!hasClearable(view.fill, [])} onClick={() => onMove({ t: 'clearAll' })}>
              Clear
            </button>
            <button className="primary" disabled={!view.eval.submittable} onClick={() => onMove({ t: 'play' })}>
              Play{view.eval.submittable ? ` (${view.eval.answer})` : ''}
            </button>
          </div>
        </>
      )}
      {confirming && (
        <Dialog placement="center" labelId="swap-title" onClose={() => setConfirming(false)}>
          <h2 id="swap-title">{nosingDog.swap.title}</h2>
          <p className="dialog-text">{nosingDog.swap.text}</p>
          <div className="dialog-actions">
            <button data-autofocus className="secondary" onClick={() => setConfirming(false)}>
              {nosingDog.swap.no}
            </button>
            <button
              className="primary"
              onClick={() => {
                const nums = pickedNums;
                const ops = pickedOps;
                stopPicking();
                onMove({ t: 'swap', nums, ops });
              }}
            >
              {nosingDog.swap.yes}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

/** The end of the fight: what happened, and Continue. */
export function NosingDogResult({ view, messages, onContinue }: { view: DogView; messages: string[]; onContinue: () => void }) {
  const won = view.over === 'won';
  return (
    <div className={styles.result} data-testid="dog-result" role="status">
      <h2>{won ? nosingDog.endTitleWon : nosingDog.endTitleLost}</h2>
      {view.last && <p className="muted">{lastLine(view.last)}</p>}
      {messages.filter((m) => m !== nosingDog.win).map((m, i) => (
        <p key={i}>{m}</p>
      ))}
      <button className="primary" onClick={onContinue}>
        {nosingDog.next}
      </button>
    </div>
  );
}
