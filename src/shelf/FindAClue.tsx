import { useEffect, useRef, useState } from 'react';
import { caseCode } from '../engine/caseRef.ts';
import type { Case, GameKind } from '../engine/types.ts';
import { generate } from '../game/caseClient.ts';
import { DIFFICULTY_LABEL } from '../game/labels.ts';
import { victimLine } from '../game/names.ts';
import { GAMES } from '../game/games/registry.tsx';
import type { Action, Progress } from '../game/state.ts';
import { loadQuick, saveQuick } from '../game/storage.ts';
import styles from './FindAClue.module.css';
import { clueRows, hideLabel, openingText, plural, visibleRows, type ClueRow } from './findAClue.ts';
import { PuzzlePage } from './PuzzlePage.tsx';
import { advance, type SaveKey } from './quickProgress.ts';
import { loadHideFinished, markOpeningSeen, openingSeen, saveHideFinished } from './shelfStore.ts';

/** A case to show without loading her save (the dev preview). */
export interface SampleCase {
  c: Case;
  progress: Progress;
  ref: string;
  /** Skip the opening and show the list. */
  seen?: boolean;
  /** Open this game's puzzle page at once, with no page turn. */
  open?: GameKind;
}

interface Loaded {
  c: Case;
  progress: Progress;
  ref: string;
  /** Her save's own ref and history id, to write back; none for a sample. */
  key: SaveKey | null;
}

/** Rebuilds her saved Quick case. Null while it builds, false when there is none. */
function useQuickCase(sample: SampleCase | undefined): Loaded | null | false {
  // Her save is read once; with none, there is nothing to build.
  const [saved] = useState(() => (sample ? null : loadQuick()));
  const [built, setBuilt] = useState<Loaded | false | null>(null);
  useEffect(() => {
    if (!saved) return;
    let live = true;
    generate({ kind: 'case', ref: saved.ref }).then(
      (c) => live && setBuilt({ c, progress: saved.progress, ref: caseCode(saved.ref), key: { ref: saved.ref, historyId: saved.historyId } }),
      () => live && setBuilt(false),
    );
    return () => {
      live = false;
    };
  }, [saved]);
  if (sample) return { ...sample, key: null };
  return saved ? built : false;
}

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
export function FindAClue({ sample }: { sample?: SampleCase }) {
  const loaded = useQuickCase(sample);
  const [hide, setHide] = useState(loadHideFinished);
  const [opened, setOpened] = useState<boolean | null>(null);
  const [picked, setPicked] = useState<{ kind: GameKind; turn: boolean } | null>(() => (sample?.open ? { kind: sample.open, turn: false } : null));
  // Her latest progress, so two actions in one tick (a save, then a finish) both land.
  const [moves, setMoves] = useState<Progress | null>(null);
  const latest = useRef<Progress | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  if (loaded === null) return <p className={styles.lede}>Opening the case…</p>;
  if (loaded === false) return <p className={styles.lede}>There is no case saved on this shelf yet.</p>;
  const { c, ref, key } = loaded;
  const progress = moves ?? loaded.progress;
  const dispatch = (a: Action) => {
    const next = advance(c, latest.current ?? loaded.progress, a, key, saveQuick);
    latest.current = next;
    setMoves(next);
  };
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
