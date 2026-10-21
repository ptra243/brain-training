# Next sessions

Ideas for sessions to start fresh with `/clear` (or another terminal). Each has its own
`Last touched` date. A `SessionStart` hook (`.claude/hooks/stale-sessions.mjs`) shows these as a
numbered menu when a session starts (or after `/clear`): reply "start 3" and Claude runs that entry's
starting prompt. It also tells Claude to mention any entry untouched for 14 days or more and ask
whether to keep, update or drop it. Each `## Session:` heading is its menu line, so keep it short.

Keeping an entry current: when you work on one, or when its handoff docs change, update its
`Last touched` line (`YYYY-MM-DD`). Delete an entry once its session is done.

The list is a ranked backlog: the first entry is the next thing to do. Rank in tiers: (1) finished
work waiting to merge or ship, and anything that blocks other entries; (2) fixes and small wins;
(3) planned builds with a settled design; (4) design work; (5) exploratory ideas. Within a tier, put
first whatever unblocks other entries. **Re-rank an entry whenever you add it, rewrite it, or its
status changes** (built, blocked, unblocked, done): move it to its place, don't edit it where it
stands. A blocked entry keeps its rank and names its blocker in the heading.

## Session: Nosing around: number grid and the dog
Last touched: 2026-10-22
Reads first: `docs/nosing-around.md` ("Next build", then "Build spec" for the first build), then
`src/games/lock.ts`, `src/games/nosing.ts`, `src/game/games/NosingLock.tsx`.
Goal: the owner asked for this next. Build the shared number grid (rows, at most 3 numbers a row,
row-operator slots, live row and running totals, a solver for the grid's shape), move the lock onto it
(lock targets checked on the grid; storage prefix bump or reading old lock moves), then add the dog
fight on a snake head (tarot minor-arcana decks, operator deck, 3 lives each, beat for 1 or double for 2,
exact defence for an extra card, the dog picks a middle play she can answer). Settle the two "Still
open" items first, then split: grid and solver, lock UI, dog module, dog UI, `check-cases` additions.
The fill-in-the-blank speed round can follow in the same session if there's room.
Starting prompt:
```
Read "Next build" in docs/nosing-around.md, settle its open items with me, then split the number grid, the lock on the grid and the dog fight into implementer briefs.
```

## Session: Validate saved data
Last touched: 2026-10-21
Reads first: `docs/code-review-followups.md` section 4, `src/game/storage.ts`, `src/game/games/saveData.ts`.
Goal: saves are checked, not cast. A bad game record resets that game only; a bad field falls back to
its empty value. Decide Valibot or hand-written guards (Valibot needs installing on the owner's
machine), then delegate. Add node tests with malformed saves.
Starting prompt:
```
Read docs/code-review-followups.md section 4, help me pick Valibot or hand-written guards, then write an implementer brief with tests for malformed saves.
```

## Session: Exploration mode, phase 1
Last touched: 2026-10-21
Reads first: `docs/exploration-mode.md` (settled design), `src/game/CLAUDE.md`, `e2e/CLAUDE.md`, then
`CampaignView.tsx`, `Casebook.tsx`, `SuspectSheet.tsx` and `MapPanel.tsx`.
Goal: build-order step 1. In campaign rounds the map becomes the main screen: her marker, exclamation
marks on rooms with puzzles, a room list (things, puzzles, guests), the person screen with portrait and
talk, the time header ("10:30 (2 games left)") and card, one guess any time with the warning, and the
midnight lock. Quick play stays untouched; no case changes, no storage bump. Then the next-murder scene
(step 2) as its own small session.
Starting prompt:
```
Read docs/exploration-mode.md, write the implementer brief for build-order step 1 (exploration in campaign rounds), and hand it off.
```

## Session: Face to face, questioning the accused
Last touched: 2026-10-21
Reads first: `docs/face-to-face.md` (settled design), `src/engine/CLAUDE.md` (campaign, interrogations),
`src/game/CLAUDE.md`, then `src/engine/interrogation.ts`, `src/engine/campaign.ts`, `src/game/campaign.ts`.
Goal: in campaigns, accusing opens the finale questioning with the accused (only the killer lies), with
rotating closing lines; a wrong weapon now ends the round and a seeded innocent non-decoy is the next
body. Rounds that never hit the new path stay the same. Do piece 1 (the wrong-weapon rule) here, delegate
pieces 2 to 4. If exploration phase 1 lands first, the questioning plays before its next-murder scene.
Starting prompt:
```
Read docs/face-to-face.md, build piece 1 (wrong weapon ends the round) here, then brief the implementer on pieces 2 to 4.
```

## Session: Theme content, tarot cast and line pools
Last touched: 2026-10-20
Reads first: `docs/theme-draft.md`. Best after "The cast", which fixes the roles.
Goal: the line pools and shared tangents are drafted. What's left is content only (no engine code):
fix lines that break rules 2 and 3 (times such as "all night", "for hours"), write the 4 extra
next-door tangents, lines for the six extra cards, the missing card + object and follow-up threads,
and pick the tone. Also make borrowed cards sound natural:
- Audit every role-neutral line against each role that may borrow that card. Some only fit the home
  role (the Emperor's "I've given the orders for years" is tagged N but needs someone in charge); retag as B.
- Write 1 or 2 bespoke lines per role + secondary card pairing (about 15 to 20 lines in all, e.g. the
  Gardener with the Devil: "Everything in that garden owes me something.").
- Explore a hostile reading: a cold or curt night as its own line pool ("Ask someone else. Or don't.").
  Rolled the same way for everyone, so the killer is no more likely to be hostile (rule 5). Hostile
  means rude, never lying (every clue is true), and no barbed lines aimed at one person unless any
  suspect can say them about anyone.
Starting prompt:
```
Read docs/theme-draft.md, fix the lines that break rules 2 and 3, audit the neutral lines against borrowing roles, then draft the six extra cards and the missing card + object threads.
```

## Session: Talk and threads, part B
Last touched: 2026-10-21
Reads first: `docs/talk-threads.md` (settled design and the implementer brief), `src/game/CLAUDE.md`,
`src/engine/CLAUDE.md`, `e2e/CLAUDE.md`.
Part A is built (2026-10-21, placeholder lines in `src/content/talk.ts`). Start this after the Theme
content session has written the real lines.
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
Then code: chapters in the campaign thread slot, ranks saved as her moves, and the named first victim
(the 8th guest in `campaignCast`).
Starting prompt:
```
Read the Guest pool and Confidants sections of docs/theme-draft.md, then help me write the 5-chapter arcs, victim openings and endings.
```

## Session: Relationships between characters
Last touched: 2026-10-21
Reads first: `docs/theme-draft.md` (Follow-up threads, Model), the cast and who-knows-whom map from
"The cast" session. The trigger list is settled in `docs/talk-threads.md`.
Goal: make characters react to each other, without anything depending on the killer (rule 5). Explore:
- Card pairs: tarot pairs (Emperor and Empress, Magician and High Priestess, Devil and Lovers) open a
  thread between the two people holding them ("{other} won't look at me tonight").
- Hand-picked pairs, not every combination (21 pairs × 4 reading combinations for the core 7 cards is
  about 250 lines, mostly never seen). Start with 4 to 6 pairs whose roles already suggest a story: Host +
  Hostess (the marriage), Elder heir + Younger heir (rivals for the house), Host + Elder heir
  (succession), Host + Uncle (the old quarrel), Host + Financier (debt), Detective + Conjurer (the one
  who sees through tricks and the one who makes them). A pair thread only comes up when both are seated
  (10-guest pool, 7 seated). Beats 1 and 2 are
  shared; the two readings pick only beat 3 (both upright: they make up; both reversed: they fall out
  for good; one of each: only one of them still cares). Check how a pair thread fits with "one thread
  per suspect" in `docs/talk-threads.md`.
- Shared card: two suspects can't share a home card (tarot mode labels would clash), but they can
  share tonight's secondary card. Their upright/reversed rolls decide how it goes: both upright,
  kindred spirits; both reversed, rivals who are too alike; one of each, one-sided. Aim for about one
  case in three having a pair; start with the 4 or 5 most borrowed cards (about 3 lines per type each).
- A `heard` trigger: hearing about B from A opens B's next beat ("The Financier has been very generous
  lately" opens the Financier's thread). It uses only what she has seen, so it's safe.
- No alibis: relationship lines say how people feel, never where they were or when (rule 3; a witness
  never vouches for themselves).
Starting prompt:
```
Read the "Relationships between characters" entry in docs/next-sessions.md and docs/theme-draft.md, then help me design card-pair and shared-card threads and the heard trigger.
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
`CLAUDE.md`), `src/engine/CLAUDE.md`, `src/engine/campaign.ts`, `src/game/campaign.ts`.
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

## Session: Target or another word game (exploratory)
Last touched: 2026-10-21
Reads first: `src/games/CLAUDE.md`, `scripts/build-words.ts`, `src/games/dictionary.ts` and
`src/game/games/WordleGame.tsx` (how the guess list is fetched).
Goal: design, then build, a Target-style game (a 3×3 grid around one 9-letter word, find 4+ letter
words that use the centre letter), or another word game if that fits better. Proposed approach:
- Two lists. Guesses are checked against a big list: `build-words.ts` also writes
  `public/words-4-9.txt` (the old 4–9 filter on `word-list`) and Wordle keeps its 5-letter file.
  The puzzle is built from a common-word list generated from SCOWL tiers (`wordlist-english`
  on npm; install it on the owner's machine), 4–9 letters, no proper nouns, plus a small blocklist.
  It is committed to `src/content/` and lazily imported by the game.
- The seed 9-letter word comes from the most common tiers only, and never a room, suspect or item name.
- Goals, the Solve answer and the cat's hints come from the common list. A guess that's only in the big
  list counts as a bonus word, not toward the goals.
- Editing the common list changes cases: bump the storage prefix in `src/game/storage.ts`, and add a
  golden test (one seed, its word and goal counts).
Settle first: Target or another game, goal levels, what the clue reward is, and whether it joins the
case rotation.
Starting prompt:
```
Read the "Target or another word game" entry in docs/next-sessions.md and help me design the game: confirm Target or pick another, settle goals, hints and the clue reward, then plan the two word lists.
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
Last touched: 2026-10-20
Reads first: `src/engine/CLAUDE.md` (one solution, own seed stream, interrogations, campaign),
`src/engine/clues.ts`, `src/engine/solver.ts`, `src/engine/search.ts`, `src/engine/wording.ts`.
Low priority: only if hard cases feel too easy.
Idea: a new optional hard logic level where everyone tells the truth except the killer, and everything
the killer says is false. She reasons "if the Butler did it, their story is false; does that still fit?"
It's the one form of casebook lie that stays fair. Lies inside a minigame (the interrogation) already exist
and are unaffected; outside this level, "every clue is true" stays.
Explore and settle:
- Clue model: testimony becomes a claim ("the Butler says X"), evidence stays fact. How the casebook
  shows claims; whether "a witness never vouches for themselves" still holds or the lie replaces it.
- Solver: try each suspect as the killer with their claims negated; exactly one suspect must fit, with
  a minimal clue set. Cost for 7 guests (already needs `search.ts`).
- Fairness: the killer must make at least one claim she can prove false, so she never has to guess.
- Scope at first: no case board, no campaign; how map and grid hints treat claims.
- New level on its own seed stream, after the existing draw; presets, campaigns and the golden
  snapshot stay unchanged. `check-cases` covers the new level.
Starting prompt:
```
Read "The killer lies" entry in docs/next-sessions.md and src/engine/CLAUDE.md, then help me decide whether it's worth building and sketch the clue model and solver change.
```
