// Mental maths questions for the board game: seeded, household wording from
// `src/content/nosingQuestions.ts`, a short working, and three choices for the
// cat's hints. Every answer is a whole number from 0 to 9999.

import { Rng, hashSeed } from '../engine/rng.ts';
import { nosingQuestions, type QuestionKind } from '../content/nosingQuestions.ts';
import type { Difficulty } from '../engine/types.ts';

export type Level = Difficulty;
export type { QuestionKind };

export const LEVEL_KINDS: Record<Level, readonly QuestionKind[]> = {
  easy: ['add', 'subtract', 'times', 'clockGap'],
  medium: ['timesTwo', 'change', 'percent', 'gap24'],
  hard: ['steps', 'stepsLess', 'fraction', 'backwards'],
};

export interface Question {
  kind: QuestionKind;
  /** Index of the wording in the kind's pool. */
  wording: number;
  text: string;
  answer: number;
  /** 2 to 3 short lines; the last ends on the answer. */
  working: string[];
  /** The answer and two near misses, shuffled. */
  choices: [number, number, number];
}

interface Draft {
  a: string | number;
  b: string | number;
  c?: string | number;
  answer: number;
  working: string[];
  /** Near-miss distances, nearest first. */
  near?: number[];
}

const between = (rng: Rng, lo: number, hi: number) => lo + rng.int(hi - lo + 1);
const stepped = (rng: Rng, lo: number, hi: number, step: number) => lo + step * rng.int(Math.floor((hi - lo) / step) + 1);

/** Minutes since midnight as hh:mm. */
export function clockText(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const hhmm = (minutes: number) => Math.floor(minutes / 60) * 100 + (minutes % 60);

const DRAFTS: Record<QuestionKind, (rng: Rng) => Draft> = {
  add(rng) {
    const a = between(rng, 12, 79);
    const b = between(rng, 11, 99 - a);
    const tens = Math.floor(b / 10) * 10;
    return { a, b, answer: a + b, working: [`${a} + ${tens} = ${a + tens}`, `${a + tens} + ${b - tens} = ${a + b}`] };
  },
  subtract(rng) {
    const a = between(rng, 31, 99);
    const b = between(rng, 11, a - 5);
    const tens = Math.floor(b / 10) * 10;
    return { a, b, answer: a - b, working: [`${a} − ${tens} = ${a - tens}`, `${a - tens} − ${b - tens} = ${a - b}`] };
  },
  times(rng) {
    const a = between(rng, 3, 10);
    const b = between(rng, 3, 10);
    return { a, b, answer: a * b, working: [`${a} lots of ${b}`, `${a} × ${b} = ${a * b}`] };
  },
  clockGap(rng) {
    const a = between(rng, 2, 40);
    const b = between(rng, a + 5, 58);
    return { a, b, answer: b - a, working: [`From ${a} up to ${b}`, `${b} − ${a} = ${b - a}`] };
  },
  timesTwo(rng) {
    const a = between(rng, 12, 48);
    const b = between(rng, 3, 9);
    const tens = Math.floor(a / 10) * 10;
    return {
      a, b, answer: a * b,
      working: [`${tens} × ${b} = ${tens * b}`, `${a - tens} × ${b} = ${(a - tens) * b}`, `${tens * b} + ${(a - tens) * b} = ${a * b}`],
    };
  },
  change(rng) {
    const a = rng.pick([20, 50, 100]);
    const b = between(rng, Math.ceil(a * 0.2), a - 1);
    const up = Math.ceil(b / 10) * 10;
    return {
      a, b, answer: a - b,
      working: [`${b} up to ${up} is ${up - b}`, `${up} up to ${a} is ${a - up}`, `${up - b} + ${a - up} = ${a - b}`],
    };
  },
  percent(rng) {
    const p = rng.pick([10, 25, 50]);
    const amount = stepped(rng, 40, 400, 40);
    const answer = (amount * p) / 100;
    const how = p === 10 ? `${amount} ÷ 10` : p === 25 ? `${amount} ÷ 4` : `${amount} ÷ 2`;
    return {
      a: p, b: amount, answer,
      working: [`${p}% is ${p === 10 ? 'a tenth' : p === 25 ? 'a quarter' : 'a half'}`, `${how} = ${answer}`],
    };
  },
  gap24(rng) {
    const start = stepped(rng, 360, 1080, 5);
    const gap = stepped(rng, 25, 300, 5);
    const h = Math.floor(gap / 60);
    const m = gap % 60;
    return {
      a: clockText(start), b: clockText(start + gap), answer: gap,
      working: [`${clockText(start)} to ${clockText(start + gap)} is ${h} h ${m} min`, `${h} × 60 + ${m} = ${gap}`],
    };
  },
  steps(rng) {
    const a = between(rng, 3, 9);
    const b = between(rng, 4, 12);
    const c = between(rng, 5, 40);
    return { a, b, c, answer: a * b + c, working: [`${a} × ${b} = ${a * b}`, `${a * b} + ${c} = ${a * b + c}`] };
  },
  stepsLess(rng) {
    const a = between(rng, 3, 9);
    const b = between(rng, 6, 15);
    const c = between(rng, 5, a * b - 5);
    return { a, b, c, answer: a * b - c, working: [`${a} × ${b} = ${a * b}`, `${a * b} − ${c} = ${a * b - c}`] };
  },
  fraction(rng) {
    const b = rng.pick([3, 4, 5, 10]);
    const a = between(rng, 1, b - 1);
    const unit = between(rng, 4, 30);
    const c = b * unit;
    return {
      a, b, c, answer: a * unit,
      working: [`1/${b} of ${c} = ${unit}`, `${a} × ${unit} = ${a * unit}`],
    };
  },
  backwards(rng) {
    const leave = stepped(rng, 300, 1200, 5);
    const trip = stepped(rng, 25, 180, 5);
    const h = Math.floor(trip / 60);
    const m = trip % 60;
    const back = clockText(leave);
    return {
      a: clockText(leave + trip), b: trip, answer: hhmm(leave),
      working: [`${trip} minutes is ${h} h ${m} min`, `${clockText(leave + trip)} take away ${h} h ${m} min is ${back}`, `Written as hhmm: ${hhmm(leave)}`],
      near: [100, 10, 5],
    };
  },
};

function fill(template: string, d: Draft): string {
  return template.replace('{a}', String(d.a)).replace('{b}', String(d.b)).replace('{c}', String(d.c ?? ''));
}

function missesFor(answer: number, near: number[], rng: Rng): [number, number] {
  const candidates: number[] = [];
  for (const d of [...near, 1, 2, 3, 10]) {
    for (const v of [answer + d, answer - d]) {
      if (v >= 0 && v <= 9999 && v !== answer && !candidates.includes(v)) candidates.push(v);
    }
  }
  // Prefer the close ones: shuffle the nearest six, then take two.
  const pool = rng.shuffle(candidates.slice(0, 6));
  return [pool[0], pool[1]];
}

/** Every (kind, wording index) pair a level can ask, in a fixed order. */
export function wordingPairs(level: Level): { kind: QuestionKind; wording: number }[] {
  return LEVEL_KINDS[level].flatMap((kind) => nosingQuestions[kind].map((_, wording) => ({ kind, wording })));
}

/** One question. Without `kind`, one is drawn from the level's kinds; without `wording`, a wording is drawn from the kind's pool. */
export function question(seed: string, level: Level, kind?: QuestionKind, wording?: number): Question {
  const rng = new Rng(hashSeed(`${seed}-maths-${level}`));
  const chosen = kind ?? rng.pick(LEVEL_KINDS[level]);
  const draft = DRAFTS[chosen](rng);
  const pool = nosingQuestions[chosen];
  const w = wording ?? rng.pick(pool.map((_, i) => i));
  const text = fill(pool[w], draft);
  const misses = missesFor(draft.answer, draft.near ?? [], rng);
  const choices = rng.shuffle([draft.answer, ...misses]) as [number, number, number];
  return { kind: chosen, wording: w, text, answer: draft.answer, working: draft.working, choices };
}

/** Cat hints: 0 the first line of working, 1 the choices, 2 the answer. */
export function questionHint(q: Question, step: number): string {
  if (step <= 0) return q.working[0];
  if (step === 1) return q.choices.join(', ');
  return String(q.answer);
}
