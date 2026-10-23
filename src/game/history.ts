// Run history: the pure "record a finished run once" step. Storage and guards
// live in `storage.ts` / `saveGuards.ts`; the snapshot and copy in `runRecord.ts`.

import type { Case } from '../engine/types.ts';
import type { CampaignSave } from './campaign.ts';
import {
  addCampaignRow,
  addQuickRow,
  campaignRow,
  emptyCampaignTotals,
  emptyQuickTotals,
  quickRow,
  type CampaignRow,
  type CampaignTotals,
  type QuickRow,
  type QuickTotals,
} from './runRecord.ts';
import type { QuickSave } from './storage.ts';

/** Rows kept per list; older rows drop off but the totals keep counting them. */
export const HISTORY_CAP = 30;

export type QuickEntry = QuickRow & { id: string };
export type CampaignEntry = CampaignRow & { id: string };

export interface History {
  /** Newest first. */
  quick: QuickEntry[];
  campaign: CampaignEntry[];
  quickTotals: QuickTotals;
  campaignTotals: CampaignTotals;
}

export const emptyHistory = (): History => ({
  quick: [],
  campaign: [],
  quickTotals: emptyQuickTotals(),
  campaignTotals: emptyCampaignTotals(),
});

/** A Quick case is finished when she has solved it. */
export const quickFinished = (save: QuickSave): boolean => save.progress.solved;

/** A campaign is finished when she caught the killer or it got away. */
export const campaignFinished = (save: CampaignSave): boolean => save.outcome === 'caught' || save.outcome === 'escaped';

/** True when this finished save still needs recording (no id yet, or an id with no row). */
export function quickPending(save: QuickSave, history: History): boolean {
  return quickFinished(save) && !(save.historyId && history.quick.some((r) => r.id === save.historyId));
}

export function campaignPending(save: CampaignSave, history: History): boolean {
  return campaignFinished(save) && !(save.historyId && history.campaign.some((r) => r.id === save.historyId));
}

/**
 * Record a finished Quick case once. The id goes onto the save first (minted
 * when it has none), then the row is added only if no row has that id, so
 * running this again changes nothing. An unfinished save is returned as is.
 */
export function recordQuick(save: QuickSave, c: Case, history: History, mintId: () => string, date: string): { save: QuickSave; history: History } {
  if (!quickFinished(save)) return { save, history };
  const id = save.historyId ?? mintId();
  const next = save.historyId === id ? save : { ...save, historyId: id };
  if (history.quick.some((r) => r.id === id)) return { save: next, history };
  const row = quickRow(next, c, date);
  return {
    save: next,
    history: {
      ...history,
      quick: [{ ...row, id }, ...history.quick].slice(0, HISTORY_CAP),
      quickTotals: addQuickRow(history.quickTotals, row),
    },
  };
}

/** The same for a campaign; `cases[i]` is round `i + 1`. */
export function recordCampaign(
  save: CampaignSave,
  cases: readonly Case[],
  history: History,
  mintId: () => string,
  date: string,
): { save: CampaignSave; history: History } {
  if (!campaignFinished(save)) return { save, history };
  const id = save.historyId ?? mintId();
  const next = save.historyId === id ? save : { ...save, historyId: id };
  if (history.campaign.some((r) => r.id === id)) return { save: next, history };
  const row = campaignRow(next, cases, date);
  return {
    save: next,
    history: {
      ...history,
      campaign: [{ ...row, id }, ...history.campaign].slice(0, HISTORY_CAP),
      campaignTotals: addCampaignRow(history.campaignTotals, row),
    },
  };
}
