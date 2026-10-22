// The style library for the faceted portraits (docs/portraits.md): plain shapes in
// the 100 x 120 frame, in each group's untransformed coordinates. Hair, headwear
// and accents are drawn in head space (x, y of the mockup's head group), costumes
// and body accents in body space; "frame" accents are drawn as they are.

export type Pt = [number, number];
export type Shape =
  | { t: 'poly'; pts: Pt[]; fill: string; o?: number; stroke?: string; sw?: number }
  | { t: 'circle'; cx: number; cy: number; r: number; fill: string; o?: number; stroke?: string; sw?: number }
  | { t: 'rect'; x: number; y: number; w: number; h: number; fill: string; o?: number };

export type Space = 'head' | 'body' | 'frame';
export type AccentPiece = { space: Space; shapes: Shape[] };

// ---------- Colour and shape helpers ----------

const channels = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (c: readonly number[]): string =>
  '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

/** Multiplies each channel: below 1 darkens, above 1 lightens (clamped). */
export const shade = (hex: string, f: number): string => toHex(channels(hex).map((v) => v * f));

const mulRatio = (hex: string, ratio: readonly number[]): string => {
  const c = channels(hex);
  return toHex(c.map((v, i) => v * ratio[i]));
};

/** Per-channel ratios taken from the mockup's skin, so its default tone is reproduced. */
export type SkinTones = { lit: string; shadow: string; chin: string; nose: string; neck: string; neckShade: string; chest: string };
export const skinTones = (skin: string): SkinTones => ({
  lit: skin,
  shadow: mulRatio(skin, [0.827, 0.705, 0.625]),
  chin: mulRatio(skin, [0.69, 0.55, 0.47]),
  nose: mulRatio(skin, [0.91, 0.84, 0.78]),
  neck: mulRatio(skin, [0.955, 0.914, 0.886]),
  neckShade: mulRatio(skin, [0.757, 0.633, 0.545]),
  chest: mulRatio(skin, [0.967, 0.929, 0.903]),
});

const parsePts = (s: string): Pt[] =>
  s.trim().split(/\s+/).map((p) => {
    const [x, y] = p.split(',').map(Number);
    return [x, y] as Pt;
  });
export const poly = (pts: string, fill: string, o?: number): Shape => ({ t: 'poly', pts: parsePts(pts), fill, ...(o === undefined ? {} : { o }) });
export const circle = (cx: number, cy: number, r: number, fill: string, o?: number): Shape => ({ t: 'circle', cx, cy, r, fill, ...(o === undefined ? {} : { o }) });
export const ring = (cx: number, cy: number, r: number, stroke: string, sw: number, fill = 'none', o?: number): Shape => ({
  t: 'circle', cx, cy, r, fill, stroke, sw, ...(o === undefined ? {} : { o }),
});
/** An open line drawn as a stroked polygon with no fill. */
export const line = (pts: string, stroke: string, sw: number): Shape => ({ t: 'poly', pts: parsePts(pts), fill: 'none', stroke, sw });

// ---------- The base figure ----------

/** Head group: lit plane, shadow plane, chin shadow, nose facet. */
export const faceShapes = (t: SkinTones): Shape[] => [
  poly('40,34 54,30 60,40 58,56 50,64 42,60 38,48', t.lit),
  poly('54,30 62,34 64,46 58,56 60,40', t.shadow),
  poly('50,64 58,56 57,64', t.chin),
  poly('46,44 43,52 48,52', t.nose),
];
/** Body group: neck and its shadow. Drawn before the costume. */
export const neckShapes = (t: SkinTones): Shape[] => [
  poly('46,64 56,62 57,90 46,90', t.neck),
  poly('46,64 56,62 51,72', t.neckShade),
];

// ---------- Hair (head space) ----------

type HairPiece = { back: Shape[]; front: Shape[] };
type HairFn = (c: string, t: SkinTones) => HairPiece;

export const hairStyles: Record<string, HairFn> = {
  updo: (c) => ({
    back: [
      poly('36,30 48,20 62,24 66,34 66,52 62,34 54,30 40,34 34,50', c),
      poly('42,22 50,10 60,14 62,24 48,20', shade(c, 1.4)),
      poly('50,10 60,14 52,18', shade(c, 2)),
      poly('36,30 40,34 38,48 34,50', shade(c, 1.7)),
    ],
    front: [],
  }),
  'short-crop': (c) => ({
    back: [],
    front: [
      poly('38,42 39,30 52,24 63,28 65,42 60,34 48,32 40,36', c),
      poly('39,30 52,24 48,32 40,36 38,42', shade(c, 1.27)),
      poly('38,40 40,38 41,50', c),
    ],
  }),
  long: (c) => ({
    back: [
      poly('34,30 46,18 60,20 69,34 70,60 72,88 62,92 59,64 44,66 37,90 27,86 31,58', c),
      poly('27,86 31,58 34,62 33,84', shade(c, 1.55)),
      poly('62,92 59,64 66,62 72,88', shade(c, 0.62)),
    ],
    front: [
      poly('35,33 41,20 54,15 65,21 69,36 62,33 54,29 47,33 40,35', shade(c, 1.12)),
      poly('41,20 54,15 49,23', shade(c, 2.2)),
      poly('35,33 40,35 38,48 37,62 33,70 31,58', shade(c, 1.55)),
      poly('62,33 69,36 69,58 65,66 63,46', shade(c, 0.65)),
    ],
  }),
  'side-part-beard': (c) => ({
    back: [],
    front: [
      poly('38,44 38,30 50,23 63,27 65,42 61,34 52,31 44,30 41,38', c),
      poly('38,30 50,23 46,29 41,38', shade(c, 1.35)),
      poly('50,23 63,27 56,28', shade(c, 0.75)),
      poly('44,30 46,26 47,32', shade(c, 0.6)),
      // full short beard, mouth line, moustache
      poly('37,46 41,52 46,56 50,58 50,70 41,61', shade(c, 1.1)),
      poly('50,58 54,56 60,52 64,46 61,61 50,70', shade(c, 0.78)),
      poly('44,55 50,53 56,55 50,58', shade(c, 0.6)),
    ],
  }),
  slick: (c) => ({
    back: [],
    front: [
      poly('38,42 39,30 52,25 63,28 65,42 60,35 48,33 40,36', c),
      poly('42,31 52,26 56,28 47,32', shade(c, 3.2)),
      poly('38,40 41,38 42,50', shade(c, 1.4)),
      poly('62,36 65,42 63,50', shade(c, 0.7)),
    ],
  }),
  bun: (c) => ({
    back: [
      circle(64, 33, 8, shade(c, 0.85)),
      circle(62, 31, 4.5, shade(c, 1.1)),
      poly('56,30 66,30 64,42 56,40', shade(c, 0.7)),
    ],
    front: [
      poly('37,40 38,30 46,23 58,24 64,32 64,42 60,34 52,30 46,32 41,38', c),
      poly('38,30 46,23 52,24 46,32 41,38', shade(c, 1.22)),
      poly('52,24 58,24 64,32 60,34 52,30', shade(c, 0.78)),
    ],
  }),
  'slicked-back': (c) => ({
    back: [],
    front: [
      poly('38,44 38,30 50,23 62,26 65,40 62,34 52,31 44,33 41,38', c),
      poly('38,30 50,23 44,30 40,36', shade(c, 1.55)),
      poly('44,27 56,24 58,27 46,30', shade(c, 2.1)),
      poly('50,23 62,26 65,40 62,34 56,28', shade(c, 0.78)),
      poly('38,42 41,40 42,52', shade(c, 1.2)),
    ],
  }),
  'bald-beard': (c, t) => ({
    back: [],
    front: [
      // bare crown and white tufts at the ears
      poly('40,34 42,27 52,23 58,25 60,32 54,30', t.lit),
      poly('54,30 58,25 62,30 62,34', t.shadow),
      poly('36,30 41,27 41,34 40,42 41,52 36,48', c),
      poly('62,28 66,32 66,48 62,44 61,36', shade(c, 0.78)),
      // bushy beard and moustache
      poly('35,44 37,60 45,70 50,72 50,57 46,56 40,50', shade(c, 1.02)),
      poly('50,57 50,72 56,70 64,60 66,44 62,52 56,56', shade(c, 0.8)),
      poly('62,44 67,46 64,60 57,56', shade(c, 0.8)),
      poly('42,54 50,52 58,54 50,59', shade(c, 0.95)),
      poly('37,60 45,70 41,66', shade(c, 0.85)),
    ],
  }),
  'bald-sides': (c, t) => ({
    back: [],
    front: [
      // bare crown, short tufts above the ears
      poly('40,34 42,27 52,23 58,25 60,32 54,30', t.lit),
      poly('54,30 58,25 62,30 62,34', t.shadow),
      poly('37,32 41,29 41,36 40,46 37,44', c),
      poly('37,32 41,29 39,36', shade(c, 1.27)),
      poly('62,30 65,33 65,44 62,42 61,36', shade(c, 0.78)),
    ],
  }),
  'swept-back': (c) => ({
    back: [],
    front: [
      poly('38,42 38,30 48,20 60,18 68,28 65,42 62,32 52,28 44,32 40,38', c),
      poly('48,20 60,18 66,24 54,24', shade(c, 1.28)),
      poly('38,30 48,20 44,30 40,38', shade(c, 1.12)),
      poly('62,32 68,28 65,42', shade(c, 0.78)),
      poly('38,40 41,38 41,50', shade(c, 0.9)),
    ],
  }),
  curls: (c) => ({
    back: [circle(37, 38, 5, shade(c, 0.85)), circle(66, 38, 5, shade(c, 0.7))],
    front: [
      circle(40, 33, 5.5, shade(c, 1.1)),
      circle(46, 27, 5.5, shade(c, 1.2)),
      circle(53, 24, 5.5, shade(c, 1.18)),
      circle(60, 27, 5.5, shade(c, 0.95)),
      circle(64, 34, 5, shade(c, 0.78)),
      circle(36, 42, 4.5, shade(c, 1.0)),
      circle(43, 29, 2.2, shade(c, 1.45)),
      circle(53, 21.5, 2.2, shade(c, 1.45)),
      circle(61, 25, 2, shade(c, 1.15)),
    ],
  }),
  bob: (c) => ({
    back: [
      poly('33,35 38,31 66,31 70,37 69,64 61,66 58,50 44,50 41,66 33,64', c),
      poly('33,35 38,31 40,34 36,50 33,64', shade(c, 1.25)),
      poly('70,37 69,64 61,66 66,50', shade(c, 0.7)),
    ],
    front: [
      poly('37,38 42,31 54,30 64,31 66,38 58,33 48,33 40,40', shade(c, 1.1)),
      poly('42,31 54,30 48,34', shade(c, 1.5)),
      poly('64,31 66,38 58,33', shade(c, 0.75)),
    ],
  }),
};

// ---------- Headwear (head space, drawn over the hair) ----------

type HeadwearFn = (c: string) => Shape[];
export const headwearStyles: Record<string, HeadwearFn> = {
  'top-hat': (c) => [
    poly('33,30 38,26 64,26 69,30 64,34 38,34', shade(c, 0.85)),
    poly('41,10 52,8 52,29 40,29', shade(c, 1.35)),
    poly('52,8 62,10 63,29 52,29', c),
    poly('41,10 52,6 62,10 52,12', shade(c, 1.9)),
    poly('40,24 52,25 52,29 40,29', shade(c, 2.4)),
    poly('52,25 63,24 63,29 52,29', shade(c, 1.7)),
    poly('33,30 38,26 38,34', shade(c, 1.5)),
  ],
  fedora: (c) => [
    poly('29,32 40,27 62,25 75,31 62,36 40,36', shade(c, 0.9)),
    poly('29,32 40,27 40,36', shade(c, 1.2)),
    poly('40,26 44,16 52,14 60,17 62,26', c),
    poly('40,26 44,16 49,18 46,27', shade(c, 1.22)),
    poly('52,14 60,17 62,26 54,27', shade(c, 0.8)),
    poly('44,16 52,14 50,18', shade(c, 0.7)),
    poly('40,26 62,25 62,29 40,30', shade(c, 0.45)),
  ],
};

// ---------- Costumes (body space) ----------

type CostumeFn = (main: string, trim: string, t: SkinTones) => Shape[];
export const costumeStyles: Record<string, CostumeFn> = {
  'gown-sash': (m, trim, t) => [
    poly('38,86 46,80 57,78 68,86 54,100 44,96', t.chest),
    poly('57,78 68,86 58,90', t.shadow),
    poly('16,120 22,98 38,86 44,96 54,100 50,120', m),
    poly('22,98 38,86 30,106', shade(m, 1.4)),
    poly('54,100 68,86 80,96 86,120 50,120', shade(m, 0.68)),
    poly('44,96 54,100 62,120 50,120', trim),
    poly('54,100 60,112 62,120', shade(trim, 0.78)),
  ],
  tailcoat: (m, trim) => [
    poly('12,120 20,96 42,84 46,120', m),
    poly('20,96 42,84 28,110', shade(m, 1.29)),
    poly('46,120 58,82 80,94 88,120', shade(m, 0.54)),
    poly('44,82 57,78 54,98 50,108 46,96', trim),
    poly('54,80 57,78 54,98 50,108', shade(trim, 0.87)),
    poly('42,84 46,96 50,108 40,104 36,90', shade(m, 0.7)),
    poly('57,80 62,86 58,100 50,108 54,98', shade(m, 0.42)),
  ],
  'scarf-coat': (m, trim) => [
    poly('12,120 20,96 38,85 48,100 45,120', m),
    poly('20,96 38,85 28,108', shade(m, 1.28)),
    poly('48,120 56,94 62,84 80,94 88,120', shade(m, 0.64)),
    poly('34,86 45,77 48,98 40,105 31,93', shade(m, 1.45)),
    poly('34,86 45,77 38,92', shade(m, 1.7)),
    poly('57,77 65,84 61,101 55,96', shade(m, 0.8)),
    poly('31,93 37,93 34,97', m),
    poly('62,84 80,94 70,92', shade(m, 0.86)),
    poly('48,100 49,120 47.6,120', shade(m, 0.45)),
    poly('21,108 34,106 34,110 21,112', shade(m, 0.82)),
    poly('21,108 34,106 34,107 21,109', shade(m, 1.5)),
    poly('64,108 78,107 78,111 64,112', shade(m, 0.48)),
    poly('52.5,102 54.5,101.4 55,103.4 53,104', '#c8a24c'),
    poly('53,111 55,110.4 55.5,112.4 53.5,113', '#c8a24c'),
    poly('60,101.4 62,100.8 62.5,102.8 60.5,103.4', '#9a7a32'),
    poly('60.5,110.4 62.5,109.8 63,111.8 61,112.4', '#9a7a32'),
    // scarf, one end hanging down the front
    poly('41,76 58,73 63,83 52,90 39,86', trim),
    poly('41,76 58,73 50,80', shade(trim, 1.14)),
    poly('52,90 63,83 61,90', shade(trim, 0.72)),
    poly('44,86 52,90 50,112 42,110', shade(trim, 0.93)),
    poly('48,88 52,90 50,112', shade(trim, 0.75)),
    poly('42,110 50,112 49,116 43,115', shade(trim, 0.65)),
  ],
  'shawl-jacket': (m, trim, t) => [
    poly('12,120 20,98 40,86 46,100 44,120', m),
    poly('20,98 40,86 30,108', shade(m, 1.3)),
    poly('50,120 54,100 60,86 80,96 88,120', shade(m, 0.6)),
    poly('46,82 57,80 52,100 46,96', t.chest),
    poly('36,88 46,82 52,100 48,116 38,104', shade(m, 1.55)),
    poly('36,88 46,82 44,90', shade(m, 2)),
    poly('52,100 57,80 66,88 58,112 48,116', shade(m, 0.85)),
    poly('46,84 56,82 58,92 52,100 46,92', trim),
    poly('52,100 58,92 54,102', shade(trim, 0.75)),
    poly('48,106 56,104 58,110 50,114', shade(m, 1.15)),
  ],
  cape: (m, trim) => [
    poly('8,120 14,98 30,84 46,90 46,120', m),
    poly('14,98 30,84 22,108', shade(m, 1.5)),
    poly('46,90 62,84 84,98 92,120 46,120', shade(m, 0.62)),
    // red lining down the open front
    poly('38,86 46,88 50,120 40,120', trim),
    poly('46,88 58,84 62,120 50,120', shade(trim, 0.7)),
    // high collar standing up either side of the neck
    poly('30,84 34,64 45,72 46,90', shade(m, 1.35)),
    poly('34,64 45,72 46,90 40,84', trim),
    poly('57,90 57,70 67,64 74,86 62,84', shade(m, 0.7)),
    poly('67,64 57,70 57,90 66,86', shade(trim, 0.72)),
  ],
  'high-neck-dress': (m, trim) => [
    poly('14,120 20,98 38,88 46,94 46,120', m),
    poly('20,98 38,88 28,108', shade(m, 1.3)),
    poly('46,94 58,86 80,96 86,120 46,120', shade(m, 0.62)),
    poly('45,76 58,74 59,92 44,92', shade(m, 1.1)),
    poly('45,76 51,75 50,92 44,92', shade(m, 1.35)),
    poly('36,90 41,83 48,79 46,94 38,93', shade(m, 1.15)),
    poly('52,90 57,78 66,84 68,92 58,92', shade(m, 0.62)),
    // lace collar, the Maid's collar and apron facets
    poly('40,84 48,78 52,90 46,93', trim),
    poly('52,90 57,76 64,84 58,91', shade(trim, 0.85)),
    poly('45,74 58,72 58,78 45,80', shade(trim, 0.92)),
    poly('42,92 46,93 44,97', trim),
    poly('46,93 52,90 50,97', shade(trim, 0.92)),
    poly('52,90 58,91 56,97', shade(trim, 0.8)),
  ],
  'waistcoat-suit': (m, trim) => [
    poly('12,120 20,96 40,85 46,96 44,120', m),
    poly('20,96 40,85 28,108', shade(m, 1.3)),
    poly('50,96 58,84 80,94 88,120 52,120', shade(m, 0.6)),
    poly('44,82 57,78 54,88 50,96 46,88', '#f4f0e4'),
    poly('46,88 50,96 54,88 58,100 55,120 45,120 44,100', trim),
    poly('50,96 54,88 58,100 55,120 50,120', shade(trim, 0.78)),
    poly('40,85 46,82 50,96 44,102', shade(m, 0.72)),
    poly('57,80 62,86 56,102 52,94', shade(m, 0.46)),
  ],
  'tweed-knit': (m, trim) => [
    poly('8,120 14,98 36,86 44,96 44,120', m),
    poly('14,98 36,86 24,108', shade(m, 1.3)),
    poly('50,96 60,84 84,96 92,120 50,120', shade(m, 0.6)),
    poly('44,82 57,78 50,94', '#e8dcc0'),
    poly('42,88 57,82 57,100 55,120 44,120 42,100', trim),
    poly('50,92 57,82 57,100 55,120 50,120', shade(trim, 0.82)),
    poly('36,86 44,82 44,96 40,100', shade(m, 0.78)),
    poly('49,98 51.5,100.5 49,103 46.5,100.5', shade(trim, 0.65)),
    poly('49,106 51.5,108.5 49,111 46.5,108.5', shade(trim, 0.65)),
    poly('49,114 51.5,116.5 49,119 46.5,116.5', shade(trim, 0.65)),
    poly('18,104 28,102 26,110 16,112', shade(m, 0.72)),
  ],
  'stand-collar-jacket': (m, trim) => [
    poly('14,120 20,92 36,80 46,92 46,120', m),
    poly('20,92 36,80 28,102', shade(m, 1.3)),
    poly('46,92 56,82 80,90 86,120 46,120', shade(m, 0.62)),
    poly('40,76 46,70 57,68 62,76 58,90 46,92 40,86', shade(m, 1.1)),
    poly('40,76 46,70 50,92 40,86', shade(m, 1.35)),
    poly('50,70 57,68 62,76 58,90 50,92', shade(m, 0.72)),
    poly('49.5,92 50.5,92 51,120 49,120', shade(m, 0.45)),
    circle(47.5, 98, 1.5, trim),
    circle(47.5, 106, 1.5, trim),
    circle(47.5, 114, 1.5, trim),
    circle(52.5, 98, 1.5, shade(trim, 0.8)),
    circle(52.5, 106, 1.5, shade(trim, 0.8)),
    circle(52.5, 114, 1.5, shade(trim, 0.8)),
  ],
  'open-collar-jacket': (m, trim, t) => [
    poly('14,120 20,98 38,88 44,100 42,120', m),
    poly('20,98 38,88 28,108', shade(m, 1.1)),
    poly('52,100 58,86 80,96 86,120 52,120', shade(m, 0.78)),
    poly('44,84 57,80 56,96 50,118 44,100', trim),
    poly('46,82 57,80 54,92 50,98 48,90', t.chest),
    poly('40,84 46,80 50,92 42,93', trim),
    poly('52,92 57,78 64,86 58,95', shade(trim, 0.82)),
    poly('38,88 44,84 44,100 50,118 42,120', shade(m, 0.9)),
    poly('57,80 62,86 56,100 50,118 56,96', shade(m, 0.7)),
  ],
  'blouse-bow-jacket': (m, trim) => [
    poly('14,120 20,98 38,88 44,100 42,120', m),
    poly('20,98 38,88 28,108', shade(m, 1.3)),
    poly('50,100 58,86 78,96 86,120 50,120', shade(m, 0.62)),
    poly('42,86 57,80 56,94 50,108 44,96', trim),
    poly('52,84 57,80 56,94 50,108', shade(trim, 0.88)),
    poly('38,88 44,84 44,96 50,108 42,110', shade(m, 0.82)),
    poly('57,80 62,86 56,102 50,108 56,94', shade(m, 0.55)),
    poly('44,84 50,88 44,93', trim),
    poly('56,84 50,88 56,93', shade(trim, 0.84)),
    poly('48,86 52,86 52,90 48,90', shade(trim, 0.68)),
  ],
};

// ---------- Accents ----------

type AccentFn = (c: string) => AccentPiece[];
export const accentStyles: Record<string, AccentFn> = {
  pearls: (c) => [
    {
      space: 'body',
      shapes: [
        poly('45,86 47,84 49,86 47,88', c),
        poly('50,88 52,86 54,88 52,90', c),
        poly('55,86 57,84 59,86 57,88', c),
      ],
    },
    { space: 'frame', shapes: [circle(63.8, 61.8, 3.2, c), poly('63.8,61.8 67,61.8 65.8,64.4', shade(c, 0.82))] },
  ],
  'bow-tie': (c) => [
    {
      space: 'body',
      shapes: [
        poly('45,82 50,85 45,88', c),
        poly('55,81 50,85 55,89', shade(c, 0.85)),
        poly('48.4,83.6 51.6,83.6 51.6,86.4 48.4,86.4', shade(c, 0.7)),
      ],
    },
  ],
  'pocket-square': (c) => [
    {
      space: 'body',
      shapes: [
        poly('30,106 31,98 34,100 36,97 38,106', c),
        poly('34,100 36,97 38,106 34,106', shade(c, 0.78)),
      ],
    },
  ],
  keys: (c) => [
    {
      space: 'body',
      shapes: [
        ring(30, 107, 3.2, c, 1.2),
        poly('26,110 28.4,110 28.4,119 26,119', shade(c, 0.85)),
        poly('28.4,114 30,114 30,116 28.4,116', shade(c, 0.85)),
        poly('31,110 33.4,110 33.4,119 31,119', c),
        poly('33.4,115 35,115 35,117 33.4,117', c),
      ],
    },
  ],
  'monocle-chain': (c) => [
    {
      space: 'head',
      shapes: [
        circle(54.4, 40.6, 4.3, '#f4f0e4', 0.25),
        ring(54.4, 40.6, 4.3, c, 1.2),
        line('58.4,42.5 62,50 62.5,58 61,66', c, 0.7),
      ],
    },
    {
      space: 'body',
      shapes: [
        line('45,98 46,104 50,107 54,104 55,98', c, 0.8),
        circle(50, 107.5, 2, c),
        circle(50, 107.5, 1.1, shade(c, 0.7)),
      ],
    },
  ],
  medal: (c) => [
    {
      space: 'body',
      shapes: [
        poly('32,96 36,95 38,104 34,105', c),
        poly('36,95 38,95 40,104 38,104', shade(c, 0.7)),
        circle(36.5, 108, 2.6, '#c8a24c'),
        poly('36.5,108 39.1,108 37.8,110.4', '#8e6f27'),
      ],
    },
  ],
  flower: (c) => [
    {
      space: 'body',
      shapes: [
        poly('32,102 28,106 34,104', '#4f7a45'),
        circle(33, 98, 2.2, c),
        circle(36, 99, 2.2, shade(c, 0.85)),
        circle(31, 100.5, 2.2, shade(c, 1.12)),
        circle(34.2, 101.5, 2.2, shade(c, 0.95)),
        circle(33.6, 99.8, 1.1, '#f4d56a'),
      ],
    },
  ],
  brooch: (c) => [
    {
      space: 'body',
      shapes: [
        circle(37, 100, 2.6, c),
        poly('37,100 39.6,100 38.3,102.4', shade(c, 0.7)),
        circle(36.2, 99.2, 0.9, '#ffffff', 0.8),
      ],
    },
  ],
  'round-glasses': (c) => [
    {
      space: 'head',
      shapes: [
        circle(44, 40.6, 4.3, '#f4f0e4', 0.28),
        ring(44, 40.6, 4.3, c, 1.2),
        circle(54.4, 40.6, 4.3, '#f4f0e4', 0.22),
        ring(54.4, 40.6, 4.3, c, 1.2),
        poly('48.2,40 50.2,40 50.2,41 48.2,41', c),
        poly('41.2,37.8 43.4,36.8 41.8,39.4', '#ffffff', 0.7),
      ],
    },
  ],
};
