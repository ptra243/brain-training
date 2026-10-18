import { content } from '../content/index.ts';
import type { Clue } from '../engine/types.ts';
import { roomName, roomTint, suspectName } from './names.ts';

/** A tiny floor plan with one square marked, for statements that point at the map. */
export function MiniMap({ target }: { target: readonly [number, number] }) {
  const { house } = content;
  return (
    <span className="mini-map" style={{ gridTemplateColumns: `repeat(${house.cols}, 1fr)` }} aria-hidden="true">
      {Array.from({ length: house.rows * house.cols }, (_, i) => {
        const r = Math.floor(i / house.cols);
        const c = i % house.cols;
        const room = house.rooms.find((rm) => rm.cells.some(([rr, cc]) => rr === r && cc === c));
        const hit = r === target[0] && c === target[1];
        return <span key={i} className={hit ? 'hit' : ''} style={{ background: room ? roomTint(room.id) : undefined }} />;
      })}
    </span>
  );
}

/** "the room at row 3, column ▢" with her digits, or blanks where she hasn't filled them. */
export function LocationPhrase({ row, col }: { row: number | null; col: number | null }) {
  const box = (d: number | null) => (
    <span className={`coord ${d ? 'filled' : ''}`} aria-label={d ? String(d) : 'blank'}>
      {d ?? ''}
    </span>
  );
  return (
    <>
      the room at row {box(row)}, column {box(col)}
    </>
  );
}

interface Props {
  clue: Clue;
  /** Show the statement with coordinates instead of the room name (sudoku statements). */
  coords?: { row: number | null; col: number | null; found: boolean };
  /** Show the statement with one blank where the room goes (sudoku statements not yet found). */
  blank?: boolean;
  used?: boolean;
  onToggle?: () => void;
  /** Smaller, for lists inside games. */
  compact?: boolean;
}

/** One clue with where it came from: a witness's words or what the cats found. */
export function ClueCard({ clue, coords, blank, used, onToggle, compact }: Props) {
  const label = clue.source === 'testimony' ? `${suspectName(clue.speaker ?? '')} says` : 'Found by the cats';
  const loc = clue.location;
  const room = 'room' in clue.fact ? clue.fact.room : null;

  const statement =
    blank && loc ? (
      <>
        {loc.before}the <span className="coord room-blank" aria-label="blank" />
        {loc.after}
      </>
    ) : coords && loc ? (
      <>
        {loc.before}
        <LocationPhrase row={coords.row} col={coords.col} />
        {loc.after}
      </>
    ) : (
      clue.body
    );
  const quoted = clue.source === 'testimony' ? <>“{statement}”</> : statement;

  const inner = (
    <>
      <span className={`clue-source ${clue.source}`}>{label}</span>
      <span className="clue-body">{quoted}</span>
      {coords?.found && loc && room && (
        <span className="clue-found">
          <MiniMap target={loc.target} />
          That's the {roomName(room)}.
        </span>
      )}
    </>
  );

  if (!onToggle) return <div className={`card clue ${compact ? 'compact' : ''}`}>{inner}</div>;
  return (
    <button className={`card clue ${used ? 'used' : ''} ${compact ? 'compact' : ''}`} aria-pressed={used} onClick={onToggle}>
      {inner}
    </button>
  );
}
