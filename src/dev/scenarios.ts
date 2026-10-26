// The #dev/load/<id> scenarios: a save built on the run with the engine and the app's own save
// functions, then the real game opens on it. Never a committed save, so a format change can't
// leave one stale. e2e builds the same states from here (e2e/CLAUDE.md).

import { content } from '../content/index.ts';
import { ROUNDS, type CampaignRef } from '../engine/campaign.ts';
import { caseFor, codeFor, type QuickRef } from '../engine/caseRef.ts';
import { isSceneGame } from '../engine/gameKinds.ts';
import type { Case } from '../engine/types.ts';
import { newCampaign, pick, roundCase, updateRound, type CampaignSave } from '../game/campaignSave.ts';
import { emptyHistory, recordCampaign, recordQuick } from '../game/history.ts';
import { localDate } from '../game/runRecord.ts';
import { emptyProgress, type Progress } from '../game/state.ts';
import { saveCampaign, saveHistory, saveQuick, saveScreen } from '../game/storage.ts';

export interface Scenario {
  id: string;
  /** Shown on the #dev index. */
  about: string;
  /** Writes the saves and says which screen to open on. */
  load: () => void;
}

const campaignRef: CampaignRef = { mode: 'campaign', code: codeFor(104_729), difficulty: 'medium' };
const quickRef: QuickRef = { mode: 'quick', code: codeFor(7 * 104_729), difficulty: 'medium', length: 'normal' };

/** The round's puzzles (not the scene word games) she may play. */
const puzzles = (c: Case) => c.games.filter((g) => !isSceneGame(g));

/** An accusation of a guest who is not the killer, so the verdict is "next body". */
function wrongAccusation(c: Case): Progress['accusations'][number] {
  const suspect = c.suspects.find((s) => s !== c.murderer)!;
  return { suspect, item: c.weapon, correct: 0 };
}

/** Round `i`'s progress with its budget of puzzles chosen and won, so the clock reads midnight. */
function playedOut(save: CampaignSave, c: Case): CampaignSave {
  let next = save;
  const i = next.rounds.length - 1;
  const rounds = next.rounds.slice();
  const progress = { ...rounds[i], games: { ...rounds[i].games } };
  for (const g of puzzles(c).slice(0, c.campaign?.budget ?? 1)) {
    next = pick(next, c, g.kind);
    progress.games[g.kind] = { status: 'won', data: null };
  }
  rounds[i] = progress;
  return { ...next, rounds };
}

/** Round 1's opening marked done, so the casebook shows (the scene is `campaign-opening`). */
function openingDone(save: CampaignSave): CampaignSave {
  const rounds = save.rounds.slice();
  rounds[0] = { ...rounds[0], opening: { talked: [], done: true } };
  return { ...save, rounds };
}

/** A campaign after `wrong` wrong accusations: the next body found each time. */
function campaignAfter(wrong: number): CampaignSave {
  let save = newCampaign(campaignRef);
  for (let i = 0; i < wrong; i++) {
    const c = roundCase(content, save, i);
    const p = { ...save.rounds[i], accusations: [wrongAccusation(c)] };
    save = updateRound(save, c, p).save;
  }
  return save;
}

function loadCampaign(save: CampaignSave) {
  saveCampaign(save);
  saveScreen('campaign');
}

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'campaign-opening',
    about: 'A new campaign at round 1 with the opening scene not started',
    load: () => loadCampaign(newCampaign(campaignRef)),
  },
  {
    id: 'campaign-start',
    about: 'A new campaign at the start of round 1 (opening done), nothing played',
    load: () => loadCampaign(openingDone(newCampaign(campaignRef))),
  },
  {
    id: 'campaign-midnight',
    about: 'Round 1 with every puzzle played: the clock reads midnight and the map is locked',
    load: () => loadCampaign(playedOut(openingDone(newCampaign(campaignRef)), roundCase(content, newCampaign(campaignRef), 0))),
  },
  {
    id: 'campaign-last-round',
    about: `Round ${ROUNDS} after two wrong accusations: the next one lets the killer escape`,
    load: () => loadCampaign(campaignAfter(ROUNDS - 1)),
  },
  {
    id: 'finished-runs',
    about: 'Home with one solved Quick case and one caught campaign, both in Your record',
    load: () => {
      const date = localDate(new Date());
      let n = 0;
      const mintId = () => `dev-${++n}`;

      const c = roundCase(content, newCampaign(campaignRef), 0);
      let history = emptyHistory();
      let save = campaignAfter(1);
      const r1 = roundCase(content, save, 1);
      save = updateRound(save, r1, { ...save.rounds[1], accusations: [{ suspect: r1.murderer, item: r1.weapon, correct: 2 }] }).save;
      const cases = [c, r1];
      const rec = recordCampaign(save, cases, history, mintId, date);
      history = rec.history;
      saveCampaign(rec.save);

      const quickCase = caseFor(content, quickRef);
      const quick = { ref: quickRef, progress: { ...emptyProgress(), solved: true, accusations: [{ suspect: quickCase.murderer, item: quickCase.weapon, correct: 2 }] } };
      history = recordQuick(quick, quickCase, history, mintId, date).history;
      saveHistory(history);
      saveQuick(quick);
      saveScreen('home');
    },
  },
];
