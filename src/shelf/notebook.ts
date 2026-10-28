// The notebook's pure parts: the peek line, the tab it reopens on, and what a subject page says.
// Plain TS so it is tested without React.

import type { Case, Clue } from '../engine/types.ts';
import { itemName, roomName, suspectName } from '../game/names.ts';
import { holderOf, itemRoom, mentions, placedRoom, visibleClues, type Progress, type Subject } from '../game/state.ts';

export type NotebookTab = 'you' | 'clues' | 'grid' | 'guests';
export const NOTEBOOK_TABS: readonly { id: NotebookTab; label: string }[] = [
  { id: 'you', label: 'You' },
  { id: 'clues', label: 'Clues' },
  { id: 'grid', label: 'Grid' },
  { id: 'guests', label: 'Guests' },
];
export const DEFAULT_TAB: NotebookTab = 'clues';

/** A saved tab name, or the default when it is missing or not one of ours. */
export function parseTab(raw: unknown): NotebookTab {
  return NOTEBOOK_TABS.find((t) => t.id === raw)?.id ?? DEFAULT_TAB;
}

/** The one line on the closed notebook: how many found clues she has not ticked as used. */
export function peekLine(c: Case, p: Progress): string {
  const found = visibleClues(c, p);
  if (found.length === 0) return 'Notebook · no clues yet';
  const left = found.filter((clue) => !p.used.includes(clue.id)).length;
  // Short enough for one line at 360px ("clues to use" wrapped).
  return left === 0 ? 'Notebook · all clues used' : `Notebook · ${left} of ${found.length} to use`;
}

/** The clues she has found that name this person, room or weapon, in casebook order. */
export function subjectClues(c: Case, p: Progress, s: Subject): Clue[] {
  return visibleClues(c, p).filter((clue) => mentions(clue, s));
}

/** The name on a subject page: a guest as the dinner calls them, a weapon with "The". */
export function subjectTitle(c: Case, s: Subject): string {
  if (s.kind === 'suspect') return suspectName(s.id, c.guests);
  if (s.kind === 'item') return `The ${itemName(s.id)}`;
  return `The ${roomName(s.id)}`;
}

/** Where she has put a guest or weapon on her map and grid. */
export function placementLine(c: Case, p: Progress, s: Subject): string {
  if (s.kind === 'suspect') {
    const room = placedRoom(c, p, s.id);
    return room ? `You've placed them in the ${roomName(room)}` : 'Not placed yet';
  }
  if (s.kind === 'item') {
    const holder = holderOf(c, p, s.id);
    if (holder) return `You've given it to ${suspectName(holder, c.guests).replace(/^The /, 'the ')}`;
    const room = itemRoom(c, p, s.id);
    return room ? `You've put it in the ${roomName(room)}` : 'Not placed yet';
  }
  return '';
}
