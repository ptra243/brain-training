import { useMemo } from 'react';
import { talk } from '../content/talk.ts';
import type { Case, GameKind } from '../engine/types.ts';
import { greeting, questioningOf, readyBeats, setsFor } from './talk.ts';
import { gameDone, type Action, type Progress } from './state.ts';

interface Props {
  c: Case;
  progress: Progress;
  dispatch: (a: Action) => void;
  suspect: string;
  /** Open their questioning game (left out where games can't be opened). */
  onQuestion?: (kind: GameKind) => void;
  /**
   * What to say when no beat is ready, including when she has heard them all. Left out, the line shows
   * only while beats are still to come (the map's sheet).
   */
  idleLine?: string;
}

/** What a guest says: greeting, pips, "Anything else?", the log of what she has heard, and "Question them". */
export function TalkSection({ c, progress, dispatch, suspect, onQuestion, idleLine }: Props) {
  const set = useMemo(() => setsFor(c)[suspect], [c, suspect]);
  const heard = progress.talk?.[suspect] ?? 0;
  const ready = readyBeats(c, progress, suspect, set.thread.length);
  const questioning = questioningOf(c, suspect);
  const question = questioning && !gameDone(progress, questioning.kind) && onQuestion ? questioning : undefined;
  const more = heard < set.thread.length;

  return (
    <section className="talk" aria-labelledby="talk-title">
      <h3 id="talk-title">Talk</h3>
      <p className="talk-greeting">“{greeting(set, heard, talk.greetings)}”</p>
      <div className="talk-pips" role="img" aria-label={`${heard} of ${set.thread.length} heard`}>
        {set.thread.map((_, i) => (
          <span key={i} className={`pip ${i < heard ? 'filled' : ''}`} />
        ))}
      </div>
      {heard > 0 && (
        <ol className="talk-log">
          {set.thread.slice(0, heard).map((beat) => (
            <li key={beat}>{beat}</li>
          ))}
        </ol>
      )}
      {more && ready > heard && (
        <button className="secondary" onClick={() => dispatch({ type: 'talk-hear', suspect })}>
          Anything else?
        </button>
      )}
      {(!more || ready <= heard) && (idleLine ?? (more ? 'Nothing more to say yet.' : '')) && (
        <p className="muted">{idleLine ?? 'Nothing more to say yet.'}</p>
      )}
      {question && (
        <button className="secondary" onClick={() => onQuestion?.(question.kind)}>
          Question them
        </button>
      )}
    </section>
  );
}
