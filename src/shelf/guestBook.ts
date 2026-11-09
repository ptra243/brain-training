// The guest book (#shelf/record): which finished runs still need recording, and the
// entries it shows. Pure; the storage and building parts are in `recordRuns.ts`.

import { campaignCast, campaignGuests } from '../engine/campaign.ts';
import { content } from '../content/index.ts';
import { guestName } from '../engine/guestNames.ts';
import type { CampaignSave } from '../game/campaignSave.ts';
import { campaignPending, quickPending, type History } from '../game/history.ts';
import { DIFFICULTY_LABEL } from '../game/labels.ts';
import { caseTitle } from '../game/names.ts';
import { campaignRowLine, effortLines, quickRowLine, wrongWeaponSentence } from '../game/runRecord.ts';
import type { QuickSave } from '../game/storage.ts';

/** Which of her saved runs are finished but not in the history yet. */
export function pendingRuns(quick: QuickSave | null, campaign: CampaignSave | null, history: History): { quick: boolean; campaign: boolean } {
  return { quick: !!quick && quickPending(quick, history), campaign: !!campaign && campaignPending(campaign, history) };
}

export interface BookEntry {
  id: string;
  kind: 'quick' | 'campaign';
  date: string;
  title: string;
  /** "22 Oct · Solved on the first accusation" */
  line: string;
  /** The effort sentences, then the wrong-weapon one when there is one. */
  effort: string;
  /** The killer's name when the run was solved and the name is known. */
  signature?: string;
  /** A campaign the killer got away from: it ends "left before dessert". */
  leftEarly?: boolean;
}

/** The killer of a campaign, named as at that dinner. */
export function campaignKiller(ref: Parameters<typeof campaignCast>[1]): string {
  const cast = campaignCast(content, ref);
  return guestName(content, campaignGuests(cast), cast.killer);
}

/** Quick rows then campaign rows, newest date first; rows with the same date keep that order (quick first). */
export function bookEntries(history: History): BookEntry[] {
  const all: BookEntry[] = [
    ...history.quick.map(
      (r): BookEntry => ({
        id: r.id,
        kind: 'quick',
        date: r.date,
        title: caseTitle(r.ref),
        line: quickRowLine(r),
        effort: effortLines(r),
        ...(r.killer && { signature: r.killer }),
      }),
    ),
    ...history.campaign.map(
      (r): BookEntry => ({
        id: r.id,
        kind: 'campaign',
        date: r.date,
        title: `${DIFFICULTY_LABEL[r.ref.difficulty]} campaign ${r.ref.code}`,
        line: campaignRowLine(r),
        effort: [effortLines(r), wrongWeaponSentence(r.wrongWeaponTries)].filter(Boolean).join(' '),
        ...(r.ending === 'caught' ? { signature: campaignKiller(r.ref) } : { leftEarly: true }),
      }),
    ),
  ];
  return all
    .map((e, i) => ({ e, i }))
    .sort((a, b) => (a.e.date === b.e.date ? a.i - b.i : a.e.date < b.e.date ? 1 : -1))
    .map((x) => x.e);
}

/** A small tilt for a signature in degrees, between -2.5 and 2.5, from the row id. Never random. */
export function signatureTilt(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ((h % 11) - 5) / 2;
}
