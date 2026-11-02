// The Grid tab's pull-up sheet (Clues and House): its strip text and which clues it shows. Plain TS.
import type { Case, Clue } from '../engine/types.ts';
import { itemName, roomName, suspectName } from '../game/names.ts';
import { mentions, visibleClues, type Progress, type Subject } from '../game/state.ts';

export type SheetFace = 'clues' | 'house';

/** How the sheet calls a person, room or weapon: "Mrs White", "the Library", "the Rope". */
export function sheetSubjectName(c: Case, s: Subject): string {
  if (s.kind === 'suspect') return suspectName(s.id, c.guests);
  return s.kind === 'room' ? `the ${roomName(s.id)}` : `the ${itemName(s.id)}`;
}

/** The clues the sheet lists: everything she has found, or only those naming `focus`. */
export function sheetClues(c: Case, p: Progress, focus: Subject | null): Clue[] {
  const found = visibleClues(c, p);
  return focus ? found.filter((clue) => mentions(clue, focus)) : found;
}

/** The strip's left button: "Clues · 3 of 5 to use", "Clues · None found yet", "Clues · 2 about the Rope". */
export function sheetStrip(c: Case, p: Progress, focus: Subject | null): string {
  const found = visibleClues(c, p);
  if (focus) return `Clues · ${sheetClues(c, p, focus).length} about ${sheetSubjectName(c, focus)}`;
  if (found.length === 0) return 'Clues · None found yet';
  return `Clues · ${found.filter((clue) => !p.used.includes(clue.id)).length} of ${found.length} to use`;
}

export const sameSubject = (a: Subject | null, b: Subject | null) => !!a && !!b && a.kind === b.kind && a.id === b.id;
