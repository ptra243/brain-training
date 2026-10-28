// The notebook's pure parts: the peek line, the tab it reopens on, and what a subject page says.
// Plain TS so it is tested without React.

import type { CaseRef } from '../engine/caseRef.ts';
import type { Case, Clue } from '../engine/types.ts';
import { itemName, roomName, suspectName } from '../game/names.ts';
import { holderOf, itemRoom, mentions, placedRoom, visibleClues, type Action, type Progress, type Subject } from '../game/state.ts';

export type NotebookTab = 'you' | 'clues' | 'grid' | 'jigsaw' | 'guests';
export const NOTEBOOK_TABS: readonly { id: NotebookTab; label: string }[] = [
  { id: 'you', label: 'You' },
  { id: 'clues', label: 'Clues' },
  { id: 'grid', label: 'Grid' },
  { id: 'guests', label: 'Guests' },
];
export const DEFAULT_TAB: NotebookTab = 'clues';
const JIGSAW_TAB = { id: 'jigsaw', label: 'Jigsaw' } as const;

/** A saved tab name, or the default when it is missing or not one of ours. */
export function parseTab(raw: unknown): NotebookTab {
  return raw === 'jigsaw' ? 'jigsaw' : (NOTEBOOK_TABS.find((t) => t.id === raw)?.id ?? DEFAULT_TAB);
}

/**
 * Does this case's notebook show Jigsaw (the end board) where it would show Grid? One place to change
 * the rule. Only a Quick start case that chose the Jigsaw finish: Play cases keep Grid and no Jigsaw
 * (the classic Casebook shows both there; the owner wants never both on the shelf). `sampleEndBoard` is
 * the dev previews' stand-in for a ref.
 */
export function hasJigsaw(c: Case, ref: CaseRef | null, sampleEndBoard?: boolean): boolean {
  if (c.sceneGiven) return false;
  return ref ? ref.mode === 'quick' && !!ref.endBoard : !!sampleEndBoard;
}

/** The notebook's tabs for a case: Grid, or Jigsaw in its place, never both. */
export function tabsFor(jigsaw: boolean): readonly { id: NotebookTab; label: string }[] {
  return NOTEBOOK_TABS.map((t) => (t.id === 'grid' && jigsaw ? JIGSAW_TAB : t));
}

/** A saved or requested tab as this case has it: Grid in a Jigsaw case opens Jigsaw, and the other way round. */
export function tabForCase(tab: NotebookTab, jigsaw: boolean): NotebookTab {
  if (tab === 'grid' && jigsaw) return 'jigsaw';
  if (tab === 'jigsaw' && !jigsaw) return 'grid';
  return tab;
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

/** How far the notebook is raised: the strip, half the screen (over a map tap), or nearly all of it. */
export type Height = 'peek' | 'half' | 'full';

/** A tap on a counter or weapon: from the strip it rises to half; if already up it stays where it is. */
export function afterMapTap(h: Height): Height {
  return h === 'peek' ? 'half' : h;
}

/** A swipe on the strip or handle: up goes to full height, down tucks it to the strip. */
export function afterSwipe(dir: 'up' | 'down'): Height {
  return dir === 'up' ? 'full' : 'peek';
}

/** The counter or weapon to ring on the map: the subject page that is showing, while the notebook is up. */
export function ringedSubject(h: Height, page: Subject | null): Subject | null {
  return h !== 'peek' && page && page.kind !== 'room' ? page : null;
}

/** The rooms a guest or weapon can be put in: the case's rooms, in the order they are printed. */
export function placeRooms(c: Case): readonly string[] {
  return c.rooms;
}

/** What choosing a room on a subject page does: the same move as dragging onto that room. */
export function placeAction(s: Subject, room: string): Action | null {
  if (s.kind === 'suspect') return { type: 'place', suspect: s.id, room };
  if (s.kind === 'item') return { type: 'place-item', item: s.id, room };
  return null;
}
