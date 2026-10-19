// The case board: a packing puzzle where every clue is a piece. Rooms and an
// Unknown section share one rectangle; each piece goes wholly inside one
// section. A guest's pieces all go in the same place: the room her clues
// prove they were in, or Unknown when nothing proves it. The board is built
// so exactly one way of sorting the pieces fits (see `board.ts`); the shapes
// are free, cut to make that true.
//
// Two uses (see `caseBoard.ts`): the rotating "case board" puzzle, whose
// packing also proves its own reward clues, and the optional end board,
// which shows what her found clues prove before she accuses.

import type { Difficulty } from './types.ts';

/** The section for everyone and everything the clues don't place in a room. */
export const UNKNOWN = 'unknown';

/** A square on the board: [row, col], 0-based. */
export type BoardCell = readonly [row: number, col: number];

/**
 * - guest: a clue's piece for one guest (a guest has one per clue naming them)
 * - weapon: one per weapon in play
 * - grey: a clue she hasn't found yet (end board only); fits only Unknown
 * - body: the body, fixed in the scene room once she knows it
 * - fog: filler, fixed in Unknown, splitting it into smaller nooks
 */
export type BoardPieceKind = 'guest' | 'weapon' | 'grey' | 'body' | 'fog';

/** What a piece's clues say about where it can go. Rooms only: Unknown is always allowed for guests and weapons. */
export interface BoardMarks {
  /** Rooms it can't go in. */
  not: string[];
  /** If set, the only rooms it can go in. */
  only: string[] | null;
  /** Touch symbols: the other piece with the same symbol must share an edge with it, in the same section. */
  sym: string[];
  /** Apart symbols: the other piece with the same one can't share a room with it (both in Unknown is fine). */
  anti: string[];
}

/** One piece the board needs, before it has a shape. Built from the case by `caseBoard.ts`. */
export interface BoardPiecePlan {
  id: string;
  kind: BoardPieceKind;
  /** Guest or weapon id; null for grey, body and fog. */
  who: string | null;
  /** Where it belongs: a room id or UNKNOWN. */
  section: string;
  /** Rooms only; symbols are filled in by the builder from `touches` and `apart`. */
  not: string[];
  only: string[] | null;
  /** The clue id that gave this piece (guest pieces), if any. */
  clue: string | null;
  /** A clue she doesn't have yet (the puzzle's own reward): its piece shows no marks until solved. */
  hidden?: boolean;
}

/** Everything the builder needs. */
export interface BoardPlan {
  seed: number;
  /** Room ids on the board. Unknown is always added. */
  rooms: string[];
  pieces: BoardPiecePlan[];
  /** Pairs of piece ids that must touch (a guest seen with a weapon, two guests together). Both in the same section. */
  touches: [string, string][];
  /** Pairs of piece ids that can't share a room. */
  apart: [string, string][];
  /** How many fog pieces to add to Unknown (0 for a small board). */
  fog: number;
  /** Piece ids that must never be pinned (they'd give the answer away). */
  neverPin: string[];
}

/** A piece on the finished board. */
export interface BoardPiece {
  id: string;
  kind: BoardPieceKind;
  who: string | null;
  /** Its squares in the orientation the tray shows, normalised to start at 0,0. */
  shape: BoardCell[];
  marks: BoardMarks;
  clue: string | null;
  hidden?: boolean;
}

/** A built board. Same plan, same board. */
export interface Board {
  /** Columns and rows. */
  W: number;
  H: number;
  /** Rooms on the board, then UNKNOWN. */
  sections: string[];
  /** "r,c" → section, for every square on the board (the board is a full rectangle). */
  cells: Record<string, string>;
  pieces: BoardPiece[];
  /** Where each piece really goes: its section and exact squares. */
  truth: Record<string, { section: string; cells: BoardCell[] }>;
  /** Pieces fixed at the start besides body and fog, per level. */
  pinned: Record<Difficulty, string[]>;
}

export const boardKey = (r: number, c: number) => `${r},${c}`;
