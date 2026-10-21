// Character sets: what each guest sounds like in one case (their card, whether
// it is reversed, a thread of follow-up beats and a few loose lines).
//
// This takes no `Case`, so it cannot see the killer, and it rolls on its own
// seed stream: it never touches the stream cases are drawn from.

import { Rng, hashSeed } from './rng.ts';
import type { CardReading, TalkContent } from './types.ts';

/** Chance a guest borrows one of their secondary cards for the night. */
export const BORROW_CHANCE = 0.35;
/** Chance a guest's reading is reversed (they start cold). */
export const REVERSED_CHANCE = 0.3;
/** Loose neutral lines each guest gets. */
export const NEUTRAL_LINES = 2;

export interface CharacterSet {
  /** The guest's home card. */
  home: string;
  /** The secondary card they carry tonight, or null when they use their home card. */
  borrowed: string | null;
  reversed: boolean;
  /** Mood now (see `moodTop`). From `characterSets` it is the start mood; campaign rounds shift it (`moodFor`). */
  mood: number;
  /** Mood below warm. From `characterSets` it equals `reversed`. */
  cold: boolean;
  /** Loose lines: neutral ones first, then one bound to the home card if it has any. */
  lines: string[];
  /** Follow-up beats, in order (2 or 3). */
  thread: string[];
}

/**
 * Mood runs 0 (coldest) up to `top` (warm), where `top` is `greetings.cold.length`:
 * the steps are `greetings.cold[0..]`, then warm. A guest is cold while mood < top.
 */
export const moodTop = (content: TalkContent) => content.greetings.cold.length;

/** Where a guest starts: reversed is coldest, upright is warm. */
export const startMood = (reversed: boolean, top: number) => (reversed ? 0 : top);

/**
 * A guest's mood in a campaign round (0-based). Round 0 is the start mood. Each
 * later round it shifts from the one before: 50% stay, 25% one step warmer, 25%
 * one step colder, clamped to 0..top. Rolled per guest on its own Rng from the
 * campaign seed text, the round and the guest, never from victims, the killer
 * or her choices.
 *
 * PLACEHOLDER: the random shift stands in for moods driven by the story later.
 */
export function moodFor(campaignSeed: string, guest: string, round: number, start: number, top: number): number {
  let mood = start;
  for (let r = 1; r <= round; r++) {
    const roll = new Rng(hashSeed(`${campaignSeed}-mood-round-${r}-${guest}`)).next();
    mood += roll < 0.25 ? 1 : roll < 0.5 ? -1 : 0;
    mood = Math.max(0, Math.min(top, mood));
  }
  return mood;
}

export function characterSets(content: TalkContent, seed: string, suspects: readonly string[]): Record<string, CharacterSet> {
  const rng = new Rng(hashSeed(`${seed}sets`));
  const usedLines = new Set<string>();
  const usedThreads = new Set<string>();
  const out: Record<string, CharacterSet> = {};
  const readingOf = (card: string, reversed: boolean): CardReading => {
    const c = content.cards[card];
    if (!c) throw new Error(`talk: no card "${card}"`);
    return reversed ? c.reversed : c.upright;
  };

  /** Pick from the unused ones; if none are left, from all of them. */
  const pickFresh = (pool: readonly string[], used: Set<string>): string | undefined => {
    const fresh = pool.filter((p) => !used.has(p));
    return rng.pick(fresh.length ? fresh : pool);
  };

  for (const id of suspects) {
    const me = content.suspects[id];
    if (!me) throw new Error(`talk: no card for suspect "${id}"`);
    // Fixed draws per guest first, so one guest's rolls don't depend on what the others used.
    const reversed = rng.next() < REVERSED_CHANCE;
    const borrows = rng.next() < BORROW_CHANCE && me.mayAlsoRoll.length > 0;
    const borrowedPick = rng.int(Math.max(1, me.mayAlsoRoll.length));
    const borrowed = borrows ? me.mayAlsoRoll[borrowedPick] : null;
    const source = borrowed ?? me.card;

    // Thread: the card in use, then the home card, then any card, never one already given in this case.
    const threadKey = (t: readonly string[]) => t.join('|');
    const sourceThreads = readingOf(source, reversed).threads;
    const homeThreads = readingOf(me.card, reversed).threads;
    const anyThreads = Object.keys(content.cards).flatMap((k) => readingOf(k, reversed).threads);
    const freshOf = (list: readonly (readonly string[])[]) => list.filter((t) => !usedThreads.has(threadKey(t)));
    const candidates = [sourceThreads, homeThreads, anyThreads].map(freshOf).find((l) => l.length) ?? sourceThreads;
    const thread = [...rng.pick(candidates)];
    usedThreads.add(threadKey(thread));

    // Loose lines: neutral from the cards in use, bound from the home card only.
    const neutralPool = [...new Set([...readingOf(me.card, reversed).lines.neutral, ...readingOf(source, reversed).lines.neutral])];
    const lines: string[] = [];
    // If the guest's own cards have run dry (others used their lines), widen to every card's.
    const everyNeutral = Object.values(content.cards).flatMap((card) => [...card.upright.lines.neutral, ...card.reversed.lines.neutral]);
    for (let i = 0; i < NEUTRAL_LINES; i++) {
      const own = neutralPool.filter((l) => !lines.includes(l) && !usedLines.has(l));
      const line = own.length ? rng.pick(own) : pickFresh(everyNeutral.filter((l) => !lines.includes(l)), usedLines);
      if (line === undefined) break;
      lines.push(line);
      usedLines.add(line);
    }
    const bound = readingOf(me.card, reversed).lines.bound;
    if (bound.length) {
      const line = pickFresh(bound, usedLines)!;
      lines.push(line);
      usedLines.add(line);
    }

    out[id] = { home: me.card, borrowed, reversed, mood: startMood(reversed, moodTop(content)), cold: reversed, lines, thread };
  }
  return out;
}
