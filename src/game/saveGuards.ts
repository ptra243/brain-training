// Checks for what comes back from localStorage. A save is only ever data she
// made, but it can be old, cut short or edited, so nothing is trusted: a bad
// field falls back on its own and a bad game record resets just that game,
// instead of crashing into the error boundary (which clears everything).
// Plain TS, no React, so it can be unit tested.

import { PICK_ORDER, type PickedGame, type PlayRef, type QuickRef } from '../engine/caseRef.ts';
import type { CampaignRef } from '../engine/campaign.ts';
import { DIFFICULTIES, LENGTHS } from '../engine/settings.ts';
import type { GameKind } from '../engine/types.ts';
import type { CatMark } from '../games/cats.ts';
import type { Op } from '../games/lock.ts';
import type { NosingMove, NosingState } from '../games/nosing.ts';
import type { TarotState } from '../games/tarot.ts';
import type { BoardSave, PlacedPiece } from './board/boardSave.ts';
import type { CampaignSave, Outcome } from './campaign.ts';
import type { CatsData, CrosswordData, SudokuData, WordSearchData, WordleData } from './games/saveData.ts';
import type { GridHintState } from './gridHints.ts';
import { emptyProgress, type Accusation, type GameRecord, type InterrogationData, type Mark, type Progress } from './state.ts';
import type { QuickSave } from './storage.ts';

// Bumped when Play cases change, so a saved one isn't replayed against a different case.
// 2: Play cases draw 3 to 5 games and share clues by level. 4: Nosing around joins Play (a level roll for every Play code).
export const PLAY_VERSION = 4;

// ---------- Helpers ----------

export type Guard<T> = (v: unknown) => v is T;

/** A plain object: not null, not an array. */
export const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
export const isString = (v: unknown): v is string => typeof v === 'string';
export const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
/** A finite number (JSON turns NaN and Infinity into null). */
export const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export const isInt = (v: unknown): v is number => Number.isInteger(v);

export const isArrayOf =
  <T>(isItem: Guard<T>): Guard<T[]> =>
  (v): v is T[] =>
    Array.isArray(v) && v.every(isItem);

export const isRecordOf =
  <T>(isValue: Guard<T>): Guard<Record<string, T>> =>
  (v): v is Record<string, T> =>
    isObject(v) && Object.values(v).every(isValue);

export const oneOf =
  <T extends string | number>(...values: readonly T[]): Guard<T> =>
  (v): v is T =>
    (values as readonly unknown[]).includes(v);

/** Absent or passing. */
const opt =
  <T>(is: Guard<T>): Guard<T | undefined> =>
  (v): v is T | undefined =>
    v === undefined || is(v);

const isNullOr =
  <T>(is: Guard<T>): Guard<T | null> =>
  (v): v is T | null =>
    v === null || is(v);

const isStrings = isArrayOf(isString);
const isInts = isArrayOf(isInt);
const isMark: Guard<Mark> = oneOf<Mark>('x', 'o');
const isCatMark: Guard<CatMark> = oneOf<CatMark>('cat', 'dot');
const isCell = (v: unknown): v is [number, number] => Array.isArray(v) && v.length === 2 && isInt(v[0]) && isInt(v[1]);
const isCells = isArrayOf(isCell);

// ---------- One guard per game's data ----------

export const isCatsData = (v: unknown): v is CatsData =>
  isObject(v) &&
  isRecordOf(isCatMark)(v.marks) &&
  opt(isRecordOf(isCatMark))(v.flagged) &&
  opt(isString)(v.nudged) &&
  opt(isString)(v.explained) &&
  opt(isNum)(v.hints);

export const isCrosswordData = (v: unknown): v is CrosswordData =>
  isObject(v) &&
  isRecordOf(isString)(v.letters) &&
  opt(isRecordOf(isString))(v.flagged) &&
  opt(isString)(v.nudged) &&
  opt(isNum)(v.hints) &&
  opt(isNum)(v.size);

export const isSudokuData = (v: unknown): v is SudokuData =>
  isObject(v) &&
  isArrayOf(isInt)(v.grid) &&
  opt(isRecordOf(isNum))(v.flagged) &&
  opt(isNum)(v.nudged) &&
  opt(isNum)(v.explained) &&
  opt(isNum)(v.hints) &&
  opt(isRecordOf(isInts))(v.notes) &&
  opt(isBool)(v.showCandidates);

export const isWordSearchData = (v: unknown): v is WordSearchData => isObject(v) && isStrings(v.found);

export const isWordleData = (v: unknown): v is WordleData => isObject(v) && isStrings(v.guesses);

export const isInterrogationData = (v: unknown): v is InterrogationData =>
  isObject(v) && isStrings(v.asked) && isNum(v.strikes) && isBool(v.caught);

const isPlacedPiece = (v: unknown): v is PlacedPiece => isObject(v) && isString(v.section) && isCells(v.cells) && isCells(v.shape);

export const isBoardSave = (v: unknown): v is BoardSave =>
  isObject(v) && isRecordOf(isPlacedPiece)(v.placed) && isRecordOf(isNum)(v.rot) && isRecordOf(isNum)(v.hints) && isNum(v.hintCount);

export const isTarotState = (v: unknown): v is TarotState =>
  isObject(v) &&
  isInts(v.picked) &&
  isInts(v.matched) &&
  isNullOr(isInt)(v.jokerGone) &&
  isNullOr(isInt)(v.peek) &&
  isInts(v.seen) &&
  isNum(v.hints) &&
  isNum(v.peeks);

const isNosingMove = (v: unknown): v is NosingMove => {
  if (!isObject(v)) return false;
  switch (v.t) {
    case 'roll':
    case 'reroll':
    case 'undo':
    case 'try':
    case 'hint':
      return true;
    case 'answer':
      return isNum(v.value);
    case 'speed':
      return isNum(v.right);
    case 'combine':
      return isNum(v.a) && isNum(v.b) && oneOf<Op>('+', '-', '*', '/')(v.op);
    default:
      return false;
  }
};

export const isNosingState = (v: unknown): v is NosingState =>
  isObject(v) && isArrayOf(isNosingMove)(v.moves) && isNum(v.hints) && opt(oneOf<'revealed'>('revealed'))(v.solved);

// ---------- Progress ----------

const isGridHintState = (v: unknown): v is GridHintState =>
  isObject(v) && opt(isRecordOf(isMark))(v.flagged) && opt(isString)(v.target) && opt(oneOf<'nudge' | 'why'>('nudge', 'why'))(v.step) && opt(isNum)(v.count);

const isAccusation = (v: unknown): v is Accusation => isObject(v) && isString(v.suspect) && isString(v.item) && isNum(v.correct);

const isStatus = oneOf<GameRecord['status']>('playing', 'won', 'revealed');

/** Her moves, field by field: a bad field falls back on its own, a bad game record drops (that game restarts). */
export function sanitizeProgress(v: unknown): Progress {
  const p = emptyProgress();
  if (!isObject(v)) return p;
  if (isObject(v.marks)) for (const [k, m] of Object.entries(v.marks)) if (isMark(m)) p.marks[k] = m;
  if (Array.isArray(v.used)) p.used = v.used.filter(isString);
  if (Array.isArray(v.found)) p.found = v.found.filter(isString);
  if (Array.isArray(v.accusations)) p.accusations = v.accusations.filter(isAccusation);
  if (isBool(v.solved)) p.solved = v.solved;
  if (isObject(v.games)) {
    for (const [kind, rec] of Object.entries(v.games)) {
      // `data` stays unchecked here: the game's own guard checks it when the game opens.
      if (isObject(rec) && isStatus(rec.status)) p.games[kind as GameKind] = rec.data === undefined ? { status: rec.status } : { status: rec.status, data: rec.data };
    }
  }
  if (isGridHintState(v.gridHints)) p.gridHints = v.gridHints;
  if (isObject(v.endBoard) && isString(v.endBoard.key)) p.endBoard = { key: v.endBoard.key, save: v.endBoard.save };
  if (isRecordOf(isNum)(v.talk)) p.talk = v.talk;
  return p;
}

// ---------- Saved cases ----------

const isQuickRef = (v: unknown): v is QuickRef =>
  isObject(v) &&
  v.mode === 'quick' &&
  isString(v.code) &&
  oneOf(...DIFFICULTIES)(v.difficulty) &&
  oneOf(...LENGTHS)(v.length) &&
  opt(oneOf('classic', 'big'))(v.cast) &&
  opt(isBool)(v.endBoard);

const isPlayRef = (v: unknown): v is PlayRef =>
  isObject(v) && v.mode === 'play' && isString(v.code) && opt(isArrayOf(oneOf<PickedGame>(...PICK_ORDER)))(v.games);

const isCampaignRef = (v: unknown): v is CampaignRef =>
  isObject(v) &&
  v.mode === 'campaign' &&
  isString(v.code) &&
  oneOf(...DIFFICULTIES)(v.difficulty) &&
  opt(isBool)(v.possibleOnly) &&
  opt(isBool)(v.endBoard) &&
  opt(oneOf<1 | 2>(1, 2))(v.perPuzzle);

/** The Quick case on disk, or null when it can't be replayed (bad ref, or a Play case from an older version). */
export function sanitizeQuick(v: unknown): QuickSave | null {
  if (!isObject(v)) return null;
  if (isPlayRef(v.ref)) {
    if (v.playVersion !== PLAY_VERSION) return null;
  } else if (!isQuickRef(v.ref)) return null;
  return { ref: v.ref as QuickRef | PlayRef, progress: sanitizeProgress(v.progress) };
}

const KINDS: readonly GameKind[] = [...PICK_ORDER, 'finale'];
const isKinds = isArrayOf(oneOf<GameKind>(...KINDS));

/** The campaign on disk, or null when its ref or rounds are unusable. */
export function sanitizeCampaign(v: unknown): CampaignSave | null {
  if (!isObject(v) || !isCampaignRef(v.ref) || !Array.isArray(v.rounds) || !v.rounds.length) return null;
  const picked = Array.isArray(v.picked) ? v.picked : [];
  return {
    ref: v.ref,
    victims: Array.isArray(v.victims) ? v.victims.filter(isString) : [],
    rounds: v.rounds.map(sanitizeProgress),
    picked: v.rounds.map((_, i) => (isKinds(picked[i]) ? picked[i] : [])),
    outcome: oneOf<Outcome>('playing', 'caught', 'escaped')(v.outcome) ? v.outcome : 'playing',
  };
}
