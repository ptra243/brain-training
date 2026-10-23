/**
 * Who looks like what in the faceted portraits (`docs/portraits.md`).
 * Kept outside `Content` (like `cats`), so portraits never change a case.
 * Style ids are generic shape names; the shapes live in `src/game/portraitParts.ts`.
 * One colour per part: lit and shadow tones are derived in code.
 */

export type PortraitParts = {
  /** The lit face colour. */
  skin: string;
  hair: { style: string; colour: string };
  headwear?: { style: string; colour: string };
  costume: { style: string; main: string; trim: string };
  accent?: { style: string; colour: string };
  /** Dark tone, then the lighter diagonal half. */
  background: readonly [string, string];
  /** Counter crop in the 100 x 120 frame: x, y, width, height. Default is the head. */
  crop?: readonly [number, number, number, number];
};

/** The tabby cat's colours; its shape is fixed. */
export type CatCoat = {
  /** The lit side of the head. */
  base: string;
  /** The shadow side. */
  shade: string;
  stripe: string;
  chest: string;
  nose: string;
};

/** Keyed by the guest ids the theme content will use. */
export const portraits: Record<string, PortraitParts> = {
  host: {
    skin: '#f0cfae',
    hair: { style: 'side-part-beard', colour: '#5b5e63' },
    costume: { style: 'shawl-jacket', main: '#2f5a43', trim: '#e0d3ac' },
    accent: { style: 'pocket-square', colour: '#d4a93c' },
    background: ['#5a2228', '#6f3037'],
  },
  hostess: {
    skin: '#f3d2b0',
    hair: { style: 'updo', colour: '#2b1a14' },
    costume: { style: 'gown-sash', main: '#5a1426', trim: '#b88a3a' },
    accent: { style: 'pearls', colour: '#f4f0e4' },
    background: ['#3a2a2a', '#4a3633'],
  },
  butler: {
    skin: '#f3d2b0',
    hair: { style: 'bald-sides', colour: '#8d9292' },
    costume: { style: 'tailcoat', main: '#2a2d33', trim: '#f4f0e4' },
    accent: { style: 'bow-tie', colour: '#0f1114' },
    background: ['#a69a7e', '#b9ad92'],
  },
  conjurer: {
    skin: '#c99a6e',
    hair: { style: 'slick', colour: '#141418' },
    headwear: { style: 'top-hat', colour: '#17171c' },
    costume: { style: 'cape', main: '#1c1c24', trim: '#b02a37' },
    accent: { style: 'bow-tie', colour: '#f4f0e4' },
    background: ['#1f4a4c', '#2d5f61'],
    crop: [15, 0, 70, 70],
  },
  housekeeper: {
    skin: '#f0d2bc',
    hair: { style: 'bun', colour: '#9a9a9e' },
    costume: { style: 'high-neck-dress', main: '#2b2b30', trim: '#f4f0e4' },
    accent: { style: 'keys', colour: '#c4c9cf' },
    background: ['#7d9188', '#8fa39a'],
  },
  financier: {
    skin: '#e2b085',
    hair: { style: 'slicked-back', colour: '#2a2220' },
    costume: { style: 'waistcoat-suit', main: '#3c4048', trim: '#a8322d' },
    accent: { style: 'monocle-chain', colour: '#d4a93c' },
    background: ['#a88b4a', '#bd9f5f'],
  },
  uncle: {
    skin: '#e9bd9b',
    hair: { style: 'bald-beard', colour: '#ece8df' },
    costume: { style: 'tweed-knit', main: '#7a5a3a', trim: '#c9a05a' },
    background: ['#56688a', '#6b7fa3'],
  },
  'elder-heir': {
    skin: '#f5d6bb',
    hair: { style: 'swept-back', colour: '#b98c52' },
    costume: { style: 'stand-collar-jacket', main: '#27395e', trim: '#c8a24c' },
    accent: { style: 'medal', colour: '#a8322d' },
    background: ['#9a4f3c', '#b2644f'],
  },
  'younger-heir': {
    skin: '#f6dcc0',
    hair: { style: 'curls', colour: '#d9ac4a' },
    costume: { style: 'open-collar-jacket', main: '#ece0c4', trim: '#9fc3d8' },
    accent: { style: 'flower', colour: '#e0607a' },
    background: ['#7fb0d0', '#9bc5e0'],
  },
  detective: {
    skin: '#8a5a3c',
    hair: { style: 'bob', colour: '#8a3a22' },
    headwear: { style: 'fedora', colour: '#7a7e82' },
    costume: { style: 'blouse-bow-jacket', main: '#4a5666', trim: '#f4f0e4' },
    accent: { style: 'brooch', colour: '#c4c9cf' },
    background: ['#8a7aa0', '#9f8fb5'],
    crop: [15, 4, 70, 70],
  },
};

/** The player uses the guests' model. */
export const playerPortrait: PortraitParts = {
  skin: '#f3d2b0',
  hair: { style: 'long', colour: '#17171c' },
  costume: { style: 'scarf-coat', main: '#2e3340', trim: '#b0472f' },
  accent: { style: 'round-glasses', colour: '#15151a' },
  background: ['#a8908c', '#baa29e'],
};

/** One coat per entry of `cats` (`src/content/index.ts`), in the same order: Biscuit, Marmalade, Pepper, Sooty, Duchess. */
export const catCoats: readonly CatCoat[] = [
  { base: '#c8945c', shade: '#9c6a3a', stripe: '#6b4426', chest: '#e3c79d', nose: '#c97c6e' },
  { base: '#e6903f', shade: '#b8651f', stripe: '#8a4513', chest: '#f2d9ae', nose: '#d9807a' },
  { base: '#8e939a', shade: '#666b73', stripe: '#3e4248', chest: '#d9dadc', nose: '#c98a8a' },
  { base: '#3a3a42', shade: '#24242a', stripe: '#17171c', chest: '#5a5a63', nose: '#a8727a' },
  { base: '#efe8da', shade: '#cdc4b0', stripe: '#a8764a', chest: '#fbf8f0', nose: '#e8a4a0' },
];

export type DogCoat = {
  /** The lit side of the head. */
  base: string;
  /** The shadow side. */
  shade: string;
  ear: string;
  /** Muzzle, blaze and chest. */
  muzzle: string;
  nose: string;
  collar: string;
};

/** The one dog of the dog fight: a golden hound. */
export const dogCoat: DogCoat = {
  base: '#d6b074', shade: '#a98544', ear: '#8c5f2e', muzzle: '#f1e4c6', nose: '#2a2226', collar: '#a83a32',
};
