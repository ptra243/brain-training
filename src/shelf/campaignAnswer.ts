// Pure parts of the #shelf campaign book's Answer page, the questioning spread and the "later that night"
// scene. The held accusation's logic itself is `game/face.ts`; this is who may be accused, the printed
// lines and the scene's words (copied from `CampaignView`, which keeps the classic wording).
import { ROUNDS } from '../engine/campaign.ts';
import { midSentence } from '../engine/text.ts';
import type { Case, Interrogation } from '../engine/types.ts';
import { currentRound, stillPossible, type CampaignSave } from '../game/campaignSave.ts';
import { ROUND_TIMES } from '../game/labels.ts';
import { itemName, suspectName } from '../game/names.ts';
import type { InterrogationData } from '../game/state.ts';

const WORDS = ['one', 'two', 'three'];

/** Who her clues, over every round so far, still allow as the killer (`rounds` are the cases up to and including this one). */
export function possibleNow(save: CampaignSave, rounds: readonly Case[]): string[] {
  return stillPossible(save, rounds.slice(0, currentRound(save) + 1));
}

/** The guests the blanks list: only the possible ones when she chose "only possible killers", else everyone. */
export function accusable(save: CampaignSave, c: Case, possible: readonly string[]): string[] {
  return save.ref.possibleOnly ? possible.slice() : c.suspects.slice();
}

/** The warning before she hands in an accusation while her clues allow several killers; null when she may go straight on. */
export function guessWarning(stillPointing: number): string | null {
  return stillPointing > 1 ? `Your clues still point at ${stillPointing} people. Guess now?` : null;
}

/** One earlier chapter's wrong try, shown crossed out above the form: "Chapter one: the Financier, with the rope". */
export function earlierTries(save: CampaignSave, guests: readonly string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < currentRound(save); i++) {
    const a = save.rounds[i]?.accusations.at(-1);
    if (a) out.push(`Chapter ${WORDS[Math.min(i, WORDS.length - 1)]}: ${midSentence(suspectName(a.suspect, guests))}, with the ${itemName(a.item)}`);
  }
  return out;
}

/** The candle-out scene: `CampaignView`'s headings and sentences, plus how many candles are still lit. */
export interface LaterScene {
  kind: 'next-body' | 'wrong-weapon';
  heading: string;
  text: string;
  /** The button's "On to …": the new chapter's time, lower case. */
  nextTime: string;
  /** Candles still lit; the one at this index has just gone out. */
  lit: number;
}

/** The scene after a wrong accusation, from the save as it is once the verdict is applied (its newest victim, its new round). */
export function laterScene(kind: LaterScene['kind'], after: CampaignSave, guests: readonly string[]): LaterScene {
  const victim = after.victims.at(-1) ?? '';
  const left = ROUNDS - after.victims.length;
  return {
    kind,
    heading: kind === 'wrong-weapon' ? 'Wrong weapon, and the killer walks free' : `${suspectName(victim, guests)} wasn't the killer`,
    text:
      (kind === 'wrong-weapon' ? 'You named the killer, but with the wrong weapon you could not hold them. ' : '') +
      `Later that night, ${midSentence(suspectName(victim, guests))} is found dead. The killer is still among the guests, and` +
      (left === 1 ? ' this is your last chance.' : ` you have ${left} accusations left.`),
    nextTime: (ROUND_TIMES[currentRound(after)] ?? '').toLowerCase(),
    lit: left,
  };
}

/** The questioning's starting data with her first `n` questions already asked (the dev preview). */
export function askedFirst(puzzle: Interrogation, n: number): InterrogationData {
  return { asked: puzzle.questions.slice(0, n).map((q) => q.id), strikes: 0, caught: false };
}
