# Theme content: plan

Status: planned 2026-10-26, nothing done yet. Follows `docs/theme-draft.md` (rules for the lines, the cast,
the tarot layer) and `docs/talk-threads.md` (sets, threads, moods).

## Where things stand (counted 2026-10-26)
- `src/content/talk.ts` has all 15 cards. Each reading has 6 loose lines (neutral + bound) and 2 card
  threads, except the Magician, Chariot, Sun, Justice and Moon, which have 1. Most threads are a first pass.
- Drafted only in `theme-draft.md`, not in code: 20 borrowed lines, 17 card + object pairs, 11 cold greetings.
- In code as placeholders: `greetings` (2 cold, 3 warm), `faceLines` (4 pools of 8), `victimLines`
  (4 types x 2) and the `opening` copy.
- There are now 6 weapons (knife, rope, candlestick, wrench, poison bottle, vase). The last two have no
  object threads.

## Decided 2026-10-26
- **`talk.ts` is the only copy of the lines.** The owner reviews them as a diff. Once the drafted lines are
  copied in, `theme-draft.md` drops its line lists and keeps the rules, cast table and design.
- **Card + object threads: 3 objects per card**, so 45 pairs (28 new), each with an upright and a reversed
  3-beat thread. Spread them so each object has 7 or 8 cards, including poison bottle and vase.
- **Greetings are rolled per guest**: a curt first and a softer second cold greeting from two pools, and a
  warm one from a pool, all from the sets `Rng`, never from the killer. The ladder length stays the same.
- **Borrowed lines are wired up**: a per guest + card table in `talk.ts`. When a guest borrows that card, its
  line joins their pool. These lines are bound (that guest only).

## Targets
| Pool | Now | Target | New lines |
|---|---|---|---|
| Loose lines, 10 home cards | 6 per reading | 10 per reading | 80 |
| Loose lines, 5 extra cards | 6 per reading | 8 per reading | 20 |
| Card threads | 1 or 2 per reading | 2 per reading, all polished | 10 threads (30 beats) |
| Card + object threads | 0 in code | 45 pairs | 28 pairs (168 beats) |
| Greetings | 2 cold, 3 warm | 6 first-cold, 6 second-cold, 6 warm | about 13 |
| Opening and face lines | placeholders | polished | a pass |

## Relationships (part C) overlap
Victim threads, pair threads and shared-card threads belong to the Relationships session
(`docs/relationships.md`, `talk-threads.md` part C). They join each guest's chain beside the card thread, so
the content doesn't clash. Three things to keep apart:
- **Victim lines are not polished here.** Part C replaces the placeholder `victimLines` with victim threads
  (4 types x 2 readings x 3 beats, beat 1 is the opening line).
- **Shared files.** Both edit `src/engine/sets.ts` and the talk content. Step 1 creates empty
  `talk/victims.ts` and `talk/pairs.ts` for part C. Part C's design can happen any time; its build starts
  after step 1 here has landed.
- **One storage bump if possible.** Each prefix bump discards her saved progress, including a campaign in
  progress. Land this, part B and part C under one bump where the timing allows, and otherwise bump only
  when she's between campaigns.
- Part C's writer uses the same style sheet (`.claude/handoff/theme-lines.md`), so the voices match. The
  four drafted pair threads are placeholder voice.

## Steps
1. **Code (implementer, Sonnet).** Split `talk.ts` into `src/content/talk/<card>.ts` (one file per card,
   readings plus its object threads) and `talk/index.ts` (suspects, borrowed lines, greetings, opening), so
   writers can work in parallel without touching the same file. Add the `objectThreads` and `borrowed` types,
   the greeting pools and the roll in `src/engine/sets.ts`, and borrowed lines in the roll. Copy the drafted
   20 borrowed lines, 17 object pairs and 11 cold greetings in as they are. Add a content lint test: no
   content names (suspects, rooms, weapons, cards), no time words ("all night", "o'clock", "hours"), no line
   used twice, every `{placeholder}` known. Object threads are stored only. The `object` trigger is part B.
   Also create empty `talk/victims.ts` and `talk/pairs.ts` for part C.
2. **Writing (Opus, in parallel).** One style sheet in `.claude/handoff/theme-lines.md`: the rules from
   `theme-draft.md`, the tone (cosy-mystery comedy, dry asides, never lying, never naming a card) and 6
   example lines. Four writers, each with its own files:
   - A: Emperor, Empress, Hierophant, Magician, High Priestess
   - B: Devil, Hermit, Chariot, Sun, Justice
   - C: Lovers, Star, Death, Hanged Man, Moon
   - D: greetings, opening copy, face lines (`talk/index.ts` only; not victim lines, see below)

   A to C each bring their cards' loose lines and threads to target, polish the first-pass threads, and
   write their cards' object pairs (an object table fixed in step 1 says which 3 objects each card gets).
   A neutral line must fit every guest who can roll that card (the "who rolls each card" list).
3. **Review (main session).** Run the lint test, read one card per writer for tone, and send fixes back to
   the same writer. The owner reads the diff a card at a time.
4. **Land.** `npm run checks`, then bump the storage prefix in `src/game/storage.ts`, because new pools change
   which lines and thread an in-progress campaign rolls. Part B's harder cold questioning games change cases
   too, so land them under the same bump if part B is ready. Then trim `theme-draft.md`.

## Improvement, after steps 1 to 4 land
**Prequel and cast sheets (one Opus writer; owner reviews), then a revision pass.** A short story (4,000
to 6,000 words) of an earlier gathering at the house, years before tonight, with all ten guests and no
murder: where the old quarrels, debts, fondnesses and secrets started. From it, a half-page sheet per guest
(history, what they want, a secret, how they talk, what they are to each other guest) and a short house
history, in `docs/prequel.md` and `docs/cast-sheets.md`. The prequel becomes canon for Relationships,
"Everyone has a secret" and Confidants. Then revise the bound lines, borrowed lines and home-card threads to
draw on it.
- It never describes tonight: no seating, rooms, objects held or times for this evening, no victim or
  killer (rules 1, 3 and 5). Tonight is generated per case.
- Lines may retell its incidents as hearsay. Card-neutral lines and card threads stay generic (they must
  fit every guest who rolls the card).
- Guests may remember the same incident differently, as long as each version is still true.
- Maybe later: she could read the prequel, for example unlocked after her first campaign (not decided).

## Still open
- How tarot mode unlocks, and card names on counters at 360px: wait for tarot mode.
- Card + object threads: check rule 8 (never tappable), and that none reads as a hint about the real weapon,
  in the step 3 review.
