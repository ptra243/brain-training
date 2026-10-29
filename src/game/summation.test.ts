import assert from 'node:assert/strict';
import { test } from 'node:test';
import { citeFor, fullSteps, nightSteps, shortStep, type SumClue, type SumInput } from './summation.ts';

// Seven guests in five rooms; "d" is the killer, "f" and "g" hold nothing.
const guests = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
const solution = {
  room: ['r1', 'r1', 'r2', 'r3', 'r4', 'r5', 'r5'],
  item: ['i1', 'i2', 'i3', 'i4', 'i5', null, null],
};

const clue = (id: string, fact: SumClue['fact']): SumClue => ({ id, text: `text ${id}`, fact });

const input = (clues: SumClue[], found: string[], over: Partial<SumInput> = {}): SumInput => ({ guests, killer: 'd', solution, clues, found, ...over });

test('the killer is last and every guest has a step', () => {
  const steps = fullSteps(input([], []));
  assert.equal(steps.length, 7);
  assert.deepEqual(steps.map((s) => s.guest), ['a', 'b', 'c', 'e', 'f', 'g', 'd']);
  assert.deepEqual(steps.map((s) => s.n), [1, 2, 3, 4, 5, 6, 7]);
  assert.ok(steps.every((s) => s.of === 7 && s.earlier === null));
  assert.equal(steps[6].room, 'r3');
  assert.equal(steps[6].item, 'i4');
});

test('four guests give four steps by the same rule', () => {
  const steps = fullSteps({ guests: ['a', 'b', 'c', 'd'], killer: 'a', solution: { room: ['x', 'y', 'z', 'w'], item: ['1', '2', '3', '4'] }, clues: [], found: [] });
  assert.deepEqual(steps.map((s) => s.guest), ['b', 'c', 'd', 'a']);
});

test('placed grows one guest at a time in arrival order', () => {
  const steps = fullSteps(input([], []));
  assert.deepEqual(steps[2].placed, [
    { guest: 'a', room: 'r1' },
    { guest: 'b', room: 'r1' },
    { guest: 'c', room: 'r2' },
  ]);
});

test('an empty-handed guest has a null item', () => {
  const f = fullSteps(input([], [])).find((s) => s.guest === 'f')!;
  assert.equal(f.item, null);
  assert.equal(f.room, 'r5');
});

test('a room clue beats a later item clue', () => {
  const clues = [clue('c1', { type: 'suspect-item', suspect: 'a', item: 'i1' }), clue('c2', { type: 'suspect-room', suspect: 'a', room: 'r1' })];
  assert.equal(citeFor(input(clues, ['c1', 'c2']), 'a'), 'text c2');
});

test('same rank: the earliest clue wins', () => {
  const clues = [clue('c1', { type: 'suspect-room', suspect: 'a', room: 'r1' }), clue('c2', { type: 'suspect-room', suspect: 'a', room: 'r1' })];
  assert.equal(citeFor(input(clues, ['c2', 'c1']), 'a'), 'text c1');
});

test('lower ranks: item, empty-handed, item-room, together', () => {
  assert.equal(citeFor(input([clue('c1', { type: 'item-room', item: 'i2', room: 'r1' }), clue('c2', { type: 'suspect-item', suspect: 'b', item: 'i2' })], ['c1', 'c2']), 'b'), 'text c2');
  assert.equal(citeFor(input([clue('c1', { type: 'suspect-empty-handed', suspect: 'f' })], ['c1']), 'f'), 'text c1');
  assert.equal(citeFor(input([clue('c1', { type: 'suspect-empty-handed', suspect: 'a' })], ['c1']), 'a'), null);
  assert.equal(citeFor(input([clue('c1', { type: 'item-room', item: 'i3', room: 'r2' })], ['c1']), 'c'), 'text c1');
  assert.equal(citeFor(input([clue('c1', { type: 'item-room', item: 'i3', room: 'r9' })], ['c1']), 'c'), null);
  assert.equal(citeFor(input([clue('c1', { type: 'suspects-together', suspects: ['a', 'b'] })], ['c1']), 'b'), 'text c1');
  assert.equal(citeFor(input([clue('c1', { type: 'suspects-together', suspects: ['a', 'c'] })], ['c1']), 'a'), null);
});

test('a negative clue is not cited', () => {
  const clues = [clue('c1', { type: 'suspect-not-room', suspect: 'a', room: 'r2' }), clue('c2', { type: 'suspect-not-item', suspect: 'a', item: 'i3' })];
  assert.equal(citeFor(input(clues, ['c1', 'c2']), 'a'), null);
});

test('a clue she had not unlocked is not cited', () => {
  const clues = [clue('c1', { type: 'suspect-room', suspect: 'a', room: 'r1' })];
  assert.equal(citeFor(input(clues, []), 'a'), null);
  const step = fullSteps(input(clues, [])).find((s) => s.guest === 'a')!;
  assert.equal(step.clueText, null);
});

test('a clue naming another room is not cited', () => {
  const clues = [clue('c1', { type: 'suspect-room', suspect: 'a', room: 'r2' })];
  assert.equal(citeFor(input(clues, ['c1']), 'a'), null);
});

test('a campaign night: two short steps, then the full replay of the last round', () => {
  const earlier = [
    { input: input([], []), accused: 'b', time: '9pm' },
    { input: input([], []), accused: 'c', time: 'Midnight' },
  ];
  const steps = nightSteps(earlier, input([], []));
  assert.equal(steps.length, 2 + 7);
  assert.deepEqual(steps.slice(0, 2).map((s) => [s.round, s.guest, s.earlier?.time]), [[0, 'b', '9pm'], [1, 'c', 'Midnight']]);
  assert.ok(steps.slice(2).every((s) => s.round === 2 && s.earlier === null && s.of === 7));
  assert.equal(steps.at(-1)!.guest, 'd');
});

test('a short step is the accused alone, with their cite', () => {
  const clues = [clue('c1', { type: 'suspect-room', suspect: 'b', room: 'r1' })];
  const s = shortStep(input(clues, ['c1']), 'b', '9pm', 0);
  assert.equal(s.guest, 'b');
  assert.deepEqual(s.placed, [{ guest: 'b', room: 'r1' }]);
  assert.deepEqual(s.earlier, { time: '9pm', wrongWeapon: false });
  assert.equal(s.clueText, 'text c1');
});

test('a wrong-weapon short step names the killer with the real weapon', () => {
  const s = shortStep(input([], []), 'd', '3am', 2);
  assert.deepEqual(s.earlier, { time: '3am', wrongWeapon: true });
  assert.equal(s.item, 'i4');
  assert.equal(s.room, 'r3');
});
