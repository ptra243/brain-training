import { houseOf } from '../content/houses.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { compileClue } from './clues.ts';
import { generateCase } from './generate.ts';
import { caseFacts, interrogationEvidence } from './caseFacts.ts';
import { disproves } from './interrogation.ts';
import { isInterrogation } from './gameKinds.ts';
import type { Case } from './types.ts';

const factsOf = (c: Case) => caseFacts(houseOf(c), c);

test('interrogations: exactly one lie, every other answer true, and the proof disproves the lie', () => {
  let checked = 0;
  for (let n = 1; n <= 40; n++) {
    const c = generateCase(content, n);
    const cf = factsOf(c);
    for (const g of c.games.filter(isInterrogation)) {
      const it = g.interrogation;
      checked++;
      const lies = it.questions.filter((q) => q.lie);
      assert.equal(lies.length, 1, `case ${n} ${g.kind}`);
      assert.equal(it.questions.length, 8);
      assert.equal(new Set(it.questions.map((q) => q.ask)).size, 8, `case ${n}: repeated question`);
      for (const q of it.questions) {
        const truth = compileClue(q.answer.fact, cf.ctx)(c.solution);
        assert.equal(truth, !q.lie, `case ${n}: "${q.answer.body}" should be ${q.lie ? 'false' : 'true'}`);
        assert.equal(q.answer.speaker, it.suspect);
      }
      for (const card of it.cards) assert.ok(compileClue(card.fact, cf.ctx)(c.solution), `case ${n}: false card ${card.body}`);
      const evidence = interrogationEvidence(c, it);
      const proof = it.proof.map((id) => evidence.find((e) => e.id === id)!);
      assert.ok(proof.every(Boolean), `case ${n}: proof refers to unknown evidence`);
      assert.ok(disproves(cf, proof.map((p) => p.fact), lies[0].answer.fact), `case ${n} ${g.kind}: proof doesn't disprove the lie`);
      if (it.useCaseClues) {
        for (const id of it.proof) assert.notEqual(c.clues.find((cl) => cl.id === id)?.delivery, 'finale', 'finale proof must come from other games');
      }
    }
  }
  assert.ok(checked >= 15, `only ${checked} interrogations`);
});

test('hard self-contained interrogations need two cards: no single card catches the lie', () => {
  for (let n = 4; n <= 40; n++) {
    const c = generateCase(content, n);
    const g = c.games.filter(isInterrogation).find((g) => g.kind === 'interrogation');
    if (!g || c.difficulty === 'easy') continue;
    const cf = factsOf(c);
    const lie = g.interrogation.questions.find((q) => q.lie)!.answer.fact;
    for (const card of g.interrogation.cards) assert.ok(!disproves(cf, [card.fact], lie), `case ${n}: ${card.body} alone catches it`);
    assert.equal(g.interrogation.proof.length, 2);
  }
});

test('interrogation clues are confessions in the voice of the suspect in the chair', () => {
  for (let n = 1; n <= 30; n++) {
    const c = generateCase(content, n);
    for (const g of c.games.filter(isInterrogation)) {
      for (const id of g.clues) assert.equal(c.clues.find((cl) => cl.id === id)?.speaker, g.interrogation.suspect);
    }
  }
});
