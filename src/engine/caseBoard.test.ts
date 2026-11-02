import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { houseById } from '../content/houses.ts';
import { pinnedIds } from '../game/board/boardSave.ts';
import { buildBoard, countPackings } from './board.ts';
import { MAX_FILLER, MAX_GROUP, MIN_TO_PLACE, boardLevel, boardPuzzle, boardPuzzlePlan, fillerGroups, piecesToPlace } from './caseBoard.ts';
import { UNKNOWN } from './boardTypes.ts';
import { caseFor } from './caseRef.ts';
import type { Case, Difficulty } from './types.ts';

const LEVELS: Difficulty[] = ['easy', 'medium', 'hard'];
const withHouse = (c: Case) => ({ ...content, house: houseById(c.houseId!) });

// The picked case from .claude/handoff/board-difficulty.md: its board had two real pieces.
const bkvns = () => caseFor(content, { mode: 'play', code: 'BKVNS', games: ['wordsearch', 'cats', 'sudoku', 'interrogation', 'board', 'tarot'] } as never);

test('filler splits into groups of 2 or more, none over the level max, two groups from 4', () => {
  for (const level of LEVELS) {
    for (let n = 2; n <= MAX_FILLER; n++) {
      const g = fillerGroups(n, MAX_GROUP[level]);
      assert.equal(g.reduce((a, b) => a + b, 0), n);
      assert.ok(g.every((x) => x >= 2 && x <= MAX_GROUP[level]), `${level} ${n}: ${g}`);
      if (n >= 4) assert.ok(g.length >= 2);
    }
  }
});

test('a thin board is padded with grouped Noticed pieces: one room or Unknown', () => {
  const c = bkvns();
  const g = c.games.find((x) => x.kind === 'board')!;
  assert.equal(boardLevel(c.levels), g.level);
  for (const level of LEVELS) {
    const b = boardPuzzle(withHouse(c), c, g, level)!;
    const loose = b.pieces.filter((p) => p.loose);
    assert.ok(loose.length >= 2 && loose.length <= MAX_FILLER, level);
    const groups = new Map<string, typeof loose>();
    for (const p of loose) {
      assert.equal(p.kind, 'fog');
      assert.ok(p.group);
      groups.set(p.group!, [...(groups.get(p.group!) ?? []), p]);
      // One room (marks.only) or Unknown (no marks.only), and the truth agrees.
      assert.equal(b.truth[p.id].section, p.marks.only ? p.marks.only[0] : UNKNOWN);
      assert.ok(p.marks.sym.length >= 1, 'touches another of its group');
    }
    for (const g of groups.values()) {
      assert.ok(g.length <= MAX_GROUP[level]);
      assert.equal(new Set(g.map((p) => b.truth[p.id].section)).size, 1);
    }
    if (groups.size >= 2) {
      const rooms = [...groups.values()].filter((g) => g[0].marks.only).length;
      assert.ok(rooms >= 1 && rooms < groups.size, 'one group of each kind');
    }
    assert.equal(countPackings(b, 2), 1, 'the padded board still has one packing');
    // Loose filler is never auto-pinned; only the level's own pins can hold it.
    for (const p of loose) assert.equal(pinnedIds(b, level).includes(p.id), b.pinned[level].includes(p.id));
    assert.ok(b.pieces.filter((p) => p.kind === 'fog' && !p.loose).every((p) => pinnedIds(b, level).includes(p.id)));
  }
});

test('the picked case from the handoff reaches its minimums', () => {
  const c = bkvns();
  const g = c.games.find((x) => x.kind === 'board')!;
  const got = LEVELS.map((l) => piecesToPlace(boardPuzzle(withHouse(c), c, g, l)!, l));
  LEVELS.forEach((l, i) => assert.ok(got[i] >= MIN_TO_PLACE[l], `${l} ${got[i]}`));
});

test('a board that already meets its minimum is the plain board, unchanged', () => {
  const ALPHA = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  let seed = 12345;
  const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  let same = 0;
  for (let i = 0; i < 60 && same < 3; i++) {
    const code = Array.from({ length: 5 }, () => ALPHA[Math.floor(next() * ALPHA.length)]).join('');
    let c: Case;
    try { c = caseFor(content, { mode: 'play', code, games: ['wordsearch', 'cats', 'sudoku', 'board'] } as never); } catch { continue; }
    const g = c.games.find((x) => x.kind === 'board');
    if (!g) continue;
    const cont = withHouse(c);
    const plain = buildBoard(boardPuzzlePlan(cont, c, g));
    for (const level of LEVELS) {
      if (!plain || piecesToPlace(plain, level) < MIN_TO_PLACE[level]) continue;
      assert.deepEqual(boardPuzzle(cont, c, g, level), plain, `${code} ${level}`);
      same++;
    }
  }
  assert.ok(same > 0, 'no sample board met a minimum');
});

test('the board lists every clue it was built from, the puzzle own ones as hidden', () => {
  const c = bkvns();
  const g = c.games.find((x) => x.kind === 'board')!;
  const b = boardPuzzle(withHouse(c), c, g, boardLevel(c.levels))!;
  const given = c.clues.filter((cl) => cl.delivery === 'given').map((cl) => cl.id);
  assert.deepEqual(b.clues, { shown: given, hidden: c.clues.filter((cl) => g.clues.includes(cl.id)).map((cl) => cl.id) });
  assert.ok(b.clues!.hidden.length > 0);
});
