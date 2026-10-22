import { useState } from 'react';
import { KeyIcon } from './NosingIcons.tsx';
import { MARK_LABELS, MARK_ORDER } from './nosingUi.ts';

/** The "Key" button under the board and, when open, the list of what each icon means. */
export function NosingKey({ info }: { info: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="nosing-key">
      <div className="nosing-key-bar">
        <p className="nosing-info" role="status">
          {info}
        </p>
        <button className="secondary key-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          Key
        </button>
      </div>
      {open && (
        <ul className="card key-list" aria-label="What the icons mean">
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
