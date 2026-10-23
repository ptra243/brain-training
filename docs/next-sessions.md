# Next sessions

Ideas for sessions to start fresh with `/clear` (or another terminal). Each has its own
`Last touched` date. A `SessionStart` hook (`.claude/hooks/stale-sessions.mjs`) shows these as a
numbered menu when a session starts (or after `/clear`): reply "start 3" and Claude runs that entry's
starting prompt, and renames the session to that heading. It also tells Claude to mention any entry untouched for 14 days or more and ask
whether to keep, update or drop it. Each `## Session:` heading is its menu line, so keep it short.

Keeping an entry current: when you work on one, or when its handoff docs change, update its
`Last touched` line (`YYYY-MM-DD`). Delete an entry once its session is done.

The list is a ranked backlog: the first entry is the next thing to do. Rank in tiers: (1) finished
work waiting to merge or ship, and anything that blocks other entries; (2) fixes and small wins;
(3) planned builds with a settled design; (4) design work; (5) exploratory ideas. Within a tier, put
first whatever unblocks other entries. **Re-rank an entry whenever you add it, rewrite it, or its
status changes** (built, blocked, unblocked, done): move it to its place, don't edit it where it
stands. A blocked entry keeps its rank and names its blocker in the heading.


**Keep entries short (about 8 lines, under 1 KB).** An entry is a menu item: heading, `Last touched`,
`Reads first`, a one- or two-sentence `Goal`, and the starting prompt. Design detail, decisions and
open questions go in a linked `docs/<slug>.md`, and the entry points to it. An exploratory idea with no
settled design may stay as a short stub; give it a doc when someone starts it.

## Session: Portraits, parametric faceted cast
Last touched: 2026-10-23
Reads first: `docs/portraits.md` (settled style, parts model and open items), `src/content/portraits.ts`
and `src/game/portrait*.ts` (built), and the `#dev/portraits` gallery.
Built: the parts model, all ten guests, the player, the cat and dog, the gallery, and portraits on
counters, the person screen, the questioning chair and the dog fight header.
Left: (1) where the player's portrait appears (case intro or a profile; ask the owner); (2) whether the
cat's counter replaces its name in hint copy (ask); (3) tune the ten guests' costumes and colours in the
gallery, checking the 32px and 52px counters and the large view at 360px through `browser-check`;
(4) facial expressions (brows, mouth facet, head tilt) as a later layer.
Starting prompt:
```
Read docs/portraits.md, then open #dev/portraits through browser-check and tune the ten guests at 32px, 52px and the large view. Ask me where the player's portrait should appear.
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

## Session: Theme content, tarot cast and line pools
Last touched: 2026-10-22
Reads first: `docs/theme-draft.md`. Best after "The cast", which fixes the roles.
Goal: every pool is drafted (2026-10-22): 10 guests and 5 extra cards, borrowing table, borrowed
lines per pair, 40 tangents, card + object threads, cold greetings, funnier tone. What's left:
- Card threads: one per card per reading (one thread per suspect, `docs/talk-threads.md`); 2 drafted.
- Card + object gaps listed at the end of that section (Chariot and Sun have none).
- Pool size: grow the core cast to 10 to 12 lines per reading before the campaign.
- The cast and drafted lines are in `src/content/` (2026-10-22). Card threads past the two drafted are
  a first pass in `talk.ts`: polish them there. Card names on counters at 360px wait for tarot mode.
Starting prompt:
```
Read docs/theme-draft.md, draft one card thread per card per reading for the 15 cards, then fill the card + object gaps.
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
Reads first: `docs/theme-draft.md` (Guest pool, draft cast, Extension: Confidants) and
`docs/talk-threads.md`. Content first; code after.
Goal: write the campaign's story content for the 10-guest pool:
- A 5-chapter backstory arc per guest, 3 beats each (about 150 lines). About the past, never tonight
  (rule 1), and true whoever turns out to be the killer (rule 5).
- Victim openings: 2 or 3 lines per guest on why they mattered to the house.
- Endings: one pool per card for after the solve, with `{victim}` filled in.
- Lines for the three new guests (Elder heir, Younger heir, Detective) and the Butler's reworded lines.
Then code: chapters in the campaign thread slot and ranks saved as her moves (the named first victim is
built: `Case.victim`).
Starting prompt:
```
Read the Guest pool and Confidants sections of docs/theme-draft.md, then help me write the 5-chapter arcs, victim openings and endings.
```

## Session: Campaign opening, meeting the guests
Last touched: 2026-10-23
Reads first: `docs/campaign-opening.md` (the settled build plan, with every owner decision),
`docs/talk-threads.md`, `docs/theme-draft.md` (Confidants, opening and ending), `src/engine/campaign.ts`.
Goal: a skippable first phase of a campaign where she talks to every guest once and gets round 1's free
clues from those conversations (cases unchanged), plus beat review ("so far" lines, a "Story so far"
page) and the moved-body variant.
Starting prompt:
```
Read docs/campaign-opening.md (the settled build plan), write the handoff file, then build it piece by piece with implementer agents, in the order the plan gives.
```

## Session: Relationships between characters
Last touched: 2026-10-23
Reads first: `docs/relationships.md` (the ideas to settle), `docs/theme-draft.md` (Follow-up threads,
Model, the cast), `docs/talk-threads.md` (trigger list, settled).
Goal: make characters react to each other without anything depending on the killer: card-pair and
shared-card threads, the `heard` trigger, and campaign-only victim threads (needed by the campaign opening).
Starting prompt:
```
Read docs/relationships.md and docs/theme-draft.md, then help me design card-pair and shared-card threads, campaign victim threads and the heard trigger.
```

## Session: Finish the houses, size the big-house nosing boards
Last touched: 2026-10-23
Reads first: `docs/houses.md` (what exists, decisions, open items), the last sections of
`.claude/handoff/houses-foundation.md` (segment-wise prototype and measurements).
Goal: finish the single-storey houses work: cut the nosing variant sample in `check-cases` (it builds 100
seeds on each of 8 orientations of every layout), look at a lodge case and its nosing board at 360px, then
measure shorter medium and hard windows for the lodge, long house and T lodge (about 70-85% fill, one
sweep table) and propose numbers. Push only when asked. Cutting the sample and the browser check are
implementer and `browser-check` work; the window numbers are a design call for this session.
Starting prompt:
```
Read docs/houses.md, then cut the nosing variant sample in check-cases, check a lodge case at 360px with browser-check, and measure shorter medium and hard nosing windows for the new houses.
```

## Session: Two-storey houses, picked per case
Last touched: 2026-10-20
Reads first: `src/engine/CLAUDE.md`, `src/engine/house.ts`, `src/engine/caseFacts.ts`, `src/engine/clues.ts`
(the adjacency clue types), the house in `src/content/index.ts`, `src/game/MapPanel.tsx`.
Goal: replace the single 6x6 manor with 3 to 5 hand-drawn two-storey houses (8 to 10 rooms, two
6x6 floors joined by stairs), one picked per case on its own seeded stream (like `BOARD_SHARE`), so
the rest of the generator keeps its draws. Cases still use at most 5 rooms (the grid cap); unused rooms
stay on the map as red herrings. Today every room touches 3 to 5 of the other 5, so "next to" clues
are weak; floors make adjacency sparse. Settle first: does adjacency cross the stairs (proposed: same
floor only), and do we add floor clues ("was upstairs", "same floor as", "different floor from")?
Then write an implementer brief: `House`/`Room` types with floors and stairs, `houseFromLayout`
checks, `roomAdjacency`, MapPanel and CaseInspector drawing two floors (tabs or stacked, 360px, no
sideways scroll), room word lists, `check-cases` over every house. It's a content change: all cases
change, so bump the storage prefix (wipes saved progress; time it between campaigns). Room names and
words should match the theme (`docs/theme-draft.md`).
Starting prompt:
```
Read the "Two-storey houses" entry in docs/next-sessions.md, help me settle the open questions, then write an implementer brief.
```

## Session: Hunting the weapon (campaign)
Last touched: 2026-10-20
Reads first: the "Hunting the weapon" item in the Murder Mystery Mode — What's Left doc (link in
`CLAUDE.md`), `src/engine/CLAUDE.md`, `src/engine/campaign.ts`, `src/game/campaignSave.ts`.
Goal: make the weapon matter in the campaign. One weapon all night (today it's rolled each round);
loose either-or weapon clues on night 1; a new puzzle at the start of night 2 that gives a shortlist
of 2–3 weapons; night 3 settles the killer and the weapon; a wrong weapon costs a body like a wrong
person (an innocent dies; the accused survives, and she's told one of her two picks was right).
Settle first: the shortlist puzzle's design, the either-or clue types and wording, and how
`roundProblems` and `check-cases` prove each night. Then write an implementer brief. Every campaign
changes, so bump the storage prefix.
Starting prompt:
```
Read the "Hunting the weapon" item in the What's Left doc and docs/next-sessions.md, help me design the shortlist puzzle and the either-or clues, then write an implementer brief.
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
Last touched: 2026-10-23
Reads first: `docs/css-modules.md` (why, decision, done so far, what to watch).
Goal: move the remaining games (nosing lock / key / speed / board, number grid, typing) to
`<Game>.module.css`, one or two per commit, following `TarotGame.module.css`. Move e2e class selectors to
roles or `data-testid`; check each screen at 360px. Done so far: Tarot, dog fight, Wordle, crossword, word
search, cat puzzle, sudoku, interrogation.
Starting prompt:
```
Read docs/css-modules.md, then move the nosing views to CSS modules (settle the shared numpad / question rules first). Delegate each to the implementer, then run e2e and a 360px look check.
```

## Session: Target or another word game (exploratory)
Last touched: 2026-10-23
Reads first: `docs/target-game.md` (proposed approach, what to settle), `src/games/CLAUDE.md`.
Goal: design, then build, a Target-style word game (or another that fits better), with two word lists.
Starting prompt:
```
Read docs/target-game.md and help me design the game: confirm Target or pick another, settle goals, hints and the clue reward, then plan the two word lists.
```

## Session: The dog card deck builder (exploratory)
Last touched: 2026-10-22
Reads first: `docs/nosing-around.md` ("Next build: the dog"). Best after the dog encounter is built,
so its card, grid and operator modules exist to grow from.
Goal: decide whether the dog fight grows into a real deck builder (Slay the Spire style). Owner's seed
idea: start with one tarot suit (ace to king, 14 cards) plus a small operator deck; after each fight
pick one of three cards from other suits, or remove one. Suits only mean something once they mix, so
cards from other suits could carry small effects (e.g. cups a life back on an exact hit, swords +1
damage on a double, pentacles draw a card, wands any operator). The major arcana (0–21) are rare
rewards with bigger effects (the Fool as a wild card). A run is a series of stronger dogs, so it needs
saved progress between fights.
Settle the effects, the run length, how a loss works without getting her stuck, hints, and whether it
joins the case rotation.
Starting prompt:
```
Read "Next build: the dog" in docs/nosing-around.md and help me design the dog card game as a real deck builder: one-suit start deck, suit effects, rewards, run length, losing without getting stuck.
```

## Session: Side missions (exploratory)
Last touched: 2026-10-20
Reads first: the side characters from "The cast" session, `docs/theme-draft.md` (Model), and the
Murder Mystery Mode doc (link in `CLAUDE.md`). Low priority; needs the cast and threads first.
Goal: decide whether optional side stories with the side characters are worth building (a lost item,
the dog/cat, a servant's secret). Rules: always optional, never block the case (she can never get stuck),
pay out story or cosmetics (card art, the dog), never clues. Settle what a side mission is made of
(a minigame plus thread beats?), where it starts, and how it's saved.
Starting prompt:
```
Read the "Side missions" entry in docs/next-sessions.md, then help me decide whether side missions are worth building and what one would look like.
```

## Session: Property tests for the engine (exploratory)
Last touched: 2026-10-21
Reads first: `docs/code-review-followups.md` section 5, `src/engine/CLAUDE.md`, `scripts/check-cases.ts`.
Goal: decide whether fast-check adds anything beyond `check-cases`. If yes, add a capped property test
for one invariant (every clue is true) and see whether it finds anything.
Starting prompt:
```
Read docs/code-review-followups.md section 5 and scripts/check-cases.ts, then try one fast-check property test for "every clue is true" and tell me if it's worth keeping.
```

## Session: The killer lies, in hard mode (exploratory)
Last touched: 2026-10-23
Reads first: `docs/killer-lies.md` (variants A and B, why guests lie, what to settle),
`src/engine/CLAUDE.md`. Low priority: only if hard cases feel too easy.
Goal: decide whether a hard level where the killer's claims are all false is worth building, and sketch
the clue model and solver change (build A first, then B).
Starting prompt:
```
Read docs/killer-lies.md and src/engine/CLAUDE.md, then help me decide whether it's worth building and sketch the clue model and solver change.
```

## Session: Session hygiene review (exploratory)
Last touched: 2026-10-22
Reads first: "Why sessions ran long" below, the "Token budget" section of `CLAUDE.md`,
`docs/workflow.md`, `.claude/agents/implementer.md`, `.claude/hooks/session-length.mjs`.
When: once a week at most, or once "Why sessions ran long" has three or more new lines since the last review. Not in between.
Time box: one short session, no more than about six steps. When the checklist is done, stop; don't audit the audit.
Weekly checklist:
1. Run `/context` in a fresh session and note the startup tokens (it was about 81k on 2026-10-23: tools 38k, MCP 21k, memory 5k). A rise of 10k or more means something new is loading.
2. Check the weekly usage figure and whether any limit was hit.
3. Skim the new "Why sessions ran long" lines for a cause that appears twice or more.
4. Change a rule only for a repeat cause; anything seen once stays a note.
5. Note what you reviewed and the date, then close the session.
Goal: look for causes that repeat, and change a rule only for those; a cause seen once stays a note.
Check whether the 250k-token reminder fires at the right moment (it was a 1 MB transcript size
until 2026-10-23; tune it with `SESSION_REMIND_TOKENS`). Compare the token totals and the minutes the dated lines quote, not just their causes: a session can be cheap in tokens and still slow (long agent runs, full checks), and the fixes differ. Use the `explain-usage` skill on a session only if a cause is unclear. Mark the
lines you reviewed with the date.
Starting prompt:
```
Read "Why sessions ran long" in docs/next-sessions.md and the Token budget section of CLAUDE.md, find the causes that repeat, and propose rule changes for those only.
```

## Why sessions ran long

One dated line per long session, added when the split is written up (the session-length hook asks for
it). Not a menu entry; the review session above reads it.
Each line should also say where the minutes went: per agent run (the task notification gives its
duration), each full check, and how many ran in order versus alongside. Older lines have tokens only.

- 2026-10-22, Nosing around grid and dog: one session did design plus four builds. Briefs bundled
  engine and UI, the dog tuning took three rounds instead of one sweep, and follow-ups were piled onto
  a 200k-token agent. Rules added: small briefs, measure first, split after the first piece lands,
  reminder lowered to 700 KB.
- 2026-10-22, Faster e2e from saved state: the timing experiments (five full runs and a trace) and
  the review of the agent's work ran in the main session instead of a fresh one.
- 2026-10-22, Portraits (player and cat mockups): reading the Design canvas (its type instructions
  and the full reference board) filled about 90k of a 111k context before any drawing; two drawing
  rounds. Totals: 14 replies, 1.2M read from cache, 56k written, 13k output, transcript 1.1 MB.
- 2026-10-22, Nosing board polish (icons, key, encounter card, shorter boards): the board code was
  read in the main session before the design questions, and two implementer hand-backs were reviewed
  here on one task. Totals: main 22 replies, 2.1M read from cache, 60k written, 14k output, context
  115k; subagents (2) 60 replies, 4.4M read from cache, 165k written; transcript 1.0 MB.
- 2026-10-23, Houses (plumbing, nosing per house, rotation and new shapes): the main session stayed small
  but the wall clock did not. Minutes: plumbing agent 6, nosing-per-house agent 24.5 (61 tool calls, 105k
  tokens), `check-cases --full` 7.6, rotation/long house/T lodge agent 49.6 (75 tool calls, 123k tokens; it reported no
  trouble; its stop rule arrived by message mid-run and was not needed). The steps ran in order on purpose (same files), so nothing overlapped. Causes: (1) tuning was
  inside the implementer's brief, so the agent built throwaway measuring scripts, ran them and rebuilt
  them (the diagnosis scripts were a copy of the real code, which can drift from it); (2) no progress
  signal: the main session cannot see an agent until it reports, so "slow" and "going in circles"
  look the same, and it feared the sweep said one thing while the implementation could never match;
  (3) mechanism problems (`enterMax`, the lodge's early stop) surfaced mid-tuning, which a data-only
  tuner would have had to hand back. Rules added to CLAUDE.md: tuning is its own brief with a
  grid sweep script on the real builders, a stop rule (two rounds without improvement means stop and
  write "stuck"), a progress line per round in the handoff file, `npm run checks` decides done, and
  "none passes" goes to the main session before a fresh implementer. The rotation agent's brief
  predated those rules, so its stop rule was sent mid-run by message. Open question for the review:
  does the split (tuner apart from implementer) cost more in re-reads than it saves? Compare this
  session's minutes with the first run that follows the new rule.
  The rotation agent's own retrospective (from memory, not measured): about 25% waiting on checks and
  e2e (quick `check-cases` ran 4 times at 65-90s, one sweep hit the 600s foreground limit), 20% tuning
  sweeps, 15% rework. Detours: stock 25 obstacles cannot fit a 40-square path (the handoff's "25 fit"
  note covered one house only); a dead-end library (one door on a 1-cell wall) failed 14 of 120
  builds; an explicit `undefined` override overwrote stock values (528 failures). It guessed the
  variant id grammar, mirror direction and grid swap. What would have helped: a ready tuning script
  taking house, length, turns and obstacles, with a time cap; a handoff line "the path needs about
  obstacles + ladders + snakes + 8 plain squares, and a room with one 1-cell door can only end the
  path"; and `check-cases --only nosing` so a tuning loop does not rerun the whole quick check.
  Mostly missing tools and unstated constraints, not unclear goals.
  Totals for the same session at 2.9 MB: main 155 replies, 25.3M read from cache, 301k written, 82k output,
  context 252k; subagents (6) 234 replies, 16.5M read from cache, 1.2M written, 186k output. What made it
  large: three agent runs of 24, 50 and 26 minutes (the last a prototype that ended in a no-go), and a design
  discussion that kept growing after the main goal was done. The no-go prototype cost about 115k tokens and
  26 minutes to learn that the slow part was the board length windows, not the search; a measurement of
  fill per house, done first, would have shown that in minutes.
