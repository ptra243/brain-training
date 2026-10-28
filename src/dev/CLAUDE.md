# Dev pages (`#dev`)

`#dev` is an index listing every dev page with a link (built from
`DEV_PAGES` in `src/dev/previews.ts`). `#dev/cases` is the case inspector.
Her game does not open this hash. A look check opens a preview URL instead of playing
through to the screen. A test that proves a click loads a save one real
action before that click (`e2e/CLAUDE.md`).

## When to add or update one

Decide at the end of any task that adds or changes a screen or a game state:

- **New screen a save cannot show** (a scene, an ending, a dialog, a state
  that needs solving puzzles first): add a preview.
- **New game state that takes more than a couple of real actions to reach**
  (a mid-way minigame, a late campaign round, a finished run): add a scenario.
- **Changed a screen that already has a preview or scenario:** update its
  sample or builder in the same change, and its "what a look check judges"
  line below. A format or content change that breaks a builder shows up as a
  failing `e2e/scenarios.spec.ts`.
- **A screen her save reaches in one click:** neither; `browser-check` goes
  there through the save.

Add the id here so the index, the docs and `browser-check` agree.

## Previews

A screen the save cannot show gets its own `#dev/<id>`, rendering the
component with sample lines. So does a screen a look check would otherwise
reach by solving puzzles. Register the id in `src/dev/previews.ts`, render it
in `DevPreview.tsx`, add it here and add a landmark to `e2e/previews.spec.ts`. The index lists it
automatically.
Sample names come from `src/content` (`suspectName`, `itemName`); buttons do
nothing and nothing is saved. An unknown id lists the real ones.

URL: `http://localhost:<port>/#dev/<id>` (on the server the brief names).
What a look check judges on each:

- `hints`: a Hint button per house cat (each with its own cat head in the brass ring, label readable, 44px+), one open
  hint note (cat counter at the left, text wraps), and "The Butler is in the chair" with the portrait filling the
  brass ring (no coloured disc around the head); no sideways scroll.
- `next-murder`: the stormy scene, scream and clock, with the title and the
  "Tap to go on" line clear of the art; nothing clipped.
- `opening`: the campaign opening at the start: "Someone in this room is the culprit.", "0 of N spoken to", the
  guests in a 3-wide grid (counters 44px+, names readable), Skip; no sideways scroll.
- `opening-midway`: three guests spoken to and one guest sheet open: both portraits, greeting, victim line, beat 1
  and a clue card; nothing clipped.
- `opening-cat`: every guest spoken to, the cat's sheet open (cat portrait, intro, the "See what ... found" button).
- `opening-skip`: the skip summary dialog: clue count, the guests not spoken to, one button.
- `escaped`: "The killer got away" dialog, centred, one "See the case" button.
- `guess-now`: the Guess now? dialog, with "Not yet" and "Guess now" side by
  side and easy to tell apart.
- `time-card`: the held "10:30" card with "1 game left" (the real one fades).
- `explore`: an explored round on the map at 9pm: floor plan, the "9:00
  (N games left)" header, room list, tab bar.
- `midnight`: the same round at midnight with the map locked: Midnight header,
  a disabled room, a greyed room list.
- `you-sheet`: the You sheet over the round: her portrait card, then the clock,
  room, clues-found and games-left lines; one close button; nothing clipped,
  no sideways scroll.
- `houses`: every layout (lodge, courtyard, steps, long house, T lodge) in all 8
  orientations (`lodge/r90`, `lodge/m`...), each on the real map with nobody
  placed; a tall plan is narrowed, not stretched: footprint readable, void cells unpainted, door gaps
  (ivory with a brass dashed line) visible and not clipped, room labels
  readable at 360px, no sideways scroll.
- `nosing-houses`: the Nosing around board at the start on the lodge, courtyard, steps, long house and T
  lodge (medium): squares and marks readable at 360px, no wall inside door-joined rooms, no sideways scroll.
- `motives`: a talk simulator (Guest, Card, Reading, Thread, Victim, Mood, Games finished, Case solved, Start over,
  Hear all, Reset), each control 44px+ and fitting 360px; the greeting changes with Mood; beats appear one per tap
  up to the ready count; {victim} shows the chosen name; the source line names the thread in use; no sideways scroll.
- `shelf-ribbons`: the #shelf puzzle book open on Case, ribbons dropped (three ribbons in a row of four, a gap
  where Case lies in the crease): book runs to the left edge with a 20px left page, 6px felt right, header 16/10px
  inset; satin ribbons readable and 44px+; no sideways scroll.
- `shelf-new-case`: the New case book on a fresh sample Play case (fixed seed, nothing saved), opening not yet seen: the
  body line, the story paragraph and the button that goes on to Find a clue; notebook strip at the foot; no sideways
  scroll. The real book builds its case when opened ("Laying out the cards…" until it arrives).
- `shelf-find-a-clue`: the same book on a sample Play case (no finale; Play cases have none) with one game
  finished: story lines (not game names) lead each line, then "game · level · N clues" and "p. NN"; the finished
  line greyed ("Solved · N clues found"), "Hide finished (1)" at the foot; lines 44px+; no sideways scroll. The
  ribbons start dropped, so the first tap on the page only tucks them.
- `shelf-puzzle`, `shelf-puzzle-won`, `shelf-puzzle-revealed`: a puzzle page (full-width paper, 360px) open over the
  book on the sample case (nothing is saved): header with a ribbon chevron, the game name, Solve (not once finished),
  "level · N clues", one rule line, then the game; the won and revealed pages keep the board and add the clue
  heading, "Solved by <cat>" (revealed only), the clue cards and "Turn back to page 3". Wrapped help is two lines at
  most; no sideways scroll; buttons 44px+.
- `shelf-notebook`, `shelf-notebook-you`, `shelf-notebook-grid`, `shelf-notebook-subject`: the #shelf notebook over
  the sample case (three games won, one guest placed, one cross). Closed: a 52px kraft strip at the foot with spiral
  rings and one hand-written line ("Notebook · N of M to use"), the book above it not hidden behind it. Open
  (header and a sliver of the book stay under a scrim): kraft cover with rings, "Pull down to put away", the page on
  squared paper, four 48px tabs along the bottom (You, Clues, Grid, Guests; the current one underlined in red);
  You: portrait and three lines; Grid: Hint button and the whole grid readable; subject: back link, counter and
  name, placement line, clue cards, "What they said"; no sideways scroll at 360px. A sample never saves the tab.
- `portraits`: the portrait gallery on its own (light dev page).
- `dogfight`: the dog fight board in each state, with a cat helper picker
  (light dev page).
- `cases` (not a preview): the case inspector.

A save cannot show a click's result, so a test that proves a click still
loads a save one action before the click. A save can show a campaign round,
midnight (enough games marked done), and a minigame mid-way. Build that save
on the run. Do not commit one.

## Scenarios (`#dev/load/<id>`)

A scenario writes a save, then opens the real game on it, so you can play from
that state. Each builds its save on the run with the engine and the app's own
functions (`src/dev/scenarios.ts`), never a committed file. Loading asks first
(an in-app `Dialog`) because it replaces the game saved in this browser. e2e
builds the same states from the same builders; add a test to
`e2e/scenarios.spec.ts` for each new one.

- `campaign-opening`: a new campaign, round 1, the opening scene not started.
- `campaign-start`: a new campaign, round 1, the opening already done (opens on the casebook), nothing played.
- `campaign-midnight`: round 1 with every puzzle played, map locked.
- `campaign-last-round`: round 3 after two wrong accusations; the next wrong
  one lets the killer escape.
- `finished-runs`: Home with a solved Quick case and a caught campaign, both
  in Your record.

Not yet: a Nosing around game mid-way. The bot that plays it
(`src/games/nosingSweeps.ts`) imports `node:assert`, so it must be split
into a browser-safe module first.
