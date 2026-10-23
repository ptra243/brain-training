import type { House } from '../engine/types.ts';
import { doorSpots } from '../engine/house.ts';

// Each inset is 22% of a cell edge at each end, so the gap scales with the cell.
const INSET = 0.22;

/** Doors as gaps in the wall, drawn inside `.floorplan` (positioned in percent of the plan). Nothing for a house with no doors. */
export function DoorGaps({ house }: { house: House }) {
  if (!house.doors) return null;
  return (
    <>
      {doorSpots(house).map((d) => {
        const key = `${d.a}-${d.b}`;
        // The wall between two cells is the next cell's border, so the gap starts at the cell line.
        return d.side === 'right' ? (
          <span
            key={key}
            className="door-gap v"
            style={{ left: `calc(${((d.col + 1) / house.cols) * 100}% - 1px)`, top: `${((d.row + INSET) / house.rows) * 100}%`, height: `${((1 - 2 * INSET) / house.rows) * 100}%` }}
            aria-hidden="true"
          />
        ) : (
          <span
            key={key}
            className="door-gap h"
            style={{ top: `calc(${((d.row + 1) / house.rows) * 100}% - 1px)`, left: `${((d.col + INSET) / house.cols) * 100}%`, width: `${((1 - 2 * INSET) / house.cols) * 100}%` }}
            aria-hidden="true"
          />
        );
      })}
    </>
  );
}
