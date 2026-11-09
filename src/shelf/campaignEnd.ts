// Pure parts of the #shelf campaign book's endings and its earlier chapters: the night's replay steps, the
// got-away scene, the closing page's lines and the verdict line of a chapter she is reading back.
// Wording is `CampaignView`'s (the classic shell keeps its own copy).
import { ROUNDS } from '../engine/campaign.ts';
import { midSentence } from '../engine/text.ts';
import type { Case } from '../engine/types.ts';
import type { CampaignSave } from '../game/campaignSave.ts';
import { ROUND_TIMES } from '../game/labels.ts';
import { itemName, roomName, suspectName } from '../game/names.ts';
import { campaignRow, effortLines, quickClosing } from '../game/runRecord.ts';
import { unlockedClueIds } from '../game/state.ts';
import { nightSteps, roundInput, type EarlierRound, type SumStep } from '../game/summation.ts';

/** The night's replay: a short step per earlier round's accusation, then the last round in full. */
export function nightFor(save: CampaignSave, cases: readonly Case[]): SumStep[] {
  const last = save.rounds.length - 1;
  const input = (i: number) => roundInput(cases[i], unlockedClueIds(cases[i], save.rounds[i]));
  const earlier: EarlierRound[] = [];
  for (let i = 0; i < last; i++) {
    const accused = save.rounds[i].accusations.at(-1)?.suspect;
    if (accused) earlier.push({ input: input(i), accused, time: ROUND_TIMES[i] });
  }
  return nightSteps(earlier, input(last));
}

/** The chapter she is reading: the one she picked if it is still an earlier one, else the current chapter. */
export function viewedRound(viewing: { index: number; at: number } | null, current: number): number {
  return viewing && viewing.at === current && viewing.index >= 0 && viewing.index < current ? viewing.index : current;
}

/** The scene on the table when the killer gets away: the last candle goes out. */
export interface EndScene {
  kind: 'escaped';
  heading: string;
  text: string;
  /** Candles still lit; the one at this index has just gone out. */
  lit: number;
  /** The button's whole label. */
  button: string;
}

export function escapedScene(save: CampaignSave, c: Case): EndScene {
  const victim = save.victims.at(-1) ?? '';
  return {
    kind: 'escaped',
    heading: 'The killer got away',
    text: `${suspectName(victim, c.guests)} was the third body. By dawn, ${midSentence(suspectName(c.murderer, c.guests))} was gone, with the ${itemName(c.weapon)}.`,
    lit: Math.max(0, ROUNDS - save.victims.length),
    button: 'See the case',
  };
}

/** The effort line under a finished campaign's verdict, summed over every round. */
export function effortLine(save: CampaignSave, cases: readonly Case[]): string {
  return effortLines(campaignRow(save, cases, ''));
}

/** The closing page's wording for a finished campaign. */
export interface Closing {
  heading: string;
  /** The verdict sentence, in parts so the page can pencil the names. */
  who: string;
  room: string | null;
  what: string;
  /** Small print under the verdict. */
  note: string;
}

export function closingFor(save: CampaignSave, c: Case): Closing {
  const caught = save.outcome === 'caught';
  return {
    heading: caught ? 'Case closed' : 'The killer got away',
    who: suspectName(c.murderer, c.guests),
    room: caught ? roomName(c.sceneRoom) : null,
    what: itemName(c.weapon),
    note: caught ? `${quickClosing(save.rounds.length)}.` : 'Three wrong guesses, and by dawn they were gone.',
  };
}

/** What an earlier chapter's Answer page says: the wrong person, or the right one with the wrong weapon. */
export function earlierVerdict(save: CampaignSave, view: number, c: Case): { heading: string; line: string } {
  const accused = save.rounds[view]?.accusations.at(-1)?.suspect ?? '';
  const walkedFree = accused === c.murderer;
  const next = save.victims[view] ?? '';
  return {
    heading: `${ROUND_TIMES[view]}: ${walkedFree ? 'the wrong weapon' : 'the wrong person'}`,
    line: walkedFree
      ? `You named ${midSentence(suspectName(c.murderer, c.guests))} but the wrong weapon. With nothing to hold them on, they walked free, and ${midSentence(suspectName(next, c.guests))} was the next body.`
      : `You accused ${midSentence(suspectName(next, c.guests))}. They weren't the killer, and they were the next body.`,
  };
}
