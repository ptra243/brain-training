import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import type { Case, GameKind, Interrogation } from '../engine/types.ts';
import { generate } from '../game/caseClient.ts';
import { roundsKey } from '../game/caseJobs.ts';
import { currentRound, pick, puzzlesLeft, type CampaignSave, type Verdict } from '../game/campaignSave.ts';
import { foundIds, holdRound, pendingAccusation, resolveHeld } from '../game/face.ts';
import { reduce, unlockedClueIds, type Action, type Progress } from '../game/state.ts';
import { finishFor, type Finish } from './notebook.ts';
import { loadCampaign, saveCampaign } from '../game/storage.ts';
import { accusable, laterScene, possibleNow, type LaterScene } from './campaignAnswer.ts';

/** A campaign to show without loading her save (the dev preview). */
export interface SampleCampaign {
  save: CampaignSave;
  /** Every round, built (the preview builds them on the main thread). */
  cases: Case[];
  /** A guest whose talk spread is open from the start (the dev preview). */
  talk?: string;
  /** Turn the book to this section (an index) once it is open (the dev preview). */
  section?: number;
  /** A guest written into the Answer form from the start (the dev preview). */
  guest?: string;
  /** Questions already asked in the questioning when it opens (the dev preview). */
  asked?: number;
  /** The "later that night" scene is open from the start (the dev preview). */
  later?: LaterScene;
}

/** What resolving a held accusation did (`onResolved`). */
export interface Resolved {
  verdict: Verdict | undefined;
  /** The candle-out scene for a wrong accusation. */
  scene: LaterScene | null;
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
  /** A held accusation waits for its questioning (a reload finds it still held). */
  pending: { accused: string } | null;
  /** The held accusation's questioning, once built; null while it builds (a build that fails resolves at once). */
  questioning: Interrogation | null;
  /** The clue ids she had found when she accused, as the questioning wants them. */
  found: string[];
  /** Who the Answer form may list: everyone, or only the possible killers when she chose that. */
  allowed: string[];
  /** How many people her clues still allow as the killer. */
  stillPointing: number;
  /**
   * Apply the held accusation's verdict and save it (a sample never writes but moves in memory), then tell
   * `onResolved`. The seam for the endings: a `caught` or `escaped` verdict sets `over`.
   */
  resolve: () => void;
  /** The night is over (the accusation was right, or the third was wrong); null while it plays. */
  over: 'caught' | 'escaped' | null;
}

/**
 * The campaign twin of `useQuickBook`. Null while the rounds build, false when there is no campaign
 * in play (or the build failed). Rounds are rebuilt only when `roundsKey` changes, as `CampaignView`
 * does. `enabled` false does nothing at all (the book is a Quick one). A sample never writes.
 */
export function useCampaignBook(sample: SampleCampaign | undefined, enabled: boolean, onResolved?: (r: Resolved) => void): CampaignBook | null | false {
  const [save, setSave] = useState<CampaignSave | null>(() => (sample ? sample.save : enabled ? loadCampaign() : null));
  const latest = useRef<CampaignSave | null>(null);
  const [built, setBuilt] = useState<{ key: string; cases: Case[] } | false | null>(null);
  const [over, setOver] = useState<'caught' | 'escaped' | null>(null);
  const [face, setFace] = useState<{ key: string; interrogation: Interrogation } | null>(null);
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
  const cases = sample ? sample.cases : built && (built.key === key || over) ? built.cases : null;
  const round = save ? currentRound(save) : 0;
  const c = useMemo(() => (cases?.[round] ? ({ ...cases[round], explore: true } as Case) : null), [cases, round]);

  // An accusation is saved when she makes it but its verdict waits for the questioning (`face.ts`), as in
  // `CampaignView`: the same job and key, and a build that fails goes straight to the verdict.
  const pending = save && playing ? pendingAccusation(save) : null;
  const faceKey = pending ? `${key}|${pending.accused}` : null;
  const resolve = () => {
    if (!save || !c) return;
    const base = latest.current ?? save;
    const { save: next, verdict } = resolveHeld(base, c);
    if (!sample) {
      latest.current = next;
      saveCampaign(next);
    }
    setSave(next);
    if (verdict === 'caught' || verdict === 'escaped') setOver(verdict);
    const scene = verdict === 'next-body' || verdict === 'wrong-weapon' ? laterScene(verdict, next, c.guests) : null;
    onResolved?.({ verdict, scene });
  };
  const resolveOnFailure = useEffectEvent(resolve);
  useEffect(() => {
    if (!enabled || !c || !pending || !faceKey || !save) return;
    let live = true;
    generate({ kind: 'face', ref: save.ref, victims: save.victims, accused: pending.accused, found: foundIds(cases![round], save.rounds[round]) }).then(
      (interrogation) => {
        if (live) setFace({ key: faceKey, interrogation });
      },
      (err) => {
        console.error(err);
        if (live) resolveOnFailure();
      },
    );
    return () => {
      live = false;
    };
    // The questioning depends on the round, the accused and her found clues, which `faceKey` and `c` cover.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faceKey, c, enabled]);
  // Who her clues, over every round so far, still allow as the killer. Only the clues she has found matter, so key the memo on those.
  const foundKey = cases && save ? cases.slice(0, round + 1).map((rc, i) => (save.rounds[i] ? [...unlockedClueIds(rc, save.rounds[i])].sort().join(',') : '-')).join('|') : '';
  const possible = useMemo(
    // Every round is explored, as in the classic Accuse tab (its scene is known from the start).
    () => (cases && save ? possibleNow(save, cases.map((rc): Case => ({ ...rc, explore: true }))) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- save is read only through the clues that foundKey summarises
    [foundKey, cases, round, save?.ref.possibleOnly],
  );
  const questioning = pending && face && face.key === faceKey ? face.interrogation : null;

  if (!enabled) return false;
  if (!save || (!playing && !over) || built === false) return false;
  if (!c) return null;
  const dispatch = (a: Action) => {
    if (sample || over) return;
    const base = latest.current ?? save;
    // One accusation a chapter: while one is held, a second can't be made.
    if (a.type === 'accuse' && pendingAccusation(base)) return;
    const next = holdRound(base, reduce(c, base.rounds[round], a));
    latest.current = next;
    saveCampaign(next);
    setSave(next);
  };
  const onPick = (kind: GameKind) => {
    if (sample || over) return;
    const base = latest.current ?? save;
    const next = pick(base, c, kind);
    if (next === base) return;
    latest.current = next;
    saveCampaign(next);
    setSave(next);
  };
  return { save, round, c, progress: save.rounds[round], finish: finishFor(c, null, save.ref.endBoard),
    picked: save.picked[round] ?? [], left: puzzlesLeft(save, c), dispatch, onPick, pending: pendingAccusation(save), questioning, found: foundIds(cases![round], save.rounds[round]),
    allowed: accusable(save, c, possible), stillPointing: possible.length, resolve, over };
}
