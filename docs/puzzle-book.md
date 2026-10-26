# The puzzle book

A redesign idea: each case becomes a puzzle book on the card table, with a notebook for working out,
and each minigame opens as a printed page of that book. Mockups only so far, in `docs/mockups/`
(open `index.html` through the dev server at `/docs/mockups/`, or in Chrome or Edge; the Claude
desktop browser pane shows local files as a snapshot without their images). Nothing in the app has
changed.

## Settled

- **The book frame is for the case, not the games.** Case, Map, Puzzles and Answer are tabs on a
  book with a red cover edge and ivory pages; the notebook (clues and the logic grid) peeks up from
  the bottom and pulls up over the page. Mockups: `puzzle-book-map.html`, `notebook-grid.html`,
  `sticker-page.html`, `puzzle-book-puzzles.html`, `puzzle-book-answer.html`, `puzzle-book-closed.html`.
- **Minigames open full screen as a printed page** (`puzzle-page.html?g=<game>`). Inside the book
  frame the page is only 292px wide and about 470px tall: the crossword loses its last column, the
  notebook covers Nosing around's Roll button, and most games scroll a lot. So a game gets the whole
  phone.
- **The page dressing takes no width.** The spine shadow (left) and page edges (right) sit over the
  game's own side margins; the crossword only fits at the full 360px (at 350px it already clips).
  The header is 80px (the app's is 68px): a running head ("PUZZLE n", the case name in italics, a
  ruled line), the game name in the serif, Solve as an outlined button, and a red ribbon bookmark at
  top left as the back button (keep it at least 44px wide).
- **Paper colours.** Games on paper set the colour variables from the top of `src/styles.css` to:
  `--baize:#f4ecd8; --baize-deep:#e6dbc1; --baize-line:#d3c6a6; --on-baize:#1e2a2f;
  --on-baize-soft:#55615f; --card:#fffcf3; --card-edge:#cbbd9c`. The page is a little warmer than the
  cards so cards still stand out; cards get a thin ink outline (`1px solid rgba(30,42,47,.4)`)
  instead of a shadow. This alone recoloured about 90% of the games.
- **Print styles per game,** where soft tiles vanished on paper: the crossword gets 1px ink lines and
  black squares for blanks (grid `gap:1px`, ink background, `box-sizing:border-box`, white square
  cells); the word search gets loose letters in a ruled box with lightly hatched blanks; tarot match
  puts five cards a row so all 21 fit on one screen (about 60px wide, still above 44px). The rest
  of the hard-coded colours (about 45 across `src/game/games/*.module.css`) need moving to variables.
- **Quick play loop in the book.** The Puzzles tab is a contents page: number, name, the app's
  one-line description, clues it gives; done ones get a pencilled "✓ solved" or "solved for me";
  Final questioning is greyed with a padlock. Tapping a puzzle turns to its page, which already says
  how to play, so the app's "Pick a game" help step goes. The Solve dialog is a taped paper slip
  with the app's wording. After a puzzle comes a solution page: the answer, a "SOLVED FOR ME" stamp
  when she pressed Solve, the clues as slips "for your notebook", and "Back to the book". The Answer
  tab is a printed sentence with blanks ("It was ___ in the Hall, with the ___"), filled in pencil by
  tapping guests and weapons; the last result sits on a slip at the top; solved shows a CASE CLOSED
  stamp, the closing lines and the who-was-where table.

## Open

- **Campaign in the book:** the 9pm / Midnight / 3am rounds bar, the explore map with rooms and
  "People here", talking to a guest, the You sheet, the time card, the midnight lock, the next-murder
  scene, Guess now, Escaped and Final questioning have no puzzle book design yet.
- **The notebook drawer** puts clues one step further away than today; it must never hide a new
  clue, and needs a button as well as the pull-up gesture. On the Answer tab it shrinks to a slim
  strip so the form fits; that strip is under 44px tall on screen.
- **Mixed looks:** while games are on paper and the case is still on the green table, the two
  clash. Doing the game pages first and the case book soon after keeps that short.
- **Home:** the bookcase (`library.html`) and four other themes are mocked up; none is chosen.
- **CSS Modules:** the Nosing views and the Jigsaw (`cb-*`) are still global CSS
  (`docs/css-modules.md`); the paper styles have to work alongside that move.
- **Smaller than 44px in the mockups:** the "See the filled grid" link and the slim notebook strip.

## How the mockup screenshots were made

Real screens, captured with Playwright from the dev server, never redrawn by hand.

- Scripts live in the scratchpad but must run from the repo root to find `playwright`: copy the
  script to `./.shoot-tmp.mjs`, run it with node, delete it.
- Same case every run: an init script replaces `crypto.getRandomValues` for `Uint32Array` with the
  LCG from `e2e/fixtures.ts` (seed 12345), as the e2e tests do.
- Context: 360 × 780, `deviceScaleFactor: 2`, `reducedMotion: 'reduce'`, service workers blocked.
  Mouse drags (no touch) to place counters on the map.
- Reaching a game: Home, "Choose games", tap every pick row, start, "Get a clue", then a
  `button.puzzle-row` in the "Pick a game" dialog and `.puzzle-help button.primary`.
- A game below its header: find the `h1`, climb to the first ancestor at least 80% of the viewport
  wide, and clip a full-page screenshot from its bottom edge. Hide fixed and sticky elements
  (tab bar, clue drawer) before element screenshots.
- Paper versions: `page.addStyleTag` with the paper variables above, plus per-game print CSS that
  targets CSS-module classes by substring (`[class*="_cell_"]`, `[class*="_grid_"]`), since dev
  class names are hashed.
- If `localhost` refuses the connection, the dev server may be listening on IPv6 only: use
  `http://[::1]:5173`.
