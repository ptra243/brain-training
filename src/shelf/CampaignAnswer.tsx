import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Dialog } from '../game/Dialog.tsx';
import { atMidnight } from '../game/explore.ts';
import { itemName, roomName, suspectName } from '../game/names.ts';
import { sceneUnlocked } from '../game/state.ts';
import { blanksFilled, canSubmit, emptyBlanks, type Blanks } from './answer.ts';
import styles from './AnswerPage.module.css';
import { earlierTries, guessWarning } from './campaignAnswer.ts';
import type { CampaignBook } from './useCampaignBook.ts';

type Open = 'suspect' | 'item' | null;

/**
 * The campaign book's Answer page: the same printed form as Quick's ("It was ___ in the ___ with the ___"),
 * one accusation a chapter. Handing it in holds it (the book then opens the questioning); its verdict comes
 * after. Only the guests `allowed` are listed. Earlier chapters' wrong tries stay above, crossed out in red.
 * Kept apart from `AnswerPage`: there is no rank, no "how many right" slip and no solved page here.
 */
export function CampaignAnswer({ book, prefill }: { book: CampaignBook; prefill?: { suspect: string; seq: number } | null }) {
  const { c, progress, dispatch, allowed, stillPointing } = book;
  const [blanks, setBlanks] = useState<Blanks>(() => (prefill ? { suspect: prefill.suspect, item: '' } : emptyBlanks));
  const [open, setOpen] = useState<Open>(null);
  const [warning, setWarning] = useState(false);
  const [seenPrefill, setSeenPrefill] = useState(prefill?.seq ?? 0);
  // A guest page's "Accuse them…": that guest is written in, the weapon left for her to pick (adjusting state while rendering).
  if (prefill && prefill.seq !== seenPrefill) {
    setSeenPrefill(prefill.seq);
    setBlanks({ suspect: prefill.suspect, item: '' });
    setOpen(null);
  }
  const midnight = atMidnight(c, progress);
  const room = sceneUnlocked(c, progress) ? roomName(c.sceneRoom) : null;
  const earlier = earlierTries(book.save, c.guests);
  const warnLine = guessWarning(stillPointing);

  const pick = (which: 'suspect' | 'item', id: string) => {
    setBlanks((b) => ({ ...b, [which]: id }));
    setOpen(null);
  };
  const handIn = () => {
    dispatch({ type: 'accuse', suspect: blanks.suspect, item: blanks.item });
    setBlanks(emptyBlanks);
    setOpen(null);
  };
  const submit = () => {
    if (!canSubmit(blanks, progress.solved)) return;
    if (warnLine) setWarning(true);
    else handIn();
  };
  const toggle = (which: 'suspect' | 'item') => setOpen((o) => (o === which ? null : which));

  return (
    <div className={styles.scroll}>
      <p className={styles.head}>
        <span>The answer</span>
        <em>Fill in the blanks</em>
      </p>

      {midnight ? (
        <p className={styles.slip} role="status">
          <strong>It&apos;s midnight.</strong>
          <span>Time is up, and you must name someone now.</span>
        </p>
      ) : null}
      <p className={styles.note}>
        Name the murderer and the weapon. Name the wrong person and they&apos;ll be the next body. The right person with the wrong weapon costs a round too:
        with nothing to hold them on, someone else dies.
      </p>

      {earlier.length > 0 ? (
        <ol className={styles.tries} aria-label="Earlier chapters">
          {earlier.map((line) => (
            <li key={line}>
              <span className={styles.struck}>{line}</span>
            </li>
          ))}
        </ol>
      ) : null}

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
          {allowed.map((id) => (
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

      {warning && warnLine
        ? // On the body: the book's page turn is a transform, which would hold a fixed pop-up inside the page.
          createPortal(
            <Dialog placement="center" labelId="guess-title" onClose={() => setWarning(false)}>
              <h2 id="guess-title">Guess now?</h2>
              <p className="dialog-text">{warnLine}</p>
              <div className="dialog-actions">
                <button data-autofocus className="secondary" onClick={() => setWarning(false)}>
                  Not yet
                </button>
                <button
                  className="primary"
                  onClick={() => {
                    setWarning(false);
                    handIn();
                  }}
                >
                  Guess now
                </button>
              </div>
            </Dialog>,
            document.body,
          )
        : null}
    </div>
  );
}
