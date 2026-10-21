import { useMemo, useState, type CSSProperties } from 'react';
import { content, houseDetails } from '../content/index.ts';
import type { Case, GameKind, Room } from '../engine/types.ts';
import { Dialog } from './Dialog.tsx';
import { clockAfterNext, canOpen, minutesPerGame, openPuzzlesIn, roomContents, whereAmI } from './explore.ts';
import { GAMES } from './games/registry.tsx';
import { roomName, roomTint, suspectColour, suspectInitials, suspectName } from './names.ts';
import type { PuzzleGate } from './CluesPanel.tsx';
import { gameDone, type Action, type Progress } from './state.ts';
import { TalkSection } from './TalkSection.tsx';
import { questioningOf } from './talk.ts';

interface Props {
  c: Case;
  progress: Progress;
  dispatch: (a: Action) => void;
  /** This round's puzzle picks (absent for an earlier round). */
  gate?: PuzzleGate;
  /** An earlier round: look, don't touch. */
  readOnly?: boolean;
  /** Midnight: the map shows, but she can't move and nothing in the room opens. */
  locked?: boolean;
  onPlay: (kind: GameKind) => void;
}

const nearest = (room: Room, r: number, col: number) =>
  room.cells.reduce((best, cell) =>
    (cell[0] - r) ** 2 + (cell[1] - col) ** 2 < (best[0] - r) ** 2 + (best[1] - col) ** 2 ? cell : best,
  );

/** The square nearest the middle of a room: where her marker stands. */
function centreOf(room: Room): readonly [number, number] {
  const cr = room.cells.reduce((s, [r]) => s + r, 0) / room.cells.length;
  const cc = room.cells.reduce((s, [, col]) => s + col, 0) / room.cells.length;
  return nearest(room, cr, cc);
}

/** The campaign's map: her room, where the body was found, a mark over rooms with something to play, and what is in her room. */
export function ExploreMap({ c, progress, dispatch, gate, readOnly, locked, onPlay }: Props) {
  const { house } = content;
  const contents = useMemo(() => roomContents(content, houseDetails, c), [c]);
  const here = whereAmI(c, progress);
  const frozen = !!readOnly || !!locked;
  const picked = gate?.picked ?? [];
  const left = gate?.left ?? 0;
  const [seen, setSeen] = useState<string[]>([]);
  const [person, setPerson] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<GameKind | null>(null);

  const owner = useMemo(() => {
    const m = new Map<string, Room>();
    for (const room of house.rooms) for (const [r, col] of room.cells) m.set(`${r},${col}`, room);
    return m;
  }, [house]);
  const roomAtCell = (r: number, col: number) => owner.get(`${r},${col}`)!;
  const wall = (r: number, col: number, dr: number, dc: number) => roomAtCell(r, col) !== owner.get(`${r + dr},${col + dc}`);
  const pct = (r: number, col: number) => ({ top: `${(r / house.rows) * 100}%`, left: `${(col / house.cols) * 100}%` });

  const open = (kind: GameKind) => {
    if (frozen) return;
    if (gate && !picked.includes(kind)) setConfirming(kind);
    else onPlay(kind);
  };
  const playable = (kind: GameKind) => !!gate && canOpen(c, progress, kind, picked, left);
  const usedUp = (kind: GameKind) => !!gate && !gameDone(progress, kind) && !picked.includes(kind) && left === 0;

  const go = (room: string) => {
    if (!frozen) dispatch({ type: 'move', room });
  };

  const mine = contents[here];
  const there = house.rooms.find((r) => r.id === here)!;
  const marker = centreOf(there);
  const minutes = minutesPerGame(c);
  const puzzleReward = (kind: GameKind) => {
    const g = c.games.find((x) => x.kind === kind)!;
    return `${GAMES[kind].name}. Unlocks ${g.clues.length} clue${g.clues.length === 1 ? '' : 's'}`;
  };
  const rowAction = (kind: GameKind) =>
    gameDone(progress, kind) ? '✓' : usedUp(kind) ? '–' : progress.games[kind]?.status === 'playing' ? 'Continue' : 'Play';

  const personQuestion = person ? questioningOf(c, person) : undefined;

  return (
    <section className="panel">
      <p className="hint">
        {locked
          ? "It's midnight. There's no time left to look around."
          : readOnly
            ? 'An earlier night: you can look, but not walk about.'
            : 'Tap a room to walk there. A red mark means something to do.'}
      </p>

      <div className="floorplan-frame explore">
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
            className="floorplan explore"
            style={{
              gridTemplateColumns: `repeat(${house.cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${house.rows}, minmax(0, 1fr))`,
              aspectRatio: `${house.cols} / ${house.rows}`,
            }}
          >
            {Array.from({ length: house.rows }, (_, r) =>
              Array.from({ length: house.cols }, (_, col) => {
                const room = roomAtCell(r, col);
                const inPlay = c.rooms.includes(room.id);
                const isLabel = room.cells[0][0] === r && room.cells[0][1] === col;
                const todo = inPlay && !locked && !readOnly && openPuzzlesIn(c, progress, contents[room.id], picked, left).length > 0;
                return (
                  <div
                    key={`${r}-${col}`}
                    className={`tile ${inPlay ? '' : 'closed'} ${room.id === c.sceneRoom ? 'scene' : ''} ${room.id === here ? 'here' : ''}`}
                    onClick={inPlay ? () => go(room.id) : undefined}
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
                        {room.id === c.sceneRoom && <span className="body-mark"> ✕ body</span>}
                      </span>
                    )}
                    {isLabel && inPlay && (
                      <button
                        className="tile-hit"
                        disabled={frozen}
                        aria-label={`${room.name}${room.id === c.sceneRoom ? ', where the body was found' : ''}${room.id === here ? ', you are here' : ''}${todo ? ', something to do' : ''}`}
                        aria-current={room.id === here ? 'location' : undefined}
                        onClick={(e) => {
                          e.stopPropagation();
                          go(room.id);
                        }}
                      />
                    )}
                  </div>
                );
              }),
            )}

            {house.rooms.map((room) => {
              if (!c.rooms.includes(room.id) || locked || readOnly) return null;
              if (!openPuzzlesIn(c, progress, contents[room.id], picked, left).length) return null;
              const [r, col] = centreOf(room);
              return (
                <span key={`mark-${room.id}`} className="todo-mark" style={pct(r + 0.2, col + 0.82)} aria-hidden="true">
                  !
                </span>
              );
            })}
            <span className="you-marker" style={pct(marker[0] + 0.5, marker[1] + 0.5)} aria-hidden="true">
              You
            </span>
          </div>
        </div>
      </div>

      <p className="legend">
        Shaded rooms are empty tonight: {house.rooms.filter((r) => !c.rooms.includes(r.id)).map((r) => roomName(r.id)).join(', ')}.
      </p>

      <article className={`card room-list ${frozen ? 'greyed' : ''}`} aria-label={`In the ${roomName(here)}`}>
        <h2>In the {roomName(here)}</h2>

        {mine.looks.length > 0 && (
          <>
            <h3>Something to look at</h3>
            <ul className="puzzle-list">
              {mine.looks.map((line, i) => (
                <li key={line}>
                  <button className="puzzle-row" disabled={frozen} onClick={() => setSeen((s) => (s.includes(line) ? s : [...s, line]))}>
                    <span className="puzzle-name">{i === 0 ? 'Have a look' : 'Have another look'}</span>
                    <span className="puzzle-reward">{seen.includes(line) ? line : 'Tap to take a look'}</span>
                    <span className="puzzle-action" aria-hidden="true">
                      {seen.includes(line) ? '✓' : 'Look'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {mine.objects.length > 0 && (
          <>
            <h3>Things to try</h3>
            <ul className="puzzle-list">
              {mine.objects.map((o) => {
                const done = gameDone(progress, o.kind);
                return (
                  <li key={o.kind}>
                    <button
                      className={`puzzle-row ${done ? 'done' : ''} ${usedUp(o.kind) ? 'locked' : ''}`}
                      disabled={frozen || usedUp(o.kind)}
                      onClick={() => open(o.kind)}
                    >
                      <span className="puzzle-name">{o.label}</span>
                      <span className="puzzle-reward">
                        {done ? (progress.games[o.kind]?.status === 'won' ? 'Solved' : 'Solved for you') : usedUp(o.kind) ? 'Not tonight: you have used your picks' : puzzleReward(o.kind)}
                      </span>
                      <span className="puzzle-action" aria-hidden="true">
                        {rowAction(o.kind)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {mine.guests.length > 0 && (
          <>
            <h3>People here</h3>
            <ul className="puzzle-list">
              {mine.guests.map((s) => {
                const q = questioningOf(c, s);
                return (
                  <li key={s}>
                    <button className="puzzle-row person-row" disabled={frozen} onClick={() => setPerson(s)}>
                      <span className="counter static" style={{ '--counter': suspectColour(s) } as CSSProperties} aria-hidden="true">
                        {suspectInitials(s)}
                      </span>
                      <span className="puzzle-name">{suspectName(s)}</span>
                      <span className="puzzle-reward">{q && playable(q.kind) ? 'Talk, or question them' : 'Talk'}</span>
                      <span className="puzzle-action" aria-hidden="true">
                        Talk
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {!mine.looks.length && !mine.objects.length && !mine.guests.length && <p className="muted">Nothing here.</p>}
      </article>

      {person && (
        <Dialog onClose={() => setPerson(null)} labelId="person-title">
          <header className="sheet-head">
            <span className="portrait" style={{ '--counter': suspectColour(person) } as CSSProperties} aria-hidden="true">
              {suspectInitials(person)}
            </span>
            <div>
              <h2 id="person-title">{suspectName(person)}</h2>
              <p className="muted">In the {roomName(here)}.</p>
            </div>
            <button data-autofocus className="sheet-close" aria-label="Close" onClick={() => setPerson(null)}>
              ✕
            </button>
          </header>
          <TalkSection
            c={c}
            progress={progress}
            dispatch={dispatch}
            suspect={person}
            idleLine="Nothing more to say for now."
            onQuestion={
              personQuestion && playable(personQuestion.kind)
                ? (kind) => {
                    setPerson(null);
                    open(kind);
                  }
                : undefined
            }
          />
        </Dialog>
      )}

      {confirming && (
        <Dialog placement="center" labelId="pick-title" onClose={() => setConfirming(null)}>
          <h2 id="pick-title">Play the {GAMES[confirming].name.toLowerCase()}?</h2>
          <p className="dialog-text">
            This takes {minutes} minutes: the clock moves to {clockAfterNext(c, progress)} when you finish it.
          </p>
          <div className="dialog-actions">
            <button data-autofocus className="secondary" onClick={() => setConfirming(null)}>
              Not yet
            </button>
            <button
              className="primary"
              onClick={() => {
                const kind = confirming;
                gate?.onPick(kind);
                setConfirming(null);
                onPlay(kind);
              }}
            >
              Play it
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
