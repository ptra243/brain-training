// The #dev/<id> previews: a screen the save cannot show, rendered with sample lines.
// Add the id here, in DevPreview.tsx, and in src/dev/CLAUDE.md.

export interface PreviewInfo {
  id: string;
  /** What a look check judges. */
  about: string;
  /** 'game' keeps the baize page; 'plain' is the light inspector page. */
  look: 'game' | 'plain';
}

export const PREVIEWS: readonly PreviewInfo[] = [
  { id: 'hints', about: 'The cat counter on each hint button and note, and the questioning chair with the portrait filling the ring', look: 'game' },
  { id: 'next-murder', about: 'The next-murder scene between rounds', look: 'game' },
  { id: 'opening', about: 'The campaign opening at the start: the culprit line, 0 of N spoken to, the guests in a grid, Skip', look: 'game' },
  { id: 'opening-midway', about: 'The opening part-way: some guests spoken to, one guest sheet open with the victim line and a clue', look: 'game' },
  { id: 'opening-cat', about: 'The opening after every guest: the cat sheet before and its clue (or the goodbye dialog)', look: 'game' },
  { id: 'opening-skip', about: 'The skip summary: clues in the casebook and the guests not spoken to', look: 'game' },
  { id: 'summation', about: 'The summation, a full-replay step in the middle: floor plan with guests placed so far, the placement line, what she knew, 3 of 7, Next and Skip', look: 'game' },
  { id: 'summation-skip', about: 'The same step with the "Are you sure?" skip dialog open', look: 'game' },
  { id: 'escaped', about: 'The killer got away dialog', look: 'game' },
  { id: 'guess-now', about: 'The Guess now? warning', look: 'game' },
  { id: 'time-card', about: 'The time card after a puzzle', look: 'game' },
  { id: 'explore', about: 'An explored round on the map, at 9pm', look: 'game' },
  { id: 'midnight', about: 'The locked map at midnight', look: 'game' },
  { id: 'you-sheet', about: 'The You sheet: her portrait and tonight at a glance', look: 'game' },
  { id: 'nosing-houses', about: 'The Nosing around board at the start on each other house (medium)', look: 'game' },
  { id: 'case-board', about: 'The case board puzzle on a thin Play case (BKVNS, medium), padded with a room group and an Unknown group of Noticed pieces: labels, the How to play list, the Clues on the board count (all clues, own ones blank)', look: 'game' },
  { id: 'houses', about: 'The lodge, courtyard house and steps on the floor plan', look: 'game' },
  { id: 'motives', about: 'Talk to any guest on any card, thread and mood, one beat at a time or all at once', look: 'game' },
  { id: 'shelf-ribbons', about: 'The #shelf puzzle book open on Case with the ribbons dropped', look: 'plain' },
  { id: 'shelf-campaign', about: 'The #shelf campaign book open on Room for a sample campaign in chapter one (Room, Plan and Answer ribbons; honey oak): clock, candles, the room, its objects and Walk to; the Plan and Answer pages are not drawn yet', look: 'plain' },
  { id: 'shelf-campaign-midnight', about: 'The same campaign book in chapter two (Midnight): midnight-green palette, one candle blown out, two puzzles picked and one object won', look: 'plain' },
  { id: 'shelf-puzzle', about: 'The #shelf puzzle page: a sample game still to play, open over the book', look: 'plain' },
  { id: 'shelf-puzzle-won', about: 'The #shelf puzzle page after a win: the finished board, then the clues', look: 'plain' },
  { id: 'shelf-puzzle-revealed', about: 'The #shelf puzzle page after Solve: "Solved by" the cat, then the clues', look: 'plain' },
  { id: 'shelf-new-case', about: 'The #shelf New case book on a fresh case: the opening (who died, the story) before Find a clue', look: 'plain' },
  { id: 'shelf-find-a-clue', about: 'The #shelf Find a clue page: a hard sample case: one game won, one won with hints, one solved by the cat, the finale locked', look: 'plain' },
  { id: 'shelf-map', about: 'The #shelf book turned to Map: the plate with some guests and a weapon placed, notebook peeking', look: 'plain' },
  { id: 'shelf-map-subject', about: 'The #shelf Map with a guest ringed in brass and the notebook at half height on their page', look: 'plain' },
  { id: 'shelf-answer', about: 'The #shelf book turned to Answer: the form with one wrong try crossed out and a fresh blank line, the Right now rank line', look: 'plain' },
  { id: 'shelf-answer-solved', about: 'The #shelf Answer page once solved: the verdict in pencil, the rank, tries, Walk through the night, Back to the shelf', look: 'plain' },
  { id: 'shelf-night', about: 'The #shelf ending: one step of the night replay ("3 of N") on paper over the book, with a "Your clue" line, Skip and Next', look: 'plain' },
  { id: 'shelf-clue-slip', about: 'The #shelf notebook strip playing the clue-slip moment on load (three slips fly in, then the line changes and the strip wiggles); Play again replays it', look: 'plain' },
  { id: 'shelf-notebook',about: 'The #shelf book on Case with the notebook closed to its strip at the foot', look: 'plain' },
  { id: 'shelf-notebook-grid-clues', about: 'The #shelf notebook on the Grid tab with the pull-up sheet open on its Clues face', look: 'plain' },
  { id: 'shelf-notebook-grid-house', about: 'The #shelf notebook on the Grid tab with the pull-up sheet open on its House face (the floor plan)', look: 'plain' },
  { id: 'shelf-notebook-grid', about: 'The #shelf notebook open on the Grid tab, with the cat hint and a few marks', look: 'plain' },
  { id: 'shelf-notebook-jigsaw', about: 'The #shelf notebook open on the Jigsaw tab (a Jigsaw-finish case): the board on the page, three stickers placed, the sticker sheet drawer above the tabs', look: 'plain' },
  { id: 'shelf-notebook-subject', about: 'The #shelf notebook on a guest page: placement, clues that name them, what they said', look: 'plain' },
  { id: 'shelf-tin', about: 'The #shelf sticker tin open on a fixed code: 4 of 7 stickers lifted, the case line, Shake the tin and Stick them in', look: 'plain' },
  { id: 'shelf-labels', about: 'The #shelf puzzle labels: every game at each level, a page ring, the finished stickers, a lifted label and the finale', look: 'plain' },
  { id: 'portraits', about: 'The portrait gallery', look: 'plain' },
  { id: 'dogfight', about: 'The dog fight board in each state, with any cat helper', look: 'plain' },
];

/** What the plain #dev page lists: the case inspector, then every preview. */
export const DEV_PAGES: readonly { id: string; about: string }[] = [
  { id: 'cases', about: 'Case inspector: step through cases, see the map, clues and answer, play a case code' },
  ...PREVIEWS,
];

/** The id in `#dev/<id>`, or null for the plain `#dev` page. */
export function previewIdFromHash(hash: string): string | null {
  const m = /^#dev\/(.*)$/.exec(hash);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}
