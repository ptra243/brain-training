import { useMemo, useState, type CSSProperties } from 'react';
import { cats } from '../content/index.ts';
import { opening } from '../content/talk.ts';
import { fillIn } from '../engine/text.ts';
import { Dialog } from '../game/Dialog.tsx';
import { bodyRoom } from '../game/explore.ts';
import { faceClass, roomName, suspectColour, suspectName } from '../game/names.ts';
import { joinNames, openingScript, openingStep, openingSummary } from '../game/opening.ts';
import { SuspectCounterFace } from '../game/SuspectCounterFace.tsx';
import { catReady, guestRows, meetAction } from './campaignOpening.ts';
import styles from './CampaignOpening.module.css';
import { CAT, OpeningSpread } from './OpeningSpread.tsx';
import type { CampaignBook } from './useCampaignBook.ts';

/**
 * Chapter one's first pages: the body line and the opening lines as a printed page, then the guests to meet.
 * Tapping one opens the opening spread; each guest is met once. It dispatches exactly what `OpeningScene`
 * does (same reducer, same `Progress.opening`), so an opening half done in one shell goes on in the other.
 * Skip hands over every free clue, as it does there.
 */
export function CampaignOpening({ book, initialPerson }: { book: CampaignBook; initialPerson?: string }) {
  const { c, progress, dispatch } = book;
  const [person, setPerson] = useState<string | null>(initialPerson ?? null);
  const [skip, setSkip] = useState<'confirm' | 'summary' | null>(null);
  const script = useMemo(() => openingScript(c), [c]);
  const rows = guestRows(c, progress);
  const talked = progress.opening?.talked ?? [];
  const total = c.suspects.length;
  const step = openingStep(c, progress);
  const moved = bodyRoom(c) !== c.sceneRoom;
  const catName = cats[c.number % cats.length];
  const summary = openingSummary(c, progress);

  const meet = (guest: string) => {
    const act = meetAction(progress, guest);
    if (act) dispatch(act);
    setPerson(guest);
  };
  const meetCat = () => {
    if (!progress.opening?.cat) dispatch({ type: 'opening-cat' });
    setPerson(CAT);
  };

  return (
    <div className={styles.scroll} data-testid="campaign-opening">
      <h2 className={styles.culprit}>{opening.culprit}</h2>
      <p className={styles.room}>
        {moved
          ? fillIn(opening.dragMarks, { room: roomName(script.room), scene: roomName(c.sceneRoom) })
          : `The body was found in the ${roomName(script.room)}. Everyone is here.`}
      </p>
      {talked.length === 0 ? <p className={styles.said}>{opening.connectors[c.number % opening.connectors.length]}</p> : null}
      <p className={styles.count} data-testid="opening-count">
        {talked.length} of {total} spoken to
      </p>

      <ul className={styles.guests} aria-label="The guests">
        {rows.map((r) => (
          <li key={r.guest}>
            <button type="button" className={`${styles.guest} ${r.met ? styles.met : ''}`} onClick={() => meet(r.guest)}>
              <span className={`counter static${faceClass(r.guest)}`} style={{ '--counter': suspectColour(r.guest) } as CSSProperties} aria-hidden="true">
                <SuspectCounterFace id={r.guest} guests={c.guests} />
              </span>
              <span className={styles.name}>{suspectName(r.guest, c.guests)}</span>
              {r.met ? (
                <span className={styles.tick} role="img" aria-label="spoken to">
                  ✓
                </span>
              ) : null}
            </button>
          </li>
        ))}
        {catReady(c, progress) ? (
          <li>
            <button type="button" className={`${styles.guest} ${progress.opening?.cat ? styles.met : ''}`} onClick={meetCat}>
              <span className={styles.paw} aria-hidden="true">
                🐾
              </span>
              <span className={styles.name}>Talk to {catName}</span>
              {progress.opening?.cat ? (
                <span className={styles.tick} role="img" aria-label="spoken to">
                  ✓
                </span>
              ) : null}
            </button>
          </li>
        ) : null}
      </ul>

      <button type="button" className={styles.skip} onClick={() => setSkip('confirm')}>
        Skip
      </button>

      {person ? <OpeningSpread c={c} progress={progress} person={person} onClose={() => setPerson(null)} /> : null}

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
    </div>
  );
}
