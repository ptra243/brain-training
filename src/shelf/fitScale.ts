/** Smallest the bookcase is ever scaled to; below this the page scrolls instead. */
export const MIN_SCALE = 0.75;

/**
 * The factor to scale the bookcase by so the whole shelf page fits one screen.
 * `viewport`: the visible height. `fixed`: height of everything that is not scaled (top padding, header,
 * the rug's strip). `scalable`: the bookcase's height at scale 1, with its top margin.
 * Returns 1 when it already fits, never less than `floor`.
 */
export function fitScale(viewport: number, fixed: number, scalable: number, floor: number = MIN_SCALE): number {
  if (!(scalable > 0) || !(viewport > 0)) return 1;
  const factor = (viewport - fixed) / scalable;
  if (!(factor < 1)) return 1;
  return Math.max(floor, factor);
}
