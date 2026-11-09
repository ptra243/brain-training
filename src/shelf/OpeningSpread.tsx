import { useEffect, useEffectEvent, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cats } from '../content/index.ts';
import { catCoats, playerPortrait, portraits } from '../content/portraits.ts';
import { opening } from '../content/talk.ts';
import type { Case } from '../engine/types.ts';
import { ClueCard } from '../game/ClueCard.tsx';
import { PortraitCard } from '../game/ExploreMap.tsx';
import { suspectColour, suspectInitials, suspectName } from '../game/names.ts';
import { openingScript, victimLineText } from '../game/opening.ts';
import { hasPortrait } from '../game/Portrait.tsx';
import type { Progress } from '../game/state.ts';
import { greeting, moodTint, setsFor } from '../game/talk.ts';
import { trapTab } from './focusTrap.ts';
import pageStyles from './CampaignOpening.module.css';
import styles from './TalkSpread.module.css';
import { useBackLayer } from './useBackLayer.ts';

export const CAT = 'cat';

interface Props {
  c: Case;
  progress: Progress;
  /** A guest's id, or 'cat'. */
  person: string;
  onClose: () => void;
}

/**
 * The opening's talk spread, in `TalkSpread`'s look (her portrait and theirs on the green baize) but with no
 * tabs: what this guest says, and the free clues they give as clue cards. The page opening it has already
 * dispatched the meeting, so this only shows. A Back layer, Escape and Close all close it.
 */
export function OpeningSpread({ c, progress, person, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const script = useMemo(() => openingScript(c), [c]);
  const sets = useMemo(() => setsFor(c), [c]);
  const isCat = person === CAT;
  const catName = cats[c.number % cats.length];
  const coat = catCoats[c.number % cats.length % catCoats.length];
  const clueOf = (id: string) => c.clues.find((x) => x.id === id)!;
  const name = isCat ? catName : suspectName(person, c.guests);

  useBackLayer(true, onClose);
  const close = useEffectEvent(() => onClose());
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus({ preventScroll: true });
    const untrap = tableRef.current ? trapTab(tableRef.current) : undefined;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      untrap?.();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  let card;
  let body;
  if (isCat) {
    const told = !!progress.opening?.cat;
    card = <PortraitCard coat={coat} tint="none" caption={catName} />;
    body = (
      <div data-testid="opening-cat">
        <p className={pageStyles.said}>{opening.catIntro[c.number % opening.catIntro.length]}</p>
        {told ? (
          <>
            <p className={pageStyles.plain}>{opening.catClueLead}</p>
            <Clues ids={script.catClues} c={c} clueOf={clueOf} />
          </>
        ) : null}
      </div>
    );
  } else {
    const set = sets[person];
    const told = progress.opening?.talked.includes(person);
    const mine = script.guests.find((g) => g.guest === person)!;
    const heard = progress.talk?.[person] ?? 0;
    card = <PortraitCard parts={hasPortrait(person) ? portraits[person] : undefined} tint={moodTint(set, heard, set.greetings)} caption={name} initials={suspectInitials(person, c.guests)} colour={suspectColour(person)} />;
    body = (
      <div data-testid="opening-person">
        <p className={pageStyles.said}>“{greeting(set, heard, set.greetings)}”</p>
        {told ? (
          <>
            <p className={pageStyles.plain}>“{victimLineText(c, person, suspectName(c.victim, c.guests))}”</p>
            <p className={pageStyles.plain}>“{set.thread[0]}”</p>
            <Clues ids={mine.clues} c={c} clueOf={clueOf} />
          </>
        ) : null}
      </div>
    );
  }

  return createPortal(
    <div ref={tableRef} className={styles.table} role="dialog" aria-modal="true" aria-labelledby="opening-spread-title" data-testid="opening-spread">
      <div className={styles.column}>
        <header className={styles.head}>
          <h2 id="opening-spread-title" className={styles.title}>
            <span className="sr-only">Talking to </span>
            {name}
          </h2>
          <button ref={closeRef} type="button" className={styles.close} aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className={styles.cards}>
          <PortraitCard parts={playerPortrait} tint="none" caption="You" />
          {card}
        </div>
        <div className={`${styles.note} ${pageStyles.spreadNote}`}>{body}</div>
      </div>
    </div>,
    document.body,
  );
}

function Clues({ ids, c, clueOf }: { ids: readonly string[]; c: Case; clueOf: (id: string) => Case['clues'][number] }) {
  if (ids.length === 0) return <p className={pageStyles.plain}>Nothing for your casebook from them.</p>;
  return (
    <>
      <ul className={pageStyles.clues} aria-label="New clues">
        {ids.map((id) => (
          <li key={id}>
            <span className={pageStyles.newClue}>New clue</span>
            <ClueCard clue={clueOf(id)} guests={c.guests} />
          </li>
        ))}
      </ul>
      <p className={pageStyles.added}>✓ Added to your casebook</p>
    </>
  );
}
