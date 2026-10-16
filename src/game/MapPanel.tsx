import { useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { content } from '../content/index.ts';
import type { Case, Room } from '../engine/types.ts';
import { itemName, roomName, suspectColour, suspectInitials, suspectName } from './names.ts';
import { heldItem, placedRoom, type Action, type Progress } from './state.ts';

interface Props {
  c: Case;
  progress: Progress;
  dispatch: (a: Action) => void;
}

const ROOM_TINTS: Record<string, string> = {
  kitchen: '#e7d9bf',
  library: '#cfd8c0',
  hall: '#d9d2c4',
  study: '#e2c9b8',
  conservatory: '#c7dacd',
  bedroom: '#dcd0dc',
};

/** Where counters gather in a room: the room cell nearest its centre. */
function anchorCell(room: Room): [number, number] {
  const cr = room.cells.reduce((s, [r]) => s + r, 0) / room.cells.length;
  const cc = room.cells.reduce((s, [, col]) => s + col, 0) / room.cells.length;
  let best = room.cells[0];
  let bestD = Infinity;
  for (const cell of room.cells) {
    const d = (cell[0] - cr) ** 2 + (cell[1] - cc) ** 2;
    if (d < bestD) [best, bestD] = [cell, d];
  }
  return [best[0], best[1]];
}

/** Offsets (in cells) so several counters in one room don't sit on top of each other. */
const SPREAD: [number, number][][] = [
  [[0, 0]],
  [[0, -0.27], [0, 0.27]],
  [[-0.22, -0.27], [-0.22, 0.27], [0.27, 0]],
  [[-0.24, -0.27], [-0.24, 0.27], [0.24, -0.27], [0.24, 0.27]],
  [[-0.27, -0.3], [-0.27, 0.3], [0.27, -0.3], [0.27, 0.3], [0, 0]],
];

interface Drag {
  suspect: string;
  x: number;
  y: number;
  startX: number;
  startY: number;
  moved: boolean;
}

export function MapPanel({ c, progress, dispatch }: Props) {
  const { house } = content;
  const mapRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const owner = useMemo(() => {
    const m = new Map<string, Room>();
    for (const room of house.rooms) for (const [r, col] of room.cells) m.set(`${r},${col}`, room);
    return m;
  }, [house]);
  const roomAtCell = (r: number, col: number) => owner.get(`${r},${col}`);

  const roomAtPoint = (x: number, y: number): Room | null => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect || x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null;
    const col = Math.min(house.cols - 1, Math.floor(((x - rect.left) / rect.width) * house.cols));
    const r = Math.min(house.rows - 1, Math.floor(((y - rect.top) / rect.height) * house.rows));
    return roomAtCell(r, col) ?? null;
  };

  const placeIn = (suspect: string, room: Room | null) => {
    if (room && !c.rooms.includes(room.id)) return; // empty rooms take no-one
    dispatch({ type: 'place', suspect, room: room?.id ?? null });
  };

  const onDown = (e: PointerEvent<HTMLButtonElement>, suspect: string) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ suspect, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false });
  };
  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    const moved = drag.moved || Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 8;
    setDrag({ ...drag, x: e.clientX, y: e.clientY, moved });
  };
  const onUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    if (drag.moved) {
      placeIn(drag.suspect, roomAtPoint(e.clientX, e.clientY));
      setSelected(null);
    } else {
      setSelected((s) => (s === drag.suspect ? null : drag.suspect));
    }
    setDrag(null);
  };

  const onMapTap = (r: number, col: number) => {
    if (!selected) return;
    placeIn(selected, roomAtCell(r, col) ?? null);
    setSelected(null);
  };

  // Walls: a thick edge wherever the neighbouring cell is another room or outside.
  const wall = (r: number, col: number, dr: number, dc: number) => {
    const here = roomAtCell(r, col);
    const there = roomAtCell(r + dr, col + dc);
    return here !== there;
  };

  const placed = c.suspects.map((s) => ({ suspect: s, room: placedRoom(c, progress, s) }));
  const unplaced = placed.filter((p) => !p.room).map((p) => p.suspect);

  const counter = (suspect: string, extraClass = '') => (
    <button
      key={suspect}
      className={`counter ${extraClass} ${selected === suspect ? 'selected' : ''} ${drag?.suspect === suspect && drag.moved ? 'lifted' : ''}`}
      style={{ '--counter': suspectColour(suspect) } as CSSProperties}
      aria-label={`${suspectName(suspect)}${selected === suspect ? ', selected' : ''}`}
      aria-pressed={selected === suspect}
      onPointerDown={(e) => onDown(e, suspect)}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={() => setDrag(null)}
    >
      {suspectInitials(suspect)}
    </button>
  );

  return (
    <section className="panel">
      <p className="hint">
        {selected
          ? `Now tap a room for ${suspectName(selected)}, or tap the counter again to cancel.`
          : 'Drag a counter into a room, or tap it and then tap a room. Placing someone ticks them in the grid.'}
      </p>

      <div className="floorplan-frame">
        <div
          ref={mapRef}
          className={`floorplan ${selected ? 'awaiting' : ''}`}
          style={{ gridTemplateColumns: `repeat(${house.cols}, 1fr)`, aspectRatio: `${house.cols} / ${house.rows}` }}
        >
          {Array.from({ length: house.rows }, (_, r) =>
            Array.from({ length: house.cols }, (_, col) => {
              const room = roomAtCell(r, col)!;
              const inPlay = c.rooms.includes(room.id);
              const isLabel = room.cells[0][0] === r && room.cells[0][1] === col;
              return (
                <div
                  key={`${r}-${col}`}
                  className={`tile ${inPlay ? '' : 'closed'}`}
                  onClick={() => onMapTap(r, col)}
                  style={{
                    background: ROOM_TINTS[room.id] ?? '#ddd',
                    borderTopWidth: wall(r, col, -1, 0) ? 3 : 0,
                    borderLeftWidth: wall(r, col, 0, -1) ? 3 : 0,
                    borderBottomWidth: r === house.rows - 1 ? 3 : 0,
                    borderRightWidth: col === house.cols - 1 ? 3 : 0,
                  }}
                >
                  {isLabel && <span className="room-name">{room.name}</span>}
                </div>
              );
            }),
          )}

          {house.rooms.map((room) => {
            const here = placed.filter((p) => p.room === room.id).map((p) => p.suspect);
            if (!here.length) return null;
            const [ar, ac] = anchorCell(room);
            const spread = SPREAD[Math.min(here.length, SPREAD.length) - 1];
            return here.map((suspect, i) => {
              const [dr, dc] = spread[i] ?? [0, 0];
              const item = heldItem(c, progress, suspect);
              return (
                <div
                  key={suspect}
                  className="on-map"
                  style={{
                    top: `${((ar + 0.5 + dr) / house.rows) * 100}%`,
                    left: `${((ac + 0.5 + dc) / house.cols) * 100}%`,
                  }}
                >
                  {counter(suspect)}
                  {item && <span className="held">{itemName(item)}</span>}
                </div>
              );
            });
          })}
        </div>
      </div>

      <div className="tray card">
        <h2>Not yet placed</h2>
        {unplaced.length ? (
          <ul>
            {unplaced.map((s) => (
              <li key={s}>
                {counter(s)}
                <span>{suspectName(s)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Everyone is on the map. Drag a counter off the plan to take it back.</p>
        )}
      </div>

      <p className="legend">Shaded rooms are empty tonight: {house.rooms.filter((r) => !c.rooms.includes(r.id)).map((r) => roomName(r.id)).join(', ')}.</p>

      {drag?.moved && (
        <div className="ghost" style={{ left: drag.x, top: drag.y, '--counter': suspectColour(drag.suspect) } as CSSProperties}>
          {suspectInitials(drag.suspect)}
        </div>
      )}
    </section>
  );
}
