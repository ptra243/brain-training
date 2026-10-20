// Tarot match: a forgiving memory game. Two of each card plus one joker. A card
// is only an opaque id; the theme maps ids to art and the case maps its
// suspects, items and rooms to ids by order, so no id ever names one.
// State is plain JSON (it is saved with her moves); the board is rebuilt from
// the spec's seed.

import { Rng, hashSeed } from '../engine/rng.ts';

export const JOKER = 'joker';

/** Suits of the decoy cards (minor arcana). They carry no case data. */
const SUITS: readonly string[] = ['cups', 'wands', 'swords', 'pentacles'];
const SUIT_SIZE = 14;

export interface TarotClueCards {
  /** The reward clue's own cards (suspect, weapon, room if named). Always dealt, even past `pairs`. */
  reward: readonly string[];
  /** Cards from the case's other clues, in the order to deal them. */
  other: readonly string[];
}

/** The board: card ids by position, two of each plus one `JOKER`. */
export type TarotBoard = readonly string[];

export interface TarotState {
  /** Positions she has turned over this turn (0 to 2), not yet resolved. */
  picked: number[];
  /** Positions matched (stay face up). */
  matched: number[];
  /** Position of the joker once flipped (it is off the table). */
  jokerGone: number | null;
  /** The card the joker turned up, still unmatched. */
  peek: number | null;
  /** The peek has not yet been used in a turn: it is her automatic first pick. */
  peekFresh: boolean;
  /** Positions she has seen face up at any time. */
  seen: number[];
  /** Cat hints and joker peeks used (they seed the next draw). */
  hints: number;
  peeks: number;
}

export const tarotInitial = (): TarotState => ({ picked: [], matched: [], jokerGone: null, peek: null, peekFresh: false, seen: [], hints: 0, peeks: 0 });

/**
 * Deal the board. `deck` is every card id the case can use; clue cards not in it
 * are ignored. Order: reward cards, other clue cards, then decoys, up to `pairs`
 * (reward cards are never dropped, so the board can grow past `pairs`).
 */
export function buildTarot(deck: readonly string[], clueCards: TarotClueCards, pairs: number, rng: Rng): TarotBoard {
  const known = new Set(deck);
  const chosen: string[] = [];
  const add = (id: string) => {
    if (known.has(id) && !chosen.includes(id)) chosen.push(id);
  };
  clueCards.reward.forEach(add);
  for (const id of clueCards.other) if (chosen.length < pairs) add(id);
  if (chosen.length < pairs) {
    const decoys: string[] = [];
    for (const suit of SUITS) for (let n = 1; n <= SUIT_SIZE; n++) decoys.push(`${suit}-${n}`);
    for (const id of rng.shuffle(decoys)) {
      if (chosen.length >= pairs) break;
      if (!chosen.includes(id)) chosen.push(id);
    }
  }
  return rng.shuffle([...chosen, ...chosen, JOKER]);
}

const unmatchedPositions = (board: TarotBoard, s: TarotState): number[] =>
  board.flatMap((id, i) => (id === JOKER || s.matched.includes(i) ? [] : [i]));

export const isFaceUp = (s: TarotState, i: number): boolean => s.matched.includes(i) || s.picked.includes(i) || s.peek === i;

const withSeen = (s: TarotState, i: number): number[] => (s.seen.includes(i) ? s.seen : [...s.seen, i]);

/** Turn the joker's free peek: a random unmatched, face-down card, or none. */
function peekFree(board: TarotBoard, s: TarotState, seed: number): TarotState {
  const choices = unmatchedPositions(board, s).filter((i) => !s.picked.includes(i));
  if (choices.length === 0) return { ...s, peek: null, peekFresh: false };
  const i = new Rng(hashSeed(`${seed}-peek-${s.peeks}`)).pick(choices);
  return { ...s, peek: i, peekFresh: true, peeks: s.peeks + 1, seen: withSeen(s, i) };
}

/**
 * Turn a card over. Ignored if it is matched, already picked, gone, or two cards
 * are already waiting for `resolveTurn`. Flipping the joker removes it and turns
 * one card up free; it does not count as one of her two picks. While that peek
 * card is up and she has picked nothing, it is her first pick: tapping any other
 * card makes the pair (`picked` = [peek, tapped]) and tapping the peek itself does
 * nothing. After a miss that used the peek it stops being automatic (`peekFresh`
 * false): taps pick ordinary cards and she may tap the peek to pair it. With one ordinary card already picked, the next tap pairs with it.
 */
export function flip(board: TarotBoard, s: TarotState, seed: number, i: number): TarotState {
  if (i < 0 || i >= board.length || s.matched.includes(i) || s.picked.includes(i) || s.jokerGone === i) return s;
  if (board[i] === JOKER) return peekFree(board, { ...s, jokerGone: i }, seed);
  if (s.picked.length >= 2) return s;
  // A fresh peek card counts as her first pick: with none made, one tap resolves against it.
  // Once a turn has used it and missed, it is just a face-up card she may tap like any other.
  if (s.peek !== null && s.peekFresh && s.picked.length === 0) {
    if (i === s.peek) return s;
    return { ...s, picked: [s.peek, i], seen: withSeen(s, i) };
  }
  return { ...s, picked: [...s.picked, i], seen: withSeen(s, i) };
}

/** Two cards waiting to be judged. */
export const turnReady = (s: TarotState): boolean => s.picked.length === 2;

/**
 * Judge her two picks: a match stays up, a miss turns both back down, free of
 * charge. When the joker's card gets matched a new one turns up free.
 */
export function resolveTurn(board: TarotBoard, s: TarotState, seed: number): TarotState {
  if (s.picked.length !== 2) return s;
  const [a, b] = s.picked;
  if (board[a] !== board[b]) return { ...s, picked: [], peekFresh: s.peek !== null && s.picked.includes(s.peek) ? false : s.peekFresh };
  const next: TarotState = { ...s, picked: [], matched: [...s.matched, a, b] };
  if (next.peek !== null && next.matched.includes(next.peek)) return peekFree(board, next, seed);
  return next;
}

export interface TarotHintResult {
  state: TarotState;
  /** The face-down position the cat shows as a ghost, or null if she has seen nothing yet (no hint spent). */
  ghost: number | null;
}

/**
 * The cat's hint: a ghost of a card she has seen and not matched. Prefers one
 * whose partner she has also seen. Deterministic from the seed and hints used.
 */
export function tarotHint(board: TarotBoard, s: TarotState, seed: number): TarotHintResult {
  const seen = s.seen.filter((i) => !s.matched.includes(i) && board[i] !== JOKER && !isFaceUp(s, i));
  if (seen.length === 0) return { state: s, ghost: null };
  // With a peek up and nothing picked, her next tap pairs with it: point at its partner if she has seen it.
  if (s.peek !== null && s.peekFresh && s.picked.length === 0) {
    const partner = seen.find((i) => board[i] === board[s.peek!]);
    if (partner !== undefined) return { state: { ...s, hints: s.hints + 1 }, ghost: partner };
  }
  const known = seen.filter((i) => seen.some((j) => j !== i && board[j] === board[i]));
  const ghost = new Rng(hashSeed(`${seed}-hint-${s.hints}`)).pick(known.length ? known : seen);
  return { state: { ...s, hints: s.hints + 1 }, ghost };
}

/** Every pair found (the joker needn't be flipped). */
export const tarotSolved = (board: TarotBoard, s: TarotState): boolean => unmatchedPositions(board, s).length === 0;

/** Solve button: the whole board face up. */
export function tarotRevealAll(board: TarotBoard, s: TarotState): TarotState {
  const all = board.map((_, i) => i);
  return { ...s, picked: [], peek: null, peekFresh: false, matched: all.filter((i) => board[i] !== JOKER), seen: all };
}
