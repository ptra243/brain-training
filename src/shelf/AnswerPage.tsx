import { useState } from 'react';
import styles from './AnswerPage.module.css';
import { itemName, roomName, suspectName } from '../game/names.ts';
import { effortLines, hintTotal, puzzleCounts } from '../game/runRecord.ts';
import { sceneUnlocked } from '../game/state.ts';
import type { QuickBook } from './useQuickBook.ts';
import { blanksFilled, canSubmit, emptyBlanks, resultLine, triesList, type Blanks } from './answer.ts';

type Open = 'suspect' | 'item' | null;

/**
 * The Answer page: "It was ___ in the ___ with the ___" as a printed form. Tapping a blank opens a
 * printed list and her pick is pencilled in. An accusation is who and what with (the room is always
 * the scene), so the room is printed once she knows it and is not a blank. Wrong tries stay above,
 * crossed out in red; the list of tries is her saved accusations, so the Casebook agrees.
 */
export function AnswerPage({ book, onBack, prefill }: { book: QuickBook; onBack: () => void; prefill?: { suspect: string; seq: number } | null }) {
  const { c, progress, dispatch } = book;
  const [blanks, setBlanks] = useState<Blanks>(emptyBlanks);
  const [open, setOpen] = useState<Open>(null);
  const [seenPrefill, setSeenPrefill] = useState(prefill?.seq ?? 0);
  // A guest page's "Accuse them…": that guest is written in, the weapon left for her to pick (adjusting state while rendering).
  if (prefill && prefill.seq !== seenPrefill) {
    setSeenPrefill(prefill.seq);
    setBlanks({ suspect: prefill.suspect, item: '' });
    setOpen(null);
  }
  const tries = triesList(progress);
  const last = progress.accusations.at(-1);
  const room = sceneUnlocked(c, progress) ? roomName(c.sceneRoom) : null;

  if (progress.solved) {
    const counts = puzzleCounts(c, progress);
    return (
      <div className={styles.scroll}>
        <p className={styles.head}>
          <span>The answer</span>
          <em>Case closed</em>
        </p>
        <p className={styles.verdict}>
          It was <span className={styles.pencil}>{suspectName(c.murderer, c.guests)}</span> in the <span className={styles.pencil}>{roomName(c.sceneRoom)}</span>, with the{' '}
          <span className={styles.pencil}>{itemName(c.weapon)}</span>.
        </p>
        <p className={styles.note}>Solved {tries.length === 1 ? 'on the first accusation' : `in ${tries.length} accusations`}.</p>
        <p className={styles.note}>{effortLines({ hints: hintTotal(progress), solvedForHer: counts.revealed, solvedYourself: counts.won, puzzles: counts.total })}</p>
        {tries.length > 1 ? (
          <ol className={styles.tries} aria-label="Your tries">
            {tries.map((t, i) => (
              <li key={i} className={t.crossed ? styles.crossed : undefined}>
                {suspectName(t.suspect, c.guests)} with the {itemName(t.item)}
              </li>
            ))}
          </ol>
        ) : null}
        <button type="button" className={styles.submit} onClick={onBack}>
          Back to the shelf
        </button>
      </div>
    );
  }

  const pick = (which: 'suspect' | 'item', id: string) => {
    setBlanks((b) => ({ ...b, [which]: id }));
    setOpen(null);
  };
  const submit = () => {
    if (!canSubmit(blanks, progress.solved)) return;
    dispatch({ type: 'accuse', suspect: blanks.suspect, item: blanks.item });
    setBlanks(emptyBlanks);
    setOpen(null);
  };
  const toggle = (which: 'suspect' | 'item') => setOpen((o) => (o === which ? null : which));

  return (
    <div className={styles.scroll}>
      <p className={styles.head}>
        <span>The answer</span>
        <em>Fill in the blanks</em>
      </p>

      {last ? (
        <div className={styles.slip} aria-live="polite">
          <strong>{resultLine(last)}</strong>
          <span>You will hear how many you got right, but not which.</span>
        </div>
      ) : (
        <p className={styles.note}>Name the murderer and the weapon. You will hear how many you got right, but not which.</p>
      )}

      <ol className={styles.tries} aria-label="Your tries">
        {tries.map((t, i) => (
          <li key={i}>
            <span className={t.crossed ? styles.struck : undefined}>
              It was <span className={styles.pencil}>{suspectName(t.suspect, c.guests)}</span>
              {room ? ` in the ${room}` : ''}, with the <span className={styles.pencil}>{itemName(t.item)}</span>.
            </span>
            <small> {t.correct} of 2</small>
          </li>
        ))}
      </ol>

      <p className={styles.form}>
        It was{' '}
        <button type="button" className={styles.blank} aria-expanded={open === 'suspect'} aria-label={`Who: ${blanks.suspect ? suspectName(blanks.suspect, c.guests) : 'choose'}`} onClick={() => toggle('suspect')}>
          <span className={styles.pencil}>{blanks.suspect ? suspectName(blanks.suspect, c.guests) : ''}</span>
        </button>{' '}
        in the {room ? <strong className={styles.printed}>{room}</strong> : <span className={styles.unknown}>somewhere</span>}, with the{' '}
        <button type="button" className={styles.blank} aria-expanded={open === 'item'} aria-label={`With what: ${blanks.item ? itemName(blanks.item) : 'choose'}`} onClick={() => toggle('item')}>
          <span className={styles.pencil}>{blanks.item ? itemName(blanks.item) : ''}</span>
        </button>
        .
      </p>
      {!room ? <p className={styles.note}>Solve a word game to learn where the body was found. You can still accuse.</p> : null}

      {open === 'suspect' ? (
        <div className={styles.list} role="group" aria-label="Who">
          {c.suspects.map((id) => (
            <button key={id} type="button" className={styles.option} aria-pressed={blanks.suspect === id} onClick={() => pick('suspect', id)}>
              {suspectName(id, c.guests)}
            </button>
          ))}
        </div>
      ) : null}
      {open === 'item' ? (
        <div className={styles.list} role="group" aria-label="With what">
          {c.items.map((id) => (
            <button key={id} type="button" className={styles.option} aria-pressed={blanks.item === id} onClick={() => pick('item', id)}>
              {itemName(id)}
            </button>
          ))}
        </div>
      ) : null}

      <button type="button" className={styles.submit} disabled={!canSubmit(blanks, progress.solved)} onClick={submit}>
        {blanksFilled(blanks) === 2 ? 'Make the accusation' : 'Fill both blanks first'}
      </button>
    </div>
  );
}
