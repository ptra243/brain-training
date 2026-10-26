import { useMemo, useState, type CSSProperties } from 'react';
import { cats } from '../content/index.ts';
import { catCoats, playerPortrait, portraits } from '../content/portraits.ts';
import { opening } from '../content/talk.ts';
import type { Case } from '../engine/types.ts';
import { fillIn } from '../engine/text.ts';
import { ClueCard } from './ClueCard.tsx';
import { Dialog } from './Dialog.tsx';
import { bodyRoom } from './explore.ts';
import { PortraitCard } from './ExploreMap.tsx';
import { faceClass, roomName, suspectColour, suspectInitials, suspectName } from './names.ts';
import { joinNames, openingScript, openingStep, openingSummary, victimLineText } from './opening.ts';
import { hasPortrait } from './Portrait.tsx';
import { SuspectCounterFace } from './SuspectCounterFace.tsx';
import type { Action, Progress } from './state.ts';
import { greeting, moodTint, setsFor } from './talk.ts';

interface Props {
  c: Case;
  progress: Progress;
  dispatch: (a: Action) => void;
  onHome: () => void;
  /** Dev previews: open on this person ('cat' for the cat) or on the skip step. */
  initial?: { person?: string; skip?: 'confirm' | 'summary' };
}

const CAT = 'cat';

/**
 * Round 1's opening: everyone stands in the room with the body, she talks to each guest once (any order),
 * then the cat shows its finds. All state is in `Progress.opening`; only the open sheet and the skip step are local.
 */
export function OpeningScene({ c, progress, dispatch, onHome, initial }: Props) {
  const [person, setPerson] = useState<string | null>(initial?.person ?? null);
  const [skip, setSkip] = useState<'confirm' | 'summary' | null>(initial?.skip ?? null);
  const script = useMemo(() => openingScript(c), [c]);
  const sets = useMemo(() => setsFor(c), [c]);
  const talked = progress.opening?.talked ?? [];
  const step = openingStep(c, progress);
  const total = c.suspects.length;
  const moved = bodyRoom(c) !== c.sceneRoom;
  const catName = cats[c.number % cats.length];
  const coat = catCoats[c.number % cats.length % catCoats.length];
  const clueOf = (id: string) => c.clues.find((x) => x.id === id)!;
  const summary = openingSummary(c, progress);

  const guestSheet = (guest: string) => {
    const set = sets[guest];
    const told = talked.includes(guest);
    const mine = script.guests.find((g) => g.guest === guest)!;
    const name = suspectName(guest, c.guests);
    const heard = progress.talk?.[guest] ?? 0;
    return [
      (
        <PortraitCard
          key="card"
          parts={hasPortrait(guest) ? portraits[guest] : undefined}
          tint={moodTint(set, heard, set.greetings)}
          caption={name}
          initials={suspectInitials(guest, c.guests)}
          colour={suspectColour(guest)}
        />
      ),
      (
        <div key="body" className="opening-talk" data-testid="opening-person">
          <p className="opening-line">“{greeting(set, heard, set.greetings)}”</p>
          {told ? (
            <>
              <p className="opening-victim">“{victimLineText(c, guest, suspectName(c.victim, c.guests))}”</p>
              <p className="opening-victim">“{set.thread[0]}”</p>
              {mine.clues.length > 0 && (
                <ul className="clue-list">
                  {mine.clues.map((id) => (
                    <li key={id}>
                      <span className="opening-new">New clue</span>
                      <ClueCard clue={clueOf(id)} guests={c.guests} />
                    </li>
                  ))}
                </ul>
              )}
              {mine.clues.length > 0 && <p className="opening-added">✓ Added to your casebook</p>}
            </>
          ) : (
            <button type="button" className="primary" onClick={() => dispatch({ type: 'opening-talk', guest })}>
              Hear what {name} says
            </button>
          )}
        </div>
      ),
    ] as const;
  };

  const catSheet = () => {
    const told = !!progress.opening?.cat;
    return [
      <PortraitCard key="card" coat={coat} tint="none" caption={catName} />,
      (
        <div key="body" className="opening-talk" data-testid="opening-cat">
          <p className="opening-line">{opening.catIntro[c.number % opening.catIntro.length]}</p>
          {told ? (
            <>
              <p className="opening-victim">{opening.catClueLead}</p>
              <ul className="clue-list">
                {script.catClues.map((id) => (
                  <li key={id}>
                    <span className="opening-new">New clue</span>
                    <ClueCard clue={clueOf(id)} guests={c.guests} />
                  </li>
                ))}
              </ul>
              {script.catClues.length > 0 && <p className="opening-added">✓ Added to your casebook</p>}
            </>
          ) : (
            <button type="button" className="primary" onClick={() => dispatch({ type: 'opening-cat' })}>
              See what {catName} found
            </button>
          )}
        </div>
      ),
    ] as const;
  };

  const sheet = person ? (person === CAT ? catSheet() : guestSheet(person)) : null;

  return (
    <main className="opening" data-testid="opening-scene">
      <div className="opening-top">
        <button className="step" aria-label="Home" onClick={onHome}>
          ‹
        </button>
        <h1 className="opening-culprit">{opening.culprit}</h1>
      </div>
      <p className="opening-room">
        {moved
          ? fillIn(opening.dragMarks, { room: roomName(script.room), scene: roomName(c.sceneRoom) })
          : `The body was found in the ${roomName(script.room)}. Everyone is here.`}
      </p>
      <p className="opening-count" data-testid="opening-count">
        {talked.length} of {total} spoken to
      </p>
      {talked.length === 0 && <p className="opening-line">{opening.connectors[c.number % opening.connectors.length]}</p>}

      <ul className="opening-guests">
        {c.suspects.map((g) => (
          <li key={g}>
            <button type="button" className={`opening-guest${talked.includes(g) ? ' talked' : ''}`} onClick={() => setPerson(g)}>
              {talked.includes(g) && (
                <span className="opening-tick" role="img" aria-label="spoken to">
                  ✓
                </span>
              )}
              <span className={`counter static${faceClass(g)}`} style={{ '--counter': suspectColour(g) } as CSSProperties} aria-hidden="true">
                <SuspectCounterFace id={g} guests={c.guests} />
              </span>
              <span>{suspectName(g, c.guests)}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="opening-actions">
        {step !== 'guests' && script.catClues.length > 0 && (
          <button type="button" className="primary" onClick={() => setPerson(CAT)}>
            Talk to {catName}
          </button>
        )}
        <button type="button" className="secondary opening-skip" onClick={() => setSkip('confirm')}>
          Skip
        </button>
      </div>

      {person && (
        <Dialog onClose={() => setPerson(null)} labelId="opening-person-title">
          <h2 id="opening-person-title" className="sr-only">
            Talking to {person === CAT ? catName : suspectName(person, c.guests)}
          </h2>
          <button data-autofocus type="button" className="secondary opening-back" onClick={() => setPerson(null)}>
            Back to the guests
          </button>
          <div className="talk-head no-close">
            <PortraitCard parts={playerPortrait} tint="none" caption="You" />
            {sheet![0]}
          </div>
          {sheet![1]}
        </Dialog>
      )}

      {skip === 'confirm' && (
        <Dialog placement="center" labelId="skip-title" onClose={() => setSkip(null)}>
          <h2 id="skip-title">{opening.skipTitle}</h2>
          <p className="dialog-text">{fillIn(opening.skipBody, { n: String(talked.length), total: String(total) })}</p>
          <div className="dialog-actions">
            <button data-autofocus className="secondary" onClick={() => setSkip(null)}>
              Keep going
            </button>
            <button className="primary" onClick={() => setSkip('summary')}>
              Skip
            </button>
          </div>
        </Dialog>
      )}

      {skip === 'summary' && (
        <Dialog placement="center" labelId="skip-summary-title" onClose={() => dispatch({ type: 'opening-skip' })}>
          <h2 id="skip-summary-title">Skipped</h2>
          <p className="dialog-text">
            {summary.cluesGot} clue{summary.cluesGot === 1 ? ' is' : 's are'} in your casebook.
            {summary.guestsMissed.length > 0 &&
              ` ${fillIn(opening.skipMissed, { names: joinNames(summary.guestsMissed.map((g) => suspectName(g, c.guests))) })}`}{' '}
            Their sheets are there when you want them.
          </p>
          <div className="dialog-actions single">
            <button data-autofocus className="primary" onClick={() => dispatch({ type: 'opening-skip' })}>
              Open the casebook
            </button>
          </div>
        </Dialog>
      )}

      {step === 'finish' && !person && !skip && (
        <Dialog placement="center" labelId="opening-finish-title" onClose={() => dispatch({ type: 'opening-finish' })}>
          <h2 id="opening-finish-title">That is everyone</h2>
          <p className="dialog-text">
            {opening.finished} {opening.disperse}
          </p>
          <div className="dialog-actions single">
            <button data-autofocus className="primary" onClick={() => dispatch({ type: 'opening-finish' })}>
              Look around
            </button>
          </div>
        </Dialog>
      )}
    </main>
  );
}
