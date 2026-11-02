import { useMemo, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { houseOf } from '../content/houses.ts';
import type { Case } from '../engine/types.ts';
import { SuspectCounterFace } from '../game/SuspectCounterFace.tsx';
import { PlanFrame } from '../game/PlanFrame.tsx';
import { faceClass, itemName, roomName, suspectColour } from '../game/names.ts';
import { SPREAD, anchors, ownerMap } from '../game/plan.ts';
import { heldItem, holderOf, itemRoom, placedRoom, type Progress, type Subject } from '../game/state.ts';
import styles from './GridSheet.module.css';
import { sheetStrip, sheetSubjectName, type SheetFace } from './gridSheet.ts';
import { useBackLayer } from './useBackLayer.ts';

const SWIPE_UP = 28;

interface Props {
  c: Case;
  progress: Progress;
  /** Closed when null; otherwise which face is showing. */
  face: SheetFace | null;
  onFace: (face: SheetFace | null) => void;
  /** The person, room or weapon the Clues face is filtered to. */
  focus: Subject | null;
  /** Why the list is short when it is not a subject: the cat's pawed clues. */
  pawedNote?: boolean;
  onShowAll: () => void;
  /** Tap a room on the House face. */
  onRoom: (room: string) => void;
  /** "Open their page" (a person or weapon; rooms have a page too). */
  onOpenPage: (s: Subject) => void;
  /** The clue list for the Clues face, already filtered (the notebook's ClueList). */
  clues: ReactNode;
}

/** Counters and weapons printed on the plan: read-only, taps fall through to the room beneath. */
function PlanPieces({ c, progress, house }: { c: Case; progress: Progress; house: ReturnType<typeof houseOf> }) {
  const pct = (r: number, col: number) => ({ top: `${(r / house.rows) * 100}%`, left: `${(col / house.cols) * 100}%` });
  const placed = c.suspects.map((s) => ({ suspect: s, room: placedRoom(c, progress, s) }));
  const looseItems = c.items.filter((i) => !holderOf(c, progress, i));
  const weapon = (item: string, carried = false) => (
    <span key={item} className={`weapon static ${carried ? 'carried' : ''}`}>
      {itemName(item)}
    </span>
  );
  return (
    <>
      {house.rooms.map((room) => {
        const { people, things } = anchors(room);
        const here = placed.filter((p) => p.room === room.id).map((p) => p.suspect);
        const spread = SPREAD[Math.max(0, Math.min(here.length, SPREAD.length) - 1)];
        const lying = looseItems.filter((i) => itemRoom(c, progress, i) === room.id);
        return [
          ...here.map((suspect, i) => {
            const [dr, dc] = spread[i] ?? [0, 0];
            const item = heldItem(c, progress, suspect);
            return (
              <div key={suspect} className="on-map" style={pct(people[0] + 0.5 + dr, people[1] + 0.5 + dc)}>
                <span className={`counter static${faceClass(suspect)}`} style={{ '--counter': suspectColour(suspect) } as CSSProperties} aria-hidden="true">
                  <SuspectCounterFace id={suspect} guests={c.guests} />
                </span>
                {item && weapon(item, true)}
              </div>
            );
          }),
          lying.length > 0 && (
            <div key={`items-${room.id}`} className="on-map items" style={pct(things[0] + 0.55, things[1] + 0.5)}>
              {lying.map((i) => weapon(i))}
            </div>
          ),
        ];
      })}
    </>
  );
}

/**
 * The pull-up sheet at the foot of the notebook's Grid tab: a 44px strip (clue count, House), or open on a
 * Clues face or a House face (the floor plan, read-only; a room tap shows the clues about it). Nothing is saved.
 */
export function GridSheet({ c, progress, face, onFace, focus, pawedNote, onShowAll, onRoom, onOpenPage, clues }: Props) {
  const open = face !== null;
  const house = useMemo(() => houseOf(c), [c]);
  const owner = useMemo(() => ownerMap(house), [house]);
  const gestureRef = useRef<{ y0: number | null; swiped: boolean }>({ y0: null, swiped: false });
  useBackLayer(open, () => onFace(null));

  // A swipe up on the strip opens it; the click a swipe also sends is ignored.
  const swipeUp = {
    onPointerDown: (e: ReactPointerEvent) => {
      gestureRef.current.y0 = e.clientY;
      gestureRef.current.swiped = false;
    },
    onPointerUp: (e: ReactPointerEvent) => {
      if (gestureRef.current.y0 === null) return;
      const dy = e.clientY - gestureRef.current.y0;
      gestureRef.current.y0 = null;
      if (dy < -SWIPE_UP) {
        gestureRef.current.swiped = true;
        onFace('clues');
      }
    },
    onPointerCancel: () => {
      gestureRef.current.y0 = null;
    },
  };
  const tap = (to: SheetFace) => () => {
    if (gestureRef.current.swiped) gestureRef.current.swiped = false;
    else onFace(to);
  };

  if (!open) {
    return (
      <div className={styles.sheet} data-noswipe>
        <div className={styles.strip} {...swipeUp}>
          <button type="button" className={styles.stripClues} onClick={tap('clues')}>
            {sheetStrip(c, progress, focus)}
          </button>
          <button type="button" className={styles.stripHouse} onClick={tap('house')}>
            House
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className={`${styles.sheet} ${styles.isOpen} ${face === 'house' ? styles.house : styles.cluesFace}`} data-noswipe role="region" aria-label="Clues and house">
      <div className={styles.bar}>
        <button type="button" aria-pressed={face === 'clues'} onClick={() => onFace('clues')}>
          Clues
        </button>
        <button type="button" aria-pressed={face === 'house'} onClick={() => onFace('house')}>
          House
        </button>
        <button type="button" className={styles.close} onClick={() => onFace(null)}>
          Close
        </button>
      </div>
      <div className={styles.body}>
        {face === 'clues' ? (
          <>
            {focus || pawedNote ? (
              <p className={styles.filter}>
                <span>{focus ? <>Showing clues about <strong>{sheetSubjectName(c, focus)}</strong></> : 'The clues the cat pawed at'}</span>
                <button type="button" onClick={onShowAll}>
                  Show all
                </button>
                {focus ? (
                  <button type="button" onClick={() => onOpenPage(focus)}>
                    Open their page
                  </button>
                ) : null}
              </p>
            ) : null}
            {clues}
          </>
        ) : (
          <div className={styles.plate}>
            <p className={styles.tip}>Tap a room to see the clues about it.</p>
            <PlanFrame
              house={house}
              owner={owner}
              inPlay={c.rooms}
              tile={(room) => ({
                className: focus?.kind === 'room' && focus.id === room.id ? 'hinted' : '',
                onClick: () => onRoom(room.id),
              })}
            >
              <PlanPieces c={c} progress={progress} house={house} />
            </PlanFrame>
            <p className={styles.tip}>
              Shaded rooms are empty tonight: {house.rooms.filter((r) => !c.rooms.includes(r.id)).map((r) => roomName(r.id)).join(', ') || 'none'}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
