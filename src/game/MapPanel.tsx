import { useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { content } from '../content/index.ts';
import type { Case, GameKind, Room } from '../engine/types.ts';
import { ClueCard } from './ClueCard.tsx';
import { cellOf, showsWrong } from './gridHints.ts';
import { Dialog } from './Dialog.tsx';
import { itemName, roomName, roomTint, suspectColour, suspectName, faceClass } from './names.ts';
import { SuspectCounterFace } from './SuspectCounterFace.tsx';
import {
  heldItem,
  holderOf,
  itemRoom,
  mapAccusation,
  markKey,
  placedRoom,
  sceneUnlocked,
  visibleClues,
  type Action,
  type Progress,
} from './state.ts';
import { SuspectSheet } from './SuspectSheet.tsx';
import { usePointerDrag } from './usePointerDrag.ts';

interface Props {
  c: Case;
  progress: Progress;
  dispatch: (a: Action) => void;
  /** After accusing from the map, show the result on the Accuse tab. */
  onAccused: () => void;
  /** `markKey` of the grid square the cat's hint is about. */
  pawedSquare?: string;
  /** Open a guest's questioning game from their sheet (absent where games can't be opened). */
  onQuestion?: (kind: GameKind) => void;
}

type Piece = { kind: 'suspect' | 'item'; id: string };

const nearest = (room: Room, r: number, c: number) =>
  room.cells.reduce((best, cell) =>
    (cell[0] - r) ** 2 + (cell[1] - c) ** 2 < (best[0] - r) ** 2 + (best[1] - c) ** 2 ? cell : best,
  );

/** Counters gather at the room square nearest its centre; loose weapons at the square farthest from that. */
function anchors(room: Room): { people: readonly [number, number]; things: readonly [number, number] } {
  const cr = room.cells.reduce((s, [r]) => s + r, 0) / room.cells.length;
  const cc = room.cells.reduce((s, [, col]) => s + col, 0) / room.cells.length;
  const people = nearest(room, cr, cc);
  const things =
    room.cells.length === 1
      ? people
      : room.cells.reduce((best, cell) =>
          (cell[0] - people[0]) ** 2 + (cell[1] - people[1]) ** 2 > (best[0] - people[0]) ** 2 + (best[1] - people[1]) ** 2
            ? cell
            : best,
        );
  return { people, things };
}

/** Offsets (in squares) so several counters in one room don't sit on top of each other. */
const SPREAD: [number, number][][] = [
  [[0, 0]],
  [[0, -0.27], [0, 0.27]],
  [[-0.22, -0.27], [-0.22, 0.27], [0.27, 0]],
  [[-0.24, -0.27], [-0.24, 0.27], [0.24, -0.27], [0.24, 0.27]],
  [[-0.27, -0.3], [-0.27, 0.3], [0.27, -0.3], [0.27, 0.3], [0, 0]],
];

export function MapPanel({ c, progress, dispatch, onAccused, pawedSquare, onQuestion }: Props) {
  // The cat's hint: the person or weapon and the room (or weapon) its square is about.
  const hint = pawedSquare ? cellOf(pawedSquare) : null;
  const hintedPiece = (p: Piece) => !!hint && hint.row === p.id;
  const hintedRoom = (room: string) => !!hint && hint.kind !== 'suspect-item' && hint.col === room;
  // Red-pencil rings: a person or weapon whose place on the map was pointed out as wrong.
  const wrongSuspect = (s: string) =>
    c.rooms.some((r) => progress.marks[markKey('suspect-room', s, r)] === 'o' && showsWrong(progress, progress.gridHints, markKey('suspect-room', s, r)));
  const wrongItem = (i: string) =>
    c.rooms.some((r) => progress.marks[markKey('item-room', i, r)] === 'o' && showsWrong(progress, progress.gridHints, markKey('item-room', i, r))) ||
    c.suspects.some((s) => progress.marks[markKey('suspect-item', s, i)] === 'o' && showsWrong(progress, progress.gridHints, markKey('suspect-item', s, i)));
  const { house } = content;
  const mapRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState<Piece | null>(null);
  const [confirming, setConfirming] = useState(false);

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

  /** A suspect counter under the finger, for handing someone a weapon. */
  const suspectAtPoint = (x: number, y: number): string | null => {
    for (const el of document.elementsFromPoint(x, y)) {
      const id = (el as HTMLElement).closest?.('[data-suspect]')?.getAttribute('data-suspect');
      if (id) return id;
    }
    return null;
  };

  const placeSuspect = (suspect: string, room: Room | null) => {
    if (room && !c.rooms.includes(room.id)) return; // empty rooms take no-one
    dispatch({ type: 'place', suspect, room: room?.id ?? null });
  };

  const drop = (piece: Piece, x: number, y: number) => {
    if (piece.kind === 'suspect') return placeSuspect(piece.id, roomAtPoint(x, y));
    const to = suspectAtPoint(x, y);
    if (to) return dispatch({ type: 'give-item', item: piece.id, suspect: to });
    const room = roomAtPoint(x, y);
    if (room && !c.rooms.includes(room.id)) return;
    dispatch({ type: 'place-item', item: piece.id, room: room?.id ?? null });
  };

  const { start, held, ghostRef } = usePointerDrag<Piece>({
    onDrop: (piece, at) => {
      drop(piece, at.x, at.y);
      setSelected(null);
    },
    onTap: (piece) => {
      if (piece.kind === 'suspect' && selected === piece.id) {
        setSelected(null); // tapping the counter again cancels "tap a room"
      } else {
        setSelected(null);
        setOpen(piece); // short tap: show the clues about it
      }
    },
  });

  const handlers = (piece: Piece) => ({
    onPointerDown: (e: ReactPointerEvent) => start(piece, e),
    // Keyboard activation (Enter/Space) fires click with detail 0 and no pointer events.
    onClick: (e: { detail: number }) => {
      if (e.detail === 0) setOpen(piece);
    },
  });

  const onMapTap = (r: number, col: number) => {
    if (!selected) return;
    placeSuspect(selected, roomAtCell(r, col) ?? null);
    setSelected(null);
  };

  // Walls: a thick edge wherever the neighbouring square is another room or outside.
  const wall = (r: number, col: number, dr: number, dc: number) => roomAtCell(r, col) !== roomAtCell(r + dr, col + dc);

  const lifted = (p: Piece) => held?.kind === p.kind && held.id === p.id;

  const counter = (suspect: string) => (
    <button
      key={suspect}
      data-suspect={suspect}
      className={`counter${faceClass(suspect)} ${selected === suspect ? 'selected' : ''} ${lifted({ kind: 'suspect', id: suspect }) ? 'lifted' : ''} ${wrongSuspect(suspect) ? 'wrong' : ''} ${hintedPiece({ kind: 'suspect', id: suspect }) ? 'hinted' : ''}`}
      style={{ '--counter': suspectColour(suspect) } as CSSProperties}
      aria-label={`${suspectName(suspect, c.guests)}${selected === suspect ? ', selected' : ''}`}
      aria-pressed={selected === suspect}
      {...handlers({ kind: 'suspect', id: suspect })}
    >
      <SuspectCounterFace id={suspect} guests={c.guests} />
    </button>
  );

  const weapon = (item: string, held = false) => (
    <button
      key={item}
      className={`weapon ${held ? 'carried' : ''} ${lifted({ kind: 'item', id: item }) ? 'lifted' : ''} ${wrongItem(item) ? 'wrong' : ''} ${hintedPiece({ kind: 'item', id: item }) || (hint?.kind === 'suspect-item' && hint.col === item) ? 'hinted' : ''}`}
      aria-label={`The ${itemName(item)}${held ? `, held by ${suspectName(holderOf(c, progress, item) ?? '', c.guests)}` : ''}`}
      {...handlers({ kind: 'item', id: item })}
    >
      {itemName(item)}
    </button>
  );

  const placed = c.suspects.map((s) => ({ suspect: s, room: placedRoom(c, progress, s) }));
  const unplaced = placed.filter((p) => !p.room).map((p) => p.suspect);
  const looseItems = c.items.filter((i) => !holderOf(c, progress, i));
  const trayItems = looseItems.filter((i) => !itemRoom(c, progress, i));
  const heldByUnplaced = c.items.filter((i) => {
    const h = holderOf(c, progress, i);
    return h && !placedRoom(c, progress, h);
  });

  const scene = sceneUnlocked(c, progress) ? c.sceneRoom : null;
  const implied = scene ? mapAccusation(c, progress) : null;

  const pct = (r: number, col: number) => ({
    top: `${(r / house.rows) * 100}%`,
    left: `${(col / house.cols) * 100}%`,
  });

  return (
    <section className="panel">
      <p className="hint">
        {selected
          ? `Now tap a room for ${suspectName(selected, c.guests)}, or tap the counter again to cancel.`
          : 'Drag people and weapons into rooms. Drop a weapon on someone to hand it to them. Tap anything to see its clues.'}
      </p>

      <div className="floorplan-frame">
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
            ref={mapRef}
            className={`floorplan ${selected ? 'awaiting' : ''}`}
            style={{
              gridTemplateColumns: `repeat(${house.cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${house.rows}, minmax(0, 1fr))`,
              aspectRatio: `${house.cols} / ${house.rows}`,
            }}
          >
            {Array.from({ length: house.rows }, (_, r) =>
              Array.from({ length: house.cols }, (_, col) => {
                const room = roomAtCell(r, col)!;
                const inPlay = c.rooms.includes(room.id);
                const isLabel = room.cells[0][0] === r && room.cells[0][1] === col;
                return (
                  <div
                    key={`${r}-${col}`}
                    className={`tile ${inPlay ? '' : 'closed'} ${room.id === scene ? 'scene' : ''} ${hintedRoom(room.id) ? 'hinted' : ''}`}
                    onClick={() => onMapTap(r, col)}
                    style={{
                      background: roomTint(room.id),
                      borderTopWidth: wall(r, col, -1, 0) ? 3 : 0,
                      borderLeftWidth: wall(r, col, 0, -1) ? 3 : 0,
                      borderBottomWidth: r === house.rows - 1 ? 3 : 0,
                      borderRightWidth: col === house.cols - 1 ? 3 : 0,
                    }}
                  >
                    {isLabel && (
                      <span className="room-name">
                        {room.name}
                        {room.id === scene && <span className="body-mark"> ✕ body</span>}
                      </span>
                    )}
                  </div>
                );
              }),
            )}

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
                      {counter(suspect)}
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
          </div>
        </div>
      </div>

      <div className="tray card">
        <h2>Not on the map yet</h2>
        {unplaced.length || trayItems.length ? (
          <ul>
            {unplaced.map((s) => (
              <li key={s}>
                {counter(s)}
                <span>{suspectName(s, c.guests)}</span>
                {heldByUnplaced.filter((i) => holderOf(c, progress, i) === s).map((i) => weapon(i, true))}
              </li>
            ))}
            {trayItems.map((i) => (
              <li key={i}>{weapon(i)}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">Everyone and everything is placed. Drag anything off the plan to take it back.</p>
        )}
      </div>

      <div className="accuse-bar card">
        {!scene ? (
          <p className="muted">Solve a word game on the Clues tab to learn where the body was found. Then you can accuse from here.</p>
        ) : implied ? (
          <>
            <p>
              Your map says <strong>{suspectName(implied.suspect, c.guests)}</strong>, in the {roomName(scene)}, with the{' '}
              <strong>{itemName(implied.item)}</strong>.
            </p>
            <button className="primary" disabled={progress.solved} onClick={() => setConfirming(true)}>
              {progress.solved ? 'Case closed' : 'Accuse'}
            </button>
          </>
        ) : (
          <p className="muted">
            To accuse from the map, put one person in the {roomName(scene)}, where the body was found, and give them a weapon.
          </p>
        )}
      </div>

      <p className="legend">
        Shaded rooms are empty tonight: {house.rooms.filter((r) => !c.rooms.includes(r.id)).map((r) => roomName(r.id)).join(', ')}.
      </p>

      {open?.kind === 'suspect' && (
        <SuspectSheet
          c={c}
          progress={progress}
          dispatch={dispatch}
          suspect={open.id}
          onClose={() => setOpen(null)}
          onQuestion={onQuestion}
          onMove={() => {
            setSelected(open.id);
            setOpen(null);
          }}
        />
      )}
      {open?.kind === 'item' && <ItemSheet c={c} progress={progress} dispatch={dispatch} item={open.id} onClose={() => setOpen(null)} />}

      {confirming && implied && scene && (
        <Dialog placement="center" labelId="accuse-title" onClose={() => setConfirming(false)}>
          <h2 id="accuse-title">Make the accusation?</h2>
          <p className="dialog-text">
            {suspectName(implied.suspect, c.guests)}, in the {roomName(scene)}, with the {itemName(implied.item)}. You'll hear how much of
            it is right.
          </p>
          <div className="dialog-actions">
            <button data-autofocus className="secondary" onClick={() => setConfirming(false)}>
              Not yet
            </button>
            <button
              className="primary"
              onClick={() => {
                setConfirming(false);
                dispatch({ type: 'accuse', suspect: implied.suspect, item: implied.item });
                onAccused();
              }}
            >
              Accuse
            </button>
          </div>
        </Dialog>
      )}

      {held &&
        (held.kind === 'suspect' ? (
          <div ref={ghostRef} className={`ghost${faceClass(held.id)}`} style={{ '--counter': suspectColour(held.id) } as CSSProperties}>
            <SuspectCounterFace id={held.id} guests={c.guests} />
          </div>
        ) : (
          <div ref={ghostRef} className="ghost weapon-ghost">
            {itemName(held.id)}
          </div>
        ))}
    </section>
  );
}

/** Clues that mention one weapon. */
function ItemSheet({
  c,
  progress,
  dispatch,
  item,
  onClose,
}: {
  c: Case;
  progress: Progress;
  dispatch: (a: Action) => void;
  item: string;
  onClose: () => void;
}) {
  const clues = visibleClues(c, progress).filter((cl) => 'item' in cl.fact && cl.fact.item === item);
  const holder = holderOf(c, progress, item);
  const room = itemRoom(c, progress, item);
  const where = holder
    ? `You've given it to ${suspectName(holder, c.guests).replace(/^The /, 'the ')}.`
    : room
      ? `You've put it in the ${roomName(room)}.`
      : 'Not placed yet.';
  return (
    <Dialog onClose={onClose} labelId="item-title">
      <header className="sheet-head">
        <span className="weapon static" aria-hidden="true">
          {itemName(item)}
        </span>
        <div>
          <h2 id="item-title">The {itemName(item)}</h2>
          <p className="muted">{where}</p>
        </div>
        <button data-autofocus className="sheet-close" aria-label="Close" onClick={onClose}>
          ✕
        </button>
      </header>
      {clues.length ? (
        <ul className="clue-list">
          {clues.map((clue) => (
            <li key={clue.id}>
              <ClueCard
                guests={c.guests}
                clue={clue}
                used={progress.used.includes(clue.id)}
                onToggle={() => dispatch({ type: 'toggle-used', clue: clue.id })}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No clue you've found so far mentions the {itemName(item)}.</p>
      )}
    </Dialog>
  );
}
