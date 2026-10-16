import { content } from '../content/index.ts';

const find = <T extends { id: string; name: string }>(list: readonly T[], id: string) =>
  list.find((x) => x.id === id)?.name ?? id;

export const suspectName = (id: string) => find(content.suspects, id);
export const roomName = (id: string) => find(content.house.rooms, id);
export const itemName = (id: string) => find(content.items, id);

/** Short label for a suspect counter: "The Butler" -> "Bu". */
export function suspectInitials(id: string) {
  const name = suspectName(id).replace(/^The /, '');
  return name.slice(0, 2);
}

/** Counter colours, by suspect position in the content file so they stay stable across cases. */
const COUNTER_COLOURS = ['#7c3b52', '#2f5d8a', '#6b7a2e', '#8a5a2b', '#4f3f86', '#2d7468'];
export function suspectColour(id: string) {
  const i = content.suspects.findIndex((s) => s.id === id);
  return COUNTER_COLOURS[(i < 0 ? 0 : i) % COUNTER_COLOURS.length];
}
