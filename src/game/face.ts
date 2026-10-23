// Face to face (campaign): after she accuses, the accused is questioned before the verdict shows.
// The accusation is saved at once (the round keeps the accusation but the verdict is not applied), so a
// reload mid-questioning finds it and replays the questioning. Pure parts only; the scene is `FaceToFace.tsx`.

import { faceLines } from '../content/talk.ts';
import { Rng, hashSeed } from '../engine/rng.ts';
import type { Case, Content } from '../engine/types.ts';
import { currentRound, updateRound, type CampaignSave, type Verdict } from './campaign.ts';
import { unlockedClueIds, type Progress } from './state.ts';

/** The accusation waiting for its questioning: the current round holds one and the campaign has not moved on. */
export function pendingAccusation(save: CampaignSave): { accused: string } | null {
  if (save.outcome !== 'playing') return null;
  const last = save.rounds[currentRound(save)]?.accusations.at(-1);
  return last ? { accused: last.suspect } : null;
}

/** Save her move now, whatever it was. An accusation is kept as it is, with no verdict, until the questioning ends. */
export function holdRound(save: CampaignSave, progress: Progress): CampaignSave {
  const i = currentRound(save);
  return { ...save, rounds: save.rounds.map((p, k) => (k === i ? progress : p)) };
}

/** What the held accusation does: the same result `updateRound` gave when the accusation was made. */
export function resolveHeld(content: Content, held: CampaignSave, c: Case): { save: CampaignSave; verdict?: Verdict } {
  const i = currentRound(held);
  const progress = held.rounds[i];
  const before = { ...progress, accusations: progress.accusations.slice(0, -1) };
  const rounds = held.rounds.map((p, k) => (k === i ? before : p));
  return updateRound(content, { ...held, rounds }, c, progress);
}

/** The clue ids she has found this round, for the `face` job. */
export const foundIds = (c: Case, p: Progress): string[] => [...unlockedClueIds(c, p)].sort();

export type EndingKind = 'innocent' | 'confession' | 'dodge';

/** Which closing line fits: an innocent; a killer held on the right weapon (or one who cracks); a killer who walks. */
export function endingKind(killer: boolean, rightWeapon: boolean, cracks: boolean | undefined): EndingKind {
  if (!killer) return 'innocent';
  return rightWeapon || cracks ? 'confession' : 'dodge';
}

/** A line from `faceLines`, picked by a seeded index (never the clock). */
export function faceLine(kind: keyof typeof faceLines, seed: string): string {
  const pool = faceLines[kind];
  return pool[new Rng(hashSeed(`${seed}-line-${kind}`)).int(pool.length)];
}
