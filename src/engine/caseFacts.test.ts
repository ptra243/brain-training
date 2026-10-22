import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { campaignRound, type CampaignRef } from './campaign.ts';
import { caseFacts, interrogationEvidence } from './caseFacts.ts';
import { caseFor, codeFor } from './caseRef.ts';
import { disproves } from './interrogation.ts';
import { isInterrogation } from './gameKinds.ts';
import { DIFFICULTIES } from './settings.ts';
import type { Case, ClueFact } from './types.ts';

/** 7-guest cases with interrogations: Quick start big casts and campaign rounds. */
let built: Case[] | undefined;
const bigCases = () => (built ??= buildBigCases());
function buildBigCases(): Case[] {
  const out: Case[] = [];
  for (const difficulty of DIFFICULTIES) {
    for (let i = 1; i <= 2; i++) {
      out.push(caseFor(content, { mode: 'quick', code: codeFor(i * 1_215_773), difficulty, length: 'long', cast: 'big' }));
      const ref: CampaignRef = { mode: 'campaign', code: codeFor(i * 2_654_435), difficulty };
      out.push(campaignRound(content, ref, []));
    }
  }
  return out.filter((c) => c.games.some(isInterrogation));
}

/** Every way to pick `size` of these. */
function subsets<T>(list: readonly T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (list.length < size) return [];
  const [head, ...rest] = list;
  return [...subsets(rest, size - 1).map((s) => [head, ...s]), ...subsets(rest, size)];
}

test('case facts carry the shared-rooms flag, so checks use the real rules', () => {
  const cases = bigCases();
  assert.ok(cases.length >= 8, `only ${cases.length} big cases with interrogations`);
  for (const c of cases) assert.equal(caseFacts(content.house, c).shared, true);
  assert.equal(caseFacts(content.house, caseFor(content, { mode: 'quick', code: codeFor(7), difficulty: 'easy', length: 'long', cast: 'classic' })).shared, false);
});

test('7 guests: the cards the game accepts are exactly those that disprove the lie with rooms shared', () => {
  let rejectedByRealRules = 0;
  for (const c of bigCases()) {
    const cf = caseFacts(content.house, c);
    const classic = { ...cf, shared: false };
    for (const g of c.games.filter(isInterrogation)) {
      const it = g.interrogation;
      const lie = it.questions.find((q) => q.lie)!.answer.fact;
      const evidence = interrogationEvidence(c, it);
      // The designed proof is accepted.
      const proof = it.proof.map((id) => evidence.find((e) => e.id === id)!.fact);
      assert.equal(proof.length, it.proof.length);
      assert.ok(disproves(cf, proof, lie), `${c.code} ${g.kind}: proof doesn't disprove the lie`);
      // Any set the game accepts must also be impossible alongside the lie
      // when rooms are shared; the old one-room-each rules accepted more.
      for (const set of subsets(evidence, it.proof.length)) {
        const facts: ClueFact[] = set.map((e) => e.fact);
        if (disproves(cf, facts, lie)) continue;
        if (disproves(classic, facts, lie)) rejectedByRealRules++;
      }
    }
  }
  // Documents the bug this guards against: such sets exist.
  assert.ok(rejectedByRealRules > 0, 'expected some sets that only the one-room-each rules accept');
});

test("the questioning game's evidence is the cards, or the casebook without the finale's own clues", () => {
  for (const c of bigCases()) {
    for (const g of c.games.filter(isInterrogation)) {
      const it = g.interrogation;
      const evidence = interrogationEvidence(c, it);
      if (!it.useCaseClues) assert.deepEqual(evidence, it.cards);
      else {
        assert.ok(evidence.every((e) => e.delivery !== 'finale'));
        assert.equal(evidence.length, c.clues.filter((e) => e.delivery !== 'finale').length);
      }
      for (const id of it.proof) assert.ok(evidence.some((e) => e.id === id), `${c.code}: proof card ${id} isn't on the table`);
    }
  }
});
