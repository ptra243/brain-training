// Campaign opening checks over many campaign seeds (called from scripts/check-cases.ts; the test uses a few).
import { content } from '../content/index.ts';
import { campaignRound } from '../engine/campaign.ts';
import { codeFor } from '../engine/caseRef.ts';
import type { CampaignRef } from '../engine/campaign.ts';
import { bodyRoom } from './explore.ts';
import { openingScript, openingSummary } from './opening.ts';
import { emptyProgress } from './state.ts';

export const openingRef = (seed: number): CampaignRef => ({ mode: 'campaign', code: codeFor(50_000 + seed), difficulty: 'medium' });

export interface OpeningStats {
  cases: number;
  moved: number;
}

/**
 * One round-1 campaign: the script tells every free clue exactly once and meets every seated guest,
 * and the body is never moved into the scene room (that would not be moved).
 * Throws on the first broken rule.
 */
export function openingSeed(seed: number, stats?: OpeningStats): void {
  const c = campaignRound(content, openingRef(seed), []);
  const script = openingScript(c);
  const told = [...script.guests.flatMap((g) => g.clues), ...script.catClues];
  const free = c.clues.filter((cl) => cl.delivery === 'given').map((cl) => cl.id);
  if (JSON.stringify([...told].sort()) !== JSON.stringify([...free].sort())) throw new Error(`seed ${seed}: the opening does not deliver each free clue exactly once`);
  if (script.guests.map((g) => g.guest).join() !== c.suspects.join()) throw new Error(`seed ${seed}: the opening does not cover every seated guest`);
  for (const g of script.guests) {
    for (const id of g.clues) {
      const clue = c.clues.find((cl) => cl.id === id)!;
      if (clue.speaker !== g.guest) throw new Error(`seed ${seed}: ${g.guest} tells a clue spoken by ${clue.speaker}`);
    }
  }
  if (openingSummary(c, { ...emptyProgress(), opening: { talked: [] } }).cluesGot !== free.length) throw new Error(`seed ${seed}: the skip summary miscounts the free clues`);
  const body = bodyRoom(c);
  if (body !== script.room) throw new Error(`seed ${seed}: the script gathers in ${script.room}, not the body room`);
  if (!c.rooms.includes(body)) throw new Error(`seed ${seed}: the body is in an unknown room`);
  if (stats) {
    stats.cases++;
    if (body !== c.sceneRoom) stats.moved++;
  }
}

/** The moved-body share over a sample should sit near its 1 in 4 (wide limits: a sample is small). */
export function movedRateOk(stats: OpeningStats): boolean {
  if (stats.cases < 30) return true;
  const rate = stats.moved / stats.cases;
  return rate > 0.08 && rate < 0.45;
}
