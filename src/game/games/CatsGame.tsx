import { autoDots, catConflicts, catsSolved, type CatMark, type CatPuzzle } from '../../games/cats.ts';
import type { GameProps } from './types.ts';

export interface CatsData {
  /** Key "r,c". Tap cycles blank -> dot -> cat -> blank. */
  marks: Record<string, CatMark>;
}

export const catsInitial = (): CatsData => ({ marks: {} });
export const catsSolvedData = (p: CatPuzzle): CatsData => ({
  marks: Object.fromEntries(p.solution.map((c, r) => [`${r},${c}`, 'cat' as const])),
});

const ZONE_TINTS = ['#e9c99a', '#b9d29a', '#b7b6e3', '#eab2a8', '#a9d4d9', '#f0e08e', '#dcb0d6', '#c4c7b8'];

function CatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="cat-icon" aria-hidden="true">
      <path d="M5 4 L9 8.5 H15 L19 4 L19.5 12.5 A7.5 7 0 0 1 4.5 12.5 Z" />
      <circle cx="9.3" cy="13" r="1.2" className="eye" />
      <circle cx="14.7" cy="13" r="1.2" className="eye" />
    </svg>
  );
}

const cats = (marks: Record<string, CatMark>) =>
  Object.entries(marks)
    .filter(([, m]) => m === 'cat')
    .map(([k]) => k.split(',').map(Number) as [number, number]);

export function CatsGame({ puzzle, data, finished, onChange, onFinish }: GameProps<CatPuzzle, CatsData>) {
  const n = puzzle.size;
  const placed = cats(data.marks);
  const bad = catConflicts(puzzle, placed);
  // Dots every cat implies (row, column, colour, touching). Not saved: they go when the cat does.
  const implied = autoDots(puzzle, placed);

  const tap = (r: number, c: number) => {
    if (finished) return;
    const key = `${r},${c}`;
    const marks = { ...data.marks };
    const now = marks[key];
    // A square a cat has already dotted goes straight to a cat on the first tap.
    if (!now) marks[key] = implied.has(key) ? 'cat' : 'dot';
    else if (now === 'dot') marks[key] = 'cat';
    else delete marks[key];
    const next = { marks };
    if (catsSolved(puzzle, cats(marks))) onFinish('won', next);
    else onChange(next);
  };

  const zone = (r: number, c: number) => (r < 0 || c < 0 || r >= n || c >= n ? -1 : puzzle.zones[r][c]);

  return (
    <div className="cats">
      <p className="hint dark">
        Put one cat in every row, every column and every colour. Cats can't touch, not even corner to corner. Tap once
        for a dot (your note that no cat goes there), twice for a cat. Each cat dots the squares it rules out for you.
      </p>
      <div
        className="cat-grid"
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${n}, minmax(0, 1fr))` }} role="grid" aria-label="Cat puzzle">
        {Array.from({ length: n }, (_, r) =>
          Array.from({ length: n }, (_, c) => {
            const z = zone(r, c);
            const own = data.marks[`${r},${c}`];
            const mark = own ?? (implied.has(`${r},${c}`) ? 'dot' : undefined);
            const wall = (dr: number, dc: number) => (zone(r + dr, c + dc) !== z ? 3 : 1);
            return (
              <button
                key={`${r}-${c}`}
                role="gridcell"
                className={`cat-cell ${bad.has(`${r},${c}`) ? 'clash' : ''}`}
                style={{
                  background: ZONE_TINTS[z % ZONE_TINTS.length],
                  borderTopWidth: wall(-1, 0),
                  borderLeftWidth: wall(0, -1),
                  borderBottomWidth: wall(1, 0),
                  borderRightWidth: wall(0, 1),
                }}
                aria-label={`Row ${r + 1}, column ${c + 1}: ${mark === 'cat' ? 'cat' : mark === 'dot' ? 'dot' : 'empty'}`}
                onClick={() => tap(r, c)}
              >
                {mark === 'cat' ? <CatIcon /> : mark === 'dot' ? <span className={`dot ${own ? '' : 'auto'}`} /> : null}
              </button>
            );
          }),
        )}
      </div>
      <p className="game-message" role="status">
        {finished ? (finished === 'won' ? 'Every cat is in its place.' : 'Here is where the cats go.') : `${placed.length} of ${n} cats placed.`}
      </p>
    </div>
  );
}
