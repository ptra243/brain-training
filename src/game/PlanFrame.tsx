import type { ReactNode, Ref } from 'react';
import type { House, Room } from '../engine/types.ts';
import { DoorGaps } from './DoorGaps.tsx';
import { roomTint } from './names.ts';
import { labelClass, tileWalls } from './plan.ts';

export interface PlanTile {
  /** Extra classes on the .tile (hinted, here, ...). */
  className?: string;
  onClick?: () => void;
  /** Extra text after the room name in the label, e.g. the body mark. */
  labelSuffix?: ReactNode;
  /** Rendered inside the tile after the label, only on the room's label cell. */
  labelChildren?: ReactNode;
}

interface Props {
  house: House;
  owner: Map<string, Room>;
  /** Room ids in play tonight; others get `closed`. */
  inPlay: readonly string[];
  /** Extra class on both .floorplan-frame and .floorplan ('explore'). */
  variant?: string;
  /** Extra class on .floorplan only. */
  planClass?: string;
  planRef?: Ref<HTMLDivElement>;
  /** Per-room tile behaviour. */
  tile: (room: Room, r: number, col: number, isLabel: boolean) => PlanTile;
  /** Overlays drawn after DoorGaps (counters, marks, you-marker). */
  children?: ReactNode;
}

/** The floor plan: axis numbers, the room tiles and door gaps, then the caller's overlays. */
export function PlanFrame({ house, owner, inPlay, variant, planClass, planRef, tile, children }: Props) {
  return (
    <div className={`floorplan-frame ${variant ?? ''}`.trim()}>
      <div className="plan-axes" style={{ gridTemplateColumns: `1rem repeat(${house.cols}, 1fr)` }} aria-hidden="true">
        <span />
        {Array.from({ length: house.cols }, (_, col) => (
          <span key={col}>{col + 1}</span>
        ))}
      </div>
      <div className="plan-body">
        <div className="plan-rows" style={{ gridTemplateRows: `repeat(${house.rows}, 1fr)` }} aria-hidden="true">
          {Array.from({ length: house.rows }, (_, r) => (
            <span key={r}>{r + 1}</span>
          ))}
        </div>
        <div
          ref={planRef}
          className={`floorplan ${variant ?? ''} ${planClass ?? ''}`.replace(/\s+/g, ' ').trim()}
          style={{
            gridTemplateColumns: `repeat(${house.cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${house.rows}, minmax(0, 1fr))`,
            aspectRatio: `${house.cols} / ${house.rows}`,
          }}
        >
          {Array.from({ length: house.rows }, (_, r) =>
            Array.from({ length: house.cols }, (_, col) => {
              const room = owner.get(`${r},${col}`);
              if (!room) return <div key={`${r}-${col}`} className="tile void" aria-hidden="true" />;
              const isLabel = room.cells[0][0] === r && room.cells[0][1] === col;
              const t = tile(room, r, col, isLabel);
              return (
                <div
                  key={`${r}-${col}`}
                  className={`tile ${inPlay.includes(room.id) ? '' : 'closed'} ${t.className ?? ''}`}
                  onClick={t.onClick}
                  style={{ background: roomTint(room.id), ...tileWalls(owner, r, col) }}
                >
                  {isLabel && (
                    <span className={labelClass(house, room)}>
                      {room.name}
                      {t.labelSuffix}
                    </span>
                  )}
                  {isLabel && t.labelChildren}
                </div>
              );
            }),
          )}
          <DoorGaps house={house} />
          {children}
        </div>
      </div>
    </div>
  );
}
