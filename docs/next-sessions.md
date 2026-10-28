# Next sessions

Ideas for sessions to start fresh with `/clear` (or another terminal). Each has its own
`Last touched` date. A `SessionStart` hook (`.claude/hooks/stale-sessions.mjs`) shows these as a
numbered menu when a session starts (or after `/clear`): reply "start 3" and Claude runs that entry's
starting prompt, and renames the session to that heading. It also tells Claude to mention any entry untouched for 14 days or more and ask
whether to keep, update or drop it. Each `## Session:` heading is its menu line, so keep it short.
Exploratory ideas with no settled design live in `docs/someday-sessions.md`; the menu lists them after
these, numbered on, without stale reminders.

Keeping an entry current: every session that works on something an entry covers (from the menu or
not) updates that entry before it finishes, in the same commit as the work: its `Last touched` line
(`YYYY-MM-DD`), what is now done and what is left, and a starting prompt that picks up where the work
stopped. Do the same when its handoff docs change. Delete an entry once its session is done.

The list is a ranked backlog: the first entry is the next thing to do. Rank in tiers: (1) finished
work waiting to merge or ship, and anything that blocks other entries; (2) fixes and small wins;
(3) planned builds with a settled design; (4) design work. Exploratory ideas (5) go in
`docs/someday-sessions.md`. Within a tier, put
first whatever unblocks other entries. **Re-rank an entry whenever you add it, rewrite it, or its
status changes** (built, blocked, unblocked, done): move it to its place, don't edit it where it
stands. A blocked entry keeps its rank and names its blocker in the heading.

**Keep entries short (about 8 lines, under 1 KB).** An entry is a menu item: heading, `Last touched`,
`Reads first`, a one- or two-sentence `Goal`, and the starting prompt. Design detail, decisions and
open questions go in a linked `docs/<slug>.md`, and the entry points to it. An exploratory idea with no
settled design may stay as a short stub; give it a doc when someone starts it.

## Session: Shelf UI, beside the current game
Last touched: 2026-10-28
Reads first: `docs/visual-theme.md` (Settled: a second shell, the Screens sections, Screen plan), `CONTEXT.md`.
Goal: build every screen on `#shelf` only, in the Screen plan order; the current game stays as it is. The bookcase and a still case page are up. The ribbons and page turn were prototyped and tuned on her phone (2026-10-28, `docs/mockups/ribbons-prototype.html`, settled in visual-theme.md); steps 1 (ribbons and page turn, `#dev/shelf-ribbons`), 2 (Find a clue page, `#dev/shelf-find-a-clue`) and 3 (puzzle page and won, `#dev/shelf-puzzle`, `-won`, `-revealed`; #shelf now writes the Quick save) are built in src/shelf. Left from step 3: the turning leaf covers only the book page, so the book's edges pop. Step 4 (notebook) is next. Then map, answer, stickers, campaign book, deck and guest book.
Starting prompt:
```
Steps 1–3 of the #shelf Screen plan are done (docs/visual-theme.md "Screen 3, settled"; notes in .claude/handoff/shelf-puzzle-page.md if it still exists). Plan step 4, the notebook (You, clues, grid, subject pages; "Screens 4–7, settled"), from the NotebookGrid mockup: read ClueDrawer, GridPanel and YouSheet read-only, propose to the owner how the peek and full height sit beside the open book and the puzzle page, then write a handoff and hand it to an implementer. #shelf only; no current-shell files.
```

## Session: Theme content, land the lines
Last touched: 2026-10-26
Reads first: `docs/motive-outlines.xlsx`, `docs/theme-threads.md` (Direction).
Steps 1 to 3 are done. All 60 outlines are drafted in `docs/motive-outlines.xlsx`, and the Notes
column marks each row keep or rework, with suggested rewrites. Pilot built: threads keyed by guest and
card (`src/content/talk/motives.ts`, `{victim}` filled in on show; `#dev/motives` shows them all). Only the Financier's six are written.
Goal: the owner edits the outlines and judges the pilot, then the other nine guests get motive threads. Talk can make a guest look guilty, and it is never a clue.
Starting prompt:
```
Read docs/motive-outlines.xlsx (Notes column) and src/content/talk/motives.ts. Ask me how the Financier pilot reads on #dev/motives, then write the next guest's six threads from the rows I have approved.
```

## Session: Tarot card faces
Last touched: 2026-10-23
Reads first: `docs/tarot-faces.md` (decision, plan, what to check), `src/content/tarotArt.ts`.
Goal: draw real tarot faces for the match board and dog fight: minor arcana pips first, then 22 major
emblems. Portraits are ruled out (see the doc).
Starting prompt:
```
Read docs/tarot-faces.md and src/content/tarotArt.ts, settle the pip layout and suit colours with me, then brief the implementer on step 1.
```

## Session: Talk and threads, part B
Last touched: 2026-10-21
Reads first: `docs/talk-threads.md` (settled design and the implementer brief), `src/game/CLAUDE.md`,
`src/engine/CLAUDE.md`, `e2e/CLAUDE.md`.
Part A is built. `src/content/talk.ts` has the drafted lines; card threads beyond that draft are a first
pass, still to polish.
Goal: part B of the brief. A cold suspect's questioning game is built one level harder (from their
mood at case start; in campaigns the mood moves per round), tangents inside minigame answers, and the
`object` trigger. This changes cases: storage prefix bump and `npm run update-golden` in the same commit.
Starting prompt:
```
Read docs/talk-threads.md part B, settle how mood maps to the harder questioning with me, then hand it to the implementer.
```

## Session: Confidant arcs and case framing
Last touched: 2026-10-21
Reads first: `docs/confidant-arcs.md` (the work list), `docs/theme-draft.md` (Guest pool, draft cast,
Extension: Confidants), `docs/talk-threads.md`. Content first; code after.
Goal: write the campaign's story content for the 10-guest pool (5-chapter backstory arcs, victim
openings, endings, the new guests' lines), then put chapters in the campaign thread slot.
Starting prompt:
```
Read docs/confidant-arcs.md and the Guest pool and Confidants sections of docs/theme-draft.md, then help me write the 5-chapter arcs, victim openings and endings.
```

## Session: Summation ending, how it happened
Last touched: 2026-10-27
Reads first: `.claude/handoff/summation-ending.md` (the brief), `docs/story-layer.md` (the summation ending).
Goal: after she solves a case (or the killer gets away), replay the night on the map, one guest at a time,
citing the clue that proved each step. Fully generated from the solved case; no engine or case change.
Done: Quick play, the 7-guest length, and Skip are settled, and the brief is written. Left: build it.
Starting prompt:
```
Implement `.claude/handoff/summation-ending.md`. The decisions are also in the summation section of docs/story-layer.md. Don't reopen Quick play, the 7-guest length, or Skip.
```

## Session: Everyone has a secret (design)
Last touched: 2026-10-25
Reads first: `docs/secrets.md` (the proposal, worked example and open calls), `docs/talk-threads.md` part C,
`docs/relationships.md`. Settle it alongside the victim threads in the Relationships session.
Goal: every seated guest hides a secret, rolled blind to the killer and read only after the verdict: the
killer's becomes the motive, innocents' are cleared red herrings. Story only; cases never change.
Starting prompt:
```
Read docs/secrets.md, go through its Open list with me, then draft the six secret kinds and each guest's kinds, and write a build plan.
```

## Session: Relationships between characters
Last touched: 2026-10-23
Reads first: `docs/relationships.md` (the ideas to settle, and its last section on the theme content work), `docs/theme-draft.md` (Follow-up threads,
Model, the cast), `docs/talk-threads.md` (trigger list, settled).
Goal: make characters react to each other without anything depending on the killer: card-pair and
shared-card threads, the `heard` trigger, and campaign-only victim threads (needed by the campaign opening).
Starting prompt:
```
Read docs/relationships.md and docs/theme-draft.md, then help me design card-pair and shared-card threads, campaign victim threads and the heard trigger.
```

## Session: Act breaks and a dinner prologue (campaign)
Last touched: 2026-10-25
Reads first: `docs/story-layer.md` (act breaks, dinner prologue), `src/game/NextMurderScene.tsx`,
`docs/campaign-opening.md`. Best after the campaign opening is built.
Goal: a short survivors scene after each next-murder scene (they react to the body and to her wrong
accusation, by mood), and 4 or 5 lines of dinner before the first body. Content plus UI; cases unchanged.
Starting prompt:
```
Read the act breaks and dinner prologue sections of docs/story-layer.md, draft the line pools with me, then write an implementer brief.
```

## Session: Map counters and weapon chips to 44px
Last touched: 2026-10-26
Reads first: `src/styles.css` (`.counter` and `.tray li .weapon`, both 2.2rem = 35px), `src/game/CLAUDE.md`
(Map, dragging, the 44px exceptions).
Goal: the map's suspect counters and weapon chips are 35px on every house, under the 44px rule. Grow the
tap and drag target to 44px (a bigger hit area or a bigger counter) without the tray wrapping off one phone
screen; check `#dev/explore` and a Quick case map at 360px.
Starting prompt:
```
Read the Map rules in src/game/CLAUDE.md, then propose how to make the map counters and weapon chips 44px touch targets, and check it at 360px with browser-check.
```

## Session: Case check split into sweep files
Last touched: 2026-10-27
Reads first: `docs/case-check-split.md` ("Quick sweep profile and crossword letters").
Crossword boards left the case check 2026-10-27. `crosswordAnswers()` (every house's things) is built by `crosswordSeed`, from `sceneGames.test.ts` and `sceneGames.sweep.ts`. Not done: case and end boards still build inside the case files.
Goal: the case files check only case logic and wiring; each game proves it always builds in its own sweep.
Starting prompt:
```
Read docs/case-check-split.md ("Quick sweep profile and crossword letters" and "After the split — builders that cannot fail"). Crosswords are done. Profile where the case and end boards still cost time inside the case files, and propose how a board can always build before briefing the implementer.
```

## Session: Two-storey houses, picked per case
Last touched: 2026-10-20
Reads first: `docs/two-storey-houses.md` (the proposal, what to settle, the brief's parts),
`src/engine/CLAUDE.md`, `src/engine/house.ts`, `src/engine/caseFacts.ts`, `src/engine/clues.ts`
(the adjacency clue types), the house in `src/content/index.ts`, `src/game/MapPanel.tsx`.
Goal: replace the single 6x6 manor with 3 to 5 two-storey houses, one picked per case, so "next to"
clues get sparse and useful. A content change: every case changes, storage prefix bump.
Starting prompt:
```
Read docs/two-storey-houses.md, help me settle the open questions, then write an implementer brief.
```

## Session: Hunting the weapon (campaign)
Last touched: 2026-10-25
Reads first: `docs/weapons.md` (body signs as the shortlist, weapon stories, themed weapons, open calls),
the "Hunting the weapon" item in the What's Left doc (link in `CLAUDE.md`), `src/engine/CLAUDE.md`,
`src/engine/campaign.ts`.
Goal: one weapon all night; each body shows a true sign (wound, then trace) that narrows the weapon,
so night 1 is loose, night 2 a shortlist of 2–3, night 3 settles it. Settle `docs/weapons.md`'s open calls
and how `roundProblems` and `check-cases` prove each night, then brief. Storage prefix bump.
Starting prompt:
```
Read docs/weapons.md and the "Hunting the weapon" item in the What's Left doc, settle the open calls with me, design the body-sign clue in the engine, then write an implementer brief.
```

## Session: The second killer (campaign, medium and hard)
Last touched: 2026-10-23
Reads first: `docs/second-killer.md` (the settled design, and what to settle before the brief),
`src/engine/CLAUDE.md`, `src/engine/campaign.ts`, `src/game/campaignSave.ts`, `docs/run-history.md`.
Goal: on medium and hard, a second murder by another cleared guest after night 1, three labelled
puzzles on night 2, and a final accusation that names both killers. Easy and existing campaigns stay
unchanged. Do "Hunting the weapon" first or agree the order.
Starting prompt:
```
Read docs/second-killer.md, work out how the night 2 round is built from night 1's lineup and how roundProblems proves it, then write an implementer brief.
```

## Session: Grid cases (Murdoku-style), build
Last touched: 2026-10-21
Reads first: the "Grid cases — Build Plan" doc
(https://claude.ai/artifact/Vkrc5ipo8cJ91ofWiUbmAj; read it with the Claude Docs reader),
`src/engine/CLAUDE.md`, `src/engine/house.ts`, `src/engine/types.ts`.
Goal: a new grid case mode beside the current one. An N×N floor plan generated per case, one person
per row and column, rooms shared, and the killer is the only other person in the victim's room.
Minigames unlock the clues. Steps 1 and 3 of the plan (the map generator, clue selection and tuning)
stay in the main session; the rest go to the implementer. Existing cases must not change (no prefix
bump; the grid gets its own save key and golden snapshot). Settle the plan's open questions with the
owner first, ideally from screenshots of her game.
Starting prompt:
```
Read the Grid cases build plan doc, go through its open questions with me, then start step 1: grid types and the per-case map generator in src/engine/grid/.
```

## Session: CSS Modules for game styles
Last touched: 2026-10-27
Reads first: `docs/css-modules.md` (why, decision, shared pieces, what to watch).
Goal: move the remaining games (nosing lock / key / speed / board, number grid, typing) to
`<Game>.module.css`, one per commit, following `TarotGame.module.css`. Move e2e class selectors to
roles or `data-testid`; e2e `checkScreen` is the 360px check. Done so far: Tarot, dog fight, Wordle,
crossword, word search, cat puzzle, sudoku, interrogation, the number pad, the speed round, the
nosing shell, the board and the key. Shared pieces are settled (question text is not shared; number
grid and lock actions move together because the dog borrows both; `.nosing` and the icon paint stay
global). Next piece: number grid and lock together.
Starting prompt:
```
Read docs/css-modules.md. The shared pieces are already settled. Delegate the next piece in the Next list to the implementer, then run e2e.
```

## Session: Campaign in the puzzle book (design)
Last touched: 2026-10-27
Reads first: `docs/puzzle-book.md` (settled decisions, open questions, how screenshots are made).
Goal: mock up the campaign screens in the puzzle book style, using real screenshots, so the book
covers the whole game before any of it is built. Mockups stay in `docs/mockups`. Do not change the live shell; a built screen belongs to the Shelf UI session, on `#shelf` only.
Starting prompt:
```
Read docs/puzzle-book.md, then mock up the campaign screens in the puzzle book style in docs/mockups: the rounds bar with the explore map, talking to a guest, and the You sheet.
```

## Session: Visual theme, library and puzzle book (paused)
Last touched: 2026-10-27
Reads first: `docs/visual-theme.md`.
Goal: paused. Do not restyle the live app. The look is built on `#shelf` in "Shelf UI, beside the current game". Palette not chosen. The 360px measurements are in the doc.
Starting prompt:
```
Read docs/visual-theme.md. This is paused. Do not change src/styles.css or replace Home or Casebook. New screens belong to the Shelf UI session, on #shelf only.
```

## Session: Session hygiene review (weekly)
Last touched: 2026-10-22
Reads first: `docs/session-log.md` (the checklist and "Why sessions ran long"), the "Token budget"
section of `CLAUDE.md`, `docs/workflow.md`, `.claude/agents/implementer.md`, `.claude/hooks/session-length.mjs`.
When: once a week at most, or once the log has three or more new lines since the last review. One short
session of about six steps; when the checklist is done, stop.
Goal: find the causes that repeat, and change a rule only for those; a cause seen once stays a note.
Starting prompt:
```
Read docs/session-log.md and the Token budget section of CLAUDE.md, work through the review checklist, find the causes that repeat, and propose rule changes for those only.
```
