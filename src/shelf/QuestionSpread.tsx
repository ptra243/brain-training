import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { houseOf } from '../content/houses.ts';
import { playerPortrait, portraits } from '../content/portraits.ts';
import { caseFacts } from '../engine/caseFacts.ts';
import { disproves } from '../engine/interrogation.ts';
import type { Case, Interrogation } from '../engine/types.ts';
import { PortraitCard } from '../game/ExploreMap.tsx';
import { endingKind, faceLine } from '../game/face.ts';
import { InterrogationGame } from '../game/games/InterrogationGame.tsx';
import { interrogationInitial } from '../game/games/saveData.ts';
import { suspectColour, suspectInitials, suspectName } from '../game/names.ts';
import { hasPortrait } from '../game/Portrait.tsx';
import type { InterrogationData } from '../game/state.ts';
import { askedFirst } from './campaignAnswer.ts';
import { trapTab } from './focusTrap.ts';
import styles from './QuestionSpread.module.css';
import { shelfBack } from './backStack.ts';

interface Props {
  c: Case;
  interrogation: Interrogation;
  /** Whether the accused is the killer, and whether the weapon was right (the verdict is already fixed). */
  killer: boolean;
  rightWeapon: boolean;
  /** The clue ids she had found when she accused. */
  found: readonly string[];
  /** Questions already asked when it opens (the dev preview). */
  startAsked?: number;
  /** The questioning is over (or skipped): apply the verdict. */
  onDone: () => void;
}

/**
 * The accused in the chair after her accusation, drawn like the talk spread: her portrait and theirs as two
 * ivory cards on green baize, full screen over the book (on `document.body`, escaping the book's transform),
 * with the classic questioning beneath, unchanged: it plays the verdict out and changes nothing. As in
 * `FaceToFace`, it can't be closed: Escape does nothing and Back is held here (an accusation never gets
 * dropped by a stray Back); she leaves by finishing or by "Skip to the verdict".
 */
export function QuestionSpread({ c, interrogation, killer, rightWeapon, found, startAsked = 0, onDone }: Props) {
  const [data, setData] = useState<InterrogationData>(() => (startAsked > 0 ? askedFirst(interrogation, startAsked) : interrogationInitial()));
  const [finished, setFinished] = useState<'won' | 'revealed' | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  // Back is a layer that closes nothing: when it pops, it is put straight back.
  const [held, setHeld] = useState(0);
  useEffect(() => shelfBack().pushLayer(() => setHeld((n) => n + 1)), [held]);
  useEffect(() => {
    const table = tableRef.current;
    table?.focus({ preventScroll: true });
    return table ? trapTab(table) : undefined;
  }, []);

  const who = interrogation.suspect;
  const name = suspectName(who, c.guests);
  const evidence = c.clues.filter((cl) => found.includes(cl.id) && cl.delivery !== 'finale');
  const cf = caseFacts(houseOf(c), c);
  const seed = `${c.seed}-face-${who}`;
  const kind = endingKind(killer, rightWeapon, interrogation.cracks);

  return createPortal(
    <div ref={tableRef} className={styles.table} role="dialog" aria-modal="true" aria-labelledby="question-spread-title" tabIndex={-1} data-testid="question-spread">
      <div className={styles.column}>
        <h2 id="question-spread-title" className={styles.title}>
          <span className="sr-only">Questioning </span>
          {name}
        </h2>
        <div className={styles.cards}>
          <PortraitCard parts={playerPortrait} tint="none" caption="You" />
          <PortraitCard
            parts={hasPortrait(who) ? portraits[who] : undefined}
            tint="none"
            caption={name}
            initials={suspectInitials(who, c.guests)}
            colour={suspectColour(who)}
          />
        </div>
        <div className={styles.pane}>
          <InterrogationGame
            puzzle={interrogation}
            data={data}
            guests={c.guests}
            evidence={evidence}
            disproves={(cards, answer) => disproves(cf, cards.map((x) => x.fact), answer.answer.fact)}
            finished={finished}
            onChange={setData}
            onFinish={(status, d) => {
              setData(d);
              setFinished(status);
            }}
            face={{
              retort: (n) => faceLine('retort', `${seed}-${n}`),
              onStop: () => setFinished('revealed'),
              onSkip: onDone,
              onSolve: () => setFinished('revealed'),
            }}
          />
          {finished && (
            <section className="card face-ending" aria-live="polite">
              <p className={kind === 'innocent' ? 'face-line narrator' : 'face-line'}>{kind === 'innocent' ? faceLine(kind, seed) : `“${faceLine(kind, seed)}”`}</p>
              <button className="primary" onClick={onDone}>
                On to the verdict
              </button>
            </section>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
