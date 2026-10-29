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

/** Which of Grid and Jigsaw a case's notebook shows. */
export type Finish = 'grid' | 'jigsaw' | 'both';

/**
 * Which finish tabs this case's notebook shows; one place to change the rule, like the classic Casebook.
 * A Play case (scene given) shows both. A Quick start case shows Jigsaw in place of Grid when it chose the
 * Jigsaw finish, else Grid only. `sampleEndBoard` is the dev previews' stand-in for a ref.
 */
export function finishFor(c: Case, ref: CaseRef | null, sampleEndBoard?: boolean): Finish {
  if (c.sceneGiven) return 'both';
  const jigsaw = ref ? ref.mode === 'quick' && !!ref.endBoard : !!sampleEndBoard;
  return jigsaw ? 'jigsaw' : 'grid';
}

/**
 * The notebook's tabs for a case: Clues, Grid and/or Jigsaw, Guests. No You tab in Quick cases (`YouTab`
 * and the 'you' id stay for the campaign).
 */
export function tabsFor(finish: Finish): readonly { id: NotebookTab; label: string }[] {
  const [, clues, grid, guests] = NOTEBOOK_TABS;
  if (finish === 'both') return [clues, grid, JIGSAW_TAB, guests];
  return [clues, finish === 'jigsaw' ? JIGSAW_TAB : grid, guests];
}

/**
 * A saved or requested tab as this case has it: You opens Clues; Grid in a Jigsaw case opens Jigsaw, and
 * the other way round; with both finishes each opens as itself.
 */
export function tabForCase(tab: NotebookTab, finish: Finish): NotebookTab {
  if (tab === 'you') return DEFAULT_TAB;
  if (tab === 'grid' && finish === 'jigsaw') return 'jigsaw';
  if (tab === 'jigsaw' && finish === 'grid') return 'grid';
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

/** What the Accuse button on a guest's page does: the words on it, and what goes in the Answer form. */
export interface AccuseRequest {
  suspect: string;
  /** The weapon she has given this guest, if any. */
  item?: string;
  /** With a weapon given it is handed in at once; without, the Answer page opens for her to pick one. */
  submit: boolean;
}

/** A guest's page offers an Accuse button until the case is solved; weapons and rooms never do. */
export function accuseRequest(c: Case, p: Progress, s: Subject): AccuseRequest | null {
  if (s.kind !== 'suspect' || p.solved) return null;
  const item = c.items.find((i) => holderOf(c, p, i) === s.id);
  return item ? { suspect: s.id, item, submit: true } : { suspect: s.id, submit: false };
}

/** The Accuse button's label: "Accuse the Heir with the rope", or "Accuse them…" when no weapon is given. */
export function accuseLabel(c: Case, req: AccuseRequest): string {
  if (!req.item) return 'Accuse them…';
  return `Accuse ${suspectName(req.suspect, c.guests).replace(/^The /, 'the ')} with the ${itemName(req.item)}`;
}

/** The action the Answer page's own button sends for a request that submits. */
export function accuseAction(req: AccuseRequest): Action | null {
  return req.submit && req.item ? { type: 'accuse', suspect: req.suspect, item: req.item } : null;
}
