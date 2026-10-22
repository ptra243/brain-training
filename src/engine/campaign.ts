// The campaign: one long mystery. 7 guests, one killer, up to 3 rounds. Each
// round is a body at a later time of night (a case of its own, with rooms
// shared and the killer alone at the scene). A wrong accusation means the
// accused is the next body; after the third the killer gets away.
//
// Fairness, every round: she plays any `budget` of the round's 3 puzzles.
// - Before the last round, 1 or 2 innocent decoys are chosen. The free clues
//   plus ANY one puzzle leave exactly the killer and the decoys as possible
//   killers, and no clue ever rules a decoy out, so any choice of puzzles
//   leaves 2 or 3.
// - In the last round, the free clues plus any one puzzle pin down the killer
//   and the weapon.
// A round depends on who she wrongly accused before it, so it's built when
// she gets there: same campaign and same victims, same round.

import { cluePool, type ClueContext } from './clues.ts';
import { assemble, rollShared, weightedOrder, type Truth } from './generate.ts';
import { ROTATION } from './gameKinds.ts';
import { caseContext, caseSpace } from './caseFacts.ts';
import { Rng, hashSeed } from './rng.ts';
import { couldBeKiller, possibleKillers, possibleWeapons, type Space } from './search.ts';
import { caseSettings, type CaseLevels, type CaseSettings } from './settings.ts';
import { boardPuzzle } from './caseBoard.ts';
import { tarotClueCards, tarotPairsFor } from './tarotCards.ts';
import type { Case, ClueFact, Content, Difficulty, RotatingKind } from './types.ts';

export interface CampaignRef {
  mode: 'campaign';
  /** Five characters, like a Quick start code. */
  code: string;
  difficulty: Difficulty;
  /** Starting option: the accuse screen lists only guests her clues still allow. */
  possibleOnly?: boolean;
  /** Starting option: a case board tab that fits her clues together before she accuses. Doesn't change the rounds. */
  endBoard?: boolean;
  /** Starting option: each puzzle unlocks at most this many clues (absent: 3). Fewer means more puzzles, and more to play. */
  perPuzzle?: 1 | 2;
}

export type PerPuzzle = 1 | 2 | 3;
export const PER_PUZZLE: readonly PerPuzzle[] = [3, 2, 1];

export const ROUNDS = 3;
export const CAST = 7;

/** Puzzles she may play each round, of the three on offer at 3 clues a puzzle (the word game is always free). */
export const BUDGET: Record<Difficulty, number> = { easy: 3, medium: 2, hard: 1 };

/** The puzzles a round offers at each number of clues per puzzle: one more for each clue fewer. */
export const ROUND_PUZZLES: Record<PerPuzzle, readonly RotatingKind[]> = {
  3: ROTATION,
  2: [...ROTATION, 'board'],
  1: [...ROTATION, 'board', 'tarot'],
};

const perPuzzleOf = (ref: CampaignRef): PerPuzzle => ref.perPuzzle ?? 3;

/** Puzzles she may play each round: her difficulty's budget, plus one for each extra puzzle on offer. */
export const roundBudget = (ref: CampaignRef): number => BUDGET[ref.difficulty] + ROUND_PUZZLES[perPuzzleOf(ref)].length - ROTATION.length;

/** Fewest clues a puzzle unlocks: past the ones that narrow it down, the rest say where others were. */
const MIN_PER_PUZZLE = 3;
/** The last round must pin down the killer and the weapon, which takes more clues on hard. */
const LAST_ROUND_EXTRA = 3;

const seedText = (ref: CampaignRef) => `campaign-${ref.code}-${ref.difficulty}${ref.perPuzzle ? `-per${ref.perPuzzle}` : ''}`;

/** Who's at the manor, what's in play, and who the killer is: fixed for the whole campaign. */
export interface CampaignCast {
  suspects: string[];
  rooms: string[];
  items: string[];
  killer: string;
  /** Round 1's victim: the guest after the seated ones in the seating shuffle. Not a suspect. */
  firstVictim: string;
}

export function campaignCast(content: Content, ref: CampaignRef): CampaignCast {
  const rng = new Rng(hashSeed(seedText(ref)));
  const seating = rng.shuffle(content.suspects.map((s) => s.id));
  const suspects = seating.slice(0, CAST);
  const rooms = rng.shuffle(content.house.rooms.map((r) => r.id)).slice(0, 5);
  const items = rng.shuffle(content.items.map((i) => i.id)).slice(0, 5);
  return { suspects, rooms, items, killer: rng.pick(suspects), firstVictim: seating[CAST] };
}

/** Everyone at the campaign's dinner: the cast and the first victim, the same every round. */
export const campaignGuests = (cast: CampaignCast): string[] => [...cast.suspects, cast.firstVictim];

/** This round's body (the last wrong accusation, or the first victim in round 1) and who is at dinner. */
const whoDied = (cast: CampaignCast, victims: readonly string[]) => ({
  victim: victims.at(-1) ?? cast.firstVictim,
  guests: campaignGuests(cast),
});

/** The settings a round is built with: the 7-guest levels at her difficulty, no finale. */
function roundSettings(difficulty: Difficulty): { levels: CaseLevels; settings: CaseSettings } {
  const levels: CaseLevels = { suspects: 7, logic: difficulty, minigames: difficulty, length: 'long' };
  return { levels, settings: { ...caseSettings(levels), finale: false } };
}

/**
 * The round after these wrong accusations (victims, in order): round 1 with
 * none, round 2 after one, round 3 after two.
 */
export function campaignRound(content: Content, ref: CampaignRef, victims: readonly string[]): Case {
  const cast = campaignCast(content, ref);
  const round = victims.length;
  if (round >= ROUNDS) throw new Error('The killer has already got away');
  if (victims.includes(cast.killer)) throw new Error('The killer was caught');
  const alive = cast.suspects.filter((s) => !victims.includes(s));
  const { levels, settings } = roundSettings(ref.difficulty);
  const seed = hashSeed(`${seedText(ref)}-round-${round}-${victims.join('-')}`);
  const rng = new Rng(seed);
  const last = round === ROUNDS - 1;
  const budget = roundBudget(ref);
  const per = perPuzzleOf(ref);
  if (per < 3) return wideRound(content, ref, cast, alive, round, victims, budget, per);

  for (let attempt = 0; attempt < 40; attempt++) {
    const built = tryRound(content, cast, alive, settings, last, rng);
    if (!built) continue;
    const { truth, free, puzzles } = built;
    const rotating = rng.shuffle(ROTATION);
    const order = [free, ...puzzles].flat();
    return assemble({
      content,
      seed,
      rng,
      settings,
      levels,
      caseNumber: round + 1,
      code: ref.code,
      truth: { ...truth, minimal: order, ...whoDied(cast, victims) },
      order,
      rotating,
      kinds: rotating,
      shares: { free: free.length, finale: 0, games: puzzles.map((p) => p.length) },
      campaign: { round, rounds: ROUNDS, budget, last, victims: [...victims] },
    });
  }
  throw new Error(`Campaign ${ref.code}: could not build round ${round + 1}`);
}

/** Facts and the scene for possible-killer checks in one round. */
interface RoundView {
  space: Space;
  ctx: ClueContext;
  scene: string;
}

/** One try at a round's truth and clues; null if the clues can't be made to fit. */
function tryRound(
  content: Content,
  cast: CampaignCast,
  alive: string[],
  settings: CaseSettings,
  last: boolean,
  rng: Rng,
): { truth: Omit<Truth, 'minimal' | 'victim' | 'guests'>; free: ClueFact[]; puzzles: ClueFact[][] } | null {
  const { rooms, items, killer } = cast;
  const k = alive.indexOf(killer);

  // Where everyone was: the killer alone at the scene with a weapon, the rest
  // spread over the other rooms, everyone but two (or none, at 5) armed.
  const { scene, solution } = rollShared(rng, alive, rooms, items, k);

  const ctx = caseContext(content.house, { suspects: alive });
  const view: RoundView = { space: caseSpace({ suspects: alive, rooms, items, shared: true }), ctx, scene };
  const pool = cluePool(solution, ctx, rooms, items, content.house.rooms.map((r) => r.id), rng, true);
  const ordered = weightedOrder(pool, settings, rng);

  const decoys = last ? [] : rng.shuffle(alive.filter((s) => s !== killer)).slice(0, 1 + rng.int(2));
  const target = 1 + decoys.length;
  const chosen: ClueFact[] = [];
  const keepsDecoys = (fact: ClueFact) => decoys.every((d) => couldBeKiller(view.space, [...chosen, fact], ctx, scene, d));
  const suspectsLeft = (facts: ClueFact[]) => possibleKillers(view.space, facts, ctx, scene).length;
  const weaponsLeft = (facts: ClueFact[]) => possibleWeapons(view.space, facts, ctx, scene, killer).length;
  const done = (facts: ClueFact[]) => suspectsLeft(facts) === target && (!last || weaponsLeft(facts) === 1);
  const used = new Set<ClueFact>();

  // Free clues: some narrowing, but well short of the target, so the puzzles matter.
  const free: ClueFact[] = [];
  let left = suspectsLeft(free);
  for (const fact of ordered) {
    if (free.length >= settings.freeClues || left <= target + 2) break;
    const next = suspectsLeft([...free, fact]);
    if (next < left && next > target && keepsDecoys(fact)) {
      free.push(fact);
      chosen.push(fact);
      used.add(fact);
      left = next;
    }
  }
  // Last round: the free clues may also narrow the weapon, all the way, so
  // each puzzle only has to settle who. (Three separate puzzles can't each
  // settle the weapon too: there are only two direct clues per weapon.)
  if (last) {
    let weapons = weaponsLeft(free);
    for (const fact of ordered) {
      if (weapons === 1 || free.length >= settings.freeClues + 5) break;
      if (used.has(fact)) continue;
      const trial = [...free, fact];
      const w = weaponsLeft(trial);
      if (w < weapons && suspectsLeft(trial) > target) {
        free.push(fact);
        chosen.push(fact);
        used.add(fact);
        weapons = w;
      }
    }
  }

  // Each puzzle, with the free clues, reaches the target on its own.
  const most = settings.maxPerGame + (last ? LAST_ROUND_EXTRA : 0);
  const puzzles: ClueFact[][] = [];
  for (let p = 0; p < ROTATION.length; p++) {
    const set: ClueFact[] = [];
    let suspects = suspectsLeft(free);
    let weapons = last ? weaponsLeft(free) : 0;
    for (const fact of ordered) {
      if (suspects === target && (!last || weapons === 1)) break;
      if (used.has(fact) || set.length >= most) continue;
      const trial = [...free, ...set, fact];
      const s = suspectsLeft(trial);
      const w = last && s === target ? weaponsLeft(trial) : weapons;
      const helps = s < suspects || (last && s === target && w < weapons);
      if (helps && keepsDecoys(fact)) {
        set.push(fact);
        chosen.push(fact);
        used.add(fact);
        suspects = s;
        weapons = w;
      }
    }
    if (!set.length || !done([...free, ...set])) return null;
    // Top up with true clues that leave every decoy possible.
    for (const fact of ordered) {
      if (set.length >= MIN_PER_PUZZLE) break;
      if (used.has(fact) || !keepsDecoys(fact)) continue;
      set.push(fact);
      chosen.push(fact);
      used.add(fact);
    }
    puzzles.push(set);
  }
  return { truth: { suspects: alive, rooms, items, solution, murdererIndex: k, ctx }, free, puzzles };
}

/**
 * A round with at most `per` (1 or 2) clues a puzzle, built from its own
 * puzzle list. No single puzzle settles it, so fairness comes from cover:
 * every guest the puzzles must rule out is ruled out, alone with the free
 * clues, by a clue in `offered - budget + 1` different puzzles, so any
 * `budget` of them rule out every one.
 */
function wideRound(
  content: Content,
  ref: CampaignRef,
  cast: CampaignCast,
  alive: string[],
  round: number,
  victims: readonly string[],
  budget: number,
  per: PerPuzzle,
): Case {
  const { levels, settings } = roundSettings(ref.difficulty);
  const seed = hashSeed(`${seedText(ref)}-round-${round}-${victims.join('-')}`);
  const rng = new Rng(seed);
  const last = round === ROUNDS - 1;
  const kinds = ROUND_PUZZLES[per];
  const cover = kinds.length - budget + 1;

  for (let attempt = 0; attempt < 60; attempt++) {
    const built = tryWide(content, cast, alive, settings, last, rng, kinds.length, per, cover);
    if (!built) continue;
    const { truth, free, puzzles } = built;
    const rotating = rng.shuffle(kinds);
    const order = [free, ...puzzles].flat();
    const tarotAt = rotating.indexOf('tarot');
    let tarotPairs = 0;
    if (tarotAt >= 0) {
      const cards = tarotClueCards(truth, puzzles[tarotAt], order.filter((f) => !puzzles[tarotAt].includes(f)));
      const pairs = tarotPairsFor(settings.tarotPairs, cards.reward.length);
      if (pairs === null) continue;
      tarotPairs = pairs;
    }
    const c = assemble({
      content,
      seed,
      rng,
      settings,
      levels,
      caseNumber: round + 1,
      code: ref.code,
      truth: { ...truth, minimal: order, ...whoDied(cast, victims) },
      order,
      rotating,
      kinds: rotating,
      shares: { free: free.length, finale: 0, games: puzzles.map((p) => p.length) },
      campaign: { round, rounds: ROUNDS, budget, last, victims: [...victims] },
      picked: { tarotPairs },
    });
    const board = c.games.find((g) => g.kind === 'board');
    if (board && !boardPuzzle(content, c, board)) continue;
    return c;
  }
  throw new Error(`Campaign ${ref.code}: could not build round ${round + 1}`);
}

/** One try at a wide round's truth and clues; null if the clues can't be made to fit. */
function tryWide(
  content: Content,
  cast: CampaignCast,
  alive: string[],
  settings: CaseSettings,
  last: boolean,
  rng: Rng,
  offered: number,
  per: number,
  cover: number,
): { truth: Omit<Truth, 'minimal' | 'victim' | 'guests'>; free: ClueFact[]; puzzles: ClueFact[][] } | null {
  const { rooms, items, killer } = cast;
  const k = alive.indexOf(killer);
  const { scene, solution } = rollShared(rng, alive, rooms, items, k);
  const ctx = caseContext(content.house, { suspects: alive });
  const space = caseSpace({ suspects: alive, rooms, items, shared: true });
  const pool = cluePool(solution, ctx, rooms, items, content.house.rooms.map((r) => r.id), rng, true);
  const ordered = weightedOrder(pool, settings, rng);

  const decoys = last ? [] : rng.shuffle(alive.filter((s) => s !== killer)).slice(0, 1 + rng.int(2));
  const target = 1 + decoys.length;
  const keepsDecoys = (facts: ClueFact[]) => decoys.every((d) => couldBeKiller(space, facts, ctx, scene, d));
  const suspectsLeft = (facts: ClueFact[]) => possibleKillers(space, facts, ctx, scene);
  const weaponsLeft = (facts: ClueFact[]) => possibleWeapons(space, facts, ctx, scene, killer).length;
  const used = new Set<ClueFact>();
  // How many guests the puzzles can rule out between them, each in `cover`
  // puzzles; at most 2, as in a 3-clue round, so the free clues still narrow it.
  const reach = Math.min(2, Math.max(1, Math.floor((offered * per) / cover)));

  // Free clues: narrow to within reach of the puzzles, never all the way.
  const free: ClueFact[] = [];
  let left = suspectsLeft(free).length;
  for (const fact of ordered) {
    if (left <= target + reach || free.length >= settings.freeClues + 4) break;
    const next = suspectsLeft([...free, fact]).length;
    if (next < left && next > target && keepsDecoys([...free, fact])) {
      free.push(fact);
      used.add(fact);
      left = next;
    }
  }
  if (left > target + reach) return null;
  // Last round: the free clues settle the weapon, so the puzzles only settle who.
  if (last) {
    let weapons = weaponsLeft(free);
    for (const fact of ordered) {
      if (weapons === 1 || free.length >= settings.freeClues + 9) break;
      if (used.has(fact)) continue;
      const trial = [...free, fact];
      const w = weaponsLeft(trial);
      if (w < weapons && suspectsLeft(trial).length > target) {
        free.push(fact);
        used.add(fact);
        weapons = w;
      }
    }
    if (weapons !== 1) return null;
  }

  // Who the puzzles must rule out, and which unused clues rule each out on their own.
  const innocent = new Set([killer, ...decoys]);
  const toRule = suspectsLeft(free).filter((s) => !innocent.has(s));
  const candidates = ordered
    .filter((f) => !used.has(f) && keepsDecoys([...free, f]))
    .map((f) => {
      const still = new Set(suspectsLeft([...free, f]));
      return { fact: f, rules: toRule.filter((s) => !still.has(s)) };
    });
  const covered = new Map(toRule.map((s) => [s, 0]));
  // Every puzzle clue so far: together they must still leave every decoy possible.
  const chosen = [...free];
  const fits = (f: ClueFact) => !used.has(f) && keepsDecoys([...chosen, f]);
  const puzzles: ClueFact[][] = [];
  for (let p = 0; p < offered; p++) {
    const set: ClueFact[] = [];
    const mine = new Set<string>();
    while (set.length < per) {
      let best: (typeof candidates)[number] | null = null;
      let gain = 0;
      for (const cand of candidates) {
        if (used.has(cand.fact)) continue;
        const g = cand.rules.filter((s) => !mine.has(s) && covered.get(s)! < cover).length;
        if (g > gain && fits(cand.fact)) [best, gain] = [cand, g];
      }
      if (!best) break;
      set.push(best.fact);
      chosen.push(best.fact);
      used.add(best.fact);
      for (const s of best.rules) {
        if (mine.has(s)) continue;
        mine.add(s);
        covered.set(s, covered.get(s)! + 1);
      }
    }
    puzzles.push(set);
  }
  if ([...covered.values()].some((n) => n < cover)) return null;
  // Top up with true clues that leave every decoy possible.
  for (const set of puzzles) {
    for (const cand of candidates) {
      if (set.length >= per) break;
      if (!fits(cand.fact)) continue;
      set.push(cand.fact);
      chosen.push(cand.fact);
      used.add(cand.fact);
    }
    if (!set.length) return null;
  }
  return { truth: { suspects: alive, rooms, items, solution, murdererIndex: k, ctx }, free, puzzles };
}

/** Every way to pick `size` of these. */
function choose<T>(list: readonly T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (list.length < size) return [];
  const [head, ...rest] = list;
  return [...choose(rest, size - 1).map((c) => [head, ...c]), ...choose(rest, size)];
}

/** Who could be the killer from these clues of a round, once she knows the scene. */
export function roundSuspects(content: Content, c: Case, facts: readonly ClueFact[]): string[] {
  return possibleKillers(caseSpace(c), facts, caseContext(content.house, c), c.sceneRoom);
}

/**
 * What's unfair about a round, as messages: for every choice of puzzles
 * within the budget, before the last round 2 or 3 possible killers
 * including the real one; in the last round only the killer, with only the
 * real weapon possible.
 */
export function roundProblems(content: Content, c: Case): string[] {
  const round = c.campaign;
  if (!round) return ['not a campaign round'];
  const out: string[] = [];
  const k = c.suspects.indexOf(c.murderer);
  if (c.solution.room[k] !== c.sceneRoom || c.solution.room.filter((r) => r === c.sceneRoom).length !== 1) out.push('killer not alone at the scene');
  if (c.solution.item[k] !== c.weapon) out.push("killer doesn't hold the weapon");
  const free = c.clues.filter((cl) => cl.delivery === 'given').map((cl) => cl.fact);
  const puzzles = c.games.filter((g) => !g.unlocksScene);
  const offered = Object.values(ROUND_PUZZLES).map((p) => p.length);
  if (!offered.includes(puzzles.length)) out.push(`${puzzles.length} puzzles, not ${offered.join(' or ')}`);
  if (round.budget > puzzles.length) out.push(`a budget of ${round.budget} for ${puzzles.length} puzzles`);
  const space = caseSpace(c);
  const ctx = caseContext(content.house, c);
  for (const picked of choose(puzzles, round.budget)) {
    const ids = new Set(picked.flatMap((g) => g.clues));
    const facts = [...free, ...c.clues.filter((cl) => ids.has(cl.id)).map((cl) => cl.fact)];
    const who = possibleKillers(space, facts, ctx, c.sceneRoom);
    const label = picked.map((g) => g.kind).join('+');
    if (!who.includes(c.murderer)) out.push(`${label}: rules out the killer`);
    if (round.last) {
      if (who.length !== 1) out.push(`${label}: last round leaves ${who.length} possible killers`);
      const weapons = possibleWeapons(space, facts, ctx, c.sceneRoom, c.murderer);
      if (weapons.length !== 1 || weapons[0] !== c.weapon) out.push(`${label}: weapon not pinned down (${weapons.length} possible)`);
    } else if (who.length < 2 || who.length > 3) {
      out.push(`${label}: leaves ${who.length} possible killers, not 2 or 3`);
    }
  }
  return out;
}
