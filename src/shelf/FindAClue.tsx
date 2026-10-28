import { useEffect, useRef, useState } from 'react';
import type { GameKind } from '../engine/types.ts';
import { DIFFICULTY_LABEL } from '../game/labels.ts';
import { victimLine } from '../game/names.ts';
import { GAMES } from '../game/games/registry.tsx';
import styles from './FindAClue.module.css';
import { clueRows, hideLabel, openingText, plural, visibleRows, type ClueRow } from './findAClue.ts';
import { PuzzlePage } from './PuzzlePage.tsx';
import type { QuickBook, SampleCase } from './useQuickBook.ts';
import { loadHideFinished, markOpeningSeen, openingSeen, saveHideFinished } from './shelfStore.ts';

function Line({ row, onPick }: { row: ClueRow; onPick: (row: ClueRow) => void }) {
  const meta = row.locked
    ? 'Opens when the other games are done'
    : row.done
      ? `Solved · ${plural(row.clues, 'clue')} found`
      : [GAMES[row.kind].name, row.level ? DIFFICULTY_LABEL[row.level] : null, plural(row.clues, 'clue')].filter(Boolean).join(' · ');
  return (
    <li>
      <button type="button" className={`${styles.choice} ${row.done ? styles.done : ''}`} disabled={row.locked} onClick={() => onPick(row)}>
        <span className={styles.story}>{row.story}</span>
        <span className={styles.meta}>
          <span>{meta}</span>
          {row.locked ? null : <b>p. {row.page}</b>}
        </span>
      </button>
    </li>
  );
}

/**
 * The Case page of her saved Quick case: the opening the first time, then the Find a clue list every time.
 * Her moves are written to the shared Quick save (the Casebook sees them); a sample case never writes.
 * Tapping a line turns to that game's puzzle page.
 */
export function FindAClue({ book, sample, onPuzzleOpen }: { book: QuickBook | null | false; sample?: SampleCase; onPuzzleOpen?: (open: boolean) => void }) {
  const loaded = book;
  const [hide, setHide] = useState(loadHideFinished);
  const [opened, setOpened] = useState<boolean | null>(null);
  const [picked, setPicked] = useState<{ kind: GameKind; turn: boolean } | null>(() => (sample?.open ? { kind: sample.open, turn: false } : null));
  const listRef = useRef<HTMLDivElement>(null);
  const puzzleOpen = picked !== null;
  useEffect(() => {
    onPuzzleOpen?.(puzzleOpen);
  }, [puzzleOpen, onPuzzleOpen]);

  if (loaded === null) return <p className={styles.lede}>Opening the case…</p>;
  if (loaded === false) return <p className={styles.lede}>There is no case saved on this shelf yet.</p>;
  const { c, ref, progress, dispatch } = loaded;
  const seen = opened ?? sample?.seen ?? openingSeen(ref);

  if (!seen) {
    return (
      <div className={styles.opening}>
        <p className={styles.victim}>{victimLine(c)}</p>
        <p className={styles.blurb}>{openingText(c)}</p>
        <button
          type="button"
          className={styles.primary}
          onClick={() => {
            markOpeningSeen(ref);
            setOpened(true);
          }}
        >
          Find a clue
        </button>
      </div>
    );
  }

  const rows = clueRows(c, progress, ref);
  const label = hideLabel(rows, hide);
  const open = picked ? rows.find((r) => r.kind === picked.kind) : undefined;
  const spec = open ? c.games.find((g) => g.kind === open.kind) : undefined;
  return (
    <>
      <h2 className={styles.find}>Find a clue</h2>
      <div className={styles.scroll} ref={listRef}>
        <ul className={styles.choices}>
          {visibleRows(rows, hide).map((row) => (
            <Line key={row.kind} row={row} onPick={(row) => setPicked({ kind: row.kind, turn: true })} />
          ))}
        </ul>
        {label ? (
          <button
            type="button"
            className={styles.hide}
            onClick={() => {
              saveHideFinished(!hide);
              setHide(!hide);
            }}
          >
            {label}
          </button>
        ) : null}
      </div>
      {picked && open && spec ? (
        <PuzzlePage
          c={c}
          spec={spec}
          progress={progress}
          dispatch={dispatch}
          page={open.page}
          level={open.level}
          turn={picked.turn}
          turnSource={() => listRef.current?.closest<HTMLElement>('[data-section]') ?? null}
          onClose={() => setPicked(null)}
        />
      ) : null}
    </>
  );
}
