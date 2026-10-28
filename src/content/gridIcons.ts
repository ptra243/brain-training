// Line icons for the objects in the #shelf notebook's logic grid. Kept out of `Content`
// (like `cats` and tarotArt) so they never change a case. Each is drawn in a 24x24 box
// and meant to be stroked only: fill none, stroke currentColor, width ~1.6, round caps.

export interface GridIcon {
  /** SVG path `d` strings. */
  paths: string[];
}

export const itemIcons: Record<string, GridIcon> = {
  // A kitchen knife lying flat: handle on the left, straight back, curved edge up to the point.
  knife: { paths: ['M9 9.5h12c-1 4-5 5.5-12 5.5z', 'M3 11h6v3H3z'] },
  // A noose: rope from the top, wrapped turns, and a loop.
  rope: { paths: ['M12 2v4', 'M10 6h4v5h-4z', 'M10 8.5h4', 'M10.5 11c-4 2-4 10 1.5 10s5.5-8 1.5-10'] },
  // A tall candle with a flame, on a dish with a handle.
  candlestick: { paths: ['M12 2c2 2 2 4 0 5-2-1-2-3 0-5z', 'M10 9h4v7h-4z', 'M12 16v3', 'M6 21h12', 'M8 19h8'] },
  // An open-ended spanner on a straight handle.
  wrench: { paths: ['M15 3a5 5 0 0 0-4 7L4 17l3 3 7-7a5 5 0 0 0 7-4l-3 2-3-1-1-3z'] },
  // A bottle with a cross on its label.
  poison: { paths: ['M10 2h4', 'M10.5 2v4L7 10v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V10l-3.5-4V2', 'M12 12v5', 'M9.5 14.5h5'] },
  // A bulb-bellied vase with a flared lip and two handles.
  vase: { paths: ['M8 3h8', 'M9 3c0 4-1 5-3 7s-1 8 2 10h8c3-2 4-8 2-10s-3-3-3-7', 'M8 20h8'] },
};
