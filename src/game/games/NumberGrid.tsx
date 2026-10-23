import { Fragment, useState, type ReactNode } from 'react';
import {
  PALETTE,
  getSlot,
  sameSlot,
  usedNumbers,
  usedOpCards,
  type GridEval,
  type GridFill,
  type Hand,
  type Op,
  type OpRef,
  type Slot,
} from '../../games/numberGrid.ts';
import { OP_NAME, OP_SIGN } from './nosingUi.ts';
import { rowCaption, rowProblem, slotLabel } from './numberGridUi.ts';

interface Props {
  hand: Hand;
  fill: GridFill;
  evaluation: GridEval;
  /** Slots she can't clear (the cat filled them in). */
  locked: readonly Slot[];
  /** Read only: nothing can be placed or cleared. */
  disabled?: boolean;
  /** One group of cards, signs first and then numbers, instead of two groups. */
  oneHand?: boolean;
  /** A number in the hand that the torch showed she won't need. */
  torchCard?: number | null;
  /** Draws a number card's face; the default is the plain number. */
  renderNumber?: (value: number, index: number) => ReactNode;
  /** Spoken name of a number card in the hand; the default is the number. */
  numberName?: (value: number, index: number) => string;
  onPlace: (slot: Slot, card: number | OpRef) => void;
  onClear: (slot: Slot) => void;
}

type Selected = { kind: 'num'; card: number } | { kind: 'op'; card: OpRef };

const ROWS = [0, 1, 2] as const;
const NUM_SLOTS = [0, 1, 2] as const;

/**
 * The number grid: three rows of `number sign number sign number`, each row after
 * the first joined to the running total by a sign on the left. Pick a card below,
 * then tap a slot to place it; tap a filled slot to take it back. All the rules
 * live in `numberGrid.ts`; this only keeps which card is selected.
 */
export function NumberGrid({ hand, fill, evaluation, locked, disabled = false, oneHand = false, torchCard = null, renderNumber, numberName, onPlace, onClear }: Props) {
  const [picked, setPicked] = useState<Selected | null>(null);
  const placedNumbers = usedNumbers(fill);
  const placedOps = usedOpCards(fill);
  // A card that has since been placed (by a hint, say) is no longer selected.
  const selected = picked && (picked.kind === 'num' ? !placedNumbers.includes(picked.card) : typeof picked.card !== 'number' || !placedOps.includes(picked.card)) ? picked : null;
  const errors = evaluation.errors;

  const isLocked = (slot: Slot) => locked.some((s) => sameSlot(s, slot));
  const isError = (slot: Slot) => errors.some((s) => sameSlot(s, slot));
  const fits = (slot: Slot) => selected !== null && !isLocked(slot) && (selected.kind === 'num') === (slot.kind === 'num');

  const opOf = (ref: OpRef): Op | null => (typeof ref === 'string' ? ref : hand.ops === 'palette' ? null : (hand.ops[ref] ?? null));

  /** What a filled slot shows, and says. */
  const content = (slot: Slot): { face: ReactNode; name: string } | null => {
    const v = getSlot(fill, slot);
    if (v === null) return null;
    if (slot.kind === 'num') {
      const value = hand.numbers[v as number];
      return { face: value, name: String(value) };
    }
    const op = opOf(v);
    return op ? { face: OP_SIGN[op], name: OP_NAME[op] } : null;
  };

  const tapSlot = (slot: Slot) => {
    if (disabled || isLocked(slot)) return;
    if (selected && fits(slot)) {
      onPlace(slot, selected.card);
      setPicked(null);
    } else if (getSlot(fill, slot) !== null) onClear(slot);
  };

  const slotButton = (slot: Slot) => {
    const c = content(slot);
    const filled = c !== null;
    const label = `${slotLabel(slot)}, ${c ? c.name : 'empty'}`;
    return (
      <button
        key={`${slot.row}${slot.kind}${(slot as { i?: number }).i ?? ''}`}
        className={`grid-slot ${slot.kind === 'num' ? 'num' : 'sign'} ${slot.kind === 'rowOp' ? 'join' : ''} ${filled ? 'filled' : ''} ${isLocked(slot) ? 'locked' : ''} ${isError(slot) ? 'error' : ''} ${fits(slot) ? 'fits' : ''}`}
        aria-label={isLocked(slot) ? `${label}, filled in by the cat` : isError(slot) ? `${label}, does not work` : label}
        disabled={disabled || isLocked(slot)}
        onClick={() => tapSlot(slot)}
      >
        {c?.face}
      </button>
    );
  };

  const numberCards = hand.numbers.map((value, i) => {
    const placed = placedNumbers.includes(i);
    const on = selected?.kind === 'num' && selected.card === i;
    return (
      <button
        key={i}
        className={`grid-card ${on ? 'selected' : ''} ${i === torchCard ? 'torch' : ''}`}
        aria-pressed={on}
        aria-label={`${numberName ? numberName(value, i) : value}${placed ? ', placed' : ''}${i === torchCard ? ', you will not need this one' : ''}`}
        disabled={disabled || placed}
        onClick={() => setPicked(on ? null : { kind: 'num', card: i })}
      >
        {renderNumber ? renderNumber(value, i) : value}
      </button>
    );
  });

  const signCards = (hand.ops === 'palette' ? PALETTE : hand.ops).map((op, k) => {
    const card: OpRef = hand.ops === 'palette' ? op : k;
    const placed = hand.ops !== 'palette' && placedOps.includes(k);
    const on = selected?.kind === 'op' && selected.card === card;
    return (
      <button
        key={k}
        className={`grid-card sign ${on ? 'selected' : ''}`}
        aria-pressed={on}
        aria-label={`${OP_NAME[op]}${placed ? ', placed' : ''}`}
        disabled={disabled || placed}
        onClick={() => setPicked(on ? null : { kind: 'op', card })}
      >
        {OP_SIGN[op]}
      </button>
    );
  });

  return (
    <div className="number-grid">
      <div className="grid-rows" role="group" aria-label="The grid">
        {ROWS.map((r) => (
          <div key={r} className="grid-row">
            <div className="grid-cells">
              {r === 0 ? <span className="grid-spacer" aria-hidden="true" /> : slotButton({ row: r, kind: 'rowOp' })}
              {NUM_SLOTS.map((i) => (
                <Fragment key={i}>
                  {slotButton({ row: r, kind: 'num', i })}
                  {i === 0 ? slotButton({ row: r, kind: 'op', i: 0 }) : i === 1 ? slotButton({ row: r, kind: 'op', i: 1 }) : null}
                </Fragment>
              ))}
            </div>
            {(() => {
              const problem = rowProblem(hand, fill, errors, r);
              return problem ? <p className="grid-caption error">{problem}</p> : <p className="grid-caption">{rowCaption(r, evaluation.rows[r])}</p>;
            })()}
          </div>
        ))}
      </div>

      {oneHand ? (
        <div className="grid-hand one-hand" role="group" aria-label="Your cards">
          {signCards}
          {numberCards}
        </div>
      ) : (
        <>
          <div className="grid-hand" role="group" aria-label="Your numbers">
            {numberCards}
          </div>
          <div className="grid-hand" role="group" aria-label="Signs">
            {signCards}
          </div>
        </>
      )}
    </div>
  );
}
