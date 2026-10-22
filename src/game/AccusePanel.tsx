import { useState } from 'react';
import { Dialog } from './Dialog.tsx';
import type { Case } from '../engine/types.ts';
import { itemName, roomName, suspectName } from './names.ts';
import { ACCUSATION_PARTS, sceneUnlocked, type Action, type Progress } from './state.ts';

interface Props {
  c: Case;
  progress: Progress;
  dispatch: (a: Action) => void;
  onNextCase: () => void;
  /** Campaign: a wrong person is the next body; the right person with the wrong weapon lets them walk free and an innocent is the next body. */
  campaign?: boolean;
  /** Who she may accuse (the campaign's "only possible killers" option). Default: everyone. */
  suspects?: readonly string[];
  nextLabel?: string;
  /** Exploring a campaign round: how many people her clues still allow as the killer. Above one, she's asked before she guesses. */
  stillPointing?: number;
  /** Exploring: it's midnight and she must name someone. */
  midnight?: boolean;
}

export function Picker({
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

export function AccusePanel({ c, progress, dispatch, onNextCase, campaign, suspects = c.suspects, nextLabel = 'Start a new case', stillPointing = 0, midnight }: Props) {
  const [suspect, setSuspect] = useState('');
  const [item, setItem] = useState('');
  const scene = sceneUnlocked(c, progress);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState(false);
  const last = progress.accusations.at(-1);

  if (progress.solved) {
    const tries = progress.accusations.length;
    return (
      <section className="panel">
        <article className="card verdict">
          <h2>Case closed</h2>
          <p className="verdict-line">
            {suspectName(c.murderer, c.guests)}, in the {roomName(c.sceneRoom)}, with the {itemName(c.weapon)}.
          </p>
          <p className="muted">Solved {tries === 1 ? 'on the first accusation' : `in ${tries} accusations`}.</p>
          <table className="answer">
            <tbody>
              {c.suspects.map((s, i) => (
                <tr key={s} className={s === c.murderer ? 'murderer' : ''}>
                  <th scope="row">{suspectName(s, c.guests)}</th>
                  <td>{roomName(c.solution.room[i])}</td>
                  <td>{c.solution.item[i] ? itemName(c.solution.item[i]!) : 'nothing'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="primary" onClick={onNextCase}>
            {nextLabel}
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
    if (stillPointing > 1) setWarning(true);
    else dispatch({ type: 'accuse', suspect, item });
  };

  return (
    <section className="panel">
      {midnight && (
        <p className="hint midnight-note" role="status">
          It's midnight. Time is up, and you must name someone now.
        </p>
      )}
      <p className="hint">
        {campaign
          ? "Name the murderer and the weapon. Name the wrong person and they'll be the next body. The right person with the wrong weapon costs a round too: with nothing to hold them on, someone else dies."
          : "Name the murderer and the weapon. You'll hear how many you got right, but not which."}
        {!campaign && ' You can also accuse straight from the map.'}
      </p>
      <article className="card">
        <p className="scene-note">
          {scene
            ? `The murder happened in the ${roomName(c.sceneRoom)}, where the body was found.`
            : 'Solve a word game on the Clues tab to learn where the body was found.'}
        </p>
        <Picker legend="Who" options={suspects} value={suspect} onChange={(v) => { setSuspect(v); setError(''); }} name={(id) => suspectName(id, c.guests)} />
        <Picker legend="With what" options={c.items} value={item} onChange={(v) => { setItem(v); setError(''); }} name={itemName} />
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" onClick={submit}>
          Make the accusation
        </button>
      </article>

      {warning && (
        <Dialog placement="center" labelId="guess-title" onClose={() => setWarning(false)}>
          <h2 id="guess-title">Guess now?</h2>
          <p className="dialog-text">Your clues still point at {stillPointing} people. Guess now?</p>
          <div className="dialog-actions">
            <button data-autofocus className="secondary" onClick={() => setWarning(false)}>
              Not yet
            </button>
            <button
              className="primary"
              onClick={() => {
                setWarning(false);
                dispatch({ type: 'accuse', suspect, item });
              }}
            >
              Guess now
            </button>
          </div>
        </Dialog>
      )}

      {last && (
        <article className="card result" aria-live="polite">
          <h2>
            {campaign
              ? 'Right person, wrong weapon.'
              : last.correct === 0
                ? 'Neither of those was right.'
                : `${last.correct} of ${ACCUSATION_PARTS} right. Keep digging.`}
          </h2>
          <ul className="history">
            {progress.accusations.map((a, i) => (
              <li key={i}>
                {suspectName(a.suspect, c.guests)} with the {itemName(a.item)}: <strong>{a.correct} of {ACCUSATION_PARTS}</strong>
              </li>
            ))}
          </ul>
        </article>
      )}
    </section>
  );
}
