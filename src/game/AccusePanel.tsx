import { useState } from 'react';
import type { Case } from '../engine/types.ts';
import { itemName, roomName, suspectName } from './names.ts';
import { ACCUSATION_PARTS, sceneUnlocked, type Action, type Progress } from './state.ts';

interface Props {
  c: Case;
  progress: Progress;
  dispatch: (a: Action) => void;
  onNextCase: () => void;
}

function Picker({
  legend,
  options,
  value,
  onChange,
  name,
}: {
  legend: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  name: (id: string) => string;
}) {
  return (
    <fieldset className="picker">
      <legend>{legend}</legend>
      <div className="chips">
        {options.map((id) => (
          <button key={id} type="button" className="chip" aria-pressed={value === id} onClick={() => onChange(id)}>
            {name(id)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function AccusePanel({ c, progress, dispatch, onNextCase }: Props) {
  const [suspect, setSuspect] = useState('');
  const [item, setItem] = useState('');
  const scene = sceneUnlocked(c, progress);
  const [error, setError] = useState('');
  const last = progress.accusations.at(-1);

  if (progress.solved) {
    const tries = progress.accusations.length;
    return (
      <section className="panel">
        <article className="card verdict">
          <h2>Case closed</h2>
          <p className="verdict-line">
            {suspectName(c.murderer)}, in the {roomName(c.sceneRoom)}, with the {itemName(c.weapon)}.
          </p>
          <p className="muted">Solved {tries === 1 ? 'on the first accusation' : `in ${tries} accusations`}.</p>
          <table className="answer">
            <tbody>
              {c.suspects.map((s, i) => (
                <tr key={s} className={s === c.murderer ? 'murderer' : ''}>
                  <th scope="row">{suspectName(s)}</th>
                  <td>{roomName(c.solution.room[i])}</td>
                  <td>{itemName(c.solution.item[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="primary" onClick={onNextCase}>
            Open case {c.number + 1}
          </button>
        </article>
      </section>
    );
  }

  const submit = () => {
    if (!suspect || !item) {
      setError('Pick a suspect and a weapon first.');
      return;
    }
    setError('');
    dispatch({ type: 'accuse', suspect, item });
  };

  return (
    <section className="panel">
      <p className="hint">
        Name the murderer and the weapon. You'll hear how many you got right, but not which. You can also accuse straight
        from the map.
      </p>
      <article className="card">
        <p className="scene-note">
          {scene
            ? `The murder happened in the ${roomName(c.sceneRoom)}, where the body was found.`
            : 'Solve the Wordle to learn where the body was found.'}
        </p>
        <Picker legend="Who" options={c.suspects} value={suspect} onChange={(v) => { setSuspect(v); setError(''); }} name={suspectName} />
        <Picker legend="With what" options={c.items} value={item} onChange={(v) => { setItem(v); setError(''); }} name={itemName} />
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" onClick={submit}>
          Make the accusation
        </button>
      </article>

      {last && (
        <article className="card result" aria-live="polite">
          <h2>
            {last.correct === 0
              ? 'Neither of those was right.'
              : `${last.correct} of ${ACCUSATION_PARTS} right. Keep digging.`}
          </h2>
          <ul className="history">
            {progress.accusations.map((a, i) => (
              <li key={i}>
                {suspectName(a.suspect)} with the {itemName(a.item)}: <strong>{a.correct} of {ACCUSATION_PARTS}</strong>
              </li>
            ))}
          </ul>
        </article>
      )}
    </section>
  );
}
