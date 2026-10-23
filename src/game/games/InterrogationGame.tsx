import { useState, type CSSProperties } from 'react';
import type { Clue, Interrogation, Question } from '../../engine/types.ts';
import { midSentence } from '../../engine/text.ts';
import { ClueCard } from '../ClueCard.tsx';
import { Dialog } from '../Dialog.tsx';
import { suspectColour, suspectInitials, suspectName } from '../names.ts';
import type { InterrogationData } from '../state.ts';
import type { GameProps } from './types.ts';

interface Props extends GameProps<Interrogation, InterrogationData> {
  /** Everyone at dinner (`Case.guests`), so a lone heir is called "The Heir". */
  guests: readonly string[];
  /** What she can present: the cards on the table, or her casebook in the finale. */
  evidence: readonly Clue[];
  /** Whether these pieces of evidence, together, prove the answer is a lie. */
  disproves: (evidence: readonly Clue[], answer: Question) => boolean;
  /**
   * Face to face (campaign): the accused is questioned after the accusation. No strikes and no clues; wrong
   * evidence only draws a retort; she may stop, skip or reveal the lie.
   */
  face?: {
    /** The accused's reply to evidence that proves nothing; `n` counts her wrong tries. */
    retort: (n: number) => string;
    /** She is satisfied with their story. */
    onStop: () => void;
    /** Straight to the verdict. */
    onSkip: () => void;
    /** Show the lie (after she confirms). */
    onSolve: () => void;
  };
}

export function InterrogationGame({ puzzle, data, guests, finished, onChange, onFinish, evidence, disproves, face }: Props) {
  const [confirming, setConfirming] = useState(false);
  const name = (id: string) => suspectName(id, guests);
  const mid = (id: string) => midSentence(name(id));
  const [challenging, setChallenging] = useState<Question | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [reply, setReply] = useState('');
  const who = puzzle.suspect;
  const asked = puzzle.questions.filter((q) => data.asked.includes(q.id));
  const left = puzzle.maxQuestions - asked.length;
  const strikesLeft = puzzle.strikes - data.strikes;

  const ask = (q: Question) => {
    if (finished || left <= 0) return;
    setReply('');
    onChange({ ...data, asked: [...data.asked, q.id] });
  };

  const present = () => {
    if (!challenging) return;
    const cards = evidence.filter((e) => picked.includes(e.id));
    const caught = challenging.lie && disproves(cards, challenging);
    setChallenging(null);
    setPicked([]);
    if (caught) {
      onFinish('won', { ...data, caught: true });
      return;
    }
    const strikes = data.strikes + 1;
    const next = { ...data, strikes };
    if (face) {
      setReply(face.retort(data.strikes));
      onChange(next);
      return;
    }
    if (strikes >= puzzle.strikes) {
      setReply(`${name(who)} refuses to say another word.`);
      onFinish('revealed', next);
      return;
    }
    setReply(
      challenging.lie
        ? `"That proves nothing." ${name(who)} doesn't budge. You're onto something, but not with that evidence.`
        : `"That's the truth, and you know it." ${name(who)} folds their arms.`,
    );
    onChange(next);
  };

  const lie = puzzle.questions.find((q) => q.lie);
  // She presents exactly as many pieces as the lie needs; otherwise showing
  // the whole casebook would always win.
  const need = Math.max(1, puzzle.proof.length);

  return (
    <div className="interrogation">
      <section className="chair card">
        <span className="counter static" style={{ '--counter': suspectColour(who) } as CSSProperties} aria-hidden="true">
          {suspectInitials(who, guests)}
        </span>
        <div>
          <h2>{name(who)} is in the chair</h2>
          <p className="muted">
            {finished
              ? data.caught
                ? 'Caught out.'
                : 'Questioning over.'
              : face
                ? `${left} question${left === 1 ? '' : 's'} left.`
                : `${left} question${left === 1 ? '' : 's'} left. ${strikesLeft} wrong challenge${strikesLeft === 1 ? '' : 's'} before they stop talking.`}
          </p>
        </div>
      </section>

      {!finished && face && (
        <p className="hint dark">
          {name(who)} is waiting for your questions. Ask what you like, then challenge an answer with the clues you have
          found, or say their story holds.
        </p>
      )}
      {!finished && !face && (
        <p className="hint dark">
          Everything {mid(who)} says is true except one answer. Ask your questions, then challenge the lie with the
          evidence that proves it.
        </p>
      )}

      {(asked.length > 0 || finished) && (
        <section className="transcript" aria-live="polite">
          <h2>What {mid(who)} said</h2>
          {(finished ? puzzle.questions.filter((q) => data.asked.includes(q.id) || q.lie) : asked).map((q) => {
            const isLie = finished && q.lie;
            return (
              <div key={q.id} className={`exchange ${isLie ? 'lie' : ''}`}>
                <p className="q">{q.ask}</p>
                <p className="a">
                  “{q.answer.body}”{isLie && <span className="lie-tag">Lie</span>}
                </p>
                {!finished && (
                  <button className="challenge" onClick={() => setChallenging(q)}>
                    Challenge
                  </button>
                )}
              </div>
            );
          })}
          {finished && data.caught && !face && (
            <p className="crack">
              {name(who)} goes pale. “All right. I'll tell you what I really know.”
            </p>
          )}
          {finished && !data.caught && lie && !data.asked.includes(lie.id) && (
            <p className="muted small">You didn't ask the question they lied about.</p>
          )}
        </section>
      )}

      {reply && !finished && <p className="game-message">{reply}</p>}

      {!finished && (
        <section className="questions">
          <h2>Ask</h2>
          {left <= 0 && <p className="muted small">No questions left. Challenge an answer, or press Solve.</p>}
          <div className="question-list">
            {puzzle.questions
              .filter((q) => !data.asked.includes(q.id))
              .map((q) => (
                <button key={q.id} className="question" disabled={left <= 0} onClick={() => ask(q)}>
                  {q.ask}
                </button>
              ))}
          </div>
        </section>
      )}

      {!finished && face && (
        <section className="face-actions">
          <button className="primary" onClick={face.onStop}>
            Their story holds
          </button>
          <button className="secondary" onClick={() => setConfirming(true)}>
            Solve
          </button>
          <button className="link-button" onClick={face.onSkip}>
            Skip to the verdict
          </button>
        </section>
      )}

      <section className="evidence">
        <h2>{puzzle.useCaseClues ? 'Your casebook' : 'Evidence on the table'}</h2>
        <ul className="clue-list">
          {evidence.map((e) => (
            <li key={e.id}>
              <ClueCard clue={e} guests={guests} compact />
            </li>
          ))}
        </ul>
      </section>

      {confirming && face && (
        <Dialog placement="center" labelId="face-solve-title" onClose={() => setConfirming(false)}>
          <h2 id="face-solve-title">Solve this?</h2>
          <p className="dialog-text">Are you sure? This can't be undone. You'll see where the story breaks, if it does.</p>
          <div className="dialog-actions">
            <button data-autofocus className="secondary" onClick={() => setConfirming(false)}>
              Keep asking
            </button>
            <button
              className="primary"
              onClick={() => {
                setConfirming(false);
                face.onSolve();
              }}
            >
              Solve it
            </button>
          </div>
        </Dialog>
      )}

      {challenging && (
        <Dialog labelId="present-title" onClose={() => setChallenging(null)}>
          <header className="sheet-head">
            <span />
            <div>
              <h2 id="present-title">
                Choose {need === 1 ? 'the piece of evidence' : `${need} pieces of evidence`} that prove it
              </h2>
              <p className="muted">“{challenging.answer.body}”</p>
            </div>
            <button data-autofocus className="sheet-close" aria-label="Close" onClick={() => setChallenging(null)}>
              ✕
            </button>
          </header>
          <ul className="clue-list">
            {evidence.map((e) => {
              const on = picked.includes(e.id);
              return (
                <li key={e.id}>
                  <button
                    className={`pick ${on ? 'on' : ''}`}
                    aria-pressed={on}
                    disabled={!on && picked.length >= need}
                    onClick={() => setPicked(on ? picked.filter((x) => x !== e.id) : [...picked, e.id])}
                  >
                    <span className="tick" aria-hidden="true">
                      {on ? '✓' : ''}
                    </span>
                    <ClueCard clue={e} guests={guests} compact />
                  </button>
                </li>
              );
            })}
          </ul>
          <button className="primary" disabled={picked.length !== need} onClick={present}>
            {picked.length === need ? `Present ${need === 1 ? 'it' : 'them'}` : `Pick ${need - picked.length} more`}
          </button>
        </Dialog>
      )}
    </div>
  );
}
