import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PICK_MAX, PICK_ORDER, playLevels, type PickedGame } from '../engine/caseRef.ts';
import { Rng } from '../engine/rng.ts';
import { CAP_NOTE, CODES_PER_HAND, NEW_HANDS, buildPick, caseLine, dealHand, firstHand, liftedText, newCode, stickText, toggleSticker } from './tin.ts';

const rand = () => {
  const r = new Rng(7);
  return () => r.int(1_000_000) / 1_000_000;
};

test('a dealt hand has 3 to 5 games, in order, and every game turns up', () => {
  const r = rand();
  const seen = new Set<PickedGame>();
  for (let i = 0; i < 300; i++) {
    const hand = dealHand(r);
    assert.ok(hand.length >= 3 && hand.length <= 5);
    assert.deepEqual(hand, PICK_ORDER.filter((g) => hand.includes(g)));
    hand.forEach((g) => seen.add(g));
  }
  assert.equal(seen.size, PICK_ORDER.length);
});

test('lifting adds a game in order, pressing down removes it, an eighth tap says the cap', () => {
  let state = { lifted: ['sudoku'] as PickedGame[], note: '' };
  state = toggleSticker(state.lifted, 'wordle');
  assert.deepEqual(state.lifted, ['wordle', 'sudoku']);
  state = toggleSticker(state.lifted, 'wordle');
  assert.deepEqual(state.lifted, ['sudoku']);
  const full = PICK_ORDER.slice(0, PICK_MAX);
  const capped = toggleSticker(full, PICK_ORDER[PICK_MAX]);
  assert.deepEqual(capped.lifted, full);
  assert.equal(capped.note, "That's 7. Press one down to swap.");
  assert.equal(CAP_NOTE, capped.note);
  // pressing one down while full still works and clears the note
  assert.equal(toggleSticker(full, full[0]).lifted.length, PICK_MAX - 1);
});

test('the lines under the tin', () => {
  assert.equal(liftedText(4), '4 of 7 lifted');
  assert.equal(stickText(2), 'Lift 1 more');
  assert.equal(stickText(0), 'Lift 3 more');
  assert.equal(stickText(3), 'Stick them in');
  assert.match(caseLine({ ...playLevels('K7QF2'), logic: 'medium', suspects: 5 }), /^Logic ★★☆ · 5 guests$/);
});

test('the first hand is her saved picks, or a dealt one when there are fewer than 3', () => {
  assert.deepEqual(firstHand(['sudoku', 'wordle', 'cats'], rand()), ['wordle', 'cats', 'sudoku']);
  const dealt = firstHand(['wordle'], rand());
  assert.ok(dealt.length >= 3 && dealt.length <= 5);
});

test('new codes have five characters', () => {
  assert.match(newCode(rand()), /^[0-9A-Z]{5}$/);
});

test('a build that works the first time keeps her code and games', async () => {
  const calls: string[] = [];
  const out = await buildPick({ code: 'K7QF2', games: ['cats', 'wordle', 'sudoku'] }, async (code, games) => (calls.push(code), games.length), rand());
  assert.ok(out.ok);
  assert.equal(out.code, 'K7QF2');
  assert.deepEqual(out.games, ['wordle', 'cats', 'sudoku']);
  assert.equal(out.swapped, false);
  assert.equal(calls.length, 1);
});

test('a failing code is rerolled with the same games, quietly', async () => {
  const seen: { code: string; games: PickedGame[] }[] = [];
  const out = await buildPick(
    { code: 'K7QF2', games: ['wordle', 'cats', 'sudoku'] },
    async (code, games) => {
      seen.push({ code, games });
      if (seen.length < 4) throw new Error('no');
      return 'ok';
    },
    rand(),
  );
  assert.ok(out.ok);
  assert.equal(out.swapped, false);
  assert.equal(seen.length, 4);
  assert.ok(seen.every((s) => s.games.join() === 'wordle,cats,sudoku'));
  assert.equal(new Set(seen.map((s) => s.code)).size, 4);
  assert.equal(out.code, seen[3].code);
});

test('after 5 failed codes a new hand is dealt and the case is marked swapped', async () => {
  const seen: PickedGame[][] = [];
  const out = await buildPick(
    { code: 'K7QF2', games: ['wordle', 'cats', 'sudoku'] },
    async (_code, games) => {
      seen.push(games);
      if (seen.length <= CODES_PER_HAND) throw new Error('no');
      return 'ok';
    },
    rand(),
  );
  assert.ok(out.ok);
  assert.equal(out.swapped, true);
  assert.equal(seen.length, CODES_PER_HAND + 1);
  assert.deepEqual(out.games, seen[CODES_PER_HAND]);
  assert.ok(out.games.length >= 3 && out.games.length <= 5);
});

test('after 10 new hands also fail it gives up', async () => {
  let calls = 0;
  const out = await buildPick(
    { code: 'K7QF2', games: ['wordle', 'cats', 'sudoku'] },
    async () => {
      calls++;
      throw new Error('no');
    },
    rand(),
  );
  assert.equal(out.ok, false);
  assert.equal(calls, CODES_PER_HAND * (NEW_HANDS + 1));
});
