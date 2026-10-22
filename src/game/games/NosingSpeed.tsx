import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { SpeedQuestion } from '../../games/speedRound.ts';

/** Seconds a wrong card takes off the clock. */
const SPEED_PENALTY_SECONDS = 3;

interface Props {
  questions: readonly SpeedQuestion[];
  seconds: number;
  /** Time is up (or the sums ran out): how many she got right. */
  onEnd: (right: number) => void;
}

/**
 * The speed round: a start button, then a sand timer and one sum at a time.
 * Nothing is saved until it ends, so a reload starts the round again.
 */
export function NosingSpeed({ questions, seconds, onEnd }: Props) {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [left, setLeft] = useState(seconds);
  const [index, setIndex] = useState(0);
  const [right, setRight] = useState(0);

  const end = useEffectEvent(() => onEnd(right));
  const running = endsAt !== null;
  const over = running && (left <= 0 || index >= questions.length);
  // A second tap can land before React re-renders the next sum. One tap per sum.
  const taken = useRef(false);
  useEffect(() => {
    taken.current = false;
  }, [index]);

  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => setLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [endsAt]);

  useEffect(() => {
    if (over) end();
  }, [over]);

  /** One tap ends that sum. A wrong card also takes the penalty off the clock, and off the label at once. */
  const tap = (card: string) => {
    if (taken.current || over) return;
    taken.current = true;
    if (card === questions[Math.min(index, questions.length - 1)].answer) {
      setRight((r) => r + 1);
    } else {
      setEndsAt((e) => (e === null ? e : e - SPEED_PENALTY_SECONDS * 1000));
      setLeft((l) => Math.max(0, l - SPEED_PENALTY_SECONDS));
    }
    setIndex((i) => i + 1);
  };

  if (!running) {
    return (
      <div className="speed">
        <h2>Speed round</h2>
        <p>
          Tap the card that fills the blank. You have {seconds} seconds. A wrong card costs {SPEED_PENALTY_SECONDS}{' '}
          seconds. The more you get right, the better the prize. A poor round costs you nothing.
        </p>
        <button
          className="primary"
          onClick={() => {
            setEndsAt(Date.now() + seconds * 1000);
            setLeft(seconds);
          }}
        >
          Start the {seconds} seconds
        </button>
      </div>
    );
  }

  const q = questions[Math.min(index, questions.length - 1)];
  return (
    <div className="speed">
      <div className="sand" role="timer" aria-label={`${left} seconds left`}>
        <span className="sand-fill" style={{ width: `${(left / seconds) * 100}%` }} />
        <span className="sand-text">{left}s</span>
      </div>
      <p className="speed-count">{right} right</p>
      <p className="question-text speed-sum">{q.text}</p>
      {!over && (
        <div className="speed-cards" role="group" aria-label="Four cards">
          {q.cards.map((c) => (
            <button key={c} className="speed-card" onClick={() => tap(c)}>
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
