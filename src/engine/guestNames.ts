// What a guest is called at a given dinner. A guest with a kin-mate (the two heirs) is
// "The Elder heir" when both are present and "The Heir" when no other present guest shares
// their `kin`. "Present" is `Case.guests`: the seated guests plus the victim, so an absent
// kin-mate still counts when they are the victim. Never depends on the killer.

import type { Content } from './types.ts';

export function guestName(content: Content, guests: readonly string[], id: string): string {
  const me = content.suspects.find((s) => s.id === id);
  if (!me) return id;
  if (!me.alone) return me.name;
  const kin = me.alone.kin;
  const mate = content.suspects.some((s) => s.id !== id && guests.includes(s.id) && s.alone?.kin === kin);
  return mate ? me.name : me.alone.name;
}

/** Every guest's name at this dinner, by id. */
export function guestNames(content: Content, guests: readonly string[]): Record<string, string> {
  return Object.fromEntries(content.suspects.map((s) => [s.id, guestName(content, guests, s.id)]));
}

/** The same content with each guest's `name` set for this dinner, for code that reads `content.suspects`. */
export function guestContent(content: Content, guests: readonly string[]): Content {
  return { ...content, suspects: content.suspects.map((s) => ({ ...s, name: guestName(content, guests, s.id) })) };
}
