// Pure rules for the #shelf ribbons: which ribbon goes where, which way a page turns, how many blank
// leaves flick past. No DOM here; `ribbonMotion.ts` does the moving.

/** The sections in book order. */
export const SECTIONS = ['Case', 'Map', 'Puzzles', 'Answer'] as const;
export type Section = (typeof SECTIONS)[number];

/** The prototype's tuned numbers (docs/visual-theme.md), in ms, px and degrees. */
export const MOTION = {
  /** Gap between one ribbon starting to drop and the next. */
  stagger: 45,
  /** Each ribbon drops in. */
  drop: 510,
  /** Overshoot, px. */
  over: 11,
  /** Sway, degrees. */
  sway: 5,
  /** Page turn. */
  turn: 530,
  /** Curl, degrees. */
  curl: 6,
  /** Extra blank leaves when she skips more than one section. */
  flicks: 2,
  /** Gap between leaves. */
  flickGap: 115,
  /** Reduced-motion crossfade. */
  fade: 180,
} as const;

export type Motion = { -readonly [K in keyof typeof MOTION]: number };

/**
 * A ribbon's length in px, as in `OpenBook.module.css` (`--h` and the hidden top): what hangs over
 * the page once dropped, and the extra kept above the page edge so an overshoot never shows its top.
 * Constants, not measured, so placing them never depends on when the styles apply.
 */
export const RIBBON = { visible: 132, hidden: 40, tip: 14 } as const;

/** Each ribbon swings its own way. */
export const SWAY = [1, -0.8, 0.9, -1.1] as const;

export type Turn = 'stay' | 'forward' | 'back';

/** Picking the page she is on only tucks the ribbons. Later sections turn forward, earlier ones back. */
export function turnDirection(current: number, target: number): Turn {
  if (target === current) return 'stay';
  return target > current ? 'forward' : 'back';
}

/** Blank leaves that flick past as well, only when she skips more than one section. */
export function flickCount(current: number, target: number, flicks: number): number {
  return Math.abs(target - current) > 1 ? flicks : 0;
}

/** Ribbon indexes in the order they drop. The current one stays in the crease, leaving a gap. */
export function dropOrder(count: number, current: number): number[] {
  const order: number[] = [];
  for (let i = 0; i < count; i++) if (i !== current) order.push(i);
  return order;
}

/** Tucking goes right to left: the last ribbon first. */
export function tuckStep(count: number, index: number): number {
  return count - 1 - index;
}
