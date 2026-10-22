// Speed round: quick one-step sums with one blank against a sand timer. She
// taps one of four cards to fill the blank. The timer only sizes the reward;
// below the lowest tier she just walks on. Seeded, so a reload starts the same
// round again.

import { Rng, hashSeed } from '../engine/rng.ts';
import type { Level } from './mentalMaths.ts';

export const SPEED_SECONDS = 60;
export const SPEED_COUNT = 40;

export interface SpeedQuestion {
  /** A sum with exactly one `_`, e.g. `7 × _ = 56`, `_ − 9 = 14`, `7 _ 8 = 56`. */
  text: string;
  /** Four distinct cards, shuffled: numbers, or the four operators for an operator blank. */
  cards: string[];
  /** The right card. */
  answer: string;
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

type Op = '+' | '−' | '×' | '÷';
const ALL_OPS: Op[] = ['+', '−', '×', '÷'];
const MAX_CARD = 9999;

const between = (rng: Rng, lo: number, hi: number) => lo + rng.int(hi - lo + 1);

/** `a op b = c`, always a true whole-number sum. */
function operands(rng: Rng, level: Level, op: Op): [number, number, number] {
  if (op === '+') {
    if (level === 'easy') {
      const a = between(rng, 6, 70);
      const b = between(rng, 5, 99 - a);
      return [a, b, a + b];
    }
    const a = level === 'medium' ? between(rng, 50, 300) : between(rng, 120, 600);
    const b = level === 'medium' ? between(rng, 30, 199) : between(rng, 120, 390);
    return [a, b, a + b];
  }
  if (op === '−') {
    const a = level === 'easy' ? between(rng, 20, 99) : level === 'medium' ? between(rng, 100, 400) : between(rng, 300, 999);
    const low = level === 'easy' ? 5 : level === 'medium' ? 20 : 100;
    const gap = level === 'easy' ? 3 : level === 'medium' ? 10 : 50;
    const b = between(rng, low, a - gap);
    return [a, b, a - b];
  }
  if (op === '×') {
    const a = level === 'easy' ? between(rng, 2, 10) : level === 'medium' ? between(rng, 12, 40) : between(rng, 13, 25);
    const b = level === 'easy' ? between(rng, 2, 10) : level === 'medium' ? between(rng, 3, 9) : between(rng, 6, 15);
    return [a, b, a * b];
  }
  const b = level === 'medium' ? between(rng, 2, 9) : between(rng, 3, 12);
  const c = level === 'medium' ? between(rng, 3, 12) : between(rng, 6, 20);
  return [b * c, b, c];
}

/** The number the blank would need if the sum used `op` instead, or null if it isn't a whole number. */
function altBlank(op: Op, blankLeft: boolean, shown: number, result: number): number | null {
  const divides = (n: number, d: number) => d !== 0 && n % d === 0;
  if (blankLeft) {
    // `_ op shown = result`
    if (op === '+') return result - shown;
    if (op === '−') return result + shown;
    if (op === '×') return divides(result, shown) ? result / shown : null;
    return result * shown;
  }
  // `shown op _ = result`
  if (op === '+') return result - shown;
  if (op === '−') return shown - result;
  if (op === '×') return divides(result, shown) ? result / shown : null;
  return divides(shown, result) ? shown / result : null;
}

/** Three distinct wrong numbers: near misses, then the answers other operations would give, then the nearest. */
function wrongNumbers(op: Op, blankLeft: boolean, answer: number, shown: number, result: number): number[] {
  const out: number[] = [];
  const add = (n: number | null) => {
    if (out.length >= 3 || n === null) return;
    if (!Number.isInteger(n) || n < 0 || n > MAX_CARD || n === answer || out.includes(n)) return;
    out.push(n);
  };
  if (op === '×' || op === '÷') {
    add(answer - 1);
    add(answer + 1);
  }
  add(answer + 10);
  add(answer - 10);
  for (const other of ALL_OPS) if (other !== op) add(altBlank(other, blankLeft, shown, result));
  for (let d = 1; out.length < 3; d++) {
    add(answer + d);
    add(answer - d);
  }
  return out;
}

function one(rng: Rng, level: Level): SpeedQuestion {
  const op = rng.pick(level === 'easy' ? ALL_OPS.slice(0, 3) : ALL_OPS);
  const opBlank = rng.int(level === 'easy' ? 5 : 4) === 0;
  const blankLeft = !opBlank && rng.int(2) === 0;
  const [a, b, c] = operands(rng, level, op);
  if (opBlank) {
    return { text: `${a} _ ${b} = ${c}`, cards: rng.shuffle(ALL_OPS), answer: op };
  }
  const answer = blankLeft ? a : b;
  const shown = blankLeft ? b : a;
  const text = blankLeft ? `_ ${op} ${b} = ${c}` : `${a} ${op} _ = ${c}`;
  const cards = rng.shuffle([answer, ...wrongNumbers(op, blankLeft, answer, shown, c)].map(String));
  return { text, cards, answer: String(answer) };
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
