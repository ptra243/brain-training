import { content } from '../content/index.ts';
import { caseNameWords } from '../content/caseNames.ts';
import { hasPortrait } from './portrait.ts';
import { caseName, type CaseRef } from '../engine/caseRef.ts';
import { guestName } from '../engine/guestNames.ts';
import type { Case } from '../engine/types.ts';

const find = <T extends { id: string; name: string }>(list: readonly T[], id: string) =>
  list.find((x) => x.id === id)?.name ?? id;

/** What a guest is called at this dinner (`Case.guests`): a lone heir is "The Heir". */
export const suspectName = (id: string, guests: readonly string[]) => guestName(content, guests, id);
export const roomName = (id: string) => find(content.house.rooms, id);
export const itemName = (id: string) => find(content.items, id);

/** Short label for a suspect counter: "The Butler" -> "Bu". */
export function suspectInitials(id: string, guests: readonly string[]) {
  const name = suspectName(id, guests).replace(/^The /, '');
  return name.slice(0, 2);
}

/** The line that names the body, above the opening: later rounds of a campaign happen later that night. */
export function victimLine(c: Case) {
  return `${suspectName(c.victim, c.guests)} was found dead ${c.campaign && c.campaign.round > 0 ? 'later that night' : 'after dinner'}.`;
}

/** Extra class for a counter whose face is a portrait (the CSS clips it to the circle). */
export const faceClass = (id: string) => (hasPortrait(id) ? ' has-portrait' : '');

/** Counter colours, by suspect position in the content file so they stay stable across cases. */
const COUNTER_COLOURS = ['#7c3b52', '#2f5d8a', '#6b7a2e', '#8a5a2b', '#4f3f86', '#2d7468', '#9a3b2a'];
export function suspectColour(id: string) {
  const i = content.suspects.findIndex((s) => s.id === id);
  return COUNTER_COLOURS[(i < 0 ? 0 : i) % COUNTER_COLOURS.length];
}

/** Floor-plan colour for a room, from the content file. */
export const roomTint = (id: string) => content.house.rooms.find((r) => r.id === id)?.tint ?? '#ddd6c6';

/** "The Sunken Jaguar Scandal at Stonewick": the case's name, which also replays it. */
export const caseTitle = (ref: CaseRef) => caseName(ref, caseNameWords);
