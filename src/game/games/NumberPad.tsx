import { useState } from 'react';
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
    <div className="numpad">
      <p className="numpad-screen" role="status" aria-label={label}>
        {text === '' ? <span className="numpad-empty">Type a number</span> : text}
      </p>
      <div className="numpad-keys">
        {keys.map((k) => (
          <button key={k} className="numpad-key" onClick={() => press(k)}>
            {k}
          </button>
        ))}
        <button className="numpad-key" aria-label="Delete" onClick={() => press('back')}>
          ⌫
        </button>
        <button className="numpad-key" onClick={() => press('0')}>
          0
        </button>
        <button className="numpad-key numpad-ok" disabled={value === null} onClick={submit}>
          OK
        </button>
      </div>
    </div>
  );
}
