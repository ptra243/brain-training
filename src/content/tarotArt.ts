// Tarot match card art (theme content). A card is an opaque id from the engine
// ("major-3", "cups-7", "joker") plus a face drawn here: a bold shape in a
// colour on an ivory card. Original symbols, swappable later for scans.
// Every id gets its own shape + colour pair, so no two faces look alike.

export interface TarotArt {
  /** SVG path in a 40x40 box. */
  path: string;
  /** Fill colour. */
  colour: string;
  /** Plain words for screen readers, e.g. "red star". */
  label: string;
}

const polygon = (n: number, r: number, turn = -Math.PI / 2): string =>
  Array.from({ length: n }, (_, i) => {
    const a = turn + (i * 2 * Math.PI) / n;
    return `${i ? 'L' : 'M'}${(20 + r * Math.cos(a)).toFixed(1)} ${(20 + r * Math.sin(a)).toFixed(1)}`;
  }).join('') + 'Z';

const star = (n: number, outer: number, inner: number): string =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    const r = i % 2 ? inner : outer;
    return `${i ? 'L' : 'M'}${(20 + r * Math.cos(a)).toFixed(1)} ${(21 + r * Math.sin(a)).toFixed(1)}`;
  }).join('') + 'Z';

const SHAPES: readonly { name: string; path: string }[] = [
  { name: 'circle', path: 'M20 6a14 14 0 1 0 .01 0Z' },
  { name: 'ring', path: 'M20 6a14 14 0 1 0 .01 0ZM20 14a6 6 0 1 1 -.01 0Z' },
  { name: 'square', path: 'M7 7H33V33H7Z' },
  { name: 'triangle', path: 'M20 6L35 33H5Z' },
  { name: 'downward triangle', path: 'M20 34L5 7H35Z' },
  { name: 'diamond', path: 'M20 4L33 20L20 36L7 20Z' },
  { name: 'star', path: star(5, 16, 6.5) },
  { name: 'hexagon', path: polygon(6, 15, 0) },
  { name: 'plus', path: 'M15 5H25V15H35V25H25V35H15V25H5V15H15Z' },
  { name: 'cross', path: 'M11 6L20 15L29 6L34 11L25 20L34 29L29 34L20 25L11 34L6 29L15 20L6 11Z' },
  { name: 'crescent', path: 'M28 5A16 16 0 1 0 28 35A20 20 0 0 1 28 5Z' },
  { name: 'heart', path: 'M20 34C6 24 5 14 11 10C15 7 19 9 20 13C21 9 25 7 29 10C35 14 34 24 20 34Z' },
  { name: 'bolt', path: 'M23 4L9 22H19L16 36L31 16H21Z' },
  { name: 'sunburst', path: star(8, 17, 10) },
];

// Neighbouring colours are well apart, so the same shape in a different colour is easy to tell.
const COLOURS: readonly { name: string; hex: string }[] = [
  { name: 'red', hex: '#a8322d' },
  { name: 'blue', hex: '#1f3f7a' },
  { name: 'gold', hex: '#c8921c' },
  { name: 'green', hex: '#2f6b3a' },
  { name: 'purple', hex: '#6b3a8c' },
  { name: 'orange', hex: '#d9661f' },
  { name: 'teal', hex: '#1f8a8a' },
  { name: 'black', hex: '#26262b' },
];

/** Major-arcana-style faces (case cards) before the minor suits start. */
const MAJORS = 22;
const SUIT_ORDER = ['cups', 'wands', 'swords', 'pentacles'];
const SUIT_SIZE = 14;

/** Place of an id among all faces, or -1 if the theme has no art for it. */
function slot(id: string): number {
  const m = /^([a-z]+)-(\d+)$/.exec(id);
  if (!m) return -1;
  const n = Number(m[2]);
  if (m[1] === 'major') return n < MAJORS ? n : -1;
  const s = SUIT_ORDER.indexOf(m[1]);
  return s >= 0 && n >= 1 && n <= SUIT_SIZE ? MAJORS + s * SUIT_SIZE + (n - 1) : -1;
}

export const TAROT_JOKER_ART: TarotArt = {
  path: `${star(5, 17, 8)}`,
  colour: '#c8a24c',
  label: 'joker',
};

/** The face for a card id; a plain grey circle for an id the theme doesn't know. */
export function tarotArt(id: string): TarotArt {
  const g = slot(id);
  if (g < 0) return { path: SHAPES[0].path, colour: '#8a8a8a', label: 'unknown card' };
  const shape = SHAPES[g % SHAPES.length];
  const colour = COLOURS[(g + Math.floor(g / SHAPES.length)) % COLOURS.length];
  return { path: shape.path, colour: colour.hex, label: `${colour.name} ${shape.name}` };
}
