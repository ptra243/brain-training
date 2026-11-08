import { useMemo } from 'react';
import { houseDetails } from '../content/index.ts';
import { houseOf } from '../content/houses.ts';
import { atMidnight, roomContents, whereAmI } from '../game/explore.ts';
import { ExploreFloor } from '../game/ExploreFloor.tsx';
import type { Subject } from '../game/state.ts';
import styles from './CampaignPlan.module.css';
import type { Height } from './notebook.ts';
import type { CampaignBook } from './useCampaignBook.ts';

interface Props {
  book: CampaignBook | null | false;
  /** How far up the notebook is: when it is up the plate has room to scroll above it. */
  height: Height;
  /** A guest in her own room: turn to the Room page and open the talk spread on them. */
  onTalk: (id: string) => void;
  /** A guest in another room: their page in the notebook. */
  onSubject: (s: Subject) => void;
}

/**
 * The campaign book's Plan section: the explore floor plan printed as a plate. Tap a room to walk there
 * (no time passes); tap a guest in her room to talk to them, or one in another room for their notebook
 * page. Frozen at midnight, as the classic explore map is.
 */
export function CampaignPlan({ book, height, onTalk, onSubject }: Props) {
  const c = book ? book.c : null;
  const contents = useMemo(() => (c ? roomContents(houseDetails, c) : null), [c]);
  if (!book || !c || !contents) return null;
  const here = whereAmI(c, book.progress);
  const frozen = atMidnight(c, book.progress);
  const house = houseOf(c);
  return (
    <div className={styles.scroll} data-testid="campaign-plan">
      <p className={styles.head}>
        <span>Plate I</span>
        <em>The house tonight</em>
      </p>
      <div className={styles.plate}>
        <p className="hint">{frozen ? "It's midnight. There's no time left to look around." : 'Tap a room to walk there. A red mark means something to do.'}</p>
        <ExploreFloor
          c={c}
          progress={book.progress}
          house={house}
          contents={contents}
          here={here}
          picked={book.picked}
          left={book.left}
          frozen={frozen}
          onWalk={(room) => book.dispatch({ type: 'move', room })}
          onPerson={(id) => {
            if (contents[here].guests.includes(id)) onTalk(id);
            else onSubject({ kind: 'suspect', id });
          }}
        />
      </div>
      {height === 'peek' ? null : <div className={styles.spacer} aria-hidden="true" />}
    </div>
  );
}
