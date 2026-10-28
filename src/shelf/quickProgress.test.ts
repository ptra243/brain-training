import assert from 'node:assert/strict';
import { test } from 'node:test';
import { content } from '../content/index.ts';
import { newPlayCase } from '../engine/caseRef.ts';
import { emptyProgress } from '../game/state.ts';
import type { QuickSave } from '../game/storage.ts';
import { advance, startNewQuick } from './quickProgress.ts';

const { ref, c } = newPlayCase(content, () => 0.5);
const kind = c.games[0].kind;

test('an action is reduced and written with her ref and history id', () => {
  const writes: QuickSave[] = [];
  const next = advance(c, emptyProgress(), { type: 'game-finish', kind, status: 'revealed', data: null }, { ref, historyId: 'h1' }, (q) => writes.push(q));
  assert.equal(next.games[kind]?.status, 'revealed');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].ref, ref);
  assert.equal(writes[0].historyId, 'h1');
  assert.equal(writes[0].progress, next);
});

test('with no save key (the dev preview) nothing is written', () => {
  let wrote = 0;
  const next = advance(c, emptyProgress(), { type: 'game-save', kind, data: { x: 1 } }, null, () => wrote++);
  assert.equal(next.games[kind]?.status, 'playing');
  assert.equal(wrote, 0);
});

test('a new Quick save has her ref, no moves and no history id', () => {
  const save = startNewQuick({ ref });
  assert.equal(save.ref, ref);
  assert.deepEqual(save.progress, emptyProgress());
  assert.equal(save.historyId, undefined);
});
