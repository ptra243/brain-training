// The New campaign title page's pure parts: where its choices start, the job that makes the campaign, and the
// wording of the options. The wording is `CampaignSetup`'s, word for word (that file is a .tsx, which node tests cannot load).

import { PER_PUZZLE, type PerPuzzle } from '../engine/campaign.ts';
import { DIFFICULTIES } from '../engine/settings.ts';
import type { Difficulty } from '../engine/types.ts';
import type { CaseJob } from '../game/caseJobs.ts';
import type { CampaignSave } from '../game/campaignSave.ts';
import { FINISHES, FINISH_HINT, FINISH_LABEL, type Finish } from '../game/labels.ts';

export type Accusing = 'anyone' | 'possible';

export interface Choices {
  difficulty: Difficulty;
  perPuzzle: PerPuzzle;
  accusing: Accusing;
  finish: Finish;
}

export const PER_PUZZLE_LABEL: Record<string, string> = { 3: 'Three', 2: 'Two', 1: 'One' };
export const ACCUSING_LABEL: Record<Accusing, string> = { anyone: 'Anyone alive', possible: 'Only possible killers' };
export const ACCUSING_OPTIONS: readonly Accusing[] = ['anyone', 'possible'];
export const PER_PUZZLE_OPTIONS: readonly PerPuzzle[] = PER_PUZZLE;
export const DIFFICULTY_OPTIONS: readonly Difficulty[] = DIFFICULTIES;
export const PER_PUZZLE_LEAD = 'Fewer clues per puzzle means more puzzles to play each night.';
export { FINISHES, FINISH_HINT, FINISH_LABEL };

/** The title page's heading and the one line on what a campaign is. */
export const TITLE_HEADING = 'A murder in three chapters';
export const TITLE_LEAD = 'Win puzzles to find clues, then name the killer before the last candle goes out.';

/** Where the choices start: her last campaign's, else the defaults (as `CampaignSetup`'s pickers do). */
export function initialChoices(last: CampaignSave | null): Choices {
  return {
    difficulty: last?.ref.difficulty ?? 'medium',
    perPuzzle: last?.ref.perPuzzle ?? 3,
    accusing: last?.ref.possibleOnly ? 'possible' : 'anyone',
    finish: last?.ref.endBoard ? 'jigsaw' : 'grid',
  };
}

/** The job that makes the campaign: the very one `App.startCampaign` runs for the same choices. */
export function startJob(ch: Choices): Extract<CaseJob, { kind: 'campaign-new' }> {
  return { kind: 'campaign-new', difficulty: ch.difficulty, possibleOnly: ch.accusing === 'possible', endBoard: ch.finish === 'jigsaw', perPuzzle: ch.perPuzzle };
}

/** Whether starting a new campaign replaces one still in play (so she is asked first). */
export const replacesUnfinished = (last: CampaignSave | null): boolean => last?.outcome === 'playing';

/** The option after (or before) this one in a radio group, wrapping; used by the arrow keys. */
export function stepOption<T>(options: readonly T[], current: T, dir: 1 | -1): T {
  const i = options.indexOf(current);
  return options[(i + dir + options.length) % options.length];
}
