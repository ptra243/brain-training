// Speed round: quick one-step sums against a sand timer. The timer only sizes
// the reward; below the lowest tier she just walks on. Seeded, so a reload
// starts the same round again.

import { Rng, hashSeed } from '../engine/rng.ts';
import type { Level } from './mentalMaths.ts';

export const SPEED_SECONDS = 60;
export const SPEED_COUNT = 40;

export interface SpeedQuestion {
  text: string;
  answer: number;
}

export interface SpeedReward {
  /** Bonuses drawn from the seed (the board decides which). */
  bonuses: number;
  /** Also move the cat on (the `steps` bonus). */
  steps: boolean;
}

/** Right answers needed for one bonus, two bonuses, and two plus steps. */
export const SPEED_TIERS: Record<Level, [number, number, number]> = {
  easy: [4, 6, 9],
  medium: [5, 8, 12],
  hard: [5, 8, 12],
};

const between = (rng: Rng, lo: number, hi: number) => lo + rng.int(hi - lo + 1);

function one(rng: Rng, level: Level): SpeedQuestion {
  if (level === 'easy') {
    const kind = rng.int(3);
    if (kind === 0) {
      const a = between(rng, 6, 70);
      const b = between(rng, 5, 99 - a);
      return { text: `${a} + ${b}`, answer: a + b };
    }
    if (kind === 1) {
      const a = between(rng, 20, 99);
      const b = between(rng, 5, a - 3);
      return { text: `${a} − ${b}`, answer: a - b };
    }
    const a = between(rng, 2, 10);
    const b = between(rng, 2, 10);
    return { text: `${a} × ${b}`, answer: a * b };
  }
  if (level === 'medium') {
    const kind = rng.int(4);
    if (kind === 0) {
      const a = between(rng, 12, 40);
      const b = between(rng, 3, 9);
      return { text: `${a} × ${b}`, answer: a * b };
    }
    if (kind === 1) {
      const p = rng.pick([10, 25, 50]);
      const amount = 40 * between(rng, 1, 10);
      return { text: `${p}% of ${amount}`, answer: (amount * p) / 100 };
    }
    if (kind === 2) {
      const a = between(rng, 50, 300);
      const b = between(rng, 30, 199);
      return { text: `${a} + ${b}`, answer: a + b };
    }
    const a = between(rng, 100, 400);
    const b = between(rng, 20, a - 10);
    return { text: `${a} − ${b}`, answer: a - b };
  }
  const kind = rng.int(4);
  if (kind === 0) {
    const a = between(rng, 13, 25);
    const b = between(rng, 6, 15);
    return { text: `${a} × ${b}`, answer: a * b };
  }
  if (kind === 1) {
    const d = rng.pick([3, 4, 5, 10]);
    const n = between(rng, 1, d - 1);
    const unit = between(rng, 4, 30);
    return { text: `${n}/${d} of ${d * unit}`, answer: n * unit };
  }
  if (kind === 2) {
    const a = between(rng, 120, 600);
    const b = between(rng, 120, 390);
    return { text: `${a} + ${b}`, answer: a + b };
  }
  const a = between(rng, 300, 999);
  const b = between(rng, 100, a - 50);
  return { text: `${a} − ${b}`, answer: a - b };
}

/** The round's 40 quick sums. */
export function speedQuestions(seed: string, level: Level): SpeedQuestion[] {
  const rng = new Rng(hashSeed(`${seed}-speed-${level}`));
  return Array.from({ length: SPEED_COUNT }, () => one(rng, level));
}

/** The reward for `right` correct answers; nothing below the lowest tier. */
export function speedReward(level: Level, right: number): SpeedReward {
  const [t1, t2, t3] = SPEED_TIERS[level];
  if (right >= t3) return { bonuses: 2, steps: true };
  if (right >= t2) return { bonuses: 2, steps: false };
  if (right >= t1) return { bonuses: 1, steps: false };
  return { bonuses: 0, steps: false };
}
