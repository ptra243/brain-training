# Next sessions

Ideas for sessions to start fresh with `/clear` (or another terminal). Each has its own
`Last touched` date. A `SessionStart` hook (`.claude/hooks/stale-sessions.mjs`) shows these as a
numbered menu when a session starts (or after `/clear`): reply "start 3" and Claude runs that entry's
starting prompt, and renames the session to that heading. It also tells Claude to mention any entry untouched for 14 days or more and ask
whether to keep, update or drop it. Each `## Session:` heading is its menu line, so keep it short.
Exploratory ideas with no settled design, and designed work the owner has put off, live in
`docs/someday-sessions.md`; the menu lists them after these, numbered on, without stale reminders.

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

## Session: Theme content, land the lines
Last touched: 2026-11-03
Reads first: `docs/story.md` ("How a thread reads", the people and their versions, "Threads written"), `docs/talk-threads.md` ("Two topics").
Done: the story (the chocolate company's 50th), all 60 versions with real motives, the feelings grid, and guarded threads with her line before each beat, built and in the game for the Fixer, the Lawyer and the Elder heir (`src/content/talk/motives.ts`; the Elder heir now borrows the Empress). A new guest with asks also goes in the list in `src/engine/sets.test.ts`; the talk lint rejects room words and any line another thread already uses.
Next: the Younger heir, the same way (his sister's threads are the nearest model). Then the other guests, the "About the others" pools, and "Still to do" in `docs/story.md` (renames, reaction line, the motherly Empress lines).
Starting prompt:
```
Read docs/story.md ("How a thread reads", including "Two questions for every line", the Younger heir's sketch and versions, the Elder heir's threads as the model). Follow "Refining a guest" (my ideas are often just bouncing around: give honest feedback and better options, don't just apply them): go over what each of the Younger heir's cards means and suggest better fits, refine the sketch and versions with me, then draft the six threads with feedback on each, testing every line yourself before I see it; once I approve, put them in motives.ts and docs/story.md.
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

## Session: New looks for the Fixer, Investor, Lawyer and Elder heir
Last touched: 2026-11-04
Reads first: `docs/art-guide.md` (Cast, Pipeline, Open), `docs/portraits.md`.
Goal: settle the ungendered-looks question, then draw the four new (modern) looks and modernise the
Detective's fedora through the pipeline, moving old looks to `earlierPortraits`. The Host is done.
Starting prompt:
```
Read docs/art-guide.md. Ask me the open question on ungendered looks, then propose modern looks for the Fixer, Investor, Lawyer and Elder heir (and the Detective without the fedora) in the #dev/portraits gallery, keeping the old ones as earlier looks.
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

## Session: Case check split into sweep files
Last touched: 2026-11-03
Reads first: `docs/case-check-split.md` ("Quick sweep profile and crossword letters").
Crossword boards left the case check 2026-10-27. Since PR #3 (shared-case search reuses its tables; `check-cases:full` 90 s to 50 s on 2 cores), board building is the biggest cost, about 30% of a case file. `crosswordAnswers()` (every house's things) is built by `crosswordSeed`, from `sceneGames.test.ts` and `sceneGames.sweep.ts`. Not done: case and end boards still build inside the case files.
Goal: the case files check only case logic and wiring; each game proves it always builds in its own sweep.
Starting prompt:
```
Read docs/case-check-split.md ("Quick sweep profile and crossword letters" and "After the split — builders that cannot fail"). Crosswords are done. Profile where the case and end boards still cost time inside the case files, and propose how a board can always build before briefing the implementer.
```

## Session: Shelf UI, beside the current game
Last touched: 2026-11-03 (pieces 1 and 2 built: the book setup, then the room page (`CampaignRoom`, candles, object rows, Walk to, midnight green) and the notebook in the campaign book; previews `#dev/shelf-campaign` and `shelf-campaign-midnight`)
Reads first: `docs/visual-theme.md` ("Screens 8–10, settled", its six pieces), `.claude/handoff/shelf-campaign-2.md` if present, `CONTEXT.md`.
Goal: build the campaign on `#shelf` (Screen plan step 8), pieces 4, 3, 5, 6 in that order. The midnight palette (`OpenBook.module.css`, a `midnight` class on body) was made up in piece 2; show it to the owner. Guests on the room page are plain text until piece 4 makes them open the talk spread. The notebook's Accuse buttons are hidden in the campaign until piece 5.
Starting prompt:
```
Read docs/visual-theme.md "Screens 8–10, settled" (piece 4, the talk spread), src/shelf/CampaignRoom.tsx and today's person screen in src/game/ExploreMap.tsx, then brief an implementer for piece 4: tapping a guest on the room page opens the face-to-face spread (Talk, Minigame, Clues opening their subject page in the notebook). #shelf only.
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

## Session: CSS Modules for game styles
Last touched: 2026-10-28
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

## Session: Card solitaire, the witness deal (design)
Last touched: 2026-11-03
Reads first: `docs/clear-the-dungeon.md` (rules, the 6-card slack, detective reskin, open questions).
Goal: settle the open questions, then a solver over seeded deals that keeps only winnable ones, before any UI. A reskin of Clear the Dungeon: its name, text and art aren't ours.
Starting prompt:
```
Read docs/clear-the-dungeon.md. Go through its open questions with me one at a time, then prototype the solver and report how many seeded deals it wins per variant before briefing the implementer.
```

## Session: Path puzzles, Mirrors then Railroad (design)
Last touched: 2026-11-03
Reads first: `docs/path-puzzles.md` (the shared engine, both games' pieces and levels, open questions).
Goal: one grid-and-path engine, generated route-first so every seed is solvable; Mirrors as its first game, Railroad on the same engine after.
Starting prompt:
```
Read docs/path-puzzles.md. Settle its open questions with me, then propose the engine's tile and tracer types and brief the implementer on the engine plus Mirrors easy.
```

## Session: FreeCell (design)
Last touched: 2026-11-03
Reads first: `docs/freecell.md` (rules, levels by free cells, the 360px layout problem).
Goal: prove 8 columns read well at 360px with a throwaway mockup, then settle levels and the solver for 3 and 2 free cells.
Starting prompt:
```
Read docs/freecell.md. Mock up the 8-column table at 360px first so we can judge readability, then settle the open questions with me.
```

## Session: Pyramid (design)
Last touched: 2026-11-03
Reads first: `docs/pyramid.md` (rules, scoring by cards cleared, levels by passes).
Goal: settle the open questions, then measure what share of seeded deals clear per level before building. Shares a card deck and table look with the other card games, so build after whichever card game comes first.
Starting prompt:
```
Read docs/pyramid.md. Settle its open questions with me, then prototype a solver and report the share of seeded deals that clear at 1 and 3 passes.
```

## Session: Session hygiene review (weekly)
Last touched: 2026-11-02 (reviewed; findings and the rule changes under "Reviews" in `docs/session-log.md`)
Reads first: `docs/session-log.md` (the checklist and "Why sessions ran long"), the "Token budget"
section of `CLAUDE.md`, `docs/workflow.md`, `.claude/agents/implementer.md`, `.claude/hooks/session-length.mjs`.
When: once a week at most, or once the log has three or more new lines since the last review. One short
session of about six steps; when the checklist is done, stop.
Goal: find the causes that repeat, and change a rule only for those; a cause seen once stays a note.
Starting prompt:
```
Read docs/session-log.md and the Token budget section of CLAUDE.md, work through the review checklist, find the causes that repeat, and propose rule changes for those only.
```
