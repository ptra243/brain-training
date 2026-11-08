import { useMemo, type CSSProperties } from 'react';
import type { Case, House } from '../engine/types.ts';
import { PlanFrame } from './PlanFrame.tsx';
import { ownerMap, tapRect } from './plan.ts';
import { playerPortrait } from '../content/portraits.ts';
import { bodyRoom, centreCell, openPuzzlesIn, roomsSeen, standSpots, type RoomContents } from './explore.ts';
import { faceClass, roomName, suspectColour, suspectName } from './names.ts';
import { Portrait } from './Portrait.tsx';
import { SuspectCounterFace } from './SuspectCounterFace.tsx';
import type { Progress } from './state.ts';
import type { GameKind } from '../engine/types.ts';

interface Props {
  c: Case;
  progress: Progress;
  house: House;
  /** What is in each room (`roomContents`). */
  contents: Record<string, RoomContents>;
  /** The room she is in. */
  here: string;
  /** This round's puzzle picks. */
  picked: readonly GameKind[];
  /** Puzzles she may still choose. */
  left: number;
  /** Midnight or an earlier night: no walking, no marks, guests disabled. */
  frozen: boolean;
  onWalk: (room: string) => void;
  onPerson: (id: string) => void;
}

/**
 * The explore floor plan: rooms with their tap targets, the body and scene marks, the red todo marks,
 * the guests in rooms she has entered, her own marker, and the legend for the empty rooms.
 * Shared by the classic `ExploreMap` and the #shelf campaign's Plan page.
 */
export function ExploreFloor({ c, progress, house, contents, here, picked, left, frozen, onWalk, onPerson }: Props) {
  const body = bodyRoom(c);
  const moved = body !== c.sceneRoom;
  const owner = useMemo(() => ownerMap(house), [house]);
  const pct = (r: number, col: number) => ({ top: `${(r / house.rows) * 100}%`, left: `${(col / house.cols) * 100}%` });
  const go = (room: string) => {
    if (!frozen) onWalk(room);
  };
  const mine = contents[here];
  const there = house.rooms.find((r) => r.id === here)!;
  const marker = standSpots(there, mine.guests, true).find((s) => s.id === 'player')!;
  const entered = roomsSeen(c, progress);

  return (
    <>
      <PlanFrame
        house={house}
        owner={owner}
        inPlay={c.rooms}
        variant="explore"
        tile={(room, labelR, labelCol, isLabel) => {
          // The tap target is the room's biggest rectangle, not just the label cell (a cell is ~23px on the 12-cell houses).
          const rect = tapRect(room);
          const hitStyle: CSSProperties = {
            inset: 'auto',
            top: `${(rect.r - labelR) * 100}%`,
            left: `${(rect.col - labelCol) * 100}%`,
            height: `${rect.h * 100}%`,
            width: `${rect.w * 100}%`,
          };
          const inPlay = c.rooms.includes(room.id);
          const todo = inPlay && !frozen && openPuzzlesIn(c, progress, contents[room.id], picked, left).length > 0;
          return {
            className: `${room.id === c.sceneRoom ? 'scene' : ''} ${room.id === here ? 'here' : ''}`,
            onClick: inPlay ? () => go(room.id) : undefined,
            labelSuffix: (
              <>
                {room.id === body && <span className="body-mark"> ✕ body</span>}
                {moved && room.id === c.sceneRoom && <span className="scene-mark"> ◆ scene</span>}
              </>
            ),
            labelChildren: isLabel && inPlay && (
              <button
                className="tile-hit"
                style={hitStyle}
                disabled={frozen}
                aria-label={`${room.name}${room.id === body ? ', where the body was found' : ''}${moved && room.id === c.sceneRoom ? ', where it happened, drag marks lead here' : ''}${room.id === here ? ', you are here' : ''}${todo ? ', something to do' : ''}`}
                aria-current={room.id === here ? 'location' : undefined}
                onClick={(ev) => {
                  ev.stopPropagation();
                  go(room.id);
                }}
              />
            ),
          };
        }}
      >
        {house.rooms.map((room) => {
          if (!c.rooms.includes(room.id) || frozen) return null;
          if (!openPuzzlesIn(c, progress, contents[room.id], picked, left).length) return null;
          const [r, col] = centreCell(room);
          return (
            <span key={`mark-${room.id}`} className="todo-mark" style={pct(r + 0.2, col + 0.82)} aria-hidden="true">
              !
            </span>
          );
        })}
        {house.rooms.flatMap((room) => {
          if (!entered.includes(room.id)) return [];
          const guests = contents[room.id]?.guests ?? [];
          const inRoom = room.id === here;
          return standSpots(room, guests, inRoom).flatMap((spot) => {
            if (spot.id === 'player') return [];
            const name = suspectName(spot.id, guests);
            return (
              <button
                key={spot.id}
                type="button"
                className={`map-person${faceClass(spot.id)}`}
                style={{ ...pct(spot.r, spot.col), '--counter': suspectColour(spot.id) } as CSSProperties}
                aria-label={inRoom ? `Talk to ${name}` : `Clues about ${name}`}
                disabled={frozen}
                onClick={(e) => {
                  e.stopPropagation();
                  onPerson(spot.id);
                }}
              >
                <SuspectCounterFace id={spot.id} guests={guests} />
              </button>
            );
          });
        })}
        <span className="you-marker" style={pct(marker.r, marker.col)} aria-hidden="true">
          <Portrait parts={playerPortrait} view="counter" />
        </span>
      </PlanFrame>

      <p className="legend">
        Shaded rooms are empty tonight: {house.rooms.filter((r) => !c.rooms.includes(r.id)).map((r) => roomName(r.id)).join(', ')}.
      </p>
    </>
  );
}
