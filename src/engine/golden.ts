// Golden case snapshots: a hash of the full Case for a fixed list of refs, so
// an unintended change to generated cases shows up. Shared by golden.test.ts
// and scripts/update-golden.ts so they cannot drift.
import { createHash } from 'node:crypto';
import { content } from '../content/index.ts';
import { campaignCast, campaignRound, type CampaignRef } from './campaign.ts';
import { caseCode, caseFor, codeFor, type Cast, type PlayRef, type QuickRef } from './caseRef.ts';
import { generateCase } from './generate.ts';
import { DIFFICULTIES, LENGTHS, PRESETS } from './settings.ts';
import type { Case } from './types.ts';

/** JSON with object keys sorted, so the hash doesn't depend on key order. */
export function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v,
  );
}

export const hashCase = (c: Case): string => createHash('sha256').update(stableJson(c)).digest('hex').slice(0, 16);

/** Every golden ref, by label, as a function that builds its case. */
export function goldenRefs(): Record<string, () => Case> {
  const out: Record<string, () => Case> = {};
  // Numbered presets: case-N-difficulty.
  for (const difficulty of DIFFICULTIES) {
    for (const n of [1, 2, 3, 6, 11, 25, 50]) out[`case-${n}-${difficulty}`] = () => generateCase(content, n, PRESETS[difficulty]);
  }
  // Campaign rounds: round 1, then round 2 and 3 after the first living non-killer is accused each time.
  for (const difficulty of DIFFICULTIES) {
    for (const i of [1, 2]) {
      const ref: CampaignRef = { mode: 'campaign', code: codeFor(i * 2_654_435), difficulty };
      for (let round = 1; round <= 3; round++) {
        out[`campaign-${ref.code}-${difficulty}-round${round}`] = () => {
          const killer = campaignCast(content, ref).killer;
          const victims: string[] = [];
          for (let r = 1; r < round; r++) {
            const c = campaignRound(content, ref, victims);
            victims.push(c.suspects.find((s) => s !== killer)!);
          }
          return campaignRound(content, ref, victims);
        };
      }
    }
  }
  // Campaigns with fewer clues per puzzle (more puzzles a round).
  for (const perPuzzle of [1, 2] as const) {
    for (const difficulty of DIFFICULTIES) {
      for (const i of [1, 2]) {
        const ref: CampaignRef = { mode: 'campaign', code: codeFor(i * 2_654_435), difficulty, perPuzzle };
        for (let round = 1; round <= 2; round++) {
          out[`campaign-${ref.code}-${difficulty}-per${perPuzzle}-round${round}`] = () => {
            const killer = campaignCast(content, ref).killer;
            const victims: string[] = [];
            for (let r = 1; r < round; r++) victims.push(campaignRound(content, ref, victims).suspects.find((s) => s !== killer)!);
            return campaignRound(content, ref, victims);
          };
        }
      }
    }
  }
  // Play: the code rolls everything.
  for (let i = 1; i <= 20; i++) {
    const ref: PlayRef = { mode: 'play', code: codeFor(i * 1_215_773) };
    out[`play-${caseCode(ref)}`] = () => caseFor(content, ref);
  }
  // Quick: every difficulty, length and cast, one code each.
  const casts: Cast[] = ['classic', 'big'];
  let k = 0;
  for (const difficulty of DIFFICULTIES) {
    for (const length of LENGTHS) {
      for (const cast of casts) {
        k++;
        const ref: QuickRef = { mode: 'quick', code: codeFor(k * 3_141_592), difficulty, length, cast };
        out[`quick-${caseCode(ref)}`] = () => caseFor(content, ref);
      }
    }
  }
  return out;
}

/** Label to hash for every golden ref, keys sorted. */
export function goldenHashes(): Record<string, string> {
  const refs = goldenRefs();
  return Object.fromEntries(Object.keys(refs).sort().map((label) => [label, hashCase(refs[label]())]));
}
