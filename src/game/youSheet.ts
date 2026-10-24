// The lines on the "You" sheet: tonight at a glance. Plain TS so it can be tested.

import type { Case } from '../engine/types.ts';
import { clockLine, gamesLeft, whereAmI } from './explore.ts';
import { roomName } from './names.ts';
import { visibleClues, type Progress } from './state.ts';

/** Short sentences about where the evening stands. `picksLeft` is undefined when there is no gate; it is left out when the clock already says the same. */
export function youLines(c: Case, p: Progress, picksLeft?: number): string[] {
  const lines = [clockLine(c, p), `You are in the ${roomName(whereAmI(c, p))}`, `${visibleClues(c, p).length} of ${c.clues.length} clues found`];
  if (picksLeft !== undefined && picksLeft !== gamesLeft(c, p)) lines.push(`${picksLeft} game${picksLeft === 1 ? '' : 's'} left tonight`);
  return lines;
}
