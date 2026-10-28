import assert from 'node:assert/strict';
import { Rng, hashSeed } from '../engine/rng.ts';
import { house } from '../content/index.ts';
import type { House } from '../engine/types.ts';
import { nosingLadders, nosingSnakes } from '../content/nosing.ts';
import { BONUS_KINDS, nosingBounds, nosingRoomTarget, nosingSpec, type NosingLevel } from './nosingBoard.ts';
import { lockHand } from './lock.ts';
import { allSlots, evaluateGrid, getSlot, solveGrid } from './numberGrid.ts';
import {
  buildNosing,
  nosingHint,
  nosingInitial,
  nosingSplit,
  nosingStep,
  nosingView,
  dogReward,
  type NosingMove,
  type NosingPuzzle,
  type NosingState,
  type NosingView,
} from './nosing.ts';

export const LEVELS: NosingLevel[] = ['easy', 'medium', 'hard'];

export function make(level: NosingLevel, i: number, share = 5, at: House = house): NosingPuzzle {
  const rooms = at.rooms.map((r) => r.id);
  return buildNosing({
    house: at,
    seed: at === house ? `test-${i}-${level}` : `test-${i}-${level}-${at.id}`,
    level,
    sceneRoom: rooms[i % rooms.length],
    clues: Array.from({ length: share }, (_, k) => `c${k + 1}`),
    ladders: nosingLadders,
    snakes: nosingSnakes,
  });
}

export type Policy = 'hints' | 'wrong' | 'mixed';

/** End the fight without cards. Hints passes, wrong fails, mixed passes when `rng.int(2) === 1`. */
function skipDogMove(policy: Policy, rng: Rng): NosingMove {
  const pass = policy === 'hints' || (policy === 'mixed' && rng.int(2) === 1);
  return { t: 'skipDog', pass };
}

/** The next move a bot makes, and whether to take a hint first. */
function next(p: NosingPuzzle, s: NosingState, v: NosingView, policy: Policy, rng?: Rng): { move?: NosingMove; hint?: boolean } {
  if (v.phase === 'roll' || v.phase === 'rolled') return { move: { t: 'roll' } };
  if (v.phase === 'speed') return { move: { t: 'speed', right: policy === 'hints' ? 40 : policy === 'wrong' ? 0 : rng!.int(41) } };
  if (v.phase === 'question') {
    const q = v.question!.q;
    if (policy === 'wrong' || (policy === 'mixed' && rng!.int(2) === 0)) return { move: { t: 'answer', value: q.answer + 1 } };
    if (v.hintStep < 3) return { hint: true };
    return { move: { t: 'answer', value: q.answer } };
  }
  if (v.phase === 'dog') return { move: skipDogMove(policy, rng!) };
  // The lock.
  if (policy !== 'hints') return v.evaluation.submittable ? { move: { t: 'try' } } : { move: fillNext(p, s) };
  // A hint fills the grid with more of the way; try once it holds the target.
  if (v.evaluation.submittable && v.evaluation.answer === p.lock.target) return { move: { t: 'try' } };
  return { hint: true };
}

/** The next card to place: the first empty slot, in reading order, that takes one (any unused number, or +). */
export function fillNext(p: NosingPuzzle, s: NosingState): NosingMove {
  const v = nosingView(p, s);
  for (const slot of allSlots()) {
    if (getSlot(v.grid, slot) !== null) continue;
    const cards: (number | '+')[] = slot.kind === 'num' ? p.lock.numbers.map((_, i) => i) : ['+'];
    for (const card of cards) {
      const move: NosingMove = { t: 'place', slot, card };
      if (nosingStep(p, s, move) !== s) return move;
    }
  }
  throw new Error('nothing to place');
}

/** Her grid made submittable by placing cards. */
export function fillUntilSubmittable(p: NosingPuzzle, s: NosingState): NosingState {
  for (let n = 0; n < 20 && !nosingView(p, s).evaluation.submittable; n++) s = nosingStep(p, s, fillNext(p, s));
  return s;
}

/** `salt` changes what the random ('mixed') bot does, so a caller can look for a run that reaches some phase. */
export function drive(p: NosingPuzzle, policy: Policy, stop?: (v: NosingView) => boolean, salt = ''): { s: NosingState; v: NosingView; dog: 'won' | 'lost' | null; sawDog: boolean } {
  let s = nosingInitial();
  let dog: 'won' | 'lost' | null = null;
  let sawDog = false;
  const rng = new Rng(hashSeed(`${p.seed}-bot${salt}`));
  for (let n = 0; n < 2000; n++) {
    const v = nosingView(p, s);
    for (const m of v.messages) assert.ok(!/\b[A-Z]{3,}\b/.test(m), `${p.seed}: all-caps word in "${m}"`);
    if (v.phase === 'dog') sawDog = true;
    if (v.dog?.over) dog = v.dog.over;
    // A caller that stops on the fight returns first, so it still sees a live fight.
    if (v.finished || stop?.(v)) return { s, v, dog, sawDog };
    const a = next(p, s, v, policy, rng);
    if (a.hint) {
      const h = nosingHint(p, s);
      assert.ok(h, 'a hint was expected');
      s = h.state;
      // At the lock, a 'tiles' hint is followed by the 'move' hint, which is then played.
      continue;
    }
    const after = nosingStep(p, s, a.move!);
    assert.notEqual(after, s, `illegal bot move ${JSON.stringify(a.move)} in ${v.phase}`);
    s = after;
  }
  throw new Error('the bot did not finish');
}

/**
 * Walks the board with real rolls and answers but without the card games: a question, speed round,
 * ladder, snake or bonus gets the real answer move (right, wrong or random per `policy`), the dog
 * ends with one `skipDog` (pass, fail, or a coin flip), and the walk stops at the lock. It never
 * deals the dog's cards or fills the lock.
 */
export function walk(p: NosingPuzzle, policy: Policy, salt = ''): { s: NosingState; v: NosingView; sawDog: boolean } {
  let s = nosingInitial();
  let sawDog = false;
  const rng = new Rng(hashSeed(`${p.seed}-walk${salt}`));
  for (let n = 0; n < 2000; n++) {
    const v = nosingView(p, s);
    if (v.phase === 'dog') sawDog = true;
    if (v.finished || v.phase === 'lock') return { s, v, sawDog };
    let after: NosingState;
    if (v.phase === 'roll' || v.phase === 'rolled') after = nosingStep(p, s, { t: 'roll' });
    else if (v.phase === 'speed') after = nosingStep(p, s, { t: 'speed', right: policy === 'hints' ? 40 : policy === 'wrong' ? 0 : rng.int(41) });
    else if (v.phase === 'question') {
      const right = policy === 'hints' || (policy === 'mixed' && rng.int(2) === 1);
      after = nosingStep(p, s, { t: 'answer', value: v.question!.q.answer + (right ? 0 : 1) });
    } else after = nosingStep(p, s, skipDogMove(policy, rng)); // the dog
    assert.notEqual(after, s, `${p.seed}: the walker was stuck in ${v.phase}`);
    s = after;
  }
  throw new Error('the walker did not reach the lock');
}

/**
 * The per-seed sweeps behind the slow Nosing tests. `npm test` runs a few fixed seeds of each;
 * `scripts/check-cases.ts` runs a sample (quick) or all of them (--full). A failed assertion throws.
 */

/**
 * Three walks (right answers, always wrong, random) meet the dog, stay inside the turn window and end on the last square
 * ready for the lock. The dog ends with `skipDog` (a fail slides). The card fight is not played here: see the dog-fight
 * sweep (`dogFightSweeps.ts`).
 */
export function botSeed(level: NosingLevel, i: number, at: House = house): void {
  const p = make(level, i, 1 + (i % 7), at);
  const lv = nosingSpec(p.house, level);
  for (const policy of ['hints', 'wrong', 'mixed'] as const) {
    const run = walk(p, policy);
    assert.ok(run.sawDog, `${p.seed}: the ${policy} walk meets the dog`);
    assert.equal(run.v.phase, 'lock', `${p.seed}: the ${policy} walk ends at the lock`);
    assert.equal(run.v.pos, p.board.squares.length - 1, `${p.seed}: the ${policy} walk ends on the last square`);
    const turns = run.v.turn - 1;
    assert.ok(turns <= lv.turns[1] && turns >= lv.turns[0], `${p.seed}: ${policy} walk took ${turns} turns`);
  }
}

/** The dog waits on a snake head, which has no question, and never pays out steps. */
export function dogSquareSeed(level: NosingLevel, i: number): void {
  const p = make(level, i);
  assert.equal(p.board.squares[p.dogSquare].kind, 'snake', `${p.seed}: the dog sits on a snake head`);
  assert.equal(p.questions[p.dogSquare], undefined, 'no question on the dog square');
  const reward = dogReward(p.seed);
  assert.equal(reward.length, 2);
  assert.ok(reward.every((k) => BONUS_KINDS.includes(k) && k !== 'steps'), `${p.seed}: reward ${reward}`);
}

// Moved as they were from scripts/check-cases.ts: the fairness checks of one built Nosing puzzle, used by the forced boards
// (nosing.sweep.ts) and, for Play cases, by the case check.
export const nosingChecked: Record<string, number> = { easy: 0, medium: 0, hard: 0, none: 0 };

/** Whether a run meets the dog: a walker that answers every question right (or wrong) must be stopped by it before the lock. */
export function meetsDog(p: NosingPuzzle, right: boolean): boolean {
  let s = nosingInitial();
  for (let n = 0; n < 400; n++) {
    const v = nosingView(p, s);
    if (v.phase === 'dog') return true;
    if (v.finished || v.phase === 'lock' || v.phase === 'open') return false;
    const move =
      v.phase === 'question' ? { t: 'answer' as const, value: v.question!.q.answer + (right ? 0 : 1) }
      : v.phase === 'speed' ? { t: 'speed' as const, right: right ? 40 : 0 }
      : { t: 'roll' as const };
    const next = nosingStep(p, s, move);
    if (next === s) return false;
    s = next;
  }
  return false;
}

/** The dog square is a snake head, and a right run and a wrong run both meet the dog. The fight itself is not played. */
export function dogProblems(p: NosingPuzzle): string[] {
  const out: string[] = [];
  if (p.board.squares[p.dogSquare]?.kind !== 'snake') out.push(`nosing dog square ${p.dogSquare} is not a snake head`);
  for (const right of [true, false]) if (!meetsDog(p, right)) out.push(`nosing run never meets the dog (answering ${right ? 'right' : 'wrong'})`);
  return out;
}

/** Everything that makes a Nosing around puzzle unfair. */
export function nosingProblems(p: NosingPuzzle, sceneRoom: string, clueCount: number): string[] {
  const out: string[] = [];
  const lv = nosingSpec(p.house, p.level);
  const { board, lock } = p;
  const len = board.path.length;
  // The board: the exact turn and question bounds sit inside the level's ranges.
  const b = nosingBounds(board, p.seed, lv);
  if (b.minTurns < lv.turns[0] || b.maxTurns > lv.turns[1]) out.push(`nosing turns ${b.minTurns}-${b.maxTurns} outside ${lv.turns.join('-')}`);
  if (b.minQuestions < lv.minQuestions) out.push(`nosing has only ${b.minQuestions} questions`);
  if (len < lv.len[0] || len > lv.len[1]) out.push(`nosing path of ${len} squares`);
  // The lock meets its tier, and is exact with no bonuses.
  const tier = { easy: { lo: 20, hi: 99 }, medium: { lo: 100, hi: 299 }, hard: { lo: 300, hi: 699 } }[p.level];
  if (lock.numbers.length !== 6) out.push(`nosing lock has ${lock.numbers.length} numbers`);
  if (lock.target < tier.lo || lock.target > tier.hi) out.push(`nosing lock target ${lock.target}`);
  const hand = lockHand(lock);
  const way = solveGrid(hand, lock.target, 4);
  if (!way) out.push('nosing lock has no exact way');
  else {
    if (p.level === 'easy' && way.numbersUsed > 3) out.push('nosing easy lock needs more than 3 numbers');
    if (p.level === 'hard' && way.numbersUsed < 4) out.push('nosing hard lock needs fewer than 4 numbers');
  }
  const stored = evaluateGrid(hand, lock.way);
  if (!stored.submittable || stored.answer !== lock.target || stored.errors.length) out.push('nosing lock way misses the target');
  // Questions: whole numbers from 0 to 9999, the answer among the choices.
  for (const [i, q] of Object.entries(p.questions)) {
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 9999) out.push(`nosing question ${i} answers ${q.answer}`);
    if (!q.choices.includes(q.answer) || new Set(q.choices).size !== 3) out.push(`nosing question ${i} has bad choices`);
  }
  for (const [i, list] of Object.entries(p.speed)) {
    if (list.some((q) => new Set(q.cards).size !== 4 || !q.cards.includes(q.answer) || q.text.split('_').length !== 2)) out.push(`nosing speed round ${i} has a bad answer`);
  }
  board.squares.forEach((sq, i) => {
    if ((sq.kind === 'ladder' || (sq.kind === 'snake' && i !== p.dogSquare) || sq.kind === 'obstacle' || sq.kind === 'search') && !p.questions[i]) out.push(`nosing square ${i} has no question`);
    if (sq.kind === 'speed' && !p.speed[i]) out.push(`nosing square ${i} has no speed round`);
    if (sq.kind === 'ladder' || sq.kind === 'snake') {
      const c = (sq.kind === 'ladder' ? nosingLadders : nosingSnakes).find((x) => x.id === sq.contentId);
      if (!c) out.push(`nosing ${sq.kind} ${i} has no content`);
      else if (c.rooms !== 'any' && !c.rooms.includes(board.roomOf[i])) out.push(`nosing ${sq.kind} ${c.id} sits in ${board.roomOf[i]}`);
    }
  });
  // At least nosingRoomTarget rooms. Every entered room has a search square; a second one is a clue outside the scene. Clue indexes match the split.
  const split = nosingSplit(clueCount);
  const rooms = new Set(board.roomOf);
  if (rooms.size < nosingRoomTarget(lv, p.house.rooms.length, split.search)) out.push('nosing path misses a room');
  const searches = board.squares.flatMap((sq, i) => (sq.kind === 'search' ? [{ room: board.roomOf[i], clue: sq.clueIndex != null }] : []));
  const seen = new Map<string, number>();
  let searchOk = searches.every((s) => rooms.has(s.room)) && [...rooms].every((r) => searches.some((s) => s.room === r));
  for (const s of searches) {
    const n = seen.get(s.room) ?? 0;
    if (n >= 1 && (!s.clue || s.room === sceneRoom)) searchOk = false;
    seen.set(s.room, n + 1);
  }
  if ((seen.get(sceneRoom) ?? 0) !== (rooms.has(sceneRoom) ? 1 : 0)) searchOk = false;
  if (!searchOk) out.push('nosing: not one search square in every room');
  const idx = board.squares.flatMap((sq) => (sq.kind === 'search' && sq.clueIndex != null ? [sq.clueIndex] : [])).sort();
  if (idx.length !== split.search || idx.some((v, k) => v !== k)) out.push(`nosing has ${idx.length} clue squares for ${split.search} search clues`);
  if (p.searchClues.length !== split.search || p.lockClues.length !== split.lock) out.push('nosing clue split is wrong');
  const lockRoom = board.roomOf[len - 1];
  if (lockRoom === sceneRoom) out.push('nosing lock is in the scene room');
  if (!board.clueRooms.includes(lockRoom)) out.push('nosing lock room is not a clue room');
  if (board.clueRooms.includes(sceneRoom)) out.push('nosing has a clue in the scene room');
  out.push(...dogProblems(p));
  nosingChecked[p.level]++;
  return out;
}
