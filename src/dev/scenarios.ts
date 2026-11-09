// The #dev/load/<id> scenarios: a save built on the run with the engine and the app's own save
// functions, then the real game opens on it. Never a committed save, so a format change can't
// leave one stale. e2e builds the same states from here (e2e/CLAUDE.md).

import { content, houseDetails } from '../content/index.ts';
import { ROUNDS, type CampaignRef } from '../engine/campaign.ts';
import { caseFor, codeFor, type QuickRef } from '../engine/caseRef.ts';
import { isSceneGame } from '../engine/gameKinds.ts';
import type { Case } from '../engine/types.ts';
import { newCampaign, pick, roundCase, stillPossible, updateRound, type CampaignSave } from '../game/campaignSave.ts';
import { laterScene, type LaterScene } from '../shelf/campaignAnswer.ts';
import { emptyHistory, recordCampaign, recordQuick, type History } from '../game/history.ts';
import { localDate } from '../game/runRecord.ts';
import { roomContents, roundPuzzles } from '../game/explore.ts';
import { openingScript } from '../game/opening.ts';
import { emptyProgress, reduce, type Progress } from '../game/state.ts';
import { questioningOf } from '../game/talk.ts';
import { saveCampaign, saveHistory, saveQuick, saveScreen, type QuickSave } from '../game/storage.ts';

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

/** A new campaign at the start of round 1 with the opening done, for the #shelf campaign book's preview. */
export const campaignStart = (): CampaignSave => openingDone(newCampaign(campaignRef));

/**
 * Chapter one on its opening, two guests met (the #shelf campaign opening preview). With `spread` the opening
 * spread is open on a guest who gives a free clue (met, so the clue card shows).
 */
export function campaignOpening(spread = false): { save: CampaignSave; cases: Case[]; openingGuest?: string } {
  const start = newCampaign(campaignRef);
  const c = roundCase(content, start, 0);
  const script = openingScript(c);
  const withClue = script.guests.find((g) => g.clues.length > 0)?.guest ?? c.suspects[0];
  const met = [withClue, ...c.suspects.filter((g) => g !== withClue)].slice(0, 2);
  const rounds = start.rounds.slice();
  rounds[0] = met.reduce((p, guest) => reduce({ ...c, explore: true as const }, p, { type: 'opening-talk', guest }), rounds[0]);
  return { save: { ...start, rounds }, cases: [c], ...(spread && { openingGuest: withClue }) };
}

/**
 * Chapter one with the face-to-face talk open on a guest who has a questioning game: she stands in
 * that guest's room and has heard one line from them. For the #shelf campaign book's talk preview.
 */
export function campaignTalk(): { save: CampaignSave; cases: Case[]; talk: string } {
  const save = campaignStart();
  const c = roundCase(content, save, 0);
  const contents = roomContents(houseDetails, c);
  const at = c.rooms.find((room) => contents[room].guests.some((g) => questioningOf(c, g)))!;
  const talk = contents[at].guests.find((g) => questioningOf(c, g))!;
  const rounds = save.rounds.slice();
  rounds[0] = { ...rounds[0], at, talk: { ...rounds[0].talk, [talk]: 1 } };
  return { save: { ...save, rounds }, cases: [c], talk };
}

/**
 * Chapter one turned to the Plan page: she stands in a room with guests and has walked into two more
 * (so their guests show on the plan). For the #shelf campaign book's Plan preview.
 */
export function campaignPlan(): { save: CampaignSave; cases: Case[]; section: number } {
  const save = campaignStart();
  const c = roundCase(content, save, 0);
  const contents = roomContents(houseDetails, c);
  const withGuests = c.rooms.filter((room) => contents[room].guests.length > 0);
  const at = withGuests[0];
  const seen = withGuests.filter((room) => room !== at && room !== c.sceneRoom).slice(0, 2);
  const rounds = save.rounds.slice();
  rounds[0] = { ...rounds[0], at, seen };
  return { save: { ...save, rounds }, cases: [c], section: 1 };
}

/**
 * Chapter two (Midnight) after one wrong accusation, for the #shelf campaign book's midnight preview: two
 * puzzles picked, the first one won, and she stands in the room that holds it. Both rounds are built, as
 * the book wants every round (the sample never writes).
 */
export function campaignChapterTwo(): { save: CampaignSave; cases: Case[] } {
  let save = campaignAfter(1);
  const cases = [roundCase(content, save, 0), roundCase(content, save, 1)];
  const c = cases[1];
  const [won, second] = roundPuzzles(c).objects;
  save = pick(pick(save, c, won.kind), c, second.kind);
  const contents = roomContents(houseDetails, c);
  const at = Object.keys(contents).find((room) => contents[room].objects.some((o) => o.kind === won.kind))!;
  const rounds = save.rounds.slice();
  rounds[1] = { ...rounds[1], at, games: { ...rounds[1].games, [won.kind]: { status: 'won', data: null } } };
  return { save: { ...save, rounds }, cases };
}

/**
 * A solved Quick case and a caught campaign, recorded in a history (the Home scenario and the guest book
 * preview). `more` adds an escaped campaign and an older solved case so the book has a mix.
 */
export function finishedRuns(more = false): { history: History; campaign: CampaignSave; quick: QuickSave } {
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

  const quickCase = caseFor(content, quickRef);
  const quick = { ref: quickRef, progress: { ...emptyProgress(), solved: true, accusations: [{ suspect: quickCase.murderer, item: quickCase.weapon, correct: 2 }] } };
  const recQuick = recordQuick(quick, quickCase, history, mintId, date);
  history = recQuick.history;

  if (more) {
    const older = '2026-10-02';
    // The killer got away: three wrong people named.
    const lost = campaignAfter(ROUNDS - 1);
    const last = roundCase(content, lost, ROUNDS - 1);
    const escaped = updateRound(lost, last, { ...lost.rounds[ROUNDS - 1], accusations: [wrongAccusation(last)] }).save;
    history = recordCampaign(escaped, [roundCase(content, lost, 0), roundCase(content, lost, 1), last], history, mintId, older).history;
    const otherRef: QuickRef = { ...quickRef, code: codeFor(11 * 104_729) };
    const otherCase = caseFor(content, otherRef);
    const other = { ref: otherRef, progress: { ...emptyProgress(), solved: true, accusations: [{ suspect: otherCase.murderer, item: otherCase.weapon, correct: 2 }] } };
    history = recordQuick(other, otherCase, history, mintId, older).history;
  }
  return { history, campaign: rec.save, quick: recQuick.save };
}

/** Round 1 with every puzzle played, so the clock reads midnight (the `campaign-midnight` scenario's save). */
export const campaignMidnight = (): CampaignSave => playedOut(openingDone(newCampaign(campaignRef)), roundCase(content, newCampaign(campaignRef), 0));

/** Chapter one on the Answer page with a guest written into the form (the #shelf campaign Answer preview). */
export function campaignAnswer(): { save: CampaignSave; cases: Case[]; section: number; guest: string } {
  const save = campaignStart();
  const c = roundCase(content, save, 0);
  return { save, cases: [c], section: 2, guest: wrongAccusation(c).suspect };
}

/** Chapter one with a wrong accusation held and two questions asked (the #shelf campaign questioning preview). */
export function campaignQuestion(): { save: CampaignSave; cases: Case[]; asked: number } {
  const { save } = campaignHeld();
  return { save, cases: [roundCase(content, save, 0)], asked: 2 };
}

/** Chapter one with a wrong accusation handed in and not yet questioned: a reload finds the questioning waiting. */
export function campaignHeld(): { save: CampaignSave; guest: string } {
  const save = campaignStart();
  const accusation = wrongAccusation(roundCase(content, save, 0));
  const rounds = save.rounds.slice();
  rounds[0] = { ...rounds[0], accusations: [accusation] };
  return { save: { ...save, rounds }, guest: accusation.suspect };
}

/** Chapter two with the scene after a wrong accusation open: the first candle out (the #shelf campaign "later" preview). */
export function campaignLater(): { save: CampaignSave; cases: Case[]; later: LaterScene } {
  const save = campaignAfter(1);
  const cases = [roundCase(content, save, 0), roundCase(content, save, 1)];
  return { save, cases, later: laterScene('next-body', save, cases[0].guests) };
}

/** The last round of `save` with this accusation handed in and not yet questioned (a reload finds the questioning waiting). */
function holding(save: CampaignSave, accusation: Progress['accusations'][number]): CampaignSave {
  const i = save.rounds.length - 1;
  const rounds = save.rounds.slice();
  rounds[i] = { ...rounds[i], accusations: [accusation] };
  return { ...save, rounds };
}

/** Chapter one with the killer and the right weapon handed in and not yet questioned: the next verdict is "caught". */
export function campaignHeldRight(): CampaignSave {
  const save = campaignStart();
  const c = roundCase(content, save, 0);
  return holding(save, { suspect: c.murderer, item: c.weapon, correct: 2 });
}

/** The last chapter after two wrong accusations, with a third wrong one handed in: the next verdict is "escaped". */
export function campaignHeldLast(): CampaignSave {
  const save = campaignAfter(ROUNDS - 1);
  return holding(save, wrongAccusation(roundCase(content, save, ROUNDS - 1)));
}

/** A campaign caught in chapter two (one wrong try before it), and every round built. */
export function campaignCaught(): { save: CampaignSave; cases: Case[]; section: number } {
  const before = campaignAfter(1);
  const cases = [roundCase(content, before, 0), roundCase(content, before, 1)];
  const c = cases[1];
  const save = updateRound(before, c, { ...before.rounds[1], accusations: [{ suspect: c.murderer, item: c.weapon, correct: 2 }] }).save;
  return { save, cases, section: 2 };
}

/** A campaign the killer escaped: three wrong accusations. The got-away scene is open from the start. */
export function campaignEscaped(): { save: CampaignSave; cases: Case[]; section: number; ending: 'scene' } {
  const before = campaignAfter(ROUNDS - 1);
  const cases = [0, 1, 2].map((i) => roundCase(content, before, i));
  const last = cases[ROUNDS - 1];
  const save = updateRound(before, last, { ...before.rounds[ROUNDS - 1], accusations: [wrongAccusation(last)] }).save;
  return { save, cases, section: 2, ending: 'scene' };
}

/** Chapter two, with chapter one open to read (the earlier-chapters preview). */
export function campaignEarlier(): { save: CampaignSave; cases: Case[]; view: number } {
  // Chapter one: one object won (so there is a finished row to open), then a wrong accusation.
  let start = campaignStart();
  const c0 = roundCase(content, start, 0);
  const won = roundPuzzles(c0).objects[0];
  start = pick(start, c0, won.kind);
  const contents = roomContents(houseDetails, c0);
  const at = Object.keys(contents).find((room) => contents[room].objects.some((o) => o.kind === won.kind))!;
  const progress = { ...start.rounds[0], at, games: { [won.kind]: { status: 'won' as const, data: null } }, accusations: [wrongAccusation(c0)] };
  const save = updateRound(start, c0, progress).save;
  return { save, cases: [c0, roundCase(content, save, 1)], view: 0 };
}

/**
 * A "only possible killers" campaign in round 1 where one won puzzle leaves her clues pointing at fewer
 * guests than there are: the first puzzle that does, won. For the Answer page's shorter list.
 */
export function campaignPossibleOnly(): { save: CampaignSave; allowed: string[]; all: string[] } {
  const start = openingDone(newCampaign({ ...campaignRef, possibleOnly: true }));
  const c = { ...roundCase(content, start, 0), explore: true } as Case;
  for (const g of puzzles(c)) {
    const rounds = [{ ...start.rounds[0], games: { [g.kind]: { status: 'won' as const, data: null } } }];
    const save = { ...start, rounds };
    const allowed = stillPossible(save, [c]);
    if (allowed.length > 0 && allowed.length < c.suspects.length) return { save, allowed, all: c.suspects.slice() };
  }
  throw new Error('no puzzle narrows the killers down');
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
    load: () => loadCampaign(campaignMidnight()),
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
      const runs = finishedRuns();
      saveCampaign(runs.campaign);
      saveHistory(runs.history);
      saveQuick(runs.quick);
      saveScreen('home');
    },
  },
];
