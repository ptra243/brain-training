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
  - Colours: Case gold, Map green, Puzzles blue, Answer rust. No brass "current" ribbon any more;
    the crease shows where she is.
  - An unbuilt section's page says "This page isn't drawn yet."

- **Hide finished** is a small link at the foot of page 3 ("Hide finished (2)" / "Show finished
  (2)"), absent when nothing is finished. Remembered in a shelf-only localStorage key (guarded), not
  the case save.

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
- **The deck**: tapping it fans the game cards on the table; a tap turns a card face up (picked) or
  down; "Deal" starts the case. Same choice and save as today's Pick games.
- **The guest book**: running totals in ink on the front page, then one handwritten entry per
  finished run (today's history rows): date, case title, "Solved on the first accusation", the
  killer's name signed at the end. An unsolved run has no signature and "left before dessert".
- **Not in this plan**: the secret lever book, spine colours from the case code, solved cases
  arriving as books, sticker rewards. They stay under Unexplored ideas.

## Screen plan (owner, 2026-10-28)

Quick play end to end first, then campaign, then the deck and the guest book, each its own screen on
`#shelf`, still leaving today's game alone. Only when she is ready: make the app open on `#shelf`.
Words in `CONTEXT.md`.

Done (2026-10-27): the `#shelf` route and the honey-oak bookcase. New case and the saved case book
play a CSS open (lift, grow, stiff cover) onto a still case page: blurb, three clue choices, ribbons
for Case, Map, Puzzles and Answer. The choices do nothing yet. Other books still open "This page
isn't drawn yet."

| Order | Shelf screen | Replaces | Mockup |
|---|---|---|---|
| done | Library (bookcase) | Home | `CosyLibrary` |
| done (still) | Case page | Opening scene | `CosyTable` |
| 1 | Ribbons and page turn | Tabs | `CaseRibbons` |
| 2 | Find a clue page | Get a clue | `CyoaChoices`, `CyoaPage` |
| 3 | Puzzle page (and won) | GameScreen | `puzzle-page*.html` |
| 4 | Notebook: You, clues, grid, subject pages | Clue drawer, grid, You sheet | `NotebookGrid` |
| 5 | Map plate (taps open subject pages) | Map, suspect sheet | `PuzzleMap` |
| 6 | Answer page | Accuse panel (face to face is campaign, step 8) | `puzzle-book-answer.html` |
| 7 | Sticker page | Jigsaw end board | `StickerPage` |
| 8 | Campaign: title page, room page, chapters | Campaign setup, view, next murder | `CampaignRoom` |
| 9 | The deck | Pick games | none |
| 10 | Guest book | Record | none |

Each new screen needs a look check at 360 × 780. Sticker rewards and sticker branches stay later,
and they change cases, so they are not part of this shell.
