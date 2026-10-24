import { houseOf } from '../content/houses.ts';
import { useMemo, useState, type CSSProperties } from 'react';
import { houseDetails } from '../content/index.ts';
import type { Case, GameKind, House } from '../engine/types.ts';
import { PlanFrame } from './PlanFrame.tsx';
import { ownerMap, tapRect } from './plan.ts';
import { playerPortrait, portraits, type PortraitParts } from '../content/portraits.ts';
import { talk } from '../content/talk.ts';
import { Dialog } from './Dialog.tsx';
import { canOpen, centreCell, clockAfterNext, minutesPerGame, openPuzzlesIn, bodyRoom, roomContents, roomsSeen, standSpots, whereAmI } from './explore.ts';
import { GAMES } from './games/registry.tsx';
import { faceClass, roomName, suspectColour, suspectInitials, suspectName } from './names.ts';
import { hasPortrait, Portrait } from './Portrait.tsx';
import type { Tint } from './portrait.ts';
import { SuspectCounterFace } from './SuspectCounterFace.tsx';
import type { PuzzleGate } from './CluesPanel.tsx';
import { ClueCard } from './ClueCard.tsx';
import { gameDone, mentionsSuspect, visibleClues, type Action, type Progress } from './state.ts';
import { TalkSection } from './TalkSection.tsx';
import { moodTint, questioningOf, setsFor } from './talk.ts';

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
  /** The house to draw (default: the manor). */
  house?: House;
}

type PersonTab = 'talk' | 'minigame' | 'clues';

/** Ivory card: the drawn portrait, or initials when this guest has none yet. */
export function PortraitCard({ parts, tint, caption, initials, colour }: { parts?: PortraitParts; tint: Tint; caption: string; initials?: string; colour?: string }) {
  return (
    <figure className="portrait portrait-card" aria-hidden="true">
      <span className="portrait-art">
        {parts ? <Portrait parts={parts} view="full" tint={tint} /> : <span className="portrait-fallback" style={{ background: colour }}>{initials}</span>}
      </span>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function PersonMinigame({
  c,
  progress,
  person,
  playable,
  onPlay,
}: {
  c: Case;
  progress: Progress;
  person: string;
  playable: (kind: GameKind) => boolean;
  onPlay: (kind: GameKind) => void;
}) {
  const q = questioningOf(c, person);
  if (!q) return <p className="muted">Nothing to play with them.</p>;
  const kind = q.kind;
  if (gameDone(progress, kind)) return <p className="muted">{progress.games[kind]?.status === 'won' ? 'Solved.' : 'Solved for you.'}</p>;
  if (!playable(kind)) return <p className="muted">Not tonight: you have used your picks</p>;
  const n = c.games.find((g) => g.kind === kind)!.clues.length;
  return (
    <div className="person-game">
      <p className="person-game-name">{GAMES[kind].name}</p>
      <p className="muted">Unlocks {n} clue{n === 1 ? '' : 's'}</p>
      <button type="button" className="primary" onClick={() => onPlay(kind)}>
        {progress.games[kind]?.status === 'playing' ? 'Continue' : 'Play'}
      </button>
    </div>
  );
}

function PersonClues({ c, progress, dispatch, suspect }: { c: Case; progress: Progress; dispatch: (a: Action) => void; suspect: string }) {
  const clues = visibleClues(c, progress).filter((clue) => mentionsSuspect(clue, suspect));
  if (!clues.length) {
    return <p className="muted">No clue you've found so far names {suspectName(suspect, c.guests)}. Play the games to unlock more, or work them out from everyone else.</p>;
  }
  return (
    <ul className="clue-list">
      {clues.map((clue) => (
        <li key={clue.id}>
          <ClueCard guests={c.guests} clue={clue} used={progress.used.includes(clue.id)} onToggle={() => dispatch({ type: 'toggle-used', clue: clue.id })} />
        </li>
      ))}
    </ul>
  );
}

/** The campaign's map: her room, where the body was found, a mark over rooms with something to play, and what is in her room. */
export function ExploreMap({ c, progress, dispatch, gate, readOnly, locked, onPlay, house = houseOf(c) }: Props) {
  const contents = useMemo(() => roomContents(houseDetails, c), [c]);
  const here = whereAmI(c, progress);
  const frozen = !!readOnly || !!locked;
  const picked = gate?.picked ?? [];
  const left = gate?.left ?? 0;
  const [seen, setSeen] = useState<string[]>([]);
  const [person, setPerson] = useState<string | null>(null);
  const [personTab, setPersonTab] = useState<PersonTab>('talk');
  const [confirming, setConfirming] = useState<GameKind | null>(null);
  const openPerson = (id: string) => {
    setPersonTab('talk');
    setPerson(id);
  };

  const owner = useMemo(() => ownerMap(house), [house]);
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
  const marker = standSpots(there, mine.guests, true).find((s) => s.id === 'player')!;
  const entered = roomsSeen(c, progress);
  const minutes = minutesPerGame(c);
  const puzzleReward = (kind: GameKind) => {
    const g = c.games.find((x) => x.kind === kind)!;
    return `${GAMES[kind].name}. Unlocks ${g.clues.length} clue${g.clues.length === 1 ? '' : 's'}`;
  };
  const rowAction = (kind: GameKind) =>
    gameDone(progress, kind) ? '✓' : usedUp(kind) ? '–' : progress.games[kind]?.status === 'playing' ? 'Continue' : 'Play';

  const personRoom = person ? (Object.keys(contents).find((room) => contents[room].guests.includes(person)) ?? here) : here;
  const personTint = person ? moodTint(setsFor(c)[person], progress.talk?.[person] ?? 0, talk.greetings) : 'none';
  const withThem = !!person && personRoom === here;

  return (
    <section className="panel">
      <p className="hint">
        {locked
          ? "It's midnight. There's no time left to look around."
          : readOnly
            ? 'An earlier night: you can look, but not walk about.'
            : 'Tap a room to walk there. A red mark means something to do.'}
      </p>

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
          const todo = inPlay && !locked && !readOnly && openPuzzlesIn(c, progress, contents[room.id], picked, left).length > 0;
          return {
            className: `${room.id === c.sceneRoom ? 'scene' : ''} ${room.id === here ? 'here' : ''}`,
            onClick: inPlay ? () => go(room.id) : undefined,
            labelSuffix: room.id === bodyRoom(c) && <span className="body-mark"> ✕ body</span>,
            labelChildren: isLabel && inPlay && (
              <button
                className="tile-hit"
                style={hitStyle}
                disabled={frozen}
                aria-label={`${room.name}${room.id === bodyRoom(c) ? ', where the body was found' : ''}${room.id === here ? ', you are here' : ''}${todo ? ', something to do' : ''}`}
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
              if (!c.rooms.includes(room.id) || locked || readOnly) return null;
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
                      openPerson(spot.id);
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
                    <button className="puzzle-row person-row" disabled={frozen} onClick={() => openPerson(s)}>
                      <span className={`counter static${faceClass(s)}`} style={{ '--counter': suspectColour(s) } as CSSProperties} aria-hidden="true">
                        <SuspectCounterFace id={s} guests={c.guests} />
                      </span>
                      <span className="puzzle-name">{suspectName(s, c.guests)}</span>
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

      {person && withThem && (
        <Dialog onClose={() => setPerson(null)} labelId="person-title">
          <h2 id="person-title" className="sr-only">
            Talking to {suspectName(person, c.guests)}
          </h2>
          <div className="talk-head">
            <button data-autofocus type="button" className="sheet-close" aria-label="Close" onClick={() => setPerson(null)}>
              ✕
            </button>
            <PortraitCard parts={playerPortrait} tint="none" caption="You" />
            <PortraitCard
              parts={hasPortrait(person) ? portraits[person] : undefined}
              tint={personTint}
              caption={suspectName(person, c.guests)}
              initials={suspectInitials(person, c.guests)}
              colour={suspectColour(person)}
            />
          </div>
          <div className="person-tabs" role="tablist" aria-label="With them">
            {(
              [
                ['talk', 'Talk'],
                ['minigame', 'Minigame'],
                ['clues', 'Clues'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={personTab === id} onClick={() => setPersonTab(id)}>
                {label}
              </button>
            ))}
          </div>
          {personTab === 'talk' && (
            <TalkSection c={c} progress={progress} dispatch={dispatch} suspect={person} idleLine="Nothing more to say for now." />
          )}
          {personTab === 'minigame' && (
            <PersonMinigame
              c={c}
              progress={progress}
              person={person}
              playable={playable}
              onPlay={(kind) => {
                setPerson(null);
                open(kind);
              }}
            />
          )}
          {personTab === 'clues' && <PersonClues c={c} progress={progress} dispatch={dispatch} suspect={person} />}
        </Dialog>
      )}

      {person && !withThem && (
        <Dialog onClose={() => setPerson(null)} labelId="person-title">
          <header className="sheet-head with-card">
            <PortraitCard
              parts={hasPortrait(person) ? portraits[person] : undefined}
              tint={personTint}
              caption={suspectName(person, c.guests)}
              initials={suspectInitials(person, c.guests)}
              colour={suspectColour(person)}
            />
            <div>
              <h2 id="person-title">{suspectName(person, c.guests)}</h2>
              <p className="muted">In the {roomName(personRoom)}.</p>
            </div>
            <button data-autofocus type="button" className="sheet-close" aria-label="Close" onClick={() => setPerson(null)}>
              ✕
            </button>
          </header>
          <PersonClues c={c} progress={progress} dispatch={dispatch} suspect={person} />
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
