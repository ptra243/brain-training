import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import {
  CROSSWORD_SIZE,
  cellKey,
  crosswordFull,
  crosswordHint,
  crosswordWon,
  entryLabel,
  entryCells,
  entrySolved,
  letterAt,
  shadedRight,
  type CrosswordEntry,
  type CrosswordHint,
  type CrosswordPuzzle,
  type Direction,
} from '../../games/crossword.ts';
import { HintButton, HintNote } from './Hints.tsx';
import { TypingInput } from './TypingInput.tsx';
import { focusTyping, hasFinePointer } from './typing.ts';
import { crosswordInitial, type CrosswordData } from './saveData.ts';
import type { GameProps } from './types.ts';
import styles from './CrosswordGame.module.css';

interface Cursor {
  r: number;
  c: number;
  dir: Direction;
}

interface Square {
  across?: CrosswordEntry;
  down?: CrosswordEntry;
  number?: number;
  /** 1-based place in the hidden word, for shaded squares. */
  shaded?: number;
}

const label = entryLabel;

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh'];
const count = (n: number, one: string, many: string) => (n === 1 ? one : `${n} ${many}`);

/** What the cat did, in a sentence. */
function hintText(cat: string, h: CrosswordHint): string {
  switch (h.kind) {
    case 'wrong': {
      const n = Object.keys(h.squares).length;
      return `${cat} pads across the grid and sits on ${count(n, "a letter that isn't right", "letters that aren't right")}. ${n === 1 ? "It's" : "They're"} crossed in red pencil.`;
    }
    case 'nudge':
      return h.shadedSquares
        ? `${cat} curls up on ${label(h.entry)}. ${count(h.shadedSquares, 'One of its squares is', 'of its squares are')} shaded, so it's worth a go.`
        : `${cat} curls up on ${label(h.entry)}. Try that one next.`;
    case 'letter':
      return `${cat} knocks a pencil off the table. It rolls to ${label(h.entry)}: the ${ORDINALS[h.index]} letter is ${h.letter}.`;
  }
}

export function CrosswordGame({ puzzle, data: savedData, finished, helper = 'The cat', onChange, onFinish }: GameProps<CrosswordPuzzle, CrosswordData>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // Letters typed on a grid of another size (medium and hard grids grew) don't fit this one: start afresh.
  const data = savedData && (savedData.size ?? CROSSWORD_SIZE) === puzzle.width ? savedData : crosswordInitial();
  const flagged = data.flagged ?? {};
  // Saves from the old one-line crossword have no `letters`: start afresh.
  const letters = data.letters ?? {};
  const { entries, shaded, answer } = puzzle;

  const squares = useMemo(() => {
    const m = new Map<string, Square>();
    for (const e of entries) {
      entryCells(e).forEach(([r, c], i) => {
        const sq = m.get(cellKey(r, c)) ?? {};
        sq[e.dir] = e;
        if (i === 0) sq.number = e.number;
        m.set(cellKey(r, c), sq);
      });
    }
    shaded.forEach(([r, c], k) => (m.get(cellKey(r, c))!.shaded = k + 1));
    return m;
  }, [entries, shaded]);

  // Only draw the rows and columns the words use.
  const keys = [...squares.keys()].map((k) => k.split(',').map(Number));
  const top = Math.min(...keys.map(([r]) => r));
  const left = Math.min(...keys.map(([, c]) => c));
  const rows = Math.max(...keys.map(([r]) => r)) - top + 1;
  const cols = Math.max(...keys.map(([, c]) => c)) - left + 1;

  const firstEmpty = (e: CrosswordEntry, l: Record<string, string>) => {
    const cells = entryCells(e);
    return cells.find(([r, c]) => !letterAt(l, r, c)) ?? cells[0];
  };
  const start = (e: CrosswordEntry, l: Record<string, string>): Cursor => {
    const [r, c] = firstEmpty(e, l);
    return { r, c, dir: e.dir };
  };

  const [cursor, setCursor] = useState<Cursor>(() => start(entries[0], letters));
  const sq = squares.get(cellKey(cursor.r, cursor.c));
  const active = sq?.[cursor.dir] ?? sq?.across ?? sq?.down ?? entries[0];
  const activeCells = entryCells(active);
  const at = activeCells.findIndex(([r, c]) => r === cursor.r && c === cursor.c);

  const focusOnOpen = useEffectEvent(() => {
    if (!finished && hasFinePointer()) focusTyping(inputRef);
  });
  useEffect(() => focusOnOpen(), []); // once, when the game opens

  // Keep the square she's on in sight: big grids scroll sideways, and the clue list sits below the grid.
  const jump = useRef<ScrollBehavior | null>(null);
  useEffect(() => {
    const behavior = jump.current;
    jump.current = null;
    if (!behavior) return;
    const see = (r: number, c: number) => gridRef.current?.querySelector(`[data-cell="${cellKey(r, c)}"]`)?.scrollIntoView({ behavior, block: 'nearest', inline: 'nearest' });
    // Show a couple of squares ahead in the word's direction first; the cursor square wins if both can't fit.
    if (at >= 0) see(...activeCells[Math.min(at + 2, activeCells.length - 1)]);
    see(cursor.r, cursor.c);
  });
  const moveTo = (next: Cursor, behavior: ScrollBehavior = 'auto') => {
    jump.current = behavior;
    setCursor(next);
  };

  const commit = (next: Record<string, string>, extra: Partial<CrosswordData> = {}) => {
    const d = { ...data, ...extra, letters: next, size: puzzle.width };
    if (crosswordWon(puzzle, next)) onFinish('won', d);
    else onChange(d);
  };

  const askHint = () => {
    if (finished) return;
    const h = crosswordHint(puzzle, letters, { flagged, nudged: data.nudged });
    if (!h) return;
    const hints = (data.hints ?? 0) + 1;
    setNote(hintText(helper, h));
    if (h.kind === 'wrong') commit(letters, { hints, flagged: { ...flagged, ...h.squares } });
    else if (h.kind === 'nudge') {
      moveTo(start(h.entry, letters), 'smooth');
      commit(letters, { hints, nudged: label(h.entry) });
    } else {
      const key = cellKey(...h.square);
      const rest = { ...flagged };
      delete rest[key];
      moveTo({ r: h.square[0], c: h.square[1], dir: h.entry.dir }, 'smooth');
      commit({ ...letters, [key]: h.letter }, { hints, flagged: rest });
    }
  };

  /** The next word after `e` (across then down) that still has an empty square. */
  const nextOpen = (e: CrosswordEntry, l: Record<string, string>) => {
    const k = entries.indexOf(e);
    for (let d = 1; d <= entries.length; d++) {
      const cand = entries[(k + d) % entries.length];
      if (entryCells(cand).some(([r, c]) => !letterAt(l, r, c))) return cand;
    }
    return e;
  };

  const select = (r: number, c: number) => {
    if (finished) return;
    const here = squares.get(cellKey(r, c))!;
    let dir = cursor.dir;
    // Tapping the square you're on turns the word round, where there is one the other way.
    if (r === cursor.r && c === cursor.c) dir = dir === 'across' ? 'down' : 'across';
    if (!here[dir]) dir = dir === 'across' ? 'down' : 'across';
    moveTo({ r, c, dir });
    focusTyping(inputRef);
  };

  const selectEntry = (e: CrosswordEntry) => {
    if (finished) return;
    moveTo(start(e, letters), 'smooth');
    focusTyping(inputRef);
  };

  const type = (deleted: number, inserted: string) => {
    if (finished) return;
    const l = { ...letters };
    let e = active;
    let i = Math.max(0, at);
    let cells = entryCells(e);
    for (let d = 0; d < deleted; d++) {
      // Clear this square if it has a letter, else step back and clear that one.
      if (!l[cellKey(...cells[i])] && i > 0) i--;
      delete l[cellKey(...cells[i])];
    }
    for (const letter of inserted) {
      l[cellKey(...cells[i])] = letter;
      if (i < cells.length - 1) i++;
      else if (cells.every(([r, c]) => letterAt(l, r, c))) {
        // Word full: move on to the next one with gaps.
        e = nextOpen(e, l);
        cells = entryCells(e);
        const [er, ec] = firstEmpty(e, l);
        i = cells.findIndex(([r, c]) => r === er && c === ec);
      }
    }
    moveTo({ r: cells[i][0], c: cells[i][1], dir: e.dir });
    commit(l);
  };

  const arrow = (key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown') => {
    const [dr, dc] = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[key];
    const dir: Direction = dc ? 'across' : 'down';
    for (let r = cursor.r + dr, c = cursor.c + dc; r >= 0 && c >= 0 && r < puzzle.height && c < puzzle.width; r += dr, c += dc) {
      const here = squares.get(cellKey(r, c));
      if (here) return moveTo({ r, c, dir: here[dir] ? dir : dir === 'across' ? 'down' : 'across' });
    }
    if (squares.get(cellKey(cursor.r, cursor.c))?.[dir]) moveTo({ ...cursor, dir });
  };

  const spelled = shaded.map(([r, c]) => letterAt(letters, r, c));
  const wordRead = !finished && shadedRight(puzzle, letters);
  const fullButWrong = !finished && crosswordFull(puzzle, letters);
  // Past 7 squares the grid keeps 44px squares and scrolls sideways in its own box.
  const wide = cols > CROSSWORD_SIZE;

  const clueList = (dir: Direction) => (
    <section className={styles.clueGroup}>
      <h3>{dir === 'across' ? 'Across' : 'Down'}</h3>
      <ol className={styles.clues}>
        {entries
          .filter((e) => e.dir === dir)
          .map((e) => (
            <li key={label(e)}>
              <button
                className={`${styles.clueRow} ${!finished && e === active ? styles.current : ''} ${entrySolved(e, letters) ? styles.solved : ''}`}
                onPointerDown={(ev) => ev.preventDefault()}
                onClick={() => selectEntry(e)}
                disabled={!!finished}
              >
                <b>{e.number}.</b> {e.clue}
                {finished && <span className={styles.answer}> {e.word}</span>}
              </button>
            </li>
          ))}
      </ol>
    </section>
  );

  return (
    <div>
      <p className="hint dark">
        The numbered shaded squares spell what the body was lying by: 1 is its first letter. Once you can read it you can take the clue, or
        finish the grid first.
      </p>
      {!finished && (
        <div className={styles.top}>
          <div className={styles.clue}>
            <p aria-live="polite">
              <b>
                {active.number} {active.dir}.
              </b>{' '}
              {active.clue} <span className={styles.mutedOnCard}>({active.word.length})</span>
            </p>
            <HintButton helper={helper} onAsk={askHint} />
          </div>
          {note && <HintNote text={note} onClose={() => setNote(null)} />}
          {wordRead && (
            <div className={styles.read}>
              <p>
                The shaded squares spell <b>{answer}</b>. Finish the grid, or take the clue now.
              </p>
              <button className="secondary" onPointerDown={(e) => e.preventDefault()} onClick={() => onFinish('won', { ...data, size: puzzle.width })}>
                Take the clue
              </button>
            </div>
          )}
        </div>
      )}
      <div className={`typing-host ${wide ? styles.scroll : ''}`}>
        <div
          ref={gridRef}
          className={`${styles.grid} ${wide ? styles.wide : ''}`}
          role="grid"
          aria-label="Crossword"
          style={
            wide
              ? { gridTemplateColumns: `repeat(${cols}, 2.75rem)` }
              : { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, maxWidth: `${cols * 3.4}rem` }
          }
        >
          {Array.from({ length: rows }, (_, y) =>
            Array.from({ length: cols }, (_, x) => {
              const r = top + y;
              const c = left + x;
              const here = squares.get(cellKey(r, c));
              if (!here) return <span key={`${r}-${c}`} className={styles.gap} />;
              const letter = letterAt(letters, r, c);
              const isCursor = !finished && focused && cursor.r === r && cursor.c === c;
              const inWord = !finished && activeCells.some(([ar, ac]) => ar === r && ac === c);
              const solved = (here.across && entrySolved(here.across, letters)) || (here.down && entrySolved(here.down, letters));
              const wrong = !finished && !!letter && flagged[cellKey(r, c)] === letter;
              const words = [here.across, here.down].filter(Boolean).map((e) => label(e!)).join(' and ');
              return (
                <button
                  key={`${r}-${c}`}
                  data-cell={cellKey(r, c)}
                  className={`${styles.cell} ${here.shaded ? styles.shaded : ''} ${inWord ? styles.inRow : ''} ${isCursor ? styles.cursor : ''} ${solved ? styles.solved : ''} ${wrong ? styles.wrong : ''}`}
                  aria-label={`${words}${letter ? `, ${letter}` : ''}${wrong ? ', crossed out as wrong' : ''}${here.shaded ? `, shaded square ${here.shaded}` : ''}`}
                  // Keep the keyboard up while moving between squares.
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => select(r, c)}
                  disabled={!!finished}
                >
                  {here.number && (
                    <span className={styles.num} aria-hidden="true">
                      {here.number}
                    </span>
                  )}
                  {here.shaded && (
                    <span className={styles.order} aria-hidden="true">
                      {here.shaded}
                    </span>
                  )}
                  {letter}
                </button>
              );
            }),
          )}
        </div>
        {!finished && (
          <TypingInput
            inputRef={inputRef}
            value={activeCells
              .slice(0, Math.max(0, at))
              .map(([r, c]) => letterAt(letters, r, c) || '-')
              .join('')}
            onType={type}
            onEnter={() => moveTo(start(nextOpen(active, letters), letters))}
            onArrow={arrow}
            onFocusChange={setFocused}
            enterKeyHint="next"
            label={`${active.number} ${active.dir}: ${active.clue}`}
          />
        )}
      </div>
      <p className="game-message" role="status">
        {finished
          ? `The shaded squares spell ${answer}.`
          : fullButWrong
            ? `Every square is filled, but some letters aren't right. ${helper} can point them out.`
            : focused
              ? ''
              : wide
                ? 'Tap a square to type, or a clue to jump to it. Slide the grid sideways to see the rest.'
                : 'Tap a square to type. Tap it again to switch between across and down.'}
      </p>
      {finished === null && spelled.some(Boolean) && (
        <p className={styles.shadedWord} aria-label="Shaded letters so far">
          {spelled.map((l, k) => (
            <span key={k}>{l || '·'}</span>
          ))}
        </p>
      )}
      {clueList('across')}
      {clueList('down')}
    </div>
  );
}
