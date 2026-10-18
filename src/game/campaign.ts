// A campaign in play: who she has wrongly accused (each became the next
// body), her moves in each round, the puzzles she chose within each round's
// budget, and how it ended. Rounds are rebuilt from the campaign ref and the
// victims before them; only her moves are saved.

import { ROUNDS, campaignRound, roundSuspects, type CampaignRef } from '../engine/campaign.ts';
import type { Case, Content, GameKind } from '../engine/types.ts';
import { emptyProgress, sceneUnlocked, unlockedClueIds, type Progress } from './state.ts';

export type Outcome = 'playing' | 'caught' | 'escaped';

export interface CampaignSave {
  ref: CampaignRef;
  /** Guests she wrongly accused, in order. */
  victims: string[];
  /** Her moves in each round so far; the last is the round she's on. */
  rounds: Progress[];
  /** The puzzles she chose to play in each round. */
  picked: GameKind[][];
  outcome: Outcome;
}

export const newCampaign = (ref: CampaignRef): CampaignSave => ({ ref, victims: [], rounds: [emptyProgress()], picked: [[]], outcome: 'playing' });

/** The case for round `i` (0-based): built from the victims before it. */
export const roundCase = (content: Content, save: CampaignSave, i: number): Case => campaignRound(content, save.ref, save.victims.slice(0, i));

export const currentRound = (save: CampaignSave) => save.rounds.length - 1;

/** What her latest accusation did. */
export type Verdict = 'caught' | 'wrong-weapon' | 'next-body' | 'escaped';

/**
 * Her moves in the current round changed. If she just made an accusation,
 * work out what it did: the killer and weapon end it; the killer with the
 * wrong weapon costs nothing; anyone else is the next body, and after the
 * last round the killer gets away.
 */
export function updateRound(save: CampaignSave, c: Case, progress: Progress): { save: CampaignSave; verdict?: Verdict } {
  const i = currentRound(save);
  const before = save.rounds[i];
  const rounds = save.rounds.map((p, k) => (k === i ? progress : p));
  const updated = { ...save, rounds };
  if (save.outcome !== 'playing' || progress.accusations.length <= before.accusations.length) return { save: updated };

  const last = progress.accusations.at(-1)!;
  if (last.suspect === c.murderer && last.item === c.weapon) return { save: { ...updated, outcome: 'caught' }, verdict: 'caught' };
  if (last.suspect === c.murderer) return { save: updated, verdict: 'wrong-weapon' };
  const victims = [...save.victims, last.suspect];
  if (victims.length >= ROUNDS) return { save: { ...updated, victims, outcome: 'escaped' }, verdict: 'escaped' };
  return {
    save: { ...updated, victims, rounds: [...rounds, emptyProgress()], picked: [...save.picked, []] },
    verdict: 'next-body',
  };
}

/** Puzzles (besides the word game) she may still choose this round. */
export function puzzlesLeft(save: CampaignSave, c: Case): number {
  return Math.max(0, (c.campaign?.budget ?? 0) - (save.picked[currentRound(save)]?.length ?? 0));
}

/** Whether she may open this game this round: word games always, a puzzle once chosen. */
export function canPlay(save: CampaignSave, c: Case, kind: GameKind): boolean {
  if (c.games.find((g) => g.kind === kind)?.unlocksScene) return true;
  return save.picked[currentRound(save)]?.includes(kind) || puzzlesLeft(save, c) > 0;
}

/** She chooses to play this puzzle, using one of the round's puzzles. */
export function pick(save: CampaignSave, c: Case, kind: GameKind): CampaignSave {
  const i = currentRound(save);
  if (save.picked[i].includes(kind) || !canPlay(save, c, kind)) return save;
  return { ...save, picked: save.picked.map((p, k) => (k === i ? [...p, kind] : p)) };
}

/**
 * Who her clues still allow as the killer: anyone alive who could have been
 * alone at every scene she knows, given each round's unlocked clues. Before
 * she knows a round's scene, that round rules nobody out.
 */
export function stillPossible(content: Content, save: CampaignSave, cases: readonly Case[]): string[] {
  const now = cases[cases.length - 1];
  let left = now.suspects.slice();
  cases.forEach((c, i) => {
    const p = save.rounds[i];
    if (!p || !sceneUnlocked(c, p)) return;
    const ids = unlockedClueIds(c, p);
    const facts = c.clues.filter((cl) => ids.has(cl.id)).map((cl) => cl.fact);
    const possible = new Set(roundSuspects(content, c, facts));
    left = left.filter((s) => possible.has(s));
  });
  return left;
}
