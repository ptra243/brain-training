import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { PICK_ORDER, caseCode, caseFor, caseName, newPickCase, parseCase, parseCaseCode, playLevels, type PickedGame, type PlayRef } from './caseRef.ts';
import { caseNameWords } from '../content/caseNames.ts';
import { gameLevel } from './settings.ts';

const ref = (code: string, games: PickedGame[]): PlayRef => ({ mode: 'play', code, games });

test('a picked case code round-trips, forgiving case, spaces and order', () => {
  const r = ref('K7QF2', ['wordle', 'crossword', 'cats']);
  assert.equal(caseCode(r), 'K7QF2+WCK');
  for (const typed of ['K7QF2+WCK', 'k7qf2+wck', ' K7QF2 + K C W ', 'K7QF2+KWC']) assert.deepEqual(parseCaseCode(typed), r, typed);
  assert.equal(caseCode(ref('K7QF2', [...PICK_ORDER])), 'K7QF2+WCFKSIBTN');
  for (const bad of ['K7QF2+WC', 'K7QF2+WCC', 'K7QF2+WCX', 'K7QF2+', 'K7QF2+wc1', 'K7QO2+WCK', 'K7QF2WCK', 'K7QF2-WCK']) assert.equal(parseCaseCode(bad), null, bad);
  // Never confused with a Quick start code or a plain Play code.
  assert.deepEqual(parseCaseCode('K7QF2-MNB'), { mode: 'quick', code: 'K7QF2', difficulty: 'medium', length: 'normal', cast: 'big' });
  assert.deepEqual(parseCaseCode('K7QF2'), { mode: 'play', code: 'K7QF2' });
});

test('a picked ref has a name, and names read back as plain Play refs', () => {
  const r = ref('K7QF2', ['wordle', 'crossword', 'cats']);
  const name = caseName(r, caseNameWords);
  assert.equal(name, caseName({ mode: 'play', code: 'K7QF2' }, caseNameWords));
  assert.deepEqual(parseCase(name, caseNameWords), { mode: 'play', code: 'K7QF2' });
});

test('same picked ref, same case; her games are in it at the levels the code rolled', () => {
  const r = ref('K7QF2', ['sudoku', 'board', 'tarot', 'wordle']);
  const a = caseFor(content, r);
  assert.deepEqual(a, caseFor(content, r));
  assert.deepEqual(a, newPickCase(content, 'K7QF2', ['tarot', 'wordle', 'board', 'sudoku']).c);
  const levels = playLevels('K7QF2');
  for (const g of r.games!) {
    const spec = a.games.find((x) => x.kind === g);
    assert.ok(spec, g);
    if (spec.kind !== 'wordle') assert.equal((spec as { level?: string }).level, gameLevel(levels, g), g);
  }
  assert.equal(a.levels.logic, levels.logic);
  assert.equal(a.levels.suspects, levels.suspects);
});

test('a picked case does not change a plain Play case', () => {
  const plain = caseFor(content, { mode: 'play', code: 'K7QF2' });
  assert.deepEqual(plain, caseFor(content, { mode: 'play', code: 'K7QF2' }));
  assert.notEqual(plain.seed, caseFor(content, ref('K7QF2', ['wordle', 'cats', 'sudoku'])).seed);
});

test('every combination of three or more games builds, with every picked game in it', () => {
  const codes = ['K7QF2', 'B3M9X', 'Z4HRT'];
  let combos = 0;
  for (let m = 1; m < 1 << PICK_ORDER.length; m++) {
    const games = PICK_ORDER.filter((_, i) => m & (1 << i));
    if (games.length < 3) continue;
    // One code for every combination, three for the ones that stress tarot, the board and everything at once.
    const stress = games.length === PICK_ORDER.length || (games.length === 3 && games.includes('tarot') && games.includes('board'));
    const some = stress ? codes : [codes[combos % codes.length]];
    combos++;
    for (const code of some) {
      const c = caseFor(content, ref(code, games));
      for (const g of games) assert.ok(c.games.some((x) => x.kind === g), `${code}+${games.join(',')} lacks ${g}`);
      for (const g of c.games) if (g.kind !== 'finale') assert.ok(g.clues.length >= 1 && g.clues.length <= 7, `${g.kind} has ${g.clues.length} clues`);
    }
  }
  assert.equal(combos, 466);
});
