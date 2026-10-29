// The pure parts of the #shelf Find a clue page: story line and page number picks (a string hash,
// never the engine Rng, so no case changes), the row list and the hide-finished counts.

import { caseOpenings } from '../content/index.ts';
import { storyLines } from '../content/storyLines.ts';
import { hashSeed, Rng } from '../engine/rng.ts';
import type { Case, Difficulty, GameKind } from '../engine/types.ts';
import { gameHints } from '../game/runRecord.ts';
import { finaleOpen, gameDone, type Progress } from '../game/state.ts';

export interface ClueRow {
  kind: GameKind;
  story: string;
  level: Difficulty | undefined;
  clues: number;
  /** The page number printed on the line, 10 to 99, distinct within a case. */
  page: number;
  done: boolean;
  /** How she finished it: on her own or with the cat's Solve; undefined while open. */
  status: 'won' | 'revealed' | undefined;
  /** Hint presses in this game (0 for games that count none). */
  hints: number;
  /** The finale before every other game is finished. */
  locked: boolean;
}

export const FIRST_PAGE = 10;
export const PAGE_COUNT = 90;

/** One story line for a game, the same every time for the same case. */
export function storyFor(ref: string, kind: GameKind): string {
  const lines = storyLines[kind];
  return lines[hashSeed(`${ref}-${kind}-story`) % lines.length];
}

/** A page number for each game: from the hash of `ref` + kind, moved on past any already taken. */
export function pageNumbers(ref: string, kinds: readonly GameKind[]): Record<string, number> {
  const taken = new Set<number>();
  const pages: Record<string, number> = {};
  for (const kind of kinds) {
    let n = hashSeed(`${ref}-${kind}-page`) % PAGE_COUNT;
    while (taken.has(n)) n = (n + 1) % PAGE_COUNT;
    taken.add(n);
    pages[kind] = FIRST_PAGE + n;
  }
  return pages;
}

/** Every game in the case as a line, in the case's order. */
export function clueRows(c: Case, progress: Progress, ref: string): ClueRow[] {
  const pages = pageNumbers(
    ref,
    c.games.map((g) => g.kind),
  );
  const open = finaleOpen(c, progress);
  return c.games.map((g) => {
    const rec = progress.games[g.kind];
    const done = gameDone(progress, g.kind);
    return {
      kind: g.kind,
      story: storyFor(ref, g.kind),
      level: g.level,
      clues: g.clues.length,
      page: pages[g.kind],
      done,
      status: done ? (rec?.status === 'revealed' ? 'revealed' : 'won') : undefined,
      hints: gameHints(g.kind, rec?.data),
      locked: g.kind === 'finale' && !open && !done,
    };
  });
}

/** What the line says under the story: clues found (and hints), or that the cat solved it. Null while open. */
export function rowStateText(row: Pick<ClueRow, 'status' | 'hints' | 'clues' | 'locked'>): string | null {
  if (row.locked) return 'Opens when every other page is done';
  if (row.status === 'revealed') return row.clues > 0 ? `The cat solved it · ${plural(row.clues, 'clue')}` : 'The cat solved it · no new clues';
  if (row.status !== 'won') return null;
  // A scene word game shares one scene clue, so a won game can have none of its own.
  const found = row.clues > 0 ? `${plural(row.clues, 'clue')} found` : 'No new clues';
  return row.hints >= 1 ? `${found} · ${plural(row.hints, 'hint')}` : found;
}

/** The button's spoken label: game, level, page and state. */
export function rowAriaLabel(row: ClueRow, gameName: string, levelName: string | undefined): string {
  const state = row.locked ? 'locked, opens when the others are done' : row.status === 'won' ? `won${row.hints >= 1 ? `, ${plural(row.hints, 'hint')}` : ''}` : row.status === 'revealed' ? 'solved by the cat' : null;
  return [gameName, levelName?.toLowerCase(), `page ${row.page}`].filter(Boolean).join(', ') + (state ? `, ${state}` : '');
}

export const finishedCount = (rows: readonly ClueRow[]) => rows.filter((r) => r.done).length;

/** The rows to show: all of them, or only those still to play. */
export const visibleRows = (rows: readonly ClueRow[], hideFinished: boolean) => (hideFinished ? rows.filter((r) => !r.done) : rows);

/** The foot button's words, or null when nothing is finished (no button). */
export function hideLabel(rows: readonly ClueRow[], hideFinished: boolean): string | null {
  const n = finishedCount(rows);
  if (n === 0) return null;
  return `${hideFinished ? 'Show' : 'Hide'} finished (${n})`;
}

const COUNT_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/** The scene-setting paragraph, the same pick as Get a clue's (its own Rng, not the case's), filled with the guests in words. */
export function openingText(c: Case): string {
  const text = new Rng(hashSeed(`${c.seed}-opening`)).pick(caseOpenings);
  const word = COUNT_WORDS[c.suspects.length] ?? String(c.suspects.length);
  return text.replace(/\{count\}/g, (_m, at: number) => {
    const starts = at === 0 || text.slice(at - 2, at) === '. ';
    return starts ? word.charAt(0).toUpperCase() + word.slice(1) : word;
  });
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Games a picked case added that she did not pick ("The cat added this one"); none for other cases. */
export function addedGames(games: readonly { kind: GameKind }[], ref: { mode: string; games?: readonly string[] } | null): GameKind[] {
  if (!ref || ref.mode !== 'play' || !ref.games) return [];
  const picked = ref.games;
  return games.map((g) => g.kind).filter((k) => !picked.includes(k));
}
