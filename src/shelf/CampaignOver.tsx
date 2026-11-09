import styles from './AnswerPage.module.css';
import { earlierTries } from './campaignAnswer.ts';
import { closingFor, earlierVerdict, effortLine } from './campaignEnd.ts';
import overStyles from './CampaignOver.module.css';
import type { CampaignBook } from './useCampaignBook.ts';

interface Props {
  book: CampaignBook;
  /** Leave the book for the shelf. */
  onBack: () => void;
  /** Play the night's replay again. */
  onReplay: () => void;
}

/**
 * The campaign book's Answer page once the night is over. On the last chapter it is the closing page: the
 * verdict as the printed form filled in ink, today's wording, the effort line and the earlier chapters'
 * crossed-out tries. On an earlier chapter she is reading back, it is that chapter's verdict in red pencil.
 */
export function CampaignOver({ book, onBack, onReplay }: Props) {
  const { save, c } = book;
  if (book.round < book.current) {
    const v = earlierVerdict(save, book.round, c);
    return (
      <div className={styles.scroll} data-testid="earlier-verdict">
        <p className={styles.head}>
          <span>The answer</span>
          <em>Read only</em>
        </p>
        <p className={overStyles.red}>{v.heading}</p>
        <p className={overStyles.redLine}>{v.line}</p>
      </div>
    );
  }
  const closing = closingFor(save, c);
  const tries = earlierTries(save, c.guests);
  return (
    <div className={styles.scroll} data-testid="night-over" data-verdict={save.outcome}>
      <p className={styles.head}>
        <span>The answer</span>
        <em>{closing.heading}</em>
      </p>
      {tries.length > 0 ? (
        <ol className={styles.tries} aria-label="Earlier chapters">
          {tries.map((line) => (
            <li key={line}>
              <span className={styles.struck}>{line}</span>
            </li>
          ))}
        </ol>
      ) : null}
      <p className={styles.verdict}>
        It was <span className={styles.pencil}>{closing.who}</span>
        {closing.room ? (
          <>
            {' '}in the <span className={styles.pencil}>{closing.room}</span>
          </>
        ) : null}
        , with the <span className={styles.pencil}>{closing.what}</span>.
      </p>
      <p className={styles.note}>{closing.note}</p>
      <p className={styles.note} data-testid="closing-effort">
        {effortLine(save, book.cases)}
      </p>
      <button type="button" className={styles.secondary} onClick={onReplay}>
        See the night again
      </button>
      <button type="button" className={styles.submit} onClick={onBack}>
        Back to the shelf
      </button>
    </div>
  );
}
