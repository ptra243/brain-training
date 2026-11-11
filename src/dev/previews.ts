// The #dev/<id> previews: a screen the save cannot show, rendered with sample lines.
// Add the id here, in DevPreview.tsx, and in src/dev/CLAUDE.md.

/** The index sections for previews, in page order (Tools and the scenarios are placed by devIndex.ts). */
export const PREVIEW_GROUPS = [
  { id: 'tools', title: 'Tools' },
  { id: 'classic-opening', title: 'Classic: opening' },
  { id: 'classic-round', title: 'Classic: a round' },
  { id: 'classic-ending', title: 'Classic: accusing and endings' },
  { id: 'classic-puzzles', title: 'Classic: puzzles and houses' },
  { id: 'shelf-book', title: 'Shelf: case book' },
  { id: 'shelf-notebook', title: 'Shelf: notebook' },
  { id: 'shelf-campaign', title: 'Shelf: campaign book' },
  { id: 'shelf-extras', title: 'Shelf: shelf and extras' },
] as const;

export type PreviewGroup = (typeof PREVIEW_GROUPS)[number]['id'];

export interface PreviewInfo {
  id: string;
  /** Which index section lists it. */
  group: PreviewGroup;
  /** What a look check judges. */
  about: string;
  /** 'game' keeps the baize page; 'plain' is the light inspector page. */
  look: 'game' | 'plain';
}

export const PREVIEWS: readonly PreviewInfo[] = [
  { id: 'motives', group: 'tools', about: 'Talk to any guest on any card, thread and mood, one beat at a time or all at once', look: 'game' },
  { id: 'portraits', group: 'tools', about: 'The portrait gallery', look: 'plain' },
  { id: 'housekeeper', group: 'tools', about: 'The Housekeeper’s hour as a playable text prototype: deal a case code, send three staff to three jobs for three rounds, tick a report, fill the statement', look: 'game' },
  { id: 'dogfight', group: 'tools', about: 'The dog fight board in each state, with any cat helper', look: 'plain' },
  { id: 'opening', group: 'classic-opening', about: 'The campaign opening at the start: the culprit line, 0 of N spoken to, the guests in a grid, Skip', look: 'game' },
  { id: 'opening-midway', group: 'classic-opening', about: 'The opening part-way: some guests spoken to, one guest sheet open with the victim line and a clue', look: 'game' },
  { id: 'opening-cat', group: 'classic-opening', about: 'The opening after every guest: the cat sheet before and its clue (or the goodbye dialog)', look: 'game' },
  { id: 'opening-skip', group: 'classic-opening', about: 'The skip summary: clues in the casebook and the guests not spoken to', look: 'game' },
  { id: 'explore', group: 'classic-round', about: 'An explored round on the map, at 9pm', look: 'game' },
  { id: 'midnight', group: 'classic-round', about: 'The locked map at midnight', look: 'game' },
  { id: 'you-sheet', group: 'classic-round', about: 'The You sheet: her portrait and tonight at a glance', look: 'game' },
  { id: 'time-card', group: 'classic-round', about: 'The time card after a puzzle', look: 'game' },
  { id: 'next-murder', group: 'classic-round', about: 'The next-murder scene between rounds', look: 'game' },
  { id: 'guess-now', group: 'classic-ending', about: 'The Guess now? warning', look: 'game' },
  { id: 'summation', group: 'classic-ending', about: 'The summation, a full-replay step in the middle: floor plan with guests placed so far, the placement line, what she knew, 3 of 7, Next and Skip', look: 'game' },
  { id: 'summation-skip', group: 'classic-ending', about: 'The same step with the "Are you sure?" skip dialog open', look: 'game' },
  { id: 'escaped', group: 'classic-ending', about: 'The killer got away dialog', look: 'game' },
  { id: 'hints', group: 'classic-puzzles', about: 'The cat counter on each hint button and note, and the questioning chair with the portrait filling the ring', look: 'game' },
  { id: 'case-board', group: 'classic-puzzles', about: 'The case board puzzle on a thin Play case (BKVNS, medium), padded with a room group and an Unknown group of Noticed pieces: labels, the How to play list, the Clues on the board count (all clues, own ones blank)', look: 'game' },
  { id: 'houses', group: 'classic-puzzles', about: 'The lodge, courtyard house and steps on the floor plan', look: 'game' },
  { id: 'nosing-houses', group: 'classic-puzzles', about: 'The Nosing around board at the start on each other house (medium)', look: 'game' },
  { id: 'shelf-ribbons', group: 'shelf-book', about: 'The #shelf puzzle book open on Case with the ribbons dropped', look: 'plain' },
  { id: 'shelf-new-case', group: 'shelf-book', about: 'The #shelf New case book on a fresh case: the opening (who died, the story) before Find a clue', look: 'plain' },
  { id: 'shelf-find-a-clue', group: 'shelf-book', about: 'The #shelf Find a clue page: a hard sample case: one game won, one won with hints, one solved by the cat, the finale locked', look: 'plain' },
  { id: 'shelf-puzzle', group: 'shelf-book', about: 'The #shelf puzzle page: a sample game still to play, open over the book', look: 'plain' },
  { id: 'shelf-puzzle-won', group: 'shelf-book', about: 'The #shelf puzzle page after a win: the finished board, then the clues', look: 'plain' },
  { id: 'shelf-puzzle-revealed', group: 'shelf-book', about: 'The #shelf puzzle page after Solve: "Solved by" the cat, then the clues', look: 'plain' },
  { id: 'shelf-map', group: 'shelf-book', about: 'The #shelf book turned to Map: the plate with some guests and a weapon placed, notebook peeking', look: 'plain' },
  { id: 'shelf-map-subject', group: 'shelf-book', about: 'The #shelf Map with a guest ringed in brass and the notebook at half height on their page', look: 'plain' },
  { id: 'shelf-answer', group: 'shelf-book', about: 'The #shelf book turned to Answer: the form with one wrong try crossed out and a fresh blank line, the Right now rank line', look: 'plain' },
  { id: 'shelf-answer-solved', group: 'shelf-book', about: 'The #shelf Answer page once solved: the verdict in pencil, the rank, tries, Walk through the night, Back to the shelf', look: 'plain' },
  { id: 'shelf-night', group: 'shelf-book', about: 'The #shelf ending: one step of the night replay ("3 of N") on paper over the book, with a "Your clue" line, Skip and Next', look: 'plain' },
  { id: 'shelf-clue-slip', group: 'shelf-book', about: 'The #shelf notebook strip playing the clue-slip moment on load (three slips fly in, then the line changes and the strip wiggles); Play again replays it', look: 'plain' },
  { id: 'shelf-notebook', group: 'shelf-notebook', about: 'The #shelf book on Case with the notebook closed to its strip at the foot', look: 'plain' },
  { id: 'shelf-notebook-grid', group: 'shelf-notebook', about: 'The #shelf notebook open on the Grid tab, with the cat hint and a few marks', look: 'plain' },
  { id: 'shelf-notebook-grid-clues', group: 'shelf-notebook', about: 'The #shelf notebook on the Grid tab with the pull-up sheet open on its Clues face', look: 'plain' },
  { id: 'shelf-notebook-grid-house', group: 'shelf-notebook', about: 'The #shelf notebook on the Grid tab with the pull-up sheet open on its House face (the floor plan)', look: 'plain' },
  { id: 'shelf-notebook-jigsaw', group: 'shelf-notebook', about: 'The #shelf notebook open on the Jigsaw tab (a Jigsaw-finish case): the board on the page, three stickers placed, the sticker sheet drawer above the tabs', look: 'plain' },
  { id: 'shelf-notebook-subject', group: 'shelf-notebook', about: 'The #shelf notebook on a guest page: placement, clues that name them, what they said', look: 'plain' },
  { id: 'shelf-campaign-title', group: 'shelf-campaign', about: 'The New campaign book open on its title page (honey oak, no ribbons from the top): "A murder in three chapters", Easy / Medium / Hard as three satin ribbon bookmarks with Medium pulled down, the other three options as printed lines, and the wax seal "Break the seal"', look: 'plain' },
  { id: 'shelf-campaign-opening', group: 'shelf-campaign', about: 'Chapter one on its opening page (no ribbons, no notebook): "Someone in this room is the culprit.", the body line, "2 of N spoken to", the guests as ticked rows, Skip', look: 'plain' },
  { id: 'shelf-campaign-opening-talk', group: 'shelf-campaign', about: 'The opening spread over that page, on a guest who gives a free clue: her portrait and theirs on the green baize, what they say, the clue as a card, "Added to your casebook", Close', look: 'plain' },
  { id: 'shelf-campaign', group: 'shelf-campaign', about: 'The #shelf campaign book open on Room for a sample campaign in chapter one (Room, Plan and Answer ribbons; honey oak): clock, candles, the room, its objects and Walk to; the Plan and Answer pages follow in their own previews', look: 'plain' },
  { id: 'shelf-campaign-plan', group: 'shelf-campaign', about: 'The campaign book in chapter one turned to Plan: the house as a printed plate, two rooms entered so guests show, red marks, her marker', look: 'plain' },
  { id: 'shelf-campaign-talk', group: 'shelf-campaign', about: 'The campaign book in chapter one with the face-to-face talk spread open on a guest with a questioning game: green baize, her card and theirs, the Talk tab with one line said, Minigame and Clues tabs', look: 'plain' },
  { id: 'shelf-campaign-answer', group: 'shelf-campaign', about: 'The campaign book in chapter one turned to Answer: the printed form with a guest pencilled in and the weapon still blank', look: 'plain' },
  { id: 'shelf-campaign-question', group: 'shelf-campaign', about: 'The questioning after an accusation, over the chapter-one book: her portrait and the accused on the green baize, two questions asked, Their story holds, Solve and Skip to the verdict', look: 'plain' },
  { id: 'shelf-campaign-later', group: 'shelf-campaign', about: 'The "later that night" scene after a wrong accusation, over chapter two (midnight palette): three candles, the first just out, the heading, the sentence and the On to button', look: 'plain' },
  { id: 'shelf-campaign-midnight', group: 'shelf-campaign', about: 'The same campaign book in chapter two (Midnight): midnight-green palette, one candle blown out, two puzzles picked and one object won', look: 'plain' },
  { id: 'shelf-campaign-earlier', group: 'shelf-campaign', about: 'The campaign book in chapter two with chapter one open to read: the contents list, the read-only Room page and its candles', look: 'plain' },
  { id: 'shelf-campaign-caught', group: 'shelf-campaign', about: 'The campaign book after the killer was caught in chapter two, on its closing page: the verdict in ink, the crossed-out try from chapter one, the effort line, See the night again and Back to the shelf', look: 'plain' },
  { id: 'shelf-campaign-escaped', group: 'shelf-campaign', about: 'The scene on the table when the killer gets away: three candles out, the third body, the weapon and See the case', look: 'plain' },
  { id: 'shelf-tin', group: 'shelf-extras', about: 'The #shelf sticker tin open on a fixed code: 4 of 7 stickers lifted, the case line, Shake the tin and Stick them in', look: 'plain' },
  { id: 'shelf-guest-book', group: 'shelf-extras', about: 'The #shelf guest book with sample entries: totals in ink, a solved case and a caught campaign signed by the killer, an older pair, an escaped campaign that "left before dessert"', look: 'plain' },
  { id: 'shelf-guest-book-empty', group: 'shelf-extras', about: 'The #shelf guest book with nothing finished yet: "No one has signed yet."', look: 'plain' },
  { id: 'shelf-labels', group: 'shelf-extras', about: 'The #shelf puzzle labels: every game at each level, a page ring, the finished stickers, a lifted label and the finale', look: 'plain' },
];

/** What the plain #dev page lists: the case inspector, then every preview. */
export const DEV_PAGES: readonly { id: string; about: string; group: PreviewGroup }[] = [
  { id: 'cases', group: 'tools', about: 'Case inspector: step through cases, see the map, clues and answer, play a case code' },
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
