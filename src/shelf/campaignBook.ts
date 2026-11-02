// Pure parts of the #shelf campaign book: its chapter titles and the Room page's line.
import { ROUNDS } from '../engine/campaign.ts';
import { ROUND_TIMES } from '../game/labels.ts';

const NUMBERS = ['one', 'two', 'three'];

/** "Chapter one: 9pm" for round index 0, "Chapter two: Midnight", "Chapter three: 3am". Clamped to the rounds there are. */
export function chapterTitle(round: number): string {
  const i = Math.min(Math.max(round, 0), ROUNDS - 1);
  return `Chapter ${NUMBERS[i]}: ${ROUND_TIMES[i]}`;
}

/** The Room page's line, given the room's name. */
export const roomLine = (room: string): string => `You are in the ${room}.`;
