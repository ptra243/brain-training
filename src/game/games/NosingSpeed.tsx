import { useEffect, useEffectEvent, useState } from 'react';
import type { SpeedQuestion } from '../../games/speedRound.ts';
import { NumberPad } from './NumberPad.tsx';

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

  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => setLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [endsAt]);

  useEffect(() => {
    if (over) end();
  }, [over]);

  if (!running) {
    return (
      <div className="speed">
        <h2>Speed round</h2>
        <p>
          Answer as many quick sums as you can in {seconds} seconds. The more you get right, the better the prize. A
          poor round costs you nothing.
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
      <p className="question-text">{q.text}</p>
      {!over && (
        <NumberPad
          label="Your answer"
          onSubmit={(v) => {
            if (v === q.answer) setRight((r) => r + 1);
            setIndex((i) => i + 1);
          }}
        />
      )}
    </div>
  );
}
