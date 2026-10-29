import { useMemo, useState, type CSSProperties } from 'react';
import { houseOf } from '../content/houses.ts';
import type { Case } from '../engine/types.ts';
import { midSentence } from '../engine/text.ts';
import { Dialog } from './Dialog.tsx';
import { standSpots } from './explore.ts';
import { faceClass, itemName, roomName, suspectColour, suspectName } from './names.ts';
import { ownerMap } from './plan.ts';
import { PlanFrame } from './PlanFrame.tsx';
import { SuspectCounterFace } from './SuspectCounterFace.tsx';
import type { SumStep } from './summation.ts';

interface Props {
  c: Case;
  step: SumStep;
  /** The last step's button reads "See the verdict". */
  last: boolean;
  onNext: () => void;
  onSkip: () => void;
  /** The killer got away: a step with no cite says she never found it out, not that she worked it out. */
  escaped?: boolean;
  /** Dev previews: open with the skip confirm showing. */
  initialSkip?: boolean;
}

/** One step of the summation: the floor plan with the guests shown so far, what this guest was really doing, and what she knew. */
export function Summation({ c, step, last, onNext, onSkip, escaped, initialSkip }: Props) {
  const house = useMemo(() => houseOf(c), [c]);
  const owner = useMemo(() => ownerMap(house), [house]);
  const [confirming, setConfirming] = useState(!!initialSkip);
  const pct = (r: number, col: number) => ({ top: `${(r / house.rows) * 100}%`, left: `${(col / house.cols) * 100}%` });

  const name = suspectName(step.guest, c.guests);
  const where = `in the ${roomName(step.room)}`;
  const line = `${name} was ${where} ${step.item ? `with the ${itemName(step.item)}` : 'with nothing in hand'}.`;
  const heading = step.earlier
    ? step.earlier.wrongWeapon
      ? `${step.earlier.time}. You named the right person and the wrong weapon.`
      : `${step.earlier.time}. You accused ${midSentence(name)}.`
    : null;

  return (
    <section className="panel summation" aria-label="The night, as it was">
      {heading ? (
        <h2 className="summation-head">{heading}</h2>
      ) : (
        <p className="summation-count" data-testid="summation-count">
          {step.n} of {step.of}
        </p>
      )}

      <PlanFrame house={house} owner={owner} inPlay={c.rooms} variant="explore" tile={() => ({})}>
        {house.rooms.flatMap((room) => {
          const here = step.placed.filter((p) => p.room === room.id).map((p) => p.guest);
          return standSpots(room, here, false).map((spot) => (
            <span
              key={spot.id}
              className={`map-person summation-counter${faceClass(spot.id)}${spot.id === step.guest ? ' arriving' : ''}`}
              style={{ ...pct(spot.r, spot.col), '--counter': suspectColour(spot.id) } as CSSProperties}
              role="img"
              aria-label={`${suspectName(spot.id, c.guests)}, ${roomName(room.id)}`}
            >
              <SuspectCounterFace id={spot.id} guests={c.guests} />
            </span>
          ));
        })}
      </PlanFrame>

      <article className="card summation-card" aria-live="polite">
        <p className="verdict-line">{line}</p>
        <p className="muted summation-cite">{step.clueText
            ? `You knew this: ${step.clueText}`
            : step.earlier || escaped
              ? 'You never found this out.'
              : 'You worked this out from your clues.'}</p>
      </article>

      <div className="summation-actions">
        <button type="button" className="secondary" onClick={() => setConfirming(true)}>
          Skip
        </button>
        <button type="button" className="primary" onClick={onNext}>
          {last ? 'See the verdict' : 'Next'}
        </button>
      </div>

      {confirming && (
        <Dialog placement="center" labelId="summation-skip-title" onClose={() => setConfirming(false)}>
          <h2 id="summation-skip-title">Are you sure?</h2>
          <p className="dialog-text">You'll skip the rest and go straight to the verdict.</p>
          <div className="dialog-actions">
            <button data-autofocus className="secondary" onClick={() => setConfirming(false)}>
              Keep watching
            </button>
            <button
              className="primary"
              onClick={() => {
                setConfirming(false);
                onSkip();
              }}
            >
              Skip
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
