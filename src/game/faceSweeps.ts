// Face-to-face questioning checks over many campaign seeds (called from scripts/check-cases.ts; the test uses a few).
import { content } from '../content/index.ts';
import type { CampaignRef } from '../engine/campaign.ts';
import { campaignRound } from '../engine/campaign.ts';
import { caseFacts } from '../engine/caseFacts.ts';
import { codeFor } from '../engine/caseRef.ts';
import { compileClue } from '../engine/clues.ts';
import { disproves } from '../engine/interrogation.ts';
import type { Interrogation } from '../engine/types.ts';
import { faceToFace } from './caseJobs.ts';

export const faceRef = (seed: number): CampaignRef => ({ mode: 'campaign', code: codeFor(40_000 + seed), difficulty: 'medium' });

export interface FaceStats {
  killers: number;
  cracks: number;
  innocents: number;
}

/**
 * One round-1 campaign: question the killer and two innocents, once with every clue found and once with none.
 * Throws on the first broken rule.
 */
export function faceSeed(seed: number, stats?: FaceStats): void {
  const ref = faceRef(seed);
  const c = campaignRound(content, ref, []);
  const cf = caseFacts(content.house, c);
  const ids = c.clues.map((cl) => cl.id);
  const innocents = c.suspects.filter((s) => s !== c.murderer).slice(0, 2);
  for (const found of [ids, []]) {
    for (const accused of [c.murderer, ...innocents]) {
      const it: Interrogation = faceToFace(content, ref, [], accused, found);
      const again = faceToFace(content, ref, [], accused, found);
      if (JSON.stringify(it) !== JSON.stringify(again)) throw new Error(`seed ${seed}: ${accused} questioning is not repeatable`);
      if (it.suspect !== accused) throw new Error(`seed ${seed}: ${accused} is not in the chair`);
      for (const q of it.questions) {
        if (q.answer.speaker !== accused) throw new Error(`seed ${seed}: ${accused} did not answer`);
        const t = compileClue(q.answer.fact, cf.ctx)(c.solution);
        if (t === q.lie) throw new Error(`seed ${seed}: "${q.answer.body}" should be ${q.lie ? 'false' : 'true'}`);
        if (q.lie && /item$/.test(q.answer.fact.type)) throw new Error(`seed ${seed}: the lie names a weapon holder`);
      }
      const lies = it.questions.filter((q) => q.lie);
      if (accused !== c.murderer) {
        if (lies.length || it.cracks || it.questions.length !== 8) throw new Error(`seed ${seed}: innocent ${accused} should have 8 true answers`);
        if (stats) stats.innocents++;
        continue;
      }
      if (stats) stats.killers++;
      if (it.cracks) {
        if (lies.length || it.proof.length) throw new Error(`seed ${seed}: a cracked killer has no lie`);
        if (stats) stats.cracks++;
        continue;
      }
      if (lies.length !== 1) throw new Error(`seed ${seed}: the killer needs exactly one lie`);
      const proof = it.proof.map((id) => c.clues.find((cl) => cl.id === id)!.fact);
      if (!found.length || !disproves(cf, proof, lies[0].answer.fact)) throw new Error(`seed ${seed}: the proof doesn't catch the lie`);
      if (it.proof.some((id) => !found.includes(id))) throw new Error(`seed ${seed}: proof uses a clue she has not found`);
    }
  }
}
