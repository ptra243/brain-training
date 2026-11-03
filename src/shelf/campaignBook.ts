// Pure parts of the #shelf campaign book: its chapter titles and the Room page's line.
import { ROUNDS } from '../engine/campaign.ts';
import type { Case, GameKind } from '../engine/types.ts';
import { canOpen, clockAfterNext, type RoomObject } from '../game/explore.ts';
import { ROUND_TIMES } from '../game/labels.ts';
import type { Progress } from '../game/state.ts';
import { clueRows, plural, rowAriaLabel, rowStateText, type ClueRow } from './findAClue.ts';

const NUMBERS = ['one', 'two', 'three'];

/** "Chapter one: 9pm" for round index 0, "Chapter two: Midnight", "Chapter three: 3am". Clamped to the rounds there are. */
export function chapterTitle(round: number): string {
  const i = Math.min(Math.max(round, 0), ROUNDS - 1);
  return `Chapter ${NUMBERS[i]}: ${ROUND_TIMES[i]}`;
}

/** The Room page's line, given the room's name. */
export const roomLine = (room: string): string => `You are in the ${room}.`;

/** Midnight and 3am (round index 1 on) use the midnight-green palette; 9pm stays honey oak. */
export const isNightChapter = (round: number): boolean => round >= 1;

/** Accusations she still has: one candle each, from `ROUNDS` less the victims so far. */
export const accusationsLeft = (victims: number): number => Math.max(0, ROUNDS - victims);

/** The candles' spoken label: "2 accusations left". */
export function candleLabel(left: number): string {
  if (left <= 0) return 'No accusations left';
  return `${left} accusation${left === 1 ? '' : 's'} left`;
}

/** The rooms she can walk to from here (the ones in play), in the case's order. */
export const walkTargets = (c: Case, here: string): string[] => c.rooms.filter((r) => r !== here);

/** One object in the room as a row: the page-3 row, its label, and what the line under it says. */
export interface RoomRow {
  kind: GameKind;
  /** "The inkwell". */
  label: string;
  row: ClueRow;
  /** She can tap it: still open to play, or finished (to read its clues again). */
  enabled: boolean;
  /** Under the label: the finished text, "N clues · until 10:20", or why it can't be opened. */
  line: string;
}

export const NO_PUZZLES_LEFT = 'No puzzles left tonight';

/** The room's objects as rows. `ref` only seeds page numbers and tilts. */
export function roomRows(c: Case, p: Progress, ref: string, objects: readonly RoomObject[], picked: readonly GameKind[], left: number): RoomRow[] {
  const rows = clueRows(c, p, ref);
  const out: RoomRow[] = [];
  for (const o of objects) {
    const row = rows.find((r) => r.kind === o.kind);
    if (!row) continue;
    const open = canOpen(c, p, o.kind, picked, left);
    const line = row.done ? (rowStateText(row) ?? '') : open ? `${plural(row.clues, 'clue')} · until ${clockAfterNext(c, p)}` : NO_PUZZLES_LEFT;
    out.push({ kind: o.kind, label: o.label, row, enabled: row.done || open, line });
  }
  return out;
}

/** The row's spoken label: the object, the game, its level and how it stands. */
export function roomRowAria(r: RoomRow, gameName: string, levelName: string | undefined): string {
  return `${r.label}. ${rowAriaLabel(r.row, gameName, levelName)}${r.row.done || r.enabled ? '' : `, ${r.line.toLowerCase()}`}`;
}
