// Case generation as plain jobs, so the same code runs in a worker or on the main thread.
import { houseOf } from '../content/houses.ts';
import { campaignRound, type CampaignRef, type PerPuzzle } from '../engine/campaign.ts';
import { caseFacts } from '../engine/caseFacts.ts';
import { guestContent } from '../engine/guestNames.ts';
import { buildInterrogation } from '../engine/interrogation.ts';
import { Rng, hashSeed } from '../engine/rng.ts';
import { caseFor, codeFor, newPickCase, newPlayCase, newQuickCase, type Cast, type CaseRef, type PickedGame, type PlayRef, type QuickRef } from '../engine/caseRef.ts';
import type { Length } from '../engine/settings.ts';
import type { Case, Content, Difficulty, Interrogation } from '../engine/types.ts';
import { newCampaign, roundCase, type CampaignSave } from './campaignSave.ts';

export type CaseJob =
  | { kind: 'case'; ref: CaseRef }
  | { kind: 'play' }
  | { kind: 'pick'; code: string; games: PickedGame[] }
  | { kind: 'quick'; difficulty: Difficulty; length: Length; cast: Cast }
  | { kind: 'campaign-new'; difficulty: Difficulty; possibleOnly: boolean; endBoard: boolean; perPuzzle: PerPuzzle }
  | { kind: 'campaign-rounds'; save: CampaignSave }
  /** Face to face: the accused's questioning in a campaign round, from the clues she has found. */
  | { kind: 'face'; ref: CampaignRef; victims: string[]; accused: string; found: string[] };

export interface CaseJobResults {
  case: Case;
  play: { ref: PlayRef; c: Case };
  pick: { ref: PlayRef; c: Case };
  quick: { ref: QuickRef; c: Case };
  'campaign-new': { save: CampaignSave; cases: Case[] };
  'campaign-rounds': Case[];
  face: Interrogation;
}

export type CaseJobResult<J extends CaseJob> = CaseJobResults[J['kind']];

/** What a campaign's rounds depend on: rebuild them only when this changes. */
export const roundsKey = (save: CampaignSave): string => JSON.stringify({ ref: save.ref, victims: save.victims, n: save.rounds.length });

/** Run one job. `random` gives whole numbers (the engine itself stays seeded). */
export function runCaseJob<J extends CaseJob>(content: Content, job: J, random: () => number): CaseJobResult<J> {
  return run(content, job, random) as CaseJobResult<J>;
}

function run(content: Content, job: CaseJob, random: () => number): CaseJobResults[CaseJob['kind']] {
  switch (job.kind) {
    case 'case':
      return caseFor(content, job.ref);
    case 'play':
      return newPlayCase(content, random);
    case 'pick':
      return newPickCase(content, job.code, job.games);
    case 'quick':
      return newQuickCase(content, job.difficulty, job.length, job.cast, random);
    case 'campaign-new': {
      const { difficulty, possibleOnly, endBoard, perPuzzle } = job;
      for (let tries = 0; tries < 10; tries++) {
        const ref: CampaignRef = {
          mode: 'campaign',
          code: codeFor(random()),
          difficulty,
          ...(possibleOnly && { possibleOnly }),
          ...(endBoard && { endBoard }),
          ...(perPuzzle !== 3 && { perPuzzle }),
        };
        const save = newCampaign(ref);
        try {
          return { save, cases: [roundCase(content, save, 0)] };
        } catch {
          continue; // try another code
        }
      }
      throw new Error('Could not build a new campaign');
    }
    case 'face':
      return faceToFace(content, job.ref, job.victims, job.accused, job.found);
    case 'campaign-rounds':
      return job.save.rounds.map((_, i) => roundCase(content, job.save, i));
  }
}

/**
 * The accused in the chair, with her found clues as evidence. The killer's questioning has one lie about
 * anything but a weapon (or cracks when her clues catch none); an innocent's has none. Own seed stream.
 */
export function faceToFace(content: Content, ref: CampaignRef, victims: readonly string[], accused: string, found: readonly string[]): Interrogation {
  const c = campaignRound(content, ref, victims);
  if (!c.suspects.includes(accused)) throw new Error('The accused is not a suspect this round');
  const caseClues = c.clues.filter((cl) => found.includes(cl.id) && cl.delivery !== 'finale');
  const killer = accused === c.murderer;
  return buildInterrogation({
    cf: caseFacts(houseOf(c), c),
    content: guestContent({ ...content, house: houseOf(c) }, c.guests),
    rng: new Rng(hashSeed(`${c.seed}-face-${accused}`)),
    idPrefix: 'fq-',
    delivery: 'finale',
    hard: true,
    known: c.clues.map((cl) => cl.fact),
    caseClues,
    speaker: accused,
    noLie: !killer,
    noWeaponLies: true,
    crackIfUncaught: killer,
  });
}
