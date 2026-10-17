import { useEffect, useRef, useState } from 'react';
import { crosswordWon, emptyEntries, rowSolved, setCell, shadedIndex, type CrosswordPuzzle } from '../../games/crossword.ts';
import { TypingInput, focusTyping, hasFinePointer } from './TypingInput.tsx';
import type { GameProps } from './types.ts';

export interface CrosswordData {
  /** One string per row, a character per square, ' ' for empty. */
  entries: string[];
}

export const crosswordInitial = (p: CrosswordPuzzle): CrosswordData => ({ entries: emptyEntries(p) });
export const crosswordSolved = (p: CrosswordPuzzle): CrosswordData => ({ entries: p.rows.map((r) => r.word) });

interface Cursor {
  row: number;
  /** Index into the row's word. */
  i: number;
}

export function CrosswordGame({ puzzle, data, finished, onChange, onFinish }: GameProps<CrosswordPuzzle, CrosswordData>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const entries = data.entries.length === puzzle.rows.length ? data.entries : emptyEntries(puzzle);
  const [cursor, setCursor] = useState<Cursor>(() => ({ row: 0, i: Math.max(0, entries[0].indexOf(' ')) }));
  const { rows, width, column } = puzzle;

  useEffect(() => {
    if (!finished && hasFinePointer()) focusTyping(inputRef);
  }, []); // once, when the game opens

  const len = (r: number) => rows[r].word.length;
  const firstEmpty = (r: number, e: readonly string[]) => Math.max(0, e[r].indexOf(' '));

  const select = (row: number, i: number) => {
    if (finished) return;
    setCursor({ row, i });
    focusTyping(inputRef);
  };

  const commit = (next: string[]) => {
    if (crosswordWon(puzzle, next)) onFinish('won', { entries: next });
    else onChange({ entries: next });
  };

  /** Next row that still has an empty square, after `from`. */
  const nextOpenRow = (from: number, e: readonly string[]) => {
    for (let k = 1; k <= rows.length; k++) {
      const r = (from + k) % rows.length;
      if (e[r].includes(' ')) return r;
    }
    return from;
  };

  const type = (deleted: number, inserted: string) => {
    if (finished) return;
    let e = entries.slice();
    let { row, i } = cursor;
    for (let d = 0; d < deleted; d++) {
      // Clear this square if it has a letter, else step back and clear that one.
      if (e[row][i] === ' ' && i > 0) i--;
      e = setCell(e, row, i, '');
    }
    for (const letter of inserted) {
      e = setCell(e, row, i, letter);
      if (i < len(row) - 1) i++;
      else if (!e[row].includes(' ')) {
        // Row full: move on to the next unfinished clue.
        row = nextOpenRow(row, e);
        i = firstEmpty(row, e);
      }
    }
    setCursor({ row, i });
    commit(e);
  };

  const arrow = (key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown') => {
    const { row, i } = cursor;
    if (key === 'ArrowLeft') return setCursor({ row, i: Math.max(0, i - 1) });
    if (key === 'ArrowRight') return setCursor({ row, i: Math.min(len(row) - 1, i + 1) });
    const r = Math.min(rows.length - 1, Math.max(0, row + (key === 'ArrowUp' ? -1 : 1)));
    // Keep the same grid column where the new row allows it.
    const col = rows[row].start + i;
    setCursor({ row: r, i: Math.min(len(r) - 1, Math.max(0, col - rows[r].start)) });
  };

  const active = rows[cursor.row];
  const shadedLetters = rows.map((_, r) => entries[r][shadedIndex(puzzle, r)]).join('');

  return (
    <div className="crossword">
      <p className="hint dark">
        Read down the shaded squares to find what the body was lying by. Fill in enough answers to read it; you don't need them all.
      </p>
      {!finished && (
        <p className="crossword-clue" aria-live="polite">
          <b>{cursor.row + 1}.</b> {active.clue} <span className="muted-on-card">({active.word.length})</span>
        </p>
      )}
      <div className="typing-host">
        <div className="crossword-grid" role="grid" aria-label="Crossword" style={{ gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))` }}>
          {rows.map((row, r) => {
            const solved = rowSolved(puzzle, entries, r);
            return Array.from({ length: width }, (_, col) => {
                const i = col - row.start;
                if (i < 0 || i >= row.word.length) return <span key={`${r}-${col}`} className="crossword-gap" />;
                const letter = entries[r][i]?.trim() ?? '';
                const isCursor = !finished && focused && cursor.row === r && cursor.i === i;
                const inRow = !finished && cursor.row === r;
                return (
                  <button
                    key={`${r}-${col}`}
                    className={`crossword-cell ${col === column ? 'shaded' : ''} ${inRow ? 'in-row' : ''} ${isCursor ? 'cursor' : ''} ${solved ? 'solved' : ''}`}
                    aria-label={`${r + 1} across, square ${i + 1}${letter ? `, ${letter}` : ''}${col === column ? ', shaded' : ''}`}
                    // Keep the keyboard up while moving between squares.
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => select(r, i)}
                    disabled={!!finished}
                  >
                    {i === 0 && (
                      <span className="crossword-num" aria-hidden="true">
                        {r + 1}
                      </span>
                    )}
                    {letter}
                  </button>
                );
              });
          })}
        </div>
        {!finished && (
          <TypingInput
            inputRef={inputRef}
            value={entries[cursor.row].slice(0, cursor.i).replace(/ /g, '-')}
            onType={type}
            onEnter={() => {
              const r = nextOpenRow(cursor.row, entries);
              setCursor({ row: r, i: firstEmpty(r, entries) });
            }}
            onArrow={arrow}
            onFocusChange={setFocused}
            enterKeyHint="next"
            label={`${cursor.row + 1} across: ${active.clue}`}
          />
        )}
      </div>
      <p className="game-message" role="status">
        {finished ? `The shaded squares spell ${puzzle.answer}.` : focused ? '' : 'Tap a square to type.'}
      </p>
      {finished === null && shadedLetters.trim() && (
        <p className="crossword-shaded" aria-label="Shaded letters so far">
          {[...shadedLetters].map((l, k) => (
            <span key={k}>{l.trim() || '·'}</span>
          ))}
        </p>
      )}
      <ol className="crossword-clues">
        {rows.map((row, r) => (
          <li key={r}>
            <button
              className={`crossword-clue-row ${!finished && cursor.row === r ? 'current' : ''} ${rowSolved(puzzle, entries, r) ? 'solved' : ''}`}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => select(r, firstEmpty(r, entries))}
              disabled={!!finished}
            >
              <b>{r + 1}.</b> {row.clue}
              {finished && <span className="crossword-answer"> {row.word}</span>}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
