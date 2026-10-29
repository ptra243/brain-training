# Visual theme: library, puzzle book and notebook

Status: the live app stays as it is. The new look is built on `#shelf`, one screen at a time, in the
"Shelf UI, beside the current game" session. Mockups in `docs/mockups/` (open `index.html`) and on the
"Library home" design canvas (https://claude.ai/artifact/JwRfscWuZEQGKRbbjx8yb2). The canvas also holds
the three palette variants and the shared palette screens, which don't export to plain HTML.

Goal: make the app feel like a game rather than menus. Today Home is a stack of cards with seven
buttons, and Get a clue is button → dialog list → Choose → Play.

## Leaning towards (not yet decided)

- **Home is the library.** Bookcases with a Quick play shelf, a Campaign shelf and a record shelf.
  Her case in progress sticks out of the shelf with a ribbon; new case and new campaign are books
  sealed with wax; Choose your games is a deck lying on the shelf; solved cases arrive as new books.
  The record is the guest book (not a rosette, not two "Your record" buttons).
- **Tapping a book takes it to the table.** The baize card table stays as the surface the books
  lie on, so today's colours carry over.
- **Two books in a case.** The *puzzle book* holds the case: the opening, the map as a printed plate,
  the puzzle pages, and the answer form (Answer, or Stickers for Jigsaw-finish cases). The *notebook*
  (kraft, top-bound, spiral) holds her working: found clues and the logic grid on graph paper. Only
  one is open at a time; the notebook peeks up from the bottom like today's clue drawer.
- **Two edge pulls in a case (owner, 2026-10-27).** Swipe up from the bottom for the notebook.
  Swipe down from the top and the ribbon bookmarks (Case, Map, Puzzles, Answer or Stickers) slide
  out from behind the page and flop down over it; tap one to jump to that page. Proposed details:
  - Both pulls start only on a strip at the edge (the notebook's peek, the ribbon tips peeking about
    14px below the header), never anywhere on the page, so dragging on the map and grid is untouched.
  - The ribbon tips can also be tapped, so she can always find them without knowing the gesture.
  - The drop: ribbons slide down from behind the page one after another (about 60ms apart), with a
    small overshoot and settle (about 350ms each), the current page's ribbon brass. Swipe up, tap the
    page or pick a ribbon to tuck them away. Reduced motion: they just appear.
  - `overscroll-behavior-y: none` under `body.shelf` so a pull down doesn't trigger Chrome's
    pull-to-refresh. The gesture starts below the status bar, so it doesn't fight Android's
    notification shade.
  - Mockup starting point: `docs/mockups/library-home/CaseRibbons.dc.html` (ribbons at rest).
  - **Picking a ribbon turns the page (owner, 2026-10-27).** The ribbons follow book order (Case,
    Map, Puzzles, Answer or Stickers). Going forward, the page lifts from the right edge and turns
    over to the left; going back, it turns from left to right. The ribbons tuck away as the page
    turns. Proposed: about 450ms with a slight curl and shadow, and a quick flick of a few leaves
    when she skips more than one section. Picking the page she's already on just tucks the ribbons.
    Reduced motion: a short crossfade. It only happens on a ribbon tap, never a swipe, so it doesn't
    bring back the page-turn swiping rejected below.
- **Jigsaw is a sticker page** at the back of the puzzle book: loose pieces are die-cut stickers on a
  sheet, pinned pieces are printed on the page, the outline hint is the dotted silhouette sticker
  albums already print. A refused drop curls and lifts back to the sheet.
- **Find a clue is choose-your-own-adventure.** Quick play: page 3 offers each puzzle as a line of
  story plus game, level and clue count, ending "turn to page 24". Campaign: the room page is the
  choice ("You are in the hall": a newspaper crossword, the Butler polishing a clean banister), each
  showing the time it takes ("until 10:20"); walking costs no time, as now.
- **Icons are stickers**: vintage paper labels (scrap, luggage labels, bookplates) rather than glossy.
  Fixed tilt per icon. Reward stickers stay round and glossy so they never look like Jigsaw pieces.
- **Cosy palette.** Three variants mocked at 360 × 780: honey oak (lightest, the favourite so far),
  rose and walnut, midnight green (night campaign rounds). Patterned wallpaper, lamp glow, mixed
  dusty spine colours, the cat asleep on the bookcase, a teacup and candle.

## Review findings already applied to the mockups

Map, grid and sticker plates run edge to edge (no book border, no side tabs); counters 36px; sticker
squares about 40px; grid labels in a printed font with full room names, handwriting only for marks
and notes; the side thumb index was dropped (it duplicated page 3); one shared tab set (Case, Map,
Answer or Stickers); Nosing around follows the cat; the record shelf shows the guest book only.

## Still open

1. **Check real screens before building.** Checked at 360 × 780 on 2026-10-27: `#dev/explore`,
   `#dev/houses`, `#dev/nosing-houses`. The floor plan fits an edge-to-edge plate (tallest is the
   Steps turned, about 360 × 432, about 128px spare in a 560px plate). A few room names paint past
   the plan edge (Dining room on the T lodge, about 17px). Nosing boards fit a full-phone page
   (328px square now, about 300px spare under an 80px header). The campaign room list (534px) does
   not belong on the plate. Still to check: `#dev/time-card`, `#dev/midnight`, `#dev/load/campaign-start`,
   the grid and the Jigsaw.
2. **Pick the palette** (honey oak is ahead). Apply it only under `body.shelf`, never in the `:root`
   variables in `src/styles.css`, until the owner makes `#shelf` the address the app opens on.
3. **Map and grid are now in different books.** She switches between them a lot; confirm with her
   that one tap on the notebook is quick enough.
4. **Tabs at the top are a reach on the S26.** Answered by the ribbon pull-down (above): a swipe
   down from anywhere along the top edge, so she doesn't have to reach for a small tab.
5. **Bottom of screen, one owner per page:** notebook peek on map and grid, sticker sheet on the
   sticker page (notebook moves to a header icon), nothing else.
6. **Sticker sheet height at 36–40px squares** may need its own scroll, or to sit under the notebook.
7. **Story line pools per game** (picked by the case seed, like the openings) so page 3 doesn't
   repeat after ten cases. Lines are flavour: never a case fact, never killer-dependent.
8. **Fonts must ship with the app** (EB Garamond, Caveat): the mockups load Google Fonts, and the
   PWA plays offline.
9. **Shadows and SVG filters**: keep them on stickers; check scrolling on her phone.

## Unexplored ideas

- **Sticker branches, later.** Solving a puzzle (or pressing Solve) gives a sticker; a foil one for
  solving without help. Pages then say "Have the key sticker? Turn to 31." Works with what exists
  (the finale already waits for the other games; progress already records won and revealed). Rules:
  never lock a needed clue (only extras: a bonus clue, a funny scene, a campaign shortcut), never
  depend on who the killer is, and it changes cases, so dump and diff plus a storage prefix bump.
- **Stickers as a collection**: the casebook cover and guest book fill up like a scrapbook (the
  weapon, the room, the killer's card after a solve).
- **The secret lever book**: an odd black book on the shelf swings the bookcase open; a way to
  discover tarot mode, which `docs/theme-draft.md` lists as undecided.
- **Spine colours from the case code**, so her shelf is unlike anyone else's.
- **Campaign as chapters**: 9pm, Midnight and 3am as chapters of one book; candles for accusations
  left, blown out on a wrong one; the clock face on the shelf shows the round.
- **Case start as breaking a wax seal**, and the book opening on the victim and the opening lines.
- **Campaign setup as the book's title page**, difficulty as three ribbon bookmarks instead of
  pickers.
- **Her own notes**: let her type into the notebook (the mockup's handwriting is decoration).
- **The invitation theme**, kept for edges only: a "regrets" card after a wrong accusation ("The Uncle
  sends his regrets. He won't be joining you for dessert."), a thank-you note on solving, the guest
  book. Most of its charm is copy, so it can be layered on later.
- **Rejected for now**: tarot spread as Home (gives the hidden layer away; maybe the tarot-mode skin),
  evidence board (noir, generic), house cutaway as Home (most art; every house differs), page-turn
  swiping (fights dragging on the map and grid).

## Settled: a second shell

The new look is `#shelf` (and `#shelf/...`). The address with no hash still loads `App`. Until the
owner switches that default, this work must not change the current shell.

- Do not edit `src/styles.css`, `Home.tsx`, `Casebook.tsx`, `CampaignCard.tsx`, `GetClue.tsx`,
  `ExploreMap.tsx`, the game CSS modules, or any other file the current game renders, in order to
  restyle it.
- `src/main.tsx` may gain one branch, the same way `#dev` is branched, and add a `shelf` class on
  `body`. Nothing else there.
- New screens are new files. Their colours apply only under `body.shelf`.
- A screen that is not drawn yet is a short page on `#shelf`. It does not fall through into today's
  components.
- Reading her save, to draw the book that sticks out, is fine. Do not write the save from `#shelf`
  until that screen is the real one and the action is the same as today (continue or start).
- **One save (owner, 2026-10-28).** Quick play becomes playable on `#shelf` early, writing the same
  save, through the same progress calls the Casebook uses, so a case started in either shell
  continues in the other. No shelf-only save prefix.
- **Games inside a page (owner, 2026-10-28).** A puzzle page is a paper frame (header, cat hint,
  Solve) around today's game component, unchanged. Later each game can be restyled with overrides
  under `body.shelf` only, never by editing its CSS module.
- **Subject pages (owner, 2026-10-28).** See screens 4–7 below. Ribbons stay four.
- The first screen is the honey-oak bookcase the owner picked on 2026-10-27
  (`docs/mockups/shots/honey-oak-shelf.png`): cream dotted wallpaper, one wooden bookcase,
  Quick play / Campaign / Your record, the cat, teacup and candle. `docs/mockups/library.html`
  is the earlier dark shelf and is not the one to build. Later screens come from `docs/mockups/`,
  one at a time.
- **Build from the source, not the screenshot.** The honey-oak screens come from the "Library
  home" design canvas (https://claude.ai/artifact/JwRfscWuZEQGKRbbjx8yb2), copied into
  `docs/mockups/library-home/`. `CosyLibrary.dc.html` is the bookcase and `CosyTable.dc.html` the
  case page at the table; the `honey` entry in each file's `palettes` holds the exact colours.
  Copy sizes, colours and the EB Garamond headings from there; `LibHoney`/`TableHoney` just pick
  the honey palette.

## Screens 1–3, settled (owner, 2026-10-28)

- **Case section is two pages.** The opening (victim, blurb) shows the first time the book opens.
  After that the Case ribbon and reopening the book land on page 3, the Find a clue page. The
  three choices on today's still case page move to page 3.
- **Page 3 lists every puzzle in the case**: a story line, then game · level · clue count. Finished
  ones stay, greyed ("Solved · 2 clues found") and tappable, with a button to hide them.
- **No separate intro page.** The puzzle page has a short header (title, level, clue count, one rule
  line, "Turn back to page 3") with the game right under it.
- **Story lines**: a pool per game in `src/content/`, about the house, the cat and objects only, never
  a guest, never a case fact. The line and the page number come from the case ref through a small
  hash in the shelf UI, not the engine `Rng`, so cases don't change. Claude drafts 3 per game; the
  owner edits.
- **Won page**: the finished puzzle, the clue(s) written in below, "Turn back to page 3". Until the
  notebook is built, the clue stays on the page; later it flies into the notebook's peek. A Solve
  shows the same with a plain "Solved by the cat" note.
- **Ribbons and page turn, tuned on her phone (owner, 2026-10-28).** Build from the prototype's
  source, `docs/mockups/ribbons-prototype.html` (published at
  https://claude.ai/artifact/KGKugQ9qeqxu8kGshshVTr): its CSS and Web Animations code are the spec,
  with the tuning sheet and sample pages left out. Settled:
  - **Numbers**: ribbons 45ms apart, each drops in 510ms with an 11px overshoot and a 5° sway that
    settles (each ribbon swings its own way); page turn 530ms with a 6° curl; skipping more than one
    section flicks 2 blank leaves 115ms apart. Reduced motion (the phone's setting): ribbons just
    appear, a turn is a 180ms crossfade.
  - **The open book runs to the left edge of the screen** with 20px of the empty left page showing,
    a lit crease (shadow and highlight) between the pages, and only 6px of felt on the right. The
    header keeps its own 16px / 10px inset.
  - **The ribbon for the page she's on lies in the crease** and hangs out of the bottom of the book.
    The top row keeps its four places and leaves a gap where that ribbon was. On a turn it is pulled
    up out of the crease and the new page's ribbon is drawn down once the page lands.
  - **Satin, draped**: a sheen across the width, darker edges, a soft shadow on the page and a fold
    where each ribbon bends over the top edge. Each ribbon is longer than it shows, hidden above the
    page edge, so the overshoot never lifts its top into view.
  - **The first tap only opens them.** Tapping or swiping down on the tips drops the ribbons and
    never turns a page; a ribbon turns the page only when the tap starts on it while they are down
    (the late click from the opening tap would otherwise land on one). Swipe up or tap the page to
    tuck them.
  - Colours: Case gold, Map green, Answer rust (Puzzles blue was dropped with its ribbon). No brass "current" ribbon any more;
    the crease shows where she is.
  - An unbuilt section's page says "This page isn't drawn yet."

- **Hide finished** is a small link at the foot of page 3 ("Hide finished (2)" / "Show finished
  (2)"), absent when nothing is finished. Remembered in a shelf-only localStorage key (guarded), not
  the case save.

## Screen 3, settled (owner, 2026-10-28)

- **#shelf writes the Quick save now**: the same `reduce` and `saveQuick` as the Casebook, keeping
  her `historyId`. A game won in either shell shows won in the other. The dev preview's sample case
  never writes storage.
- **The puzzle page is a full-width paper page** (the mockup), not inside the book: ribbons hidden,
  chevron "Turn back to page 3". A line opens it with a forward page turn (same numbers) and it turns
  back the same way; the Case ribbon stays in the crease.
- **No Puzzles ribbon (owner, 2026-10-29).** Every puzzle is a row on page 3, so Quick play has three
  ribbons: Case, Map, Answer.
- **Rule line** is the registry's `rule`: one line of at most about 47 characters, so it fits on
  one line at 360px (`help` ran 3–4 lines).
- **Won / revealed**: the finished board, then the `titles` heading, "Solved by {cat}" on a reveal,
  the scene line if this game gives it, the clue cards, "Turn back to page 3". It scrolls to the
  clues once. The half-heard teaser stays as a pencilled note above the game.
- **`src/shelf/PuzzlePage.tsx` repeats `GameScreen`'s glue** instead of sharing it, so `GameScreen` is
  untouched; merge them when #shelf becomes the default.

## Screens 4–7, settled (owner, 2026-10-28)

- **Notebook**: opens full height, index tabs along its **bottom** (Clues · Grid · Guests). Swipe
  down on the spiral, or tap above it, to tuck it back to the peek. It reopens on the page she last
  used, so map ↔ grid is one tap each way (check with her once both are playable). The first page,
  before Clues, is "You" (today's You sheet; revisit for campaign).
- **Subject page**: one notebook page per guest and per weapon. Heading (counter or chip, name,
  "You've placed them in the library" or "Not placed yet"), the clues naming them (tick as used),
  what they said (guests only, today's talk section), and "Place in a room". No cross-off: marks stay
  on the map and grid.
- **Tapping on the map** (a short tap; a drag still moves it): the notebook rises to **half height**
  on that subject's page, the counter ringed in brass on the map above. Tapping another counter or
  weapon swaps the page in place. Swipe up for full height; swipe down or tap the map to tuck it
  away. A row or column name in the notebook's grid opens the same page. This replaces today's
  suspect sheet; there is no separate card on the table.
- **Answer page**: Quick play rules unchanged (unlimited accusations, tries counted). A printed form,
  "It was ___ in the ___ with the ___"; tapping a blank opens a printed list and her pick is written
  in pencil. A wrong one is crossed out in red pencil and a fresh line appears below, so earlier
  tries stay. The "regrets" card copy comes later as a content pass.
- **Sticker page** (Jigsaw-finish cases): the bottom belongs to the sticker sheet, a drawer about two
  rows tall (2 × 44px plus padding) that scrolls sideways; the notebook becomes a header icon.

## Screen 4, settled (owner, 2026-10-28)

- **Peek**: a 52px kraft strip with the spiral at the bottom of the screen, below the book (the book
  is 52px shorter), one Caveat line "Notebook · 3 of 5 to use". Tap or swipe up to open.
- **Open**: from 96px below the top to the bottom; the header and a dimmed strip of the book stay
  above it. Tap that strip, the spiral handle, or swipe down to tuck it away.
- **Tabs along the bottom**: You · Clues · Grid · Guests. It reopens on the last tab (shelfStore).
- **Grid** is today's `GridPanel` unchanged; a row or column name opens that guest's, weapon's or
  room's page. The cat's grid hint works as in the Casebook.
- **Not on the puzzle page**: each puzzle stands alone.
- **Left for step 5**: half height from a map tap, the brass ring, "Place in a room". ("Question them"
  is dropped: see Milestone 1.)

## Milestone 1: Quick play on the shelf (owner, 2026-10-29)

**Done when** she plays one real Quick case on her phone, from the bookcase to the answer, without
help and without opening the current shell. Campaign, the deck and the guest book come after.

Decisions:

- **Palette**: honey oak, locked in (Still open #2). Midnight green stays a campaign question.
- **Fonts ship with the app** (Still open #8): EB Garamond and Caveat bundled, precached for offline.
- **New case settings**: the New case book uses her last-used difficulty, length and cast from the
  save. No picker until the deck (step 9).
- **Finish: Grid or Jigsaw, in the same place.** They are alternatives, so the Jigsaw is a notebook
  tab in place of Grid (Clues · Jigsaw · Guests) in a Jigsaw-finish Quick start case. Play
  cases have both (Clues · Grid · Jigsaw · Guests; owner, 2026-10-29), as classic Quick play.
  **No You tab in Quick play** (owner, 2026-10-29): its clock and "You are in" lines only mean
  something in the campaign, which keeps it; the clue count is already in the header. Ribbons
  stay Case · Map · Answer in every Quick case. Built as the sticker version from
  `docs/mockups/sticker-page.html` redrawn as a notebook page: the board on the page, the sticker
  sheet (2 × 44px rows, scrolls sideways) just above the tabs. The owner judges it once built. This
  replaces the Stickers section and step 7's "notebook becomes a header icon".
- **No talk in Quick play.** Subject pages show placement and clues only; the conversation (greeting,
  beats, "So far") is flavour from content, gives no clue, and stays for the campaign's face-to-face
  spread. A questioning is a minigame, so it is a row on the Find a clue page like the rest; there is
  no "Question them" on a subject page. Her talk progress in the save is left untouched.
- **Look option.** A gear on the current shell's Home and on the bookcase opens a small options
  sheet with the look, Classic or Shelf (CONTEXT.md "Look"). Stored in its own localStorage key, not
  the case save; the address with no hash opens the chosen look; `#shelf` and `#dev` keep working.
  This is the one exception to "Settled: a second shell": `Home.tsx` gains the gear and `main.tsx`
  reads the choice. Finishing the shelf means flipping the default to Shelf, later removing Classic.
- **Known gaps**: grid cells and labels to 44px in the notebook (the `test.fail` in
  `e2e/shelfNotebook.spec.ts`), and the notebook checked on her phone. The page turn's popping book
  edges wait until after the milestone.

Order (1 and 4 don't depend on 2 and 3 and can run alongside):

1. Small pieces: bundle the fonts, grid to 44px, New case uses her last settings.
2. Map plate (step 5): a counter tap raises the notebook to half height on its subject page, brass
   ring, "Place in a room".
3. Answer page (step 6).
4. Jigsaw tab (the sticker version, above).
5. The look option.
6. Her test on her phone.

**Status (2026-10-29):** 1–5 are built; 6 is left. Fonts are `@fontsource` packages imported from the
shelf chunk and precached. New case repeats her last Quick settings (`planNewCase`). The map plate
reuses `MapPanel` (one optional `onSubject` prop) and drops accusing from the map on the shelf. The
Answer page prints the room (accusations are who + weapon) and ends with "Back to the shelf". The
Jigsaw tab runs `EndBoardPanel` unchanged inside the notebook. The look is `src/game/look.ts`
(`brain-training-look` key), the sheet `OptionsSheet.tsx`. For the owner to judge:
- **Play cases show Grid and Jigsaw** (owner, 2026-10-29, after testing Milestone 1; was Grid only),
  as the classic Casebook does. One rule, `hasJigsaw` in
  `src/shelf/notebook.ts`.
- The sticker drawer: captions hidden and mini grids at 14px so two rows fit; a sideways drag on a
  sticker scrolls the drawer. Each sticker is its mini piece with the classic caption; the intro
  is hidden and "How to play" is a small disclosure.
- The notebook grid at 44px is wider than the page: it scrolls sideways in its own box (weapon
  columns start off-screen), with a soft right-edge shadow as the cue.

## Screens 8–10, settled (owner, 2026-10-28)

- **The campaign is one book in chapters**, a chapter per round (Chapter one: 9pm, Midnight, 3am).
  Ribbons are Room · Plan · Answer. The room page (`CampaignRoom`) is the hub, as page 3 is in Quick
  play: where she is, the guests there, the objects with game · level · clue count, and "Walk to ·
  no time taken". Midnight and 3am chapters use the midnight-green palette; 9pm stays honey oak.
- **Talking is a face-to-face spread** on the table, her portrait and theirs, as today's person
  screen (Talk, Minigame, Clues). Its Clues opens that guest's subject page in the notebook. The
  opening scene is the first pages of chapter one.
- **New campaign opens on a title page**: difficulty as three ribbon bookmarks (Easy, Medium, Hard)
  plus today's other setup options, and "Break the seal" to start.
- **Accusations left are candles** in the room page header; a wrong one blows one out. Face to face
  after an accusation is a spread on the table. A new body ends the chapter; the next chapter's first
  page says "later that night". Rules unchanged; only the drawing.
- **The sticker tin** (owner, 2026-10-29; replaces the deck): see "Puzzle labels and the sticker
  tin" below.
- **The guest book**: running totals in ink on the front page, then one handwritten entry per
  finished run (today's history rows): date, case title, "Solved on the first accusation", the
  killer's name signed at the end. An unsolved run has no signature and "left before dessert".
- **Not in this plan**: the secret lever book, spine colours from the case code, solved cases
  arriving as books, sticker rewards (beyond the tick and paw stickers on page 3's labels). They
  stay under Unexplored ideas.

## Puzzle labels and the sticker tin (owner, 2026-10-29)

Settled with the owner; ready to build. Mockups: `docs/mockups/puzzle-labels/ContentsLabels.dc.html`
(page 3) and `Tin.dc.html` (the tin, interactive: its script is the behaviour spec), also on the
"Puzzle labels" canvas, https://claude.ai/artifact/SSCXdaHW3jog1WgpBun5Rt (boards marked "Not
taken" are ideas turned down). Copy sizes and colours from the mockups.

### The label

- **One label, the same in the tin and the book**: 140 × 60px, landscape, cream `#fffdf6`, 9px
  corners, a coloured border inset 4px. On the left a 26px ink drawing of the puzzle; on the right
  the game name (EB Garamond 600, 14px, small caps; long names wrap to two lines) and its level as
  printed stars (★☆☆ easy, ★★☆ medium, ★★★ hard, rust `#8a2e3b`). No stars when the game has no
  level. Border colour by kind of game: words navy `#34436a` (Wordle, Mini crossword, Word search),
  numbers and logic green `#4f7a54` (Cat puzzle, Sudoku, Case board), people plum `#7b5a78`
  (Questioning, Tarot match, Nosing around). In the book it also has its page number in a 20px ring
  beside the stars; in the tin there is no book yet, so no ring.
- **Each label sits at its own slight angle** (−2° to 2°), from the case ref through the shelf UI's
  small hash like the story line and page number (never the engine `Rng`, so cases don't change).
- **Every game needs its label drawing**, kept in its registry entry (a small SVG component, with
  the kind's border colour) beside `rule`. Draw the 9 from the mockups. Add a line to "Adding a
  minigame" in `src/game/CLAUDE.md`: a new game needs a label drawing. Style: a 34 × 34 viewBox
  drawn at 26px, ink `#1e2a2f` strokes 1–1.6px (or Georgia letters and numbers), only the paper's
  muted fills (`#e9d9a8`, `#b9c9a0`) or a red-pencil or gold touch, a miniature of the puzzle itself
  (never a room, guest or weapon), `aria-hidden`.

### Page 3 (Find a clue)

- **Each row is a label beside its story line**: the label at its angle, then the story (EB
  Garamond 14.5px, about 150px wide, 3–4 lines), rows about 76px. The whole row is one button whose
  `aria-label` says the game, level, page and state. This replaces the "game · level · clue count"
  line in `src/shelf/FindAClue.tsx`; `ClueRow` (`src/shelf/findAClue.ts`) already has `level`,
  `clues` and `page`.
- **Stickers on a finished label** (the row stays tappable, "Hide finished" unchanged):
  - **Won**: a green tick sticker (`#3f7a4a`, cream die-cut edge, 32px) on the top-right corner;
    under the story "2 clues found".
  - **Won with the cat's hints**: the green tick, plus a small paw-print sticker with the number of
    hints (38 × 22 pill, brown `#8a6a48`) on the bottom-left corner; under the story "2 clues found
    · 2 hints". Only when the count is 1 or more.
  - **Solved by the cat** (`revealed`): a gold sticker (`#d2a548`) with a dark paw print, instead of
    the green tick; under the story "The cat solved it · 1 clue".
- **Hint counts**: `GameRecord` has no hint count today. Some games keep one in their own data (the
  Case board's `hintCount`; `hints` fields in `src/games/`, e.g. the dog fight; check each game).
  Add an optional "hints used" reader to the registry for the games that have one; a game without one
  shows no paw-print sticker. Counting hints in the other games is later work, not part of this.
- **The finale row gets a gold "Final puzzle" label**: border `#b8902f`, background `#fff8e6`, a
  padlock drawing, "Locked" in place of stars while it is locked (the row is disabled and faded), its
  page ring, and a story line. It is never in the tin. Only cases with a finale have it (Quick start
  at hard logic); Play and picked cases have none.
- **Clues stay as they are**: the won page and the notebook do not change.

### The sticker tin

- **Quick play and the New case book are unchanged.** The tin is a separate box on the bookcase
  next to them, for choosing her own games (the shelf's version of Choose games, `PickGames.tsx`).
  Its own shelf screen, plus a dev preview `shelf-tin` (see `src/dev/CLAUDE.md`).
- **Tapping it**: the tin comes down to the table and the lid lifts. Every game is a label (no page
  ring) on a blue-grey backing sheet inside the red-and-gold tin, 2 across: 9 games are 5 rows, about
  370px; 12 still fit with the buttons. Tapping a sticker lifts it (bigger shadow, a brass tick,
  `aria-pressed`) or presses it back down.
- **She lifts 3 to 7.** An eighth tap says "That's 7. Press one down to swap." (all 9 build, but the
  clues run thin: about 6 games of 9 give one clue, and about 3 in 100 codes fail). Under the tin:
  "4 of 7 lifted" and the case line "Logic ★★☆ · 5 guests", from `playLevels(code)`.
- **It opens on her last picks** (`loadPicks`), lifted; the first time, a dealt hand.
- **Shake the tin** replaces Roll again: a new code (`codeFor` with the UI's crypto random), the tin
  rattles (about 420ms), the stickers jostle and resettle at new angles, the stars and the case line
  are stamped afresh, and a new random hand of 3 to 5 lifts (any game equally likely, the UI's
  random, not the engine). Reduced motion: no rattle, a short crossfade.
- **Stick them in** (disabled as "Lift 2 more" below 3) saves her picks (`savePicks`, only now),
  builds the case with `generate({ kind: 'pick', code, games })` behind the `Shuffling` overlay, and
  opens the book on page 3 with those labels. An unsolved saved Quick case is asked about first, as
  the New case book does. A game the case adds for her says "The cat added this one" under its story.
- **If the case won't build**, see "A mix that won't build" below; it never shows "That mix wouldn't
  come together".
- Unchanged: the 3-game minimum, the code format and the classic Choose games screen. The 7 cap is
  the tin's alone.

### A mix that won't build (owner, 2026-10-29: handle it quietly)

- The engine already retries quietly: a picked case tries 30 seeds with the same code
  (`PICK_TRIES` in `src/engine/caseRef.ts`), so the stars she saw stay. Measured: 0 of 400 random
  sets of 3 to 7 games failed; only all 9 at once failed (4 of 150), and the tin's cap rules that
  out.
- If it ever still fails, the tin quietly rerolls: a new code, the same games, until one builds, all
  behind the `Shuffling` overlay, then opens that case; she never sees an error.
- After 5 codes with the same games (never expected: every set of 3 or more games is tested to
  build, so 5 failures means the set is the problem), it quietly changes the games: a new hand dealt as a shake does, and tries again. The case
  opens with a pencilled note on page 3, "The cat picked these puzzles instead." Only if 10 new
  hands also fail (a real bug, since nothing automatic can fix that) does it say "The cat couldn't
  make a case. Try again later." No engine change.

### Build order

1. Label drawings in the registry, the shared `PuzzleLabel` component and its CSS module (#shelf
   only), with a dev preview of all labels and stickers.
2. Page 3 rows, the stickers, the hints reader and the finale label; update `shelf-find-a-clue`.
3. The tin screen and its spot on the bookcase; `shelf-tin` preview; e2e for lift, the cap, shake
   and Stick them in.

Each needs a look check at 360 × 780.

## Screen plan (owner, 2026-10-28)

Quick play end to end first, then campaign, then the deck and the guest book, each its own screen on
`#shelf`, still leaving today's game alone. Only when she is ready: make the app open on `#shelf`.
Words in `CONTEXT.md`.

Done (2026-10-27): the `#shelf` route and the honey-oak bookcase. New case and the saved case book
play a CSS open (lift, grow, stiff cover) onto a still case page: blurb, three clue choices, ribbons
for Case, Map, Puzzles and Answer. The choices do nothing yet. Other books still open "This page
isn't drawn yet."
Update (2026-10-28): the New case book now builds a real Play case (`generate({ kind: 'play' })`),
saves it as the Quick save and opens on the real opening, Find a clue and the notebook; an unsolved
Quick case is asked about first (`#dev/shelf-new-case`).

| Order | Shelf screen | Replaces | Mockup |
|---|---|---|---|
| done | Library (bookcase) | Home | `CosyLibrary` |
| done (still) | Case page | Opening scene | `CosyTable` |
| done | Ribbons and page turn | Tabs | `CaseRibbons` |
| done | Find a clue page (read-only; rows turn to "not drawn yet") | Get a clue | `CyoaChoices`, `CyoaPage` |
| done | Puzzle page (and won) | GameScreen | `puzzle-page*.html` |
| done | Notebook: You, clues, grid, subject pages | Clue drawer, grid, You sheet | `NotebookGrid` |
| done | Map plate (taps open subject pages) | Map, suspect sheet | `PuzzleMap` |
| done | Answer page | Accuse panel (face to face is campaign, step 8) | `puzzle-book-answer.html` |
| done | Jigsaw tab in the notebook, sticker version (Milestone 1) | Jigsaw end board | `StickerPage` |
| 8 | Campaign: title page, room page, chapters | Campaign setup, view, next murder | `CampaignRoom` |
| 9 | The sticker tin (beside Quick play, which stays) | Pick games | `docs/mockups/puzzle-labels/Tin.dc.html` |
| 10 | Guest book | Record | none |

Each new screen needs a look check at 360 × 780. Sticker rewards and sticker branches stay later,
and they change cases, so they are not part of this shell.
