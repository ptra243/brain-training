import { useState } from 'react';
import styles from './NumberPad.module.css';
import { padPress, padValue } from './nosingUi.ts';

/** An in-app number pad (never the phone's keyboard): digits, back and OK. */
export function NumberPad({ onSubmit, label = 'Your answer' }: { onSubmit: (value: number) => void; label?: string }) {
  const [text, setText] = useState('');
  const value = padValue(text);
  const press = (key: string) => setText((t) => padPress(t, key));
  const submit = () => {
    if (value === null) return;
    setText('');
    onSubmit(value);
  };
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  return (
    <div className={styles.pad} data-testid="numpad">
      <p className={styles.screen} role="status" aria-label={label}>
        {text === '' ? <span className={styles.empty}>Type a number</span> : text}
      </p>
      <div className={styles.keys}>
        {keys.map((k) => (
          <button key={k} className={styles.key} onClick={() => press(k)}>
            {k}
          </button>
        ))}
        <button className={styles.key} aria-label="Delete" onClick={() => press('back')}>
          ⌫
        </button>
        <button className={styles.key} onClick={() => press('0')}>
          0
        </button>
        <button className={`${styles.key} ${styles.ok}`} disabled={value === null} onClick={submit}>
          OK
        </button>
      </div>
    </div>
  );
}
