// Talk: what a guest has to say, and how much of it she has earned. Pure.
// Only games she has finished (won or revealed) count.

import { talk } from '../content/talk.ts';
import { isInterrogation } from '../engine/gameKinds.ts';
import { characterSets, moodFor, moodTop, type CharacterSet } from '../engine/sets.ts';
import type { Case, ClueFact, GameSpec, TalkContent } from '../engine/types.ts';
import type { Tint } from './portrait.ts';
import type { Progress } from './state.ts';

const namesOf = (f: ClueFact): string[] => ('suspects' in f ? [...f.suspects] : 'suspect' in f ? [f.suspect] : []);

/** Suspect ids a game is about: those its clues name, plus the guest in a questioning. */
export function gamesAbout(c: Case, game: GameSpec): string[] {
  const ids = new Set<string>();
  for (const clue of c.clues) if (game.clues.includes(clue.id)) for (const s of namesOf(clue.fact)) ids.add(s);
  if (isInterrogation(game)) ids.add(game.interrogation.suspect);
  return [...ids];
}

const finished = (p: Progress, kind: GameSpec['kind']) => {
  const status = p.games[kind]?.status;
  return status === 'won' || status === 'revealed';
};

/**
 * Beats she can hear now: min(beats, 1 + about + floor(other / 2)), where
 * `about` is her finished games about this guest and `other` her other
 * finished games. Once the case is solved, every beat is ready.
 */
export function readyBeats(c: Case, p: Progress, suspect: string, threadLength: number): number {
  if (p.solved) return threadLength;
  let about = 0;
  let other = 0;
  for (const g of c.games) {
    if (!finished(p, g.kind)) continue;
    if (gamesAbout(c, g).includes(suspect)) about++;
    else other++;
  }
  return Math.min(threadLength, 1 + about + Math.floor(other / 2));
}

/** The line she is greeted with, by beats heard (the first is for meeting them). Cold guests warm up a step per beat; warm ones stay warm. */
export function greeting(set: Pick<CharacterSet, 'mood'>, heard: number, greetings: TalkContent['greetings']): string {
  const top = greetings.cold.length;
  if (set.mood >= top) return greetings.warm[Math.min(heard, greetings.warm.length - 1)];
  const step = Math.min(set.mood + heard, top);
  return step < top ? greetings.cold[step] : greetings.warm[Math.min(heard, greetings.warm.length - 1)];
}

/** The portrait's mood tint, from the same step as `greeting`: the coldest step is hostile, the top step warm. */
export function moodTint(set: Pick<CharacterSet, 'mood'>, heard: number, greetings: TalkContent['greetings']): Tint {
  const top = greetings.cold.length;
  const step = Math.min(set.mood + heard, top);
  return step === 0 ? 'hostile' : step >= top ? 'warm' : 'none';
}

/**
 * Everyone's set for a case. Rolled on their own stream, so cases never change.
 * A campaign seeds from its own code (`campaign-<code>-<difficulty>`; the round
 * case carries both) and builds over the whole cast in id order, so a guest's
 * card, thread and lines are the same every round; only the mood moves.
 */
export function setsFor(c: Case): Record<string, CharacterSet> {
  const round = c.campaign;
  if (!round) return characterSets(talk, String(c.seed), c.suspects);
  const seed = `campaign-${c.code}-${c.difficulty}`;
  const cast = [...new Set([...c.suspects, ...round.victims])].sort();
  const all = characterSets(talk, seed, cast);
  const top = moodTop(talk);
  return Object.fromEntries(
    c.suspects.map((s) => {
      const mood = moodFor(seed, s, round.round, all[s].mood, top);
      return [s, { ...all[s], mood, cold: mood < top }];
    }),
  );
}

/** The questioning game for this guest, if the case has one (the finale is not one). */
export const questioningOf = (c: Case, suspect: string): GameSpec | undefined =>
  c.games.find((g) => g.kind !== 'finale' && isInterrogation(g) && g.interrogation.suspect === suspect);
