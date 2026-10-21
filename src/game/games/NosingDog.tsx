import { useMemo, type ReactNode } from 'react';
import { nosingDog } from '../../content/nosing.ts';
import { tarotArt } from '../../content/tarotArt.ts';
import { CAT_LIVES, DOG_LIVES, type DogTurnResult, type DogView } from '../../games/dogFight.ts';
import type { NosingMove } from '../../games/nosing.ts';
import { gridLines, type Hand, type OpRef, type Slot } from '../../games/numberGrid.ts';
import { NumberGrid } from './NumberGrid.tsx';
import { hasClearable } from './numberGridUi.ts';

/** The line about the turn just played, from the view's `last` data. */
function lastLine(last: DogTurnResult): string {
  const t = nosingDog.last;
  if (last.role === 'attack') {
    if (last.dogLost >= 2) return t.attackTwice(last.catValue, last.dogValue);
    return last.dogLost === 1 ? t.attackOnce(last.catValue, last.dogValue) : t.attackMissed(last.catValue, last.dogValue);
  }
  if (last.catLost) return t.defendLost(last.catValue, last.dogValue);
  return last.bonusCard ? t.defendExact(last.catValue, last.dogValue) : t.defendMet(last.catValue, last.dogValue);
}

function Lives({ label, left, total }: { label: string; left: number; total: number }) {
  return (
    <div className="dog-lives" role="img" aria-label={`${label}: ${left} of ${total} lives`}>
      <span>{label}</span>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`life ${i < left ? 'on' : ''}`} aria-hidden="true" />
      ))}
    </div>
  );
}

interface Props {
  view: DogView;
  /** The hint button and note. */
  hints: ReactNode;
  onMove: (move: NosingMove) => void;
}

/** The dog fight: both sides' lives, the dog's play, then her grid and cards. */
export function NosingDog({ view, hints, onMove }: Props) {
  const hand = useMemo<Hand>(() => ({ numbers: view.numbers.map((c) => c.value), ops: view.ops.map((o) => o.op) }), [view.numbers, view.ops]);
  const dogLines = useMemo(() => gridLines({ numbers: view.dog.numbers, ops: view.dog.ops }, view.dog.fill), [view.dog]);
  const face = (value: number, index: number) => {
    const card = view.numbers[index];
    const art = tarotArt(card.id);
    return (
      <span className="tarot-card">
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <path d={art.path} fill={art.colour} />
        </svg>
        <span className="tarot-value">{value}</span>
      </span>
    );
  };

  return (
    <div className="dog-fight">
      <div className="dog-top">
        <Lives label={nosingDog.catLives} left={view.catLives} total={CAT_LIVES} />
        <Lives label={nosingDog.dogLives} left={view.dogLives} total={DOG_LIVES} />
      </div>
      <p className="dog-role">{view.role === 'attack' ? nosingDog.attack(view.dog.value) : nosingDog.defend(view.dog.value)}</p>
      {view.last && <p className="dog-last muted">{lastLine(view.last)}</p>}
      <div className="dog-play" aria-label={nosingDog.dogPlays}>
        <span className="dog-play-title">{nosingDog.dogPlays}</span>
        {dogLines.map((line, i) => (
          <span key={i}>{line}</span>
        ))}
      </div>
      {hints}
      <NumberGrid
        hand={hand}
        fill={view.fill}
        evaluation={view.eval}
        locked={[]}
        renderNumber={face}
        numberName={(_, i) => view.numbers[i].name}
        onPlace={(slot: Slot, card: number | OpRef) => onMove({ t: 'place', slot, card })}
        onClear={(slot: Slot) => onMove({ t: 'clear', slot })}
      />
      <div className="lock-actions">
        <button className="secondary" disabled={!hasClearable(view.fill, [])} onClick={() => onMove({ t: 'clearAll' })}>
          Clear
        </button>
        <button className="primary" disabled={!view.eval.submittable} onClick={() => onMove({ t: 'play' })}>
          Play{view.eval.submittable ? ` (${view.eval.answer})` : ''}
        </button>
      </div>
    </div>
  );
}

/** The end of the fight: what happened, and Continue. */
export function NosingDogResult({ view, messages, onContinue }: { view: DogView; messages: string[]; onContinue: () => void }) {
  const won = view.over === 'won';
  return (
    <div className="dog-result" role="status">
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
