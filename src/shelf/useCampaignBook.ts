import { useEffect, useMemo, useRef, useState } from 'react';
import type { Case, GameKind } from '../engine/types.ts';
import { generate } from '../game/caseClient.ts';
import { roundsKey } from '../game/caseJobs.ts';
import { currentRound, pick, puzzlesLeft, type CampaignSave } from '../game/campaignSave.ts';
import { holdRound, pendingAccusation } from '../game/face.ts';
import { reduce, type Action, type Progress } from '../game/state.ts';
import { finishFor, type Finish } from './notebook.ts';
import { loadCampaign, saveCampaign } from '../game/storage.ts';

/** A campaign to show without loading her save (the dev preview). */
export interface SampleCampaign {
  save: CampaignSave;
  /** Every round, built (the preview builds them on the main thread). */
  cases: Case[];
  /** A guest whose talk spread is open from the start (the dev preview). */
  talk?: string;
  /** Turn the book to this section (an index) once it is open (the dev preview). */
  section?: number;
}

/** Her campaign's current round, explored, with her progress and a way to move (saved to the campaign save). */
export interface CampaignBook {
  save: CampaignSave;
  /** Index of the current round. */
  round: number;
  /** The current round, as an explored copy (a UI flag the engine never sets). */
  c: Case;
  progress: Progress;
  /** Which of Grid and Jigsaw the notebook shows, decided as the classic Casebook does (the starting option). */
  finish: Finish;
  dispatch: (a: Action) => void;
  /** The puzzles she has chosen this round. */
  picked: GameKind[];
  /** Puzzles she may still choose this round. */
  left: number;
  /** Spend a pick on this puzzle (does nothing if already picked or none is left). A sample never writes. */
  onPick: (kind: GameKind) => void;
  /** A held accusation waits for its questioning; nothing in the book resolves it yet. */
  pending: { accused: string } | null;
}

/**
 * The campaign twin of `useQuickBook`. Null while the rounds build, false when there is no campaign
 * in play (or the build failed). Rounds are rebuilt only when `roundsKey` changes, as `CampaignView`
 * does. `enabled` false does nothing at all (the book is a Quick one). A sample never writes.
 */
export function useCampaignBook(sample: SampleCampaign | undefined, enabled: boolean): CampaignBook | null | false {
  const [save, setSave] = useState<CampaignSave | null>(() => (sample ? sample.save : enabled ? loadCampaign() : null));
  const latest = useRef<CampaignSave | null>(null);
  const [built, setBuilt] = useState<{ key: string; cases: Case[] } | false | null>(null);
  const key = save ? roundsKey(save) : '';
  const playing = !!save && save.outcome === 'playing';
  useEffect(() => {
    if (!enabled || sample || !save || !playing) return;
    let live = true;
    generate({ kind: 'campaign-rounds', save }).then(
      (cases) => live && setBuilt({ key, cases }),
      (err) => {
        console.error(err);
        if (live) setBuilt(false);
      },
    );
    return () => {
      live = false;
    };
    // `save` is covered by `key`: her progress doesn't change the rounds, so a move mustn't rebuild them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, sample]);
  const cases = sample ? sample.cases : built && built.key === key ? built.cases : null;
  const round = save ? currentRound(save) : 0;
  const c = useMemo(() => (cases?.[round] ? ({ ...cases[round], explore: true } as Case) : null), [cases, round]);
  if (!enabled) return false;
  if (!save || !playing || built === false) return false;
  if (!c) return null;
  const dispatch = (a: Action) => {
    if (sample) return;
    const base = latest.current ?? save;
    const next = holdRound(base, reduce(c, base.rounds[round], a));
    latest.current = next;
    saveCampaign(next);
    setSave(next);
  };
  const onPick = (kind: GameKind) => {
    if (sample) return;
    const base = latest.current ?? save;
    const next = pick(base, c, kind);
    if (next === base) return;
    latest.current = next;
    saveCampaign(next);
    setSave(next);
  };
  return { save, round, c, progress: save.rounds[round], finish: finishFor(c, null, save.ref.endBoard),
    picked: save.picked[round] ?? [], left: puzzlesLeft(save, c), dispatch, onPick, pending: pendingAccusation(save) };
}
