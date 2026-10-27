import { useEffect, useState } from 'react';
import { caseCode } from '../engine/caseRef.ts';
import type { Case } from '../engine/types.ts';
import { generate } from '../game/caseClient.ts';
import { DIFFICULTY_LABEL } from '../game/labels.ts';
import { victimLine } from '../game/names.ts';
import { GAMES } from '../game/games/registry.tsx';
import type { Progress } from '../game/state.ts';
import { loadQuick } from '../game/storage.ts';
import styles from './FindAClue.module.css';
import { clueRows, hideLabel, openingText, plural, visibleRows, type ClueRow } from './findAClue.ts';
import { loadHideFinished, markOpeningSeen, openingSeen, saveHideFinished } from './shelfStore.ts';

/** A case to show without loading her save (the dev preview). */
export interface SampleCase {
  c: Case;
  progress: Progress;
  ref: string;
  /** Skip the opening and show the list. */
  seen?: boolean;
}

interface Loaded {
  c: Case;
  progress: Progress;
  ref: string;
}

/** Rebuilds her saved Quick case, read-only. Null while it builds, false when there is none. */
function useQuickCase(sample: SampleCase | undefined): Loaded | null | false {
  // Her save is read once; with none, there is nothing to build.
  const [saved] = useState(() => (sample ? null : loadQuick()));
  const [built, setBuilt] = useState<Loaded | false | null>(null);
  useEffect(() => {
    if (!saved) return;
    let live = true;
    generate({ kind: 'case', ref: saved.ref }).then(
      (c) => live && setBuilt({ c, progress: saved.progress, ref: caseCode(saved.ref) }),
      () => live && setBuilt(false),
    );
    return () => {
      live = false;
    };
  }, [saved]);
  if (sample) return sample;
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
 * Read-only: nothing here touches her save. Tapping a line goes to a placeholder until the game pages exist.
 */
export function FindAClue({ sample }: { sample?: SampleCase }) {
  const loaded = useQuickCase(sample);
  const [hide, setHide] = useState(loadHideFinished);
  const [opened, setOpened] = useState<boolean | null>(null);
  const [picked, setPicked] = useState<ClueRow | null>(null);

  if (loaded === null) return <p className={styles.lede}>Opening the case…</p>;
  if (loaded === false) return <p className={styles.lede}>There is no case saved on this shelf yet.</p>;
  const { c, progress, ref } = loaded;
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

  if (picked) {
    return (
      <div className={styles.opening}>
        <p className={styles.lede}>This page isn&apos;t drawn yet.</p>
        <button type="button" className={styles.primary} onClick={() => setPicked(null)}>
          Back to the list
        </button>
      </div>
    );
  }

  const rows = clueRows(c, progress, ref);
  const label = hideLabel(rows, hide);
  return (
    <>
      <h2 className={styles.find}>Find a clue</h2>
      <div className={styles.scroll}>
        <ul className={styles.choices}>
          {visibleRows(rows, hide).map((row) => (
            <Line key={row.kind} row={row} onPick={setPicked} />
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
    </>
  );
}
