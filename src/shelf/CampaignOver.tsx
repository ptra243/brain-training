import styles from './AnswerPage.module.css';

/**
 * The page the book shows when the night is over (she caught the killer, or the third accusation was wrong).
 * One plain page for now: piece 5b replaces it with the caught and escaped endings and the night replay.
 * `onBack` leaves the book for the shelf.
 */
export function CampaignOver({ verdict, onBack }: { verdict: 'caught' | 'escaped'; onBack: () => void }) {
  return (
    <div className={styles.scroll} data-testid="night-over" data-verdict={verdict}>
      <p className={styles.head}>
        <span>The answer</span>
        <em>Done</em>
      </p>
      <p className={styles.verdict}>The night is over.</p>
      <button type="button" className={styles.submit} onClick={onBack}>
        Back to the shelf
      </button>
    </div>
  );
}
