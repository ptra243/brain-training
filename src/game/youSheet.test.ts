import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { generateCase } from '../engine/generate.ts';
import { clockLine, whereAmI } from './explore.ts';
import { roomName } from './names.ts';
import { emptyProgress } from './state.ts';
import { youLines } from './youSheet.ts';

const c = { ...generateCase(content, 3, 'medium'), explore: true as const, campaign: { round: 0, rounds: 3, budget: 2, last: false, victims: [] } };

test('you lines: clock, room, clues, and picks only with a gate that differs from the clock', () => {
  const p = emptyProgress();
  const lines = youLines(c, p);
  assert.equal(lines.length, 3);
  assert.equal(lines[0], clockLine(c, p));
  assert.equal(lines[1], `You are in the ${roomName(whereAmI(c, p))}`);
  assert.match(lines[2], new RegExp(`^\\d+ of ${c.clues.length} clues found$`));
  assert.equal(youLines(c, p, 2).length, 3, 'the clock already says 2 games left');
  assert.equal(youLines(c, p, 1)[3], '1 game left tonight');
  assert.equal(youLines(c, p, 0)[3], '0 games left tonight');
});

test('you lines: the room follows where she walked', () => {
  const room = c.rooms.find((r) => r !== whereAmI(c, emptyProgress()))!;
  const lines = youLines(c, { ...emptyProgress(), at: room });
  assert.equal(lines[1], `You are in the ${roomName(room)}`);
});
