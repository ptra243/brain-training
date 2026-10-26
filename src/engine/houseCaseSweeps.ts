// Whole cases on every other house (cases.houses.sweep.ts): the same fairness checks the manor's cases get, run on cases
// built in each layout and a sample of its variants (every variant with --full). The caller supplies the checks.
import { content } from '../content/index.ts';
import { sampledVariants } from '../content/houseSweeps.ts';
import { buildCaseIn } from './generate.ts';
import { caseCode, caseForIn, codeFor, pickedInOrder, type PlayRef, type QuickRef } from './caseRef.ts';
import type { CampaignRef } from './campaign.ts';
import { DIFFICULTIES, LENGTHS, PRESETS, levelsKey } from './settings.ts';
import type { Case } from './types.ts';

export type HouseCaseChecks = {
  full: boolean;
  /** Builds the case (a throw is a failure) and reports every problem with it. */
  check: (label: string, make: () => Case) => void;
  /** Walks a campaign on the ref's house (its wrong-guess paths) and reports problems. */
  campaign: (label: string, ref: CampaignRef) => void;
};

export type HouseCaseCounts = Record<string, { houses: number; cases: number }>;

/** Runs the sweep; returns, per difficulty, how many houses and cases were checked. */
export function houseCaseSweep(o: HouseCaseChecks): HouseCaseCounts {
  const counts: HouseCaseCounts = {};
  const houses = sampledVariants(o.full);
  const seen = new Set<string>();
  const bump = (d: string, house: string) => {
    counts[d] ??= { houses: 0, cases: 0 };
    counts[d].cases++;
    seen.add(`${d}/${house}`);
  };
  const perDifficulty = o.full ? 2 : 1;
  houses.forEach(({ house }, hi) => {
    const withHouse = { ...content, house };
    DIFFICULTIES.forEach((difficulty, di) => {
      const mine = (label: string, make: () => Case) => {
        bump(difficulty, house.id);
        o.check(`${house.id} ${label}`, make);
      };
      // Presets (the original case numbers' levels).
      for (let n = 1; n <= perDifficulty; n++) {
        const levels = PRESETS[difficulty];
        mine(`preset ${difficulty} case ${n}`, () => buildCaseIn(withHouse, `case-${n}-${levelsKey(levels)}`, n, String(n), levels));
      }
      // Quick start: lengths and casts spread over the houses.
      const choices = o.full ? LENGTHS.flatMap((length) => (['classic', 'big'] as const).map((cast) => ({ length, cast }))) : [{ length: LENGTHS[(hi + di) % LENGTHS.length], cast: (hi + di) % 2 ? ('big' as const) : ('classic' as const) }];
      choices.forEach(({ length, cast }, k) => {
        const ref: QuickRef = { mode: 'quick', code: codeFor((1 + hi * 7 + di * 3 + k) * 1_215_773), difficulty, length, cast };
        mine(`quick ${caseCode(ref)}`, () => caseForIn(withHouse, ref));
      });
      // Campaign: clues per puzzle spread over the houses, every difficulty.
      const perPuzzle = ([3, 2, 1] as const)[(hi + di) % 3];
      const ref: CampaignRef = { mode: 'campaign', code: codeFor((1 + hi) * 2_654_435 + di), difficulty, houseId: house.id, ...(perPuzzle !== 3 && { perPuzzle }) };
      bump(difficulty, house.id);
      o.campaign(`${house.id} campaign ${ref.code}-${difficulty}${perPuzzle !== 3 ? `-per${perPuzzle}` : ''}`, ref);
    });
    // Play (levels rolled by the code) and picked cases that choose nosing, tarot and the case board.
    const codes = o.full ? 3 : 1;
    for (let k = 0; k < codes; k++) {
      const play: PlayRef = { mode: 'play', code: codeFor((100 + hi * 11 + k) * 1_215_773) };
      const picked: PlayRef = { mode: 'play', code: codeFor((200 + hi * 11 + k) * 2_654_435), games: pickedInOrder(['nosing', 'tarot', 'board']) };
      for (const ref of [play, picked]) {
        counts.play ??= { houses: 0, cases: 0 };
        counts.play.cases++;
        seen.add(`play/${house.id}`);
        o.check(`${house.id} ${ref.games ? 'picked' : 'play'} ${caseCode(ref)}`, () => caseForIn(withHouse, ref));
      }
    }
  });
  for (const key of seen) {
    const d = key.slice(0, key.indexOf('/'));
    counts[d].houses++;
  }
  return counts;
}
