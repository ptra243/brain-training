import { useMemo, type ReactNode } from 'react';
import type { NosingPuzzle, NosingView } from '../../games/nosing.ts';
import { pawTrail, roomSquares, squareCentre, wallLines, woolPath } from './nosingUi.ts';

interface Props {
  puzzle: NosingPuzzle;
  view: NosingView;
  /** Path index the cat is drawn on (it walks there one square at a time). */
  catAt: number;
  /** Shown as a short strip, to leave room for a question and the number pad. */
  compact?: boolean;
}

const pts = (a: { x: number; y: number }[]) => a.map((p) => `${p.x},${p.y}`).join(' ');

/** The floor plan cut into the board's squares, with the path, ladders, snakes, marks and the cat. */
export function NosingBoardView({ puzzle, view, catAt, compact = false }: Props) {
  const { board, house } = puzzle;
  const last = board.path.length - 1;
  const unit = board.n === 1 ? 1.5 : 1; // marks are drawn a little bigger when squares are big
  const rooms = useMemo(() => roomSquares(house, board), [house, board]);
  const walls = useMemo(() => wallLines(rooms, board.width, board.height), [rooms, board]);
  const centres = useMemo(() => board.path.map((_, i) => squareCentre(board, i)), [board]);
  const tint = (id: string | null) => house.rooms.find((r) => r.id === id)?.tint;
  const cat = centres[catAt];

  return (
    <svg
      className={`nosing-board ${compact ? 'compact' : ''}`}
      viewBox={`-0.5 -0.5 ${board.width + 1} ${board.height + 1}`}
      role="img"
      aria-label={`The floor plan as a board. The cat is on square ${catAt + 1} of ${board.path.length}.`}
    >
      <defs>
        <g id="nosing-paw">
          <ellipse cx="0" cy="0.14" rx="0.17" ry="0.14" />
          <ellipse cx="-0.2" cy="-0.06" rx="0.07" ry="0.09" />
          <ellipse cx="-0.07" cy="-0.2" rx="0.07" ry="0.1" />
          <ellipse cx="0.07" cy="-0.2" rx="0.07" ry="0.1" />
          <ellipse cx="0.2" cy="-0.06" rx="0.07" ry="0.09" />
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
        const c = centres[i];
        const mark = (shape: string, body: ReactNode) => (
          <g key={i} className={`nosing-mark ${shape}`} transform={`translate(${c.x} ${c.y}) scale(${unit})`}>
            {body}
          </g>
        );
        switch (sq.kind) {
          case 'obstacle':
            return mark('obstacle', <rect x="-0.14" y="-0.14" width="0.28" height="0.28" transform="rotate(45)" />);
          case 'search':
            return mark(
              'search',
              <>
                <circle cx="-0.03" cy="-0.03" r="0.15" />
                <line x1="0.08" y1="0.08" x2="0.22" y2="0.22" />
              </>,
            );
          case 'speed':
            return mark('speed', <path d="M-0.15 -0.18 H0.15 L0 0 L0.15 0.18 H-0.15 L0 0 Z" />);
          case 'catFind':
            return mark('catfind', <path d="M0 -0.2 L0.06 -0.06 L0.2 0 L0.06 0.06 L0 0.2 L-0.06 0.06 L-0.2 0 L-0.06 -0.06 Z" />);
          default:
            return null;
        }
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
            <circle className="nosing-foot" cx={a.x} cy={a.y} r={0.2 * unit} />
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
            <circle className="nosing-wool" cx={a.x} cy={a.y} r={0.2 * unit} />
            {i === puzzle.dogSquare && !used && (
              <g className="nosing-dog-mark" transform={`translate(${a.x} ${a.y - (compact ? 0.1 : 0.3) * unit}) scale(${(compact ? 7 : 1.2) * unit})`}>
                <title>A dog is waiting here</title>
                <path className="nosing-dog-ear" d="M-0.2 -0.14 L-0.3 0.04 L-0.14 0 Z M0.2 -0.14 L0.3 0.04 L0.14 0 Z" />
                <ellipse rx="0.18" ry="0.16" />
                <ellipse className="nosing-dog-nose" cx="0" cy="0.05" rx="0.06" ry="0.04" />
              </g>
            )}
          </g>
        );
      })}

      <g className="nosing-door">
        <rect x={centres[0].x - 0.14 * unit} y={centres[0].y - 0.2 * unit} width={0.28 * unit} height={0.4 * unit} rx="0.04" />
      </g>
      <g className="nosing-lock" transform={`translate(${centres[last].x} ${centres[last].y}) scale(${unit})`}>
        <path d="M-0.12 -0.04 V-0.12 A0.12 0.12 0 0 1 0.12 -0.12 V-0.04" />
        <rect x="-0.18" y="-0.05" width="0.36" height="0.26" rx="0.04" />
      </g>

      <g className="nosing-cat" transform={`translate(${cat.x} ${cat.y}) scale(${unit})`}>
        <path className="nosing-ear" d="M-0.27 -0.16 L-0.21 -0.4 L-0.06 -0.27 Z M0.27 -0.16 L0.21 -0.4 L0.06 -0.27 Z" />
        <circle r="0.3" />
        <circle className="nosing-eye" cx="-0.1" cy="-0.04" r="0.04" />
        <circle className="nosing-eye" cx="0.1" cy="-0.04" r="0.04" />
      </g>
    </svg>
  );
}
