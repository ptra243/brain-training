import { useMemo, type MouseEvent } from 'react';
import { nosingLanding, type NosingPuzzle, type NosingView } from '../../games/nosing.ts';
import { MarkIcon, Paw } from './NosingIcons.tsx';
import { markKinds, nearestMark, pawTrail, roomSquares, squareCentre, wallLines, woolPath } from './nosingUi.ts';

interface Props {
  puzzle: NosingPuzzle;
  view: NosingView;
  /** Path index the cat is drawn on (it walks there one square at a time). */
  catAt: number;
  /** Shown as a short strip, to leave room for a question and the number pad. */
  compact?: boolean;
  /** Obstacle, search, speed and cat-find squares already used: drawn faded. */
  spent?: ReadonlySet<number>;
  /** The marked square she tapped, ringed. */
  selected?: number | null;
  /** A tap on the board: the nearest marked square, or null when it has none. */
  onPick?: (square: number | null) => void;
}

const pts = (a: { x: number; y: number }[]) => a.map((p) => `${p.x},${p.y}`).join(' ');

/** The floor plan cut into the board's squares, with the path, ladders, snakes, marks and the cat. */
export function NosingBoardView({ puzzle, view, catAt, compact = false, spent, selected = null, onPick }: Props) {
  const { board, house } = puzzle;
  const last = board.path.length - 1;
  const unit = board.n === 1 ? 1.5 : 1; // marks are drawn a little bigger when squares are big
  const rooms = useMemo(() => roomSquares(house, board), [house, board]);
  const walls = useMemo(() => wallLines(rooms, board.width, board.height), [rooms, board]);
  const centres = useMemo(() => board.path.map((_, i) => squareCentre(board, i)), [board]);
  const tint = (id: string | null) => house.rooms.find((r) => r.id === id)?.tint;
  const cat = centres[catAt];
  const kinds = useMemo(() => markKinds(board, puzzle.dogSquare, view.usedSnakes), [board, puzzle.dogSquare, view.usedSnakes]);

  const landing = view.phase === 'rolled' ? nosingLanding(puzzle, view) : null;

  const tap = (e: MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const m = svg.getScreenCTM();
    if (!m || !onPick) return;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    onPick(nearestMark(centres, kinds, { x: pt.x, y: pt.y }));
  };

  return (
    <svg
      className={`nosing-board ${compact ? 'compact' : ''}`}
      viewBox={`-0.5 -0.5 ${board.width + 1} ${board.height + 1}`}
      role="img"
      aria-label={`The floor plan as a board. The cat is on square ${catAt + 1} of ${board.path.length}.${landing !== null ? ` Purr-diction: it will land on square ${landing + 1}.` : ''}`}
      onClick={tap}
    >
      <defs>
        <g id="nosing-paw">
          <Paw />
        </g>
      </defs>
      {rooms.map(
        (s) =>
          s.room && <rect key={`${s.x}-${s.y}`} x={s.x} y={s.y} width="1" height="1" style={{ fill: tint(s.room) }} />,
      )}
      {walls.map((w, i) => (
        <line key={i} className="nosing-wall" x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2} />
      ))}
      <polyline className="nosing-path" points={pts(centres)} />

      {board.squares.map((sq, i) => {
        const kind = sq.kind === 'obstacle' || sq.kind === 'search' || sq.kind === 'speed' || sq.kind === 'catFind' ? sq.kind : null;
        if (!kind) return null;
        const c = centres[i];
        return (
          <g key={i} className={`nosing-mark ${spent?.has(i) ? 'spent' : ''}`} transform={`translate(${c.x} ${c.y}) scale(${unit * 1.1})`}>
            <MarkIcon kind={kind} />
          </g>
        );
      })}

      {board.squares.map((sq, i) => {
        if (sq.kind !== 'ladder' || sq.to === undefined) return null;
        const a = centres[i];
        const b = centres[sq.to];
        const taken = view.takenLadders.includes(i);
        return (
          <g key={`l${i}`} className={`nosing-ladder ${taken ? 'taken' : ''}`}>
            {pawTrail(a, b, 0.9 * unit).map((p, k) => (
              <use key={k} href="#nosing-paw" transform={`translate(${p.x} ${p.y}) rotate(${p.angle}) scale(${unit})`} />
            ))}
            <circle className="nosing-foot" cx={a.x} cy={a.y} r={0.26 * unit} />
            <g transform={`translate(${a.x} ${a.y}) scale(${unit * 1.1})`}>
              <MarkIcon kind="ladder" />
            </g>
          </g>
        );
      })}

      {board.squares.map((sq, i) => {
        if (sq.kind !== 'snake' || sq.to === undefined) return null;
        const used = view.usedSnakes.includes(i);
        const a = centres[i];
        const b = centres[sq.to];
        return (
          <g key={`s${i}`} className={`nosing-snake ${used ? 'used' : ''}`}>
            <path d={woolPath(a, b)} />
            <g transform={`translate(${a.x} ${a.y}) scale(${unit * 1.1})`}>
              <MarkIcon kind="snake" />
            </g>
            {i === puzzle.dogSquare && !used && (
              <g className="nosing-dog-mark" transform={`translate(${a.x} ${a.y - (compact ? 0.1 : 0.3) * unit}) scale(${(compact ? 7 : 1.2) * unit})`}>
                <title>A dog is waiting here</title>
                <MarkIcon kind="dog" />
              </g>
            )}
          </g>
        );
      })}

      <g transform={`translate(${centres[0].x} ${centres[0].y}) scale(${unit * 1.1})`}>
        <MarkIcon kind="door" />
      </g>
      <g transform={`translate(${centres[last].x} ${centres[last].y}) scale(${unit * 1.1})`}>
        <MarkIcon kind="lock" />
      </g>

      {selected !== null && centres[selected] && (
        <circle className="nosing-picked" cx={centres[selected].x} cy={centres[selected].y} r={0.36 * unit} />
      )}

      {landing !== null && (
        <g className="nosing-purr" transform={`translate(${centres[landing].x} ${centres[landing].y}) scale(${unit})`}>
          <MarkIcon kind="purr" />
        </g>
      )}

      <g className="nosing-cat" transform={`translate(${cat.x} ${cat.y}) scale(${unit})`}>
        <MarkIcon kind="cat" />
      </g>
    </svg>
  );
}
