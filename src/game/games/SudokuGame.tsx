import { useState } from 'react';
import { sudokuConflicts, sudokuSolved, type SudokuPuzzle } from '../../games/sudoku.ts';
import type { GameProps } from './types.ts';

export interface SudokuData {
  /** Row-major digits, 0 = empty. Givens are included. */
  grid: number[];
}

export const sudokuInitial = (p: SudokuPuzzle): SudokuData => ({ grid: p.givens.slice() });
export const sudokuSolvedData = (p: SudokuPuzzle): SudokuData => ({ grid: p.solution.slice() });

export function SudokuGame({ puzzle, data, finished, onChange, onFinish }: GameProps<SudokuPuzzle, SudokuData>) {
  const { size, boxRows, boxCols, givens } = puzzle;
  const [selected, setSelected] = useState<number | null>(() => givens.findIndex((d) => d === 0));
  const bad = sudokuConflicts(puzzle, data.grid);
  const sel = selected ?? -1;
  const selDigit = sel >= 0 ? data.grid[sel] : 0;
  const sameUnit = (i: number) => {
    if (sel < 0) return false;
    const [r, c, sr, sc] = [Math.floor(i / size), i % size, Math.floor(sel / size), sel % size];
    return r === sr || c === sc || (Math.floor(r / boxRows) === Math.floor(sr / boxRows) && Math.floor(c / boxCols) === Math.floor(sc / boxCols));
  };

  const put = (digit: number) => {
    if (finished || sel < 0 || givens[sel]) return;
    const grid = data.grid.slice();
    grid[sel] = grid[sel] === digit ? 0 : digit;
    const next = { grid };
    if (sudokuSolved(puzzle, grid)) onFinish('won', next);
    else onChange(next);
  };

  const remaining = (d: number) => size - data.grid.filter((x) => x === d).length;

  return (
    <div className="sudoku">
      <p className="hint dark">
        Fill the grid so every row, column and box has 1 to {size} once each. Tap a square, then a number.
      </p>
      <div
        className={`sudoku-grid size-${size}`}
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${size}, minmax(0, 1fr))` }}
        role="grid"
        aria-label="Sudoku"
      >
        {data.grid.map((d, i) => {
          const r = Math.floor(i / size);
          const c = i % size;
          const classes = [
            'sudoku-cell',
            givens[i] ? 'given' : 'entry',
            i === sel ? 'selected' : sameUnit(i) ? 'peer' : '',
            d && d === selDigit && i !== sel ? 'same' : '',
            bad.has(i) && !givens[i] ? 'clash' : '',
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
              aria-label={`Row ${r + 1}, column ${c + 1}: ${d || 'empty'}${givens[i] ? ', given' : ''}`}
              onClick={() => !finished && setSelected(i)}
            >
              {d || ''}
            </button>
          );
        })}
      </div>
      {!finished && (
        <div className="number-pad" style={{ gridTemplateColumns: `repeat(${size === 6 ? 7 : 5}, 1fr)` }}>
          {Array.from({ length: size }, (_, k) => k + 1).map((d) => (
            <button key={d} className="pad-key" disabled={remaining(d) === 0} onClick={() => put(d)}>
              {d}
            </button>
          ))}
          <button className="pad-key erase" aria-label="Clear square" onClick={() => sel >= 0 && !givens[sel] && data.grid[sel] && put(data.grid[sel])}>
            Clear
          </button>
        </div>
      )}
      <p className="game-message" role="status">
        {finished ? (finished === 'won' ? 'Solved.' : 'Here is the finished grid.') : bad.size ? 'Some numbers clash.' : ''}
      </p>
    </div>
  );
}
