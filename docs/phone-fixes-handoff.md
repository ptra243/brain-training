# Phone fixes batch (29–30 Oct 2026)

Fixes from the owner testing `#shelf` in Chrome on a Galaxy S22 (about **360 × 650** CSS px in the browser,
360 × 780 as the installed app). All are owner-approved; nothing here needs another design call.
When everything below is done and `npm run checks` + `npm run e2e` pass, merge into `main` and push (that
deploys), then delete this doc and its `docs/next-sessions.md` entry.

## Branches

| Branch | State |
|---|---|
| `phone-fixes` | Items 1–7 committed. 1, 3 and 4 seen on screen at 360 × 650 (fit, no scroll); 2, 5, 6 and 7 not looked at yet. Full `npm run checks` and e2e **not yet run** on the merged branch. |
| `phone-fixes-notebook-wip` | Items 8–11 in one WIP commit (`552e957`, on top of the old `main`, not merged into `phone-fixes`). Compiles, lint clean, its unit test passes; **not checked on screen, no full checks or e2e**. |

## Items

1. **Shelf fits one screen** (`phone-fixes`). `src/shelf/fitScale.ts` + `Bookcase.tsx` scale the bookcase with CSS
   `zoom` to fit the visible height (floor 0.75); thinner rug. The lede "Take a book off the shelf." stays (owner).
2. **Cover hides the book while it opens** (`phone-fixes`). `isolation: isolate` on `.app` in `OpenBook.module.css`,
   so the ribbons, crease bookmark and notebook no longer paint over the flying cover.
3. **No gap above Find a clue** (`phone-fixes`). `.scroll` top padding 46px → 0 in `FindAClue.module.css`.
4. **Solve button clears the running-head rule** (`phone-fixes`). Puzzle page head 74 → 80px, Solve top 35px, name 39px.
5. **Crossword clue stays visible with the keyboard up** (`phone-fixes`). `interactive-widget=resizes-content` in the
   `index.html` viewport meta. Check the green table's typing screens too (it applies to every screen).
6. **Zoom between book and puzzle page** (`phone-fixes`, `src/shelf/puzzleZoom.ts`, `PuzzlePage.tsx`). Back: the
   page zooms out onto the Case page (cropped from the bottom, backdrop fades), then the leaf turns back. Open:
   the mirror. Reduced motion keeps the fade. Owner wants it to look natural: check it on the phone.
7. **Sudoku box shading** (`phone-fixes`, both looks). The selected square's box is `#ddd2b4`, its row and
   column outside the box stay `#ebe5d3`; where they overlap the box shade wins (owner).
8. **Weapon icons in the notebook Guests list** (`-notebook-wip`). Shared `src/game/ItemIcon.tsx` (GridPanel uses it
   too); `Chip` in `Notebook.tsx` draws the icon in a round brass-edged badge, word chip as fallback.
9. **Hint beside the grid instructions** (`-notebook-wip`). GridPanel props `aside`, `rule`, `belowRule` (shelf only;
   the green table renders as before). Shelf copy (owner chose short): "Tap once to cross out, twice to tick. Tap
   a name to see its clues." The duplicate note under the grid is gone.
10. **Jigsaw tray weapons as true squares** (`-notebook-wip`). The global map-chip rule `.weapon` in `styles.css`
    (min-height 1.5rem, radius, border, shadow) leaked onto case-board weapon cells; the board's class is now
    `cb-weapon` in `CaseBoard.tsx` / `board.css`. Check tray, drag ghost and placed pieces (dev
    `shelf-notebook-jigsaw`, and the green-table end board).
11. **Word search list shuffled** (`-notebook-wip`). `src/game/games/wordSearchUi.ts` orders the list seeded from
    the puzzle, in the UI only; generator, oracle, saves and grids unchanged. (Backwards words only at ★★★ is
    intended; owner is fine with it.)
12. **Back button and swipes**: not started. Spec below.

## Next steps

1. Merge `phone-fixes-notebook-wip` into `phone-fixes` (expect no conflicts: the notebook branch doesn't touch the
   files the other commits changed, except that both are on top of `c141ba4`).
2. Check items 8–11 at 360 × 650 and 360 × 780 (`#dev/shelf-notebook`, `-grid`, `-subject`, `-jigsaw`, and a word
   search puzzle page), item 2 mid-flight, item 7 on a Sudoku, and item 6 at a few timestamps for open and back.
3. Brief an implementer with item 12 (below) on top of the merged branch.
4. `npm run checks`, `npm run e2e`, then merge to `main`, push, and watch the deploy (`gh run list --limit 1`).

## Item 12 spec: Back button and swipes (#shelf only)

### Back steps back one layer and never leaves the app from the shelf

Nothing pushes history today (opening a book, puzzle, notebook or dialog is React state; `main.tsx` reloads on
every hashchange, so never change the hash). Android Back therefore closes the Chrome tab.

- Back closes the top-most open layer, one per press, top first: a `Dialog` while `body.shelf` (Solve's "Are you
  sure?", New case confirm, Options) → notebook raised (half/full → `peek`) → ribbons dropped (tuck) → puzzle page
  (same as its back ribbon, with the zoom-out and turn) → open book (its back button, `onBack`) → shelf.
- **At the shelf with nothing open, Back does nothing** (owner: don't close the Chrome window).
- Closing a layer with on-screen controls must remove its history entry too, so entries never pile up.
- Suggested: `src/shelf/backStack.ts` owns a stack. `pushLayer(close)` does `history.pushState(..., location.href)`
  (same URL) and returns `release`; `popstate` pops the top layer and calls `close`; `release()` goes back one step
  and ignores the popstate it causes; several releases in one tick batch into one `history.go(-n)`. Inject
  history/window so node tests can drive it.
- Root guard: keep one guard entry on the shelf; a popstate with an empty stack re-pushes it. Chrome skips entries
  added without a user gesture, so push the guard on the first `pointerdown`/`keydown`. (The owner knows the very
  first Back before any tap may still leave.)
- Hook `useBackLayer(open, close)` for `Dialog` (only when `body.shelf`, so the green table is untouched),
  `Bookcase` (taken book), `PuzzlePage`, `Notebook` (height ≠ peek) and the ribbons (expose open/tuck from
  `ribbonMotion.ts`). `#shelf/…` hash routes are real navigations; make sure going back from them still works.
- e2e with `page.goBack()` after a real tap: each press closes one layer; at the shelf Back stays on `#shelf`;
  closing on screen then pressing Back doesn't skip a layer. Add a rule line ("a new shelf layer registers with
  `useBackLayer`").

### Swipes

Owner: "If the notebook is open do the notebook swipe. Otherwise bookmark."
- Notebook raised: a horizontal swipe on it changes tab (left = next, right = previous, no wrap).
- Otherwise, book open, no puzzle page or dialog: a swipe on the page turns to the next / previous ribbon section
  (left = next, right = previous) with `turnTo`'s animation. No wrap; at Case, swiping right does nothing.
- A swipe: |dx| > 1.5·|dy|, |dx| ≥ 60px, under ~600ms, one finger. Pure helper with tests (`src/shelf/swipe.ts`).
- Never start one from something that moves sideways or drags: Map counters and tray (`usePointerDrag`),
  case-board pieces (`data-cbpid`), the Jigsaw tray, the grid's sideways scroller, wide crosswords, inputs. Ignore
  gestures starting in a horizontally scrollable element or `[data-noswipe]`. Keep the notebook's vertical pull and
  the ribbon pull/scrim gestures working. Not inside an open puzzle page.
- e2e with real touch events (CDP `Input.dispatchTouchEvent`).

## Cloud-session notes

- Playwright here wanted `chromium_headless_shell-1248` but only 1243 was installed; a symlink fixed it. Not an
  issue on the owner's machine.
