import { useEffect, useState } from 'react';
import type { History } from '../game/history.ts';
import { campaignTotalsSentence, quickTotalsSentence } from '../game/runRecord.ts';
import { loadHistory } from '../game/storage.ts';
import styles from './GuestBook.module.css';
import { bookEntries, signatureTilt } from './guestBook.ts';
import { recordFinishedRuns } from './recordRuns.ts';

interface Props {
  /** Show this history and record nothing (the dev preview). */
  sample?: History;
}

/** `#shelf/record`: the running totals in ink, then one handwritten entry for each finished run, newest first. */
export function GuestBook({ sample }: Props) {
  const [history, setHistory] = useState<History>(() => sample ?? loadHistory());
  // A case finished on the shelf is not recorded anywhere else: do it now, then read the book again.
  useEffect(() => {
    if (sample) return;
    let live = true;
    recordFinishedRuns().then((wrote) => {
      if (live && wrote) setHistory(loadHistory());
    });
    return () => {
      live = false;
    };
  }, [sample]);

  const entries = bookEntries(history);
  const { quickTotals, campaignTotals } = history;
  return (
    <main className={styles.page}>
      <a className={styles.back} href="#shelf">
        ‹ Back to the shelf
      </a>
      <article className={styles.book}>
        <h1 className={styles.title}>Guest book</h1>
        {entries.length === 0 && quickTotals.cases === 0 && campaignTotals.campaigns === 0 ? (
          <p className={styles.empty}>No one has signed yet.</p>
        ) : (
          <>
            {quickTotals.cases > 0 && <p className={styles.totals}>{quickTotalsSentence(quickTotals)}</p>}
            {campaignTotals.campaigns > 0 && <p className={styles.totals}>{campaignTotalsSentence(campaignTotals)}</p>}
            <ul className={styles.list} aria-label="Entries">
              {entries.map((e) => (
                <li key={`${e.kind}-${e.id}`} className={styles.entry} data-testid="guest-entry">
                  <h2 className={styles.entryTitle}>{e.title}</h2>
                  <p>{e.line}</p>
                  {e.effort && <p>{e.effort}</p>}
                  {e.signature && (
                    <span className={styles.sign} style={{ transform: `rotate(${signatureTilt(e.id)}deg)` }} data-testid="guest-signature">
                      {e.signature}
                    </span>
                  )}
                  {e.leftEarly && <p className={styles.left}>left before dessert</p>}
                </li>
              ))}
            </ul>
          </>
        )}
      </article>
    </main>
  );
}
