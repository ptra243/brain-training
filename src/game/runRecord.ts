// A finished run as a short snapshot, and the sentences that describe it
// (docs/run-history.md). Pure: no React, no storage. The closing card, a
// history row and the totals all read their copy from here.

import type { CampaignRef } from '../engine/campaign.ts';
import type { CaseRef } from '../engine/caseRef.ts';
import type { Case } from '../engine/types.ts';
import type { CampaignSave } from './campaignSave.ts';
import type { Progress } from './state.ts';
import type { QuickSave } from './storage.ts';

// ---------- Counting ----------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const count = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);

/** Games whose data keeps one Hint-button counter in `data.hints`. */
const HINTS_IN_DATA = ['cats', 'crossword', 'sudoku', 'tarot', 'nosing'];

/**
 * Presses of the Hint button in one case: map and grid, each game's own
 * counter, the case board puzzle and the end board. Wordle, word search,
 * questioning and the joker's peek count nothing; Solve is not a hint.
 */
export function hintTotal(p: Progress): number {
  let total = count(p.gridHints?.count);
  for (const [kind, rec] of Object.entries(p.games)) {
    if (!rec || !isObj(rec.data)) continue;
    if (HINTS_IN_DATA.includes(kind)) total += count(rec.data.hints);
    else if (kind === 'board') total += count(rec.data.hintCount);
  }
  if (isObj(p.endBoard?.save)) total += count(p.endBoard.save.hintCount);
  return total;
}

export interface PuzzleCounts {
  /** Puzzles she solved herself. */
  won: number;
  /** Puzzles solved for her (she pressed Solve). */
  revealed: number;
  /** Puzzles in the case. The three scene word games count as one when any of them reveals the scene. */
  total: number;
}

/** `won` / `revealed` / total for one case. A puzzle still open, or never opened, is neither. */
export function puzzleCounts(c: Case, p: Progress): PuzzleCounts {
  let won = 0;
  let revealed = 0;
  let total = 0;
  let sceneSeen = false;
  let sceneWon = false;
  let sceneRevealed = false;
  for (const g of c.games) {
    const status = p.games[g.kind]?.status;
    if (g.unlocksScene && !c.sceneGiven) {
      sceneSeen = true;
      sceneWon ||= status === 'won';
      sceneRevealed ||= status === 'revealed';
      continue;
    }
    total++;
    if (status === 'won') won++;
    else if (status === 'revealed') revealed++;
  }
  if (sceneSeen) {
    total++;
    if (sceneWon) won++;
    else if (sceneRevealed) revealed++;
  }
  return { won, revealed, total };
}

const addCounts = (a: PuzzleCounts, b: PuzzleCounts): PuzzleCounts => ({ won: a.won + b.won, revealed: a.revealed + b.revealed, total: a.total + b.total });
const noCounts: PuzzleCounts = { won: 0, revealed: 0, total: 0 };

/** Accusations that named the case's killer with the other weapon. `correct === 1` would also match the right weapon on the wrong person. */
export function wrongWeaponTries(c: Case, p: Progress): number {
  return p.accusations.filter((a) => a.suspect === c.murderer && a.item !== c.weapon).length;
}

// ---------- Rows ----------

/** Local calendar date, `YYYY-MM-DD`. */
export function localDate(d: Date): string {
  const two = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}

export interface QuickRow {
  ref: CaseRef;
  date: string;
  accusations: number;
  hints: number;
  /** Puzzles she pressed Solve on. */
  solvedForHer: number;
  /** Puzzles she solved herself. */
  solvedYourself: number;
  /** Puzzles in the case. */
  puzzles: number;
}

export function quickRow(save: QuickSave, c: Case, date: string): QuickRow {
  const n = puzzleCounts(c, save.progress);
  return {
    ref: save.ref,
    date,
    accusations: save.progress.accusations.length,
    hints: hintTotal(save.progress),
    solvedForHer: n.revealed,
    solvedYourself: n.won,
    puzzles: n.total,
  };
}

export interface CampaignRow {
  ref: CampaignRef;
  date: string;
  ending: 'caught' | 'escaped';
  /** The round it ended on: 1, 2 or 3. */
  round: number;
  wrongWeaponTries: number;
  /** Wrong people named: `round - 1` on a catch, 3 when the killer got away. */
  wrongPeople: number;
  hints: number;
  solvedForHer: number;
  solvedYourself: number;
  puzzles: number;
}

/** `cases[i]` is round `i + 1`, rebuilt from the save (`roundCase`). The save must be finished. */
export function campaignRow(save: CampaignSave, cases: readonly Case[], date: string): CampaignRow {
  const ending = save.outcome === 'caught' ? 'caught' : 'escaped';
  const round = save.rounds.length;
  let hints = 0;
  let weapons = 0;
  let n = noCounts;
  save.rounds.forEach((p, i) => {
    hints += hintTotal(p);
    weapons += wrongWeaponTries(cases[i], p);
    n = addCounts(n, puzzleCounts(cases[i], p));
  });
  return {
    ref: save.ref,
    date,
    ending,
    round,
    wrongWeaponTries: weapons,
    wrongPeople: ending === 'caught' ? round - 1 : 3,
    hints,
    solvedForHer: n.revealed,
    solvedYourself: n.won,
    puzzles: n.total,
  };
}

// ---------- Copy ----------

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function hintSentence(hints: number): string {
  if (hints <= 0) return "You didn't ask for a hint.";
  return `You asked for ${hints} ${plural(hints, 'hint', 'hints')}.`;
}

/** The second sentence, or '' when no puzzle was finished. */
export function puzzleSentence(n: { solvedForHer: number; solvedYourself: number; puzzles: number }): string {
  if (n.solvedForHer >= 1) return n.solvedForHer === 1 ? '1 puzzle was solved for you.' : `${n.solvedForHer} puzzles were solved for you.`;
  if (n.solvedYourself < 1) return '';
  return n.solvedYourself >= n.puzzles ? 'You solved every puzzle yourself.' : 'You solved the puzzles you played yourself.';
}

/** The hint and puzzle sentences under a closing line, a row or a totals line. */
export function effortLines(n: { hints: number; solvedForHer: number; solvedYourself: number; puzzles: number }): string {
  return [hintSentence(n.hints), puzzleSentence(n)].filter(Boolean).join(' ');
}

export function quickClosing(accusations: number): string {
  return accusations === 1 ? 'Solved on the first accusation' : `Solved in ${accusations} accusations`;
}

const CLOCK = ['9pm', 'midnight', '3am'];
export const roundClock = (round: number): string => CLOCK[Math.min(Math.max(round, 1), CLOCK.length) - 1];

export function campaignHeading(ending: 'caught' | 'escaped', round: number): string {
  return ending === 'caught' ? `You caught the killer at ${roundClock(round)}.` : 'The killer got away.';
}

export function wrongWeaponSentence(tries: number): string {
  if (tries < 1) return '';
  return `${tries} wrong ${plural(tries, 'weapon', 'weapons')}, which cost nothing.`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-22" becomes "22 Oct". Anything unreadable comes back as it was. */
export function dateLabel(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m || +m[2] < 1 || +m[2] > 12) return date;
  return `${+m[3]} ${MONTHS[+m[2] - 1]}`;
}

/** A Quick row's second line: "22 Oct · Solved on the first accusation". */
export const quickRowLine = (r: QuickRow): string => `${dateLabel(r.date)} · ${quickClosing(r.accusations)}`;

/** A campaign row's second line: "22 Oct · You caught the killer at midnight." */
export const campaignRowLine = (r: CampaignRow): string => `${dateLabel(r.date)} · ${campaignHeading(r.ending, r.round)}`;

// ---------- Totals ----------

export interface EffortTotals {
  hints: number;
  solvedForHer: number;
  solvedYourself: number;
  puzzles: number;
}

export interface QuickTotals extends EffortTotals {
  cases: number;
  /** Cases solved on the first accusation. */
  first: number;
}

export interface CampaignTotals extends EffortTotals {
  campaigns: number;
  caught: number;
  escaped: number;
  /** Catches at 9pm (round 1). */
  caughtAt9: number;
}

/** "You asked for 37 hints, and 5 puzzles were solved for you." One line from the two effort sentences. */
function joinedEffort(n: EffortTotals): string {
  const hint = hintSentence(n.hints).replace(/\.$/, '');
  const puzzle = puzzleSentence(n);
  if (!puzzle) return `${hint}.`;
  return `${hint}, and ${puzzle.replace(/^You /, 'you ')}`;
}

const times = (n: number) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);

export function quickTotalsSentence(t: QuickTotals): string {
  const parts = [`${t.cases} ${plural(t.cases, 'case', 'cases')} solved.`];
  if (t.first > 0) parts.push(`${t.first} on the first accusation.`);
  parts.push(joinedEffort(t));
  return parts.join(' ');
}

export function campaignTotalsSentence(t: CampaignTotals): string {
  const parts = [`${t.campaigns} ${plural(t.campaigns, 'campaign', 'campaigns')}.`];
  if (t.caught > 0) {
    let s = `You caught the killer ${times(t.caught)}`;
    if (t.caughtAt9 > 0) {
      const at = t.caught === 1 ? 'at 9pm' : t.caughtAt9 === 1 ? 'once at 9pm' : t.caughtAt9 === t.caught && t.caught === 2 ? 'both at 9pm' : `${t.caughtAt9} of them at 9pm`;
      s += `, ${at}`;
    }
    parts.push(`${s}.`);
  }
  if (t.escaped > 0) parts.push(`The killer got away ${times(t.escaped)}.`);
  parts.push(joinedEffort(t));
  return parts.join(' ');
}

const addEffort = (t: EffortTotals, r: EffortTotals): EffortTotals => ({
  hints: t.hints + r.hints,
  solvedForHer: t.solvedForHer + r.solvedForHer,
  solvedYourself: t.solvedYourself + r.solvedYourself,
  puzzles: t.puzzles + r.puzzles,
});

/** Totals after one more row. */
export const addQuickRow = (t: QuickTotals, r: QuickRow): QuickTotals => ({
  ...addEffort(t, r),
  cases: t.cases + 1,
  first: t.first + (r.accusations === 1 ? 1 : 0),
});

export const addCampaignRow = (t: CampaignTotals, r: CampaignRow): CampaignTotals => ({
  ...addEffort(t, r),
  campaigns: t.campaigns + 1,
  caught: t.caught + (r.ending === 'caught' ? 1 : 0),
  escaped: t.escaped + (r.ending === 'escaped' ? 1 : 0),
  caughtAt9: t.caughtAt9 + (r.ending === 'caught' && r.round === 1 ? 1 : 0),
});

export const emptyQuickTotals = (): QuickTotals => ({ cases: 0, first: 0, hints: 0, solvedForHer: 0, solvedYourself: 0, puzzles: 0 });
export const emptyCampaignTotals = (): CampaignTotals => ({ campaigns: 0, caught: 0, escaped: 0, caughtAt9: 0, hints: 0, solvedForHer: 0, solvedYourself: 0, puzzles: 0 });
