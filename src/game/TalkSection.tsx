import { useMemo } from 'react';
import type { CharacterSet } from '../engine/sets.ts';
import type { Case, GameKind } from '../engine/types.ts';
import { soFarLines } from './opening.ts';
import { suspectName } from './names.ts';
import { beatText, greeting, questioningOf, readyBeats, setsFor } from './talk.ts';
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

/** What a guest says: greeting, pips, her question ("Tell me about yourself", then "Go on…"), the log of what she has heard, and "Question them". */
export function TalkSection({ c, progress, dispatch, suspect, onQuestion, idleLine }: Props) {
  const set = useMemo(() => setsFor(c)[suspect], [c, suspect]);
  const heard = progress.talk?.[suspect] ?? 0;
  const questioning = questioningOf(c, suspect);
  const question = questioning && !gameDone(progress, questioning.kind) && onQuestion ? questioning : undefined;
  return (
    <TalkView
      set={set}
      heard={heard}
      ready={readyBeats(c, progress, suspect, set.thread.length)}
      victimName={suspectName(c.victim, c.guests)}
      onHear={() => dispatch({ type: 'talk-hear', suspect })}
      soFar={soFarLines(c, progress, suspect)}
      idleLine={idleLine}
      onQuestion={question ? () => onQuestion?.(question.kind) : undefined}
    />
  );
}

interface ViewProps {
  set: Pick<CharacterSet, 'mood' | 'greetings' | 'thread'> & { asks?: readonly string[] | null };
  heard: number;
  ready: number;
  victimName: string;
  onHear: () => void;
  soFar?: readonly string[];
  idleLine?: string;
  /** Shows "Question them" when given. */
  onQuestion?: () => void;
}

/** The talk panel from plain props (the dev preview drives it by hand). */
export function TalkView({ set, heard, ready, victimName, onHear, soFar = [], idleLine, onQuestion }: ViewProps) {
  const more = heard < set.thread.length;
  const asks = set.asks && set.asks.length === set.thread.length ? set.asks : null;
  return (
    <section className="talk" aria-labelledby="talk-title">
      <h3 id="talk-title">Talk</h3>
      {soFar.length > 0 && (
        <p className="talk-sofar" data-testid="talk-sofar">
          <strong>So far:</strong> {soFar.join(' ')}
        </p>
      )}
      <p className="talk-greeting">“{greeting(set, heard, set.greetings)}”</p>
      <div className="talk-pips" role="img" aria-label={`${heard} of ${set.thread.length} heard`}>
        {set.thread.map((_, i) => (
          <span key={i} className={`pip ${i < heard ? 'filled' : ''}`} />
        ))}
      </div>
      {heard > 0 && (
        <ol className="talk-log">
          {set.thread.slice(0, heard).map((beat, i) => (
            <li key={beat}>
              {asks && (
                <em className="muted" style={{ display: 'block', marginBottom: 4 }} data-testid="talk-ask">
                  You: {beatText(asks[i], victimName)}
                </em>
              )}
              {beatText(beat, victimName)}
            </li>
          ))}
        </ol>
      )}
      {more && ready > heard && (
        <button className="secondary" onClick={onHear}>
          {asks ? beatText(asks[heard], victimName) : heard === 0 ? 'Tell me about yourself' : 'Go on…'}
        </button>
      )}
      {(!more || ready <= heard) && (idleLine ?? (more ? 'Nothing more to say yet.' : '')) && (
        <p className="muted">{idleLine ?? 'Nothing more to say yet.'}</p>
      )}
      {onQuestion && (
        <button className="secondary" onClick={onQuestion}>
          Question them
        </button>
      )}
    </section>
  );
}
