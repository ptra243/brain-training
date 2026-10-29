import { useEffect, useRef, useState } from 'react';
import type { GameKind } from '../engine/types.ts';
import { DIFFICULTY_LABEL } from '../game/labels.ts';
import { victimLine } from '../game/names.ts';
import { GAMES } from '../game/games/registry.tsx';
import styles from './FindAClue.module.css';
import { addedGames, clueRows, hideLabel, openingText, rowAriaLabel, rowStateText, visibleRows, type ClueRow } from './findAClue.ts';
import { labelAngle, labelName } from './labels.ts';
import { PuzzleLabel } from './PuzzleLabel.tsx';
import { PuzzlePage } from './PuzzlePage.tsx';
import type { QuickBook, SampleCase } from './useQuickBook.ts';
import { loadHideFinished, markOpeningSeen, openingSeen, saveHideFinished } from './shelfStore.ts';

function Line({ row, caseRef, added, onPick }: { row: ClueRow; caseRef: string; added: boolean; onPick: (row: ClueRow) => void }) {
  const entry = GAMES[row.kind];
  const name = labelName(entry.label.kind, entry.name);
  const state = rowStateText(row);
  return (
    <li>
      <button
        type="button"
        className={`${styles.row} ${row.done ? styles.done : ''} ${row.locked ? styles.locked : ''}`}
        disabled={row.locked}
        aria-label={rowAriaLabel(row, name, row.level ? DIFFICULTY_LABEL[row.level] : undefined)}
        onClick={() => onPick(row)}
      >
        <PuzzleLabel
          game={row.kind}
          level={row.level}
          page={row.page}
          angle={labelAngle(caseRef, row.kind)}
          sticker={row.status}
          hints={row.hints}
          locked={row.locked}
        />
        <span className={styles.story}>
          {row.story}
          {added ? <span className={styles.added}>The cat added this one</span> : null}
          {state ? <span className={styles.found}>{state}</span> : null}
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
export function FindAClue({ book, sample, onPuzzleOpen, skipOpening }: { book: QuickBook | null | false; sample?: SampleCase; onPuzzleOpen?: (open: boolean) => void; skipOpening?: boolean }) {
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
  // A case from the sticker tin opens straight on the list: she has just picked its puzzles.
  const seen = opened ?? sample?.seen ?? (skipOpening || openingSeen(ref));

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
  const added = addedGames(c.games, loaded.fullRef);
  const open = picked ? rows.find((r) => r.kind === picked.kind) : undefined;
  const spec = open ? c.games.find((g) => g.kind === open.kind) : undefined;
  return (
    <>
      <h2 className={styles.find}>Find a clue</h2>
      <div className={styles.scroll} ref={listRef}>
        {loaded.swapped ? <p className={styles.pencil}>The cat picked these puzzles instead.</p> : null}
        <ul className={styles.choices}>
          {visibleRows(rows, hide).map((row) => (
            <Line key={row.kind} row={row} caseRef={ref} added={added.includes(row.kind)} onPick={(row) => setPicked({ kind: row.kind, turn: true })} />
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
