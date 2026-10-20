import { useState } from 'react';
import {
  autoDots,
  catConflicts,
  catMoveId,
  catMoves,
  catsHint,
  catsSolved,
  type CatHint,
  type CatMark,
  type CatMove,
  type CatPuzzle,
  type CatUnit,
} from '../../games/cats.ts';
import { HintButton, HintNote, Paw } from './Hints.tsx';
import type { CatsData } from './saveData.ts';
import type { GameProps } from './types.ts';

const ZONE_TINTS = ['#e9c99a', '#b9d29a', '#b7b6e3', '#eab2a8', '#a9d4d9', '#f0e08e', '#dcb0d6', '#c4c7b8'];
const ZONE_NAMES = ['tan', 'green', 'lilac', 'pink', 'blue', 'yellow', 'mauve', 'grey'];

function CatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="cat-icon" aria-hidden="true">
      <path d="M5 4 L9 8.5 H15 L19 4 L19.5 12.5 A7.5 7 0 0 1 4.5 12.5 Z" />
      <circle cx="9.3" cy="13" r="1.2" className="eye" />
      <circle cx="14.7" cy="13" r="1.2" className="eye" />
    </svg>
  );
}

const cats = (marks: Record<string, CatMark>) =>
  Object.entries(marks)
    .filter(([, m]) => m === 'cat')
    .map(([k]) => k.split(',').map(Number) as [number, number]);

const count = (n: number, one: string, many: string) => (n === 1 ? one : `${n} ${many}`);

const unitName = (u: CatUnit) =>
  u.kind === 'zone' ? `the ${ZONE_NAMES[u.index % ZONE_NAMES.length]} colour` : `${u.kind} ${u.index + 1}`;

/** What the cat did, in a sentence. */
function hintText(cat: string, h: CatHint, p: CatPuzzle): string {
  switch (h.kind) {
    case 'wrong': {
      const n = Object.keys(h.squares).length;
      return `${cat} sits on ${count(n, "a mark that isn't right", "marks that aren't right")}. ${n === 1 ? "It's" : "They're"} crossed in red pencil.`;
    }
    case 'tidy': {
      const n = Object.keys(h.marks).length;
      return `${cat} knocks ${count(n, 'the last wrong mark', 'wrong marks')} off the board.`;
    }
    case 'nudge':
      return h.move.kind === 'look-ahead'
        ? `${cat} sits in ${unitName(h.move.unit)}. Only ${h.move.open} squares are left there, but this one takes some looking ahead.`
        : `${cat} stretches out along ${unitName(h.move.unit)}. Have a look there next.`;
    case 'why': {
      const m = h.move;
      const unit = unitName(m.unit);
      if (m.kind === 'cat')
        return moveSquares(p, m).unit.size === 1
          ? `${cat} sits on ${unit}. It's only one square, so its cat has to go there.`
          : `${cat} sniffs every square in ${unit}. All but one are ruled out, so its cat goes in the last one.`;
      if (m.kind === 'dots')
        return `${cat} bats at ${count(m.squares.length, 'a square', 'squares')} outside ${unit}. A cat there would rule out every square ${unit} has left, so no cat can go there.`;
      return `${cat} tries each square in ${unit}. All but one leave some row, column or colour with nowhere to go, a few cats later.`;
    }
    case 'move': {
      const m = h.move;
      if (m.kind === 'dots') return `${cat} dots ${count(m.squares.length, 'that square', 'those squares')} for you.`;
      return `${cat} curls up on the right square in ${unitName(m.unit)} and won't move. A cat goes there.`;
    }
  }
}

/** Squares to light up for a move: the whole unit, and once she's been told why, the squares it's about. */
function moveSquares(p: CatPuzzle, m: CatMove): { unit: Set<string>; targets: Set<string> } {
  const unit = new Set<string>();
  for (let r = 0; r < p.size; r++) {
    for (let c = 0; c < p.size; c++) {
      const inUnit = m.unit.kind === 'row' ? r === m.unit.index : m.unit.kind === 'column' ? c === m.unit.index : p.zones[r][c] === m.unit.index;
      if (inUnit) unit.add(`${r},${c}`);
    }
  }
  // A look-ahead move's square is the answer itself: keep it for the last hint.
  const squares = m.kind === 'dots' ? m.squares : m.kind === 'cat' ? [m.square] : [];
  const targets = new Set(squares.map(([r, c]) => `${r},${c}`));
  return { unit, targets };
}

export function CatsGame({ puzzle, data, finished, helper = 'The cat', onChange, onFinish }: GameProps<CatPuzzle, CatsData>) {
  const n = puzzle.size;
  const [note, setNote] = useState<string | null>(null);
  const flagged = data.flagged ?? {};
  const isWrong = (key: string) => !finished && !!data.marks[key] && flagged[key] === data.marks[key];
  const placed = cats(data.marks);
  const bad = catConflicts(puzzle, placed);
  // Dots every cat implies (row, column, colour, touching). Not saved: they go when the cat does.
  // A cat crossed out as wrong dots nothing.
  const implied = autoDots(puzzle, placed.filter(([r, c]) => !isWrong(`${r},${c}`)));
  // What the last hint pointed at, while that move is still to make.
  const move = !finished && data.nudged ? catMoves(puzzle, data.marks).find((m) => catMoveId(m) === data.nudged) : undefined;
  const lit = move ? moveSquares(puzzle, move) : null;
  const explained = !!move && data.explained === data.nudged;

  const commit = (marks: Record<string, CatMark>, extra: Partial<CatsData> = {}) => {
    const next = { ...data, ...extra, marks };
    if (catsSolved(puzzle, cats(marks))) onFinish('won', next);
    else onChange(next);
  };

  const tap = (r: number, c: number) => {
    if (finished) return;
    const key = `${r},${c}`;
    const marks = { ...data.marks };
    const now = marks[key];
    // A square a cat has already dotted goes straight to a cat on the first tap.
    if (!now) marks[key] = implied.has(key) ? 'cat' : 'dot';
    else if (now === 'dot') marks[key] = 'cat';
    else delete marks[key];
    commit(marks);
  };

  const askHint = () => {
    if (finished) return;
    const h = catsHint(puzzle, data.marks, data);
    if (!h) return;
    const hints = (data.hints ?? 0) + 1;
    setNote(hintText(helper, h, puzzle));
    if (h.kind === 'wrong') commit(data.marks, { hints, flagged: { ...flagged, ...h.squares } });
    else if (h.kind === 'nudge') commit(data.marks, { hints, nudged: catMoveId(h.move) });
    else if (h.kind === 'why') commit(data.marks, { hints, explained: catMoveId(h.move) });
    else {
      const marks = { ...data.marks };
      for (const [key, m] of Object.entries(h.marks)) {
        if (m) marks[key] = m;
        else delete marks[key];
      }
      commit(marks, { hints });
    }
  };

  const zone = (r: number, c: number) => (r < 0 || c < 0 || r >= n || c >= n ? -1 : puzzle.zones[r][c]);

  return (
    <div className="cats">
      <p className="hint dark">
        Put one cat in every row, every column and every colour. Cats can't touch, not even corner to corner. Tap once
        for a dot (your note that no cat goes there), twice for a cat. Each cat dots the squares it rules out for you.
      </p>
      {!finished && (
        <div className="hint-bar">
          <HintButton helper={helper} onAsk={askHint} />
          {note && <HintNote text={note} onClose={() => setNote(null)} />}
        </div>
      )}
      <div
        className="cat-grid"
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${n}, minmax(0, 1fr))` }} role="grid" aria-label="Cat puzzle">
        {Array.from({ length: n }, (_, r) =>
          Array.from({ length: n }, (_, c) => {
            const key = `${r},${c}`;
            const z = zone(r, c);
            const own = data.marks[key];
            const mark = own ?? (implied.has(key) ? 'dot' : undefined);
            const wrong = isWrong(key);
            const inUnit = !!lit?.unit.has(key);
            const target = explained && !!lit?.targets.has(key);
            const wall = (dr: number, dc: number) => (zone(r + dr, c + dc) !== z ? 3 : 1);
            return (
              <button
                key={`${r}-${c}`}
                role="gridcell"
                className={`cat-cell ${bad.has(key) && !wrong ? 'clash' : ''} ${wrong ? 'wrong' : ''} ${inUnit ? 'hint-unit' : ''}`}
                style={{
                  background: ZONE_TINTS[z % ZONE_TINTS.length],
                  borderTopWidth: wall(-1, 0),
                  borderLeftWidth: wall(0, -1),
                  borderBottomWidth: wall(1, 0),
                  borderRightWidth: wall(0, 1),
                }}
                aria-label={`Row ${r + 1}, column ${c + 1}, ${ZONE_NAMES[z % ZONE_NAMES.length]}: ${mark === 'cat' ? 'cat' : mark === 'dot' ? 'dot' : 'empty'}${wrong ? ', crossed out as wrong' : ''}${target ? `, ${helper} is pointing here` : ''}`}
                onClick={() => tap(r, c)}
              >
                {mark === 'cat' ? <CatIcon /> : mark === 'dot' ? <span className={`dot ${own ? '' : 'auto'}`} /> : null}
                {target && <Paw />}
              </button>
            );
          }),
        )}
      </div>
      <p className="game-message" role="status">
        {finished ? (finished === 'won' ? 'Every cat is in its place.' : 'Here is where the cats go.') : `${placed.length} of ${n} cats placed.`}
      </p>
    </div>
  );
}
