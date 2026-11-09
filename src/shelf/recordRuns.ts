// Records the runs she finished on #shelf, which nothing else records (`App.tsx` does it for the classic
// shell). Same steps as there: the id goes onto the save first, the row is added once.

import { generate } from '../game/caseClient.ts';
import { recordCampaign, recordQuick } from '../game/history.ts';
import { localDate } from '../game/runRecord.ts';
import { loadCampaign, loadHistory, loadQuick, saveCampaign, saveHistory, saveQuick } from '../game/storage.ts';
import { pendingRuns } from './guestBook.ts';

const newHistoryId = () => crypto.randomUUID();

/** Records any finished Quick case or campaign that is not in the history yet. Resolves true when it wrote a row. */
export async function recordFinishedRuns(): Promise<boolean> {
  const quick = loadQuick();
  const campaign = loadCampaign();
  const pending = pendingRuns(quick, campaign, loadHistory());
  let wrote = false;
  try {
    if (quick && pending.quick) {
      const c = await generate({ kind: 'case', ref: quick.ref });
      const save = loadQuick();
      const history = loadHistory();
      if (save && pendingRuns(save, null, history).quick) {
        const done = recordQuick(save, c, history, newHistoryId, localDate(new Date()));
        saveQuick(done.save);
        saveHistory(done.history);
        wrote = true;
      }
    }
    if (campaign && pending.campaign) {
      const cases = await generate({ kind: 'campaign-rounds', save: campaign });
      const save = loadCampaign();
      const history = loadHistory();
      if (save && pendingRuns(null, save, history).campaign) {
        const done = recordCampaign(save, cases, history, newHistoryId, localDate(new Date()));
        saveCampaign(done.save);
        saveHistory(done.history);
        wrote = true;
      }
    }
  } catch (err) {
    console.error(err);
  }
  return wrote;
}
