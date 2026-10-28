import { useState } from 'react';
import { KeyIcon } from './NosingIcons.tsx';
import { MARK_LABELS, MARK_ORDER } from './nosingUi.ts';
import styles from './NosingKey.module.css';

/** The "Key" button under the board and, when open, the list of what each icon means. */
export function NosingKey({ info }: { info: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.key}>
      <div className={styles.bar}>
        <p className={styles.info} data-testid="nosing-info" role="status">
          {info}
        </p>
        <button className={`secondary ${styles.toggle}`} aria-expanded={open} onClick={() => setOpen(!open)}>
          Key
        </button>
      </div>
      {open && (
        <ul className={`card ${styles.list}`} aria-label="What the icons mean">
          {MARK_ORDER.map((k) => (
            <li key={k}>
              <KeyIcon kind={k} />
              <span>{MARK_LABELS[k]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
