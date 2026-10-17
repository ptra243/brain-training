import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { roomAdjacency } from './house.ts';
import { generateCase } from './generate.ts';
import { allCandidates, countSolutions, filterCandidates, sameSolution } from './solver.ts';
import type { Difficulty } from './types.ts';

const ctxFor = (suspects: readonly string[]) => ({ suspects, adjacency: roomAdjacency(content.house) });

test('the house has 6 rooms and every room has a neighbour', () => {
  assert.equal(content.house.rooms.length, 6);
  for (const [room, next] of roomAdjacency(content.house)) assert.ok(next.size > 0, `${room} is isolated`);
});

test('every room has at least 5 objects, all 5-letter capital words', () => {
  for (const room of content.house.rooms) {
    assert.ok(room.objects.length >= 5, `${room.name} has only ${room.objects.length} objects`);
    for (const word of room.objects) assert.match(word, /^[A-Z]{5}$/, `${room.name}: "${word}"`);
  }
});

test('Wordle clues: answer is an object in the clue room, teaser hides the room', () => {
  for (let n = 1; n <= 30; n++) {
    const c = generateCase(content, n);
    const scene = content.house.rooms.find((r) => r.id === c.sceneRoom)!;
    assert.ok(scene.objects.includes(c.sceneClue.wordle.answer));
    for (const clue of [...c.clues.filter((cl) => cl.wordle), c.sceneClue]) {
      const { answer, teaser } = clue.wordle!;
      assert.ok(!teaser.includes(answer.toLowerCase()), `case ${n}: teaser gives away the word`);
      for (const room of content.house.rooms) {
        assert.ok(!teaser.includes(room.name), `case ${n}: teaser names the ${room.name}`);
      }
      assert.ok(clue.text.includes(answer.toLowerCase()), `case ${n}: full text is missing the word`);
    }
  }
});

test('same case number gives the same case', () => {
  assert.deepEqual(generateCase(content, 7), generateCase(content, 7));
});

for (const difficulty of ['easy', 'medium', 'hard'] as Difficulty[]) {
  test(`${difficulty}: 30 cases each have exactly one solution, and it is the real one`, () => {
    for (let n = 1; n <= 30; n++) {
      const c = generateCase(content, n, difficulty);
      const ctx = ctxFor(c.suspects);
      const facts = c.clues.map((cl) => cl.fact);
      const left = filterCandidates(allCandidates(c.rooms, c.items), facts, ctx);
      assert.equal(left.length, 1, `case ${n} has ${left.length} solutions`);
      assert.ok(sameSolution(left[0], c.solution), `case ${n} solves to the wrong answer`);
    }
  });
}

test('clue sets are minimal: dropping any clue allows a second solution', () => {
  for (let n = 1; n <= 10; n++) {
    const c = generateCase(content, n);
    const ctx = ctxFor(c.suspects);
    const candidates = allCandidates(c.rooms, c.items);
    const facts = c.clues.map((cl) => cl.fact);
    facts.forEach((_, i) => {
      const without = facts.filter((__, j) => j !== i);
      assert.ok(countSolutions(candidates, without, ctx, 1) > 1, `case ${n} clue ${i} is redundant`);
    });
  }
});

test('the murderer is the suspect in the scene room holding the weapon', () => {
  const c = generateCase(content, 12);
  const i = c.suspects.indexOf(c.murderer);
  assert.equal(c.solution.room[i], c.sceneRoom);
  assert.equal(c.solution.item[i], c.weapon);
});

test('every clue is free or unlocked by exactly one game; three scene word games plus two rotating games, and a finale on hard cases', () => {
  const seen = new Set<string>();
  for (let n = 1; n <= 30; n++) {
    const c = generateCase(content, n);
    const kinds = c.games.map((g) => g.kind);
    assert.deepEqual(kinds.slice(0, 3), ['wordle', 'crossword', 'wordsearch']);
    assert.ok(c.games.every((g) => g.unlocksScene === kinds.slice(0, 3).includes(g.kind)));
    const rotating = kinds.slice(3).filter((k) => k !== 'finale');
    assert.equal(rotating.length, 2, `case ${n}: ${kinds}`);
    rotating.forEach((k) => seen.add(k));
    assert.equal(kinds.includes('finale'), c.difficulty === 'hard');
    for (const clue of c.clues) {
      const owners = c.games.filter((g) => g.clues.includes(clue.id)).length;
      assert.equal(owners, clue.delivery === 'given' ? 0 : 1, `case ${n} ${clue.id}`);
    }
    assert.ok(c.clues.some((cl) => cl.delivery === 'given'), `case ${n} has no free clue`);
    for (const g of c.games.slice(3)) assert.ok(g.clues.length > 0, `case ${n}: ${g.kind} unlocks nothing`);
  }
  assert.deepEqual([...seen].sort(), ['cats', 'interrogation', 'sudoku'], 'all three games should come up');
});

test('clue sources: free and sudoku clues are testimony, cat clues are evidence; witnesses never vouch for themselves', () => {
  for (let n = 1; n <= 30; n++) {
    const c = generateCase(content, n);
    for (const clue of c.clues) {
      assert.equal(clue.source, clue.delivery === 'cats' ? 'evidence' : 'testimony', `case ${n} ${clue.id}`);
      if (clue.source === 'testimony') {
        assert.ok(clue.speaker && c.suspects.includes(clue.speaker));
        // Witnesses don't vouch for themselves; a suspect confessing in an interrogation can.
        const confession = clue.delivery === 'interrogation' || clue.delivery === 'finale';
        if ('suspect' in clue.fact && !confession) assert.notEqual(clue.speaker, clue.fact.suspect, `case ${n}: ${clue.text}`);
      } else assert.equal(clue.speaker, undefined);
      assert.ok(!/\{\w+\}/.test(clue.body), `unfilled placeholder: ${clue.body}`);
    }
  }
});

test('located sudoku statements point at a square inside their own room', () => {
  let seen = 0;
  for (let n = 1; n <= 30; n++) {
    const c = generateCase(content, n);
    const sudoku = c.games.find((g) => g.kind === 'sudoku');
    if (!sudoku) continue;
    for (const clue of c.clues.filter((cl) => cl.location)) {
      seen++;
      assert.equal(clue.delivery, 'sudoku');
      assert.ok(sudoku!.located?.includes(clue.id));
      assert.ok('room' in clue.fact);
      const room = content.house.rooms.find((r) => 'room' in clue.fact && r.id === clue.fact.room)!;
      const [tr, tc] = clue.location!.target;
      assert.ok(room.cells.some(([r, col]) => r === tr && col === tc), `case ${n}: target outside ${room.name}`);
      assert.equal(`${clue.location!.before}the ${room.name}${clue.location!.after}`, clue.body);
    }
    assert.ok(c.clues.some((cl) => cl.delivery === 'sudoku' && !cl.location), `case ${n}: sudoku has no completion clue`);
  }
  assert.ok(seen > 8, `only ${seen} located statements in 30 cases`);
});
