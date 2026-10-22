import { useState } from 'react';
import type { Clue } from '../../engine/types.ts';
import {
  clearNotes,
  sudokuConflicts,
  sudokuHint,
  sudokuReason,
  sudokuSolved,
  toggleNote,
  visibleNotes,
  type LocationSquares,
  type SudokuHint,
  type SudokuPuzzle,
} from '../../games/sudoku.ts';
import { ClueCard } from '../ClueCard.tsx';
import { HintButton, HintNote, Paw } from './Hints.tsx';
import type { SudokuData } from './saveData.ts';
import type { GameProps } from './types.ts';

/** A statement unlocked by two marked squares: their digits are a row and column on the floor plan. */
export interface SudokuStatement {
  label: string;
  clue: Clue;
  squares: LocationSquares;
  found: boolean;
}

const count = (n: number, one: string, many: string) => (n === 1 ? one : `${n} ${many}`);

/** What the cat did, in a sentence. */
function hintText(cat: string, h: SudokuHint, size: number): string {
  const row = (i: number) => Math.floor(i / size) + 1;
  const col = (i: number) => (i % size) + 1;
  switch (h.kind) {
    case 'wrong': {
      const n = Object.keys(h.squares).length;
      return `${cat} walks across the grid and sits on ${count(n, "a number that isn't right", "numbers that aren't right")}. ${n === 1 ? "It's" : "They're"} crossed in red pencil.`;
    }
    case 'nudge':
      return `${cat} curls up on the square in row ${row(h.cell)}, column ${col(h.cell)}. It can be worked out from the numbers already there.`;
    case 'why': {
      if (h.reason.kind === 'only-number')
        return `${cat} looks along its row, its column and its box. Between them they already have every number but one.`;
      const [unit, others] =
        h.reason.unit === 'box'
          ? ['its box', 'row or column']
          : h.reason.unit === 'row'
            ? [`row ${row(h.cell)}`, 'column or box']
            : [`column ${col(h.cell)}`, 'row or box'];
      return `${cat} paces up and down ${unit}. It needs a ${h.digit} somewhere, and every other empty square there already has a ${h.digit} in its ${others}.`;
    }
    case 'fill':
      return `${cat} pats the square until you look. It's a ${h.digit}.`;
  }
}

export function SudokuGame({
  puzzle,
  data,
  finished,
  helper = 'The cat',
  onChange,
  onFinish,
  statements,
  finishClues = [],
  guests,
}: GameProps<SudokuPuzzle, SudokuData> & { statements: SudokuStatement[]; finishClues?: Clue[]; guests: readonly string[] }) {
  const tags = new Map<number, string>();
  for (const st of statements) {
    tags.set(st.squares.row, `${st.label}↓`);
    tags.set(st.squares.col, `${st.label}→`);
  }
  const { size, boxRows, boxCols, givens } = puzzle;
  const [selected, setSelected] = useState<number | null>(() => givens.findIndex((d) => d === 0));
  const [note, setNote] = useState<string | null>(null);
  const [notesOn, setNotesOn] = useState(false);
  const notes = data.notes ?? {};
  const show = data.showCandidates ?? false;
  const shownNotes = (i: number) => (finished ? [] : visibleNotes(puzzle, data.grid, notes, show, i));
  const flagged = data.flagged ?? {};
  const bad = sudokuConflicts(puzzle, data.grid);
  // The square the cat sat on, until it's right; once she's been told why, the row, column or box that shows it.
  const nudged = !finished && data.nudged !== undefined && data.grid[data.nudged] !== puzzle.solution[data.nudged] ? data.nudged : -1;
  const reason = nudged >= 0 && data.explained === nudged ? sudokuReason(puzzle, data.grid, nudged) : null;
  const hintUnit = new Set(reason?.kind === 'only-place' ? reason.cells : []);
  const sel = selected ?? -1;
  const selDigit = sel >= 0 ? data.grid[sel] : 0;
  const sameUnit = (i: number) => {
    if (sel < 0) return false;
    const [r, c, sr, sc] = [Math.floor(i / size), i % size, Math.floor(sel / size), sel % size];
    return r === sr || c === sc || (Math.floor(r / boxRows) === Math.floor(sr / boxRows) && Math.floor(c / boxCols) === Math.floor(sc / boxCols));
  };

  const commit = (grid: number[], extra: Partial<SudokuData> = {}) => {
    const next = { ...data, ...extra, grid };
    if (sudokuSolved(puzzle, grid)) onFinish('won', next);
    else onChange(next);
  };

  const put = (digit: number) => {
    if (finished || sel < 0 || givens[sel]) return;
    if (notesOn && !data.grid[sel]) {
      commit(data.grid, { notes: toggleNote(puzzle, data.grid, notes, show, sel, digit) });
      return;
    }
    const grid = data.grid.slice();
    grid[sel] = grid[sel] === digit ? 0 : digit;
    commit(grid);
  };

  const clear = () => {
    if (finished || sel < 0 || givens[sel]) return;
    if (data.grid[sel]) put(data.grid[sel]);
    else if (shownNotes(sel).length) commit(data.grid, { notes: clearNotes(notes, sel) });
  };

  const askHint = () => {
    if (finished) return;
    const h = sudokuHint(puzzle, data.grid, data);
    if (!h) return;
    const hints = (data.hints ?? 0) + 1;
    setNote(hintText(helper, h, size));
    if (h.kind === 'wrong') commit(data.grid, { hints, flagged: { ...flagged, ...h.squares } });
    else {
      setSelected(h.cell);
      if (h.kind === 'nudge') commit(data.grid, { hints, nudged: h.cell });
      else if (h.kind === 'why') commit(data.grid, { hints, explained: h.cell });
      else {
        const grid = data.grid.slice();
        grid[h.cell] = h.digit;
        commit(grid, { hints });
      }
    }
  };

  const remaining = (d: number) => size - data.grid.filter((x) => x === d).length;

  return (
    <div className="sudoku">
      <p className="hint dark">
        Fill the grid so every row, column and box has 1 to {size} once each. Tap a square, then a number.
        {statements.length > 0 &&
          ' Lettered squares point at the floor plan: ↓ is the row, → the column. Fill both to hear that statement.'}
        {finishClues.length > 0 && ' Finish the grid for one more.'}
      </p>
      {!finished && (
        <div className="hint-bar">
          <div className="hint-row">
            <label className="check-row">
              <input type="checkbox" checked={show} onChange={(e) => commit(data.grid, { showCandidates: e.target.checked })} />
              <span className="check-box" aria-hidden="true" />
              Show possible numbers
            </label>
            <HintButton helper={helper} onAsk={askHint} />
          </div>
          {note && <HintNote text={note} onClose={() => setNote(null)} />}
        </div>
      )}
      <div
        className={`sudoku-grid size-${size}`}
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${size}, minmax(0, 1fr))` }}
        role="grid"
        aria-label="Sudoku"
      >
        {data.grid.map((d, i) => {
          const r = Math.floor(i / size);
          const c = i % size;
          const cellNotes = shownNotes(i);
          const wrong = !finished && !!d && flagged[i] === d;
          const classes = [
            'sudoku-cell',
            givens[i] ? 'given' : 'entry',
            i === sel ? 'selected' : sameUnit(i) ? 'peer' : '',
            d && d === selDigit && i !== sel ? 'same' : '',
            bad.has(i) && !givens[i] ? 'clash' : '',
            tags.has(i) ? 'tagged' : '',
            wrong ? 'wrong' : '',
            hintUnit.has(i) ? 'hint-unit' : '',
            i === nudged ? 'nudged' : '',
          ].join(' ');
          return (
            <button
              key={i}
              role="gridcell"
              className={classes}
              style={{
                borderTopWidth: r % boxRows === 0 ? 2.5 : 0.5,
                borderLeftWidth: c % boxCols === 0 ? 2.5 : 0.5,
                borderBottomWidth: r === size - 1 ? 2.5 : 0.5,
                borderRightWidth: c === size - 1 ? 2.5 : 0.5,
              }}
              aria-label={`Row ${r + 1}, column ${c + 1}: ${d || 'empty'}${givens[i] ? ', given' : ''}${wrong ? ', crossed out as wrong' : ''}${i === nudged ? `, ${helper} is sitting here` : ''}${tags.has(i) ? `, square ${tags.get(i)}` : ''}${cellNotes.length ? `, notes ${cellNotes.join(', ')}` : ''}`}
              onClick={() => !finished && setSelected(i)}
            >
              {tags.has(i) && <span className="cell-tag">{tags.get(i)}</span>}
              {d || ''}
              {cellNotes.length > 0 && (
                <span className={`cell-notes size-${size}`} aria-hidden="true">
                  {Array.from({ length: size }, (_, k) => k + 1).map((n) => (
                    <span key={n} className={n === selDigit && cellNotes.includes(n) ? 'same' : ''}>
                      {cellNotes.includes(n) ? n : ''}
                    </span>
                  ))}
                </span>
              )}
              {i === nudged && <Paw />}
            </button>
          );
        })}
      </div>
      {!finished && (
        <div className="number-pad" style={{ gridTemplateColumns: `repeat(${size === 6 ? 4 : 6}, 1fr)` }}>
          {Array.from({ length: size }, (_, k) => k + 1).map((d) => (
            <button key={d} className="pad-key" disabled={!notesOn && remaining(d) === 0} onClick={() => put(d)}>
              {d}
            </button>
          ))}
          <button className="pad-key erase" aria-label="Clear square" onClick={clear}>
            Clear
          </button>
          <button className={`pad-key notes-key ${notesOn ? 'on' : ''}`} aria-pressed={notesOn} onClick={() => setNotesOn(!notesOn)}>
            Notes
          </button>
        </div>
      )}
      <p className="game-message" role="status">
        {finished ? (finished === 'won' ? 'Solved.' : 'Here is the finished grid.') : bad.size ? 'Some numbers clash.' : ''}
      </p>
      {(statements.length > 0 || finishClues.length > 0) && (
        <section className="statements">
          <h2>Statements</h2>
          {statements.map((st) => {
            const digit = (i: number) => (data.grid[i] ? data.grid[i] : null);
            return (
              <div key={st.clue.id} className={`statement ${st.found ? 'found' : ''}`}>
                <span className="statement-label" aria-hidden="true">
                  {st.label}
                </span>
                <ClueCard
                  clue={st.clue}
                  guests={guests}
                  compact
                  coords={{ row: digit(st.squares.row), col: digit(st.squares.col), found: st.found }}
                />
              </div>
            );
          })}
          {finishClues.map((clue) => (
            <div key={clue.id} className={`statement ${finished ? 'found' : 'locked'}`}>
              {/* No letter: no square in the grid points at this one. */}
              <span className="statement-label" aria-hidden="true">
                {finished ? (
                  '✓'
                ) : (
                  <svg className="statement-lock" viewBox="0 0 16 16">
                    <rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor" />
                    <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                )}
              </span>
              {finished ? <ClueCard clue={clue} guests={guests} compact /> : <p className="statement-locked">Finish the grid to hear this one.</p>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
