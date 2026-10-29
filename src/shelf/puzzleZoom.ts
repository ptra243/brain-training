// Geometry for the puzzle page's zoom between the open book and full screen. Pure numbers in, CSS
// strings out; `PuzzlePage.tsx` animates them with the Web Animations API.

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

// A type alias, not an interface, so it is assignable to a WAAPI `Keyframe`.
export type ZoomFrame = {
  transform: string;
  clipPath: string;
};

/** The paper at rest: no move, nothing cropped. Same function shapes as `fitFrame` so they interpolate. */
export const FULL_FRAME: ZoomFrame = { transform: 'translate(0px, 0px) scale(1)', clipPath: 'inset(0px 0px 0px 0px)' };

/** Length of each zoom, ms. */
export const ZOOM_MS = 300;

/**
 * The paper shrunk onto `rect` (a Case page's box), for a paper whose untransformed box is `paper`
 * and whose `transform-origin` is its top left. It scales uniformly to the rect's width, moves to the
 * rect's corner and is cropped from the bottom so its visible height ends equal to the rect's.
 */
export function fitFrame(rect: Box, paper: Box): ZoomFrame {
  const s = rect.width / paper.width;
  const tx = rect.left - paper.left;
  const ty = rect.top - paper.top;
  // Crop in the paper's own (unscaled) pixels: what is left, once scaled, is rect.height tall.
  const crop = Math.max(0, paper.height - rect.height / s);
  return {
    transform: `translate(${round(tx)}px, ${round(ty)}px) scale(${round(s)})`,
    clipPath: `inset(0px 0px ${round(crop)}px 0px)`,
  };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
