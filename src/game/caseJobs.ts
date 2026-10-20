// Case generation as plain jobs, so the same code runs in a worker or on the main thread.
import type { CampaignRef } from '../engine/campaign.ts';
import { caseFor, codeFor, newPickCase, newPlayCase, newQuickCase, type Cast, type CaseRef, type PickedGame, type PlayRef, type QuickRef } from '../engine/caseRef.ts';
import type { Length } from '../engine/settings.ts';
import type { Case, Content, Difficulty } from '../engine/types.ts';
import { newCampaign, roundCase, type CampaignSave } from './campaign.ts';

export type CaseJob =
  | { kind: 'case'; ref: CaseRef }
  | { kind: 'play' }
  | { kind: 'pick'; code: string; games: PickedGame[] }
  | { kind: 'quick'; difficulty: Difficulty; length: Length; cast: Cast }
  | { kind: 'campaign-new'; difficulty: Difficulty; possibleOnly: boolean; endBoard: boolean }
  | { kind: 'campaign-rounds'; save: CampaignSave };

export interface CaseJobResults {
  case: Case;
  play: { ref: PlayRef; c: Case };
  pick: { ref: PlayRef; c: Case };
  quick: { ref: QuickRef; c: Case };
  'campaign-new': { save: CampaignSave; cases: Case[] };
  'campaign-rounds': Case[];
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
      const { difficulty, possibleOnly, endBoard } = job;
      for (let tries = 0; tries < 10; tries++) {
        const ref: CampaignRef = { mode: 'campaign', code: codeFor(random()), difficulty, ...(possibleOnly && { possibleOnly }), ...(endBoard && { endBoard }) };
        const save = newCampaign(ref);
        try {
          return { save, cases: [roundCase(content, save, 0)] };
        } catch {
          continue; // try another code
        }
      }
      throw new Error('Could not build a new campaign');
    }
    case 'campaign-rounds':
      return job.save.rounds.map((_, i) => roundCase(content, job.save, i));
  }
}
