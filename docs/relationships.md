# Relationships between characters

Design notes for making characters react to each other, without anything depending on the killer
(rule 5). Moved from `docs/next-sessions.md`. Status: ideas to settle with the owner, nothing built
beyond `Case.victim`. Related: `docs/theme-draft.md` (Follow-up threads, Model, the cast and the
who-knows-whom map), `docs/talk-threads.md` (trigger list, settled).

The feelings grid below is new (2026-10-29) and built on `docs/story.md` (the chocolate company, the
new cast). The sections after it predate that cast; redo them from the grid when they are picked up.

## How they feel about each other (draft for the owner)

Each guest has one feeling about each other guest. Feelings can be one-sided.

- **F** fond, **·** fine, **W** wary, **R** resent.
- **The card shades it**: upright, the guest feels what the grid says; reversed, one step colder
  (F→·, ·→W, W→R; R stays R). The same Uncle is wary of someone in one case and resents them in the next.
- **Nothing here depends on the killer.** The killer is drawn separately, so a guest who resented the
  victim is no likelier to be guilty than one who loved them. A feeling sets the tone of a line, never a clue.

Read across: how the guest on the left feels about each guest along the top.

| | Host | Hostess | Fixer | Investor | Housekpr | Acctnt | Uncle | Elder h. | Younger h. | Detective |
|---|---|---|---|---|---|---|---|---|---|---|
| **Host** | | F | F | W | · | · | R | · | F | R |
| **Hostess** | W | | · | · | F | · | F | F | F | F |
| **Fixer** | F | · | | W | W | W | · | F | F | · |
| **Investor** | · | · | W | | · | W | · | · | · | W |
| **Housekeeper** | W | F | W | W | | · | F | F | F | · |
| **Accountant** | · | · | W | W | · | | · | · | · | W |
| **Uncle** | R | F | W | · | F | · | | · | F | W |
| **Elder heir** | W | W | R | · | F | · | W | | W | · |
| **Younger heir** | W | F | F | · | F | · | F | F | | · |
| **Detective** | W | F | W | W | · | W | · | · | · | |

Why the strong ones:
- **Host**: fond of the son despite the row, only "fine" with the daughter who does the work (that is
  the prejudice, unspoken). Resents the Uncle, and the Detective the Hostess invited; wary of the Investor's offer.
- **Hostess**: wary of the Host over the credit, after thirty years. Fond of the Uncle: something old. Fond of the Detective, and invited them knowing the Host would hate it.
- **Fixer**: fond of both heirs, who grew up around them, though the Elder heir resents the Fixer back.
  Wary of everyone else who knows things (Housekeeper, Accountant, Investor).
- **Investor**: charming to everyone, wary only of those who could spoil the deal.
- **Housekeeper**: raised the heirs; kept in touch with the Uncle; wary of the Host and the Fixer.
- **Accountant**: close to nobody. Wary of anyone who might look at the numbers.
- **Uncle**: resents the Host; fond of the Hostess, the Housekeeper and the son who also walked away.
  Wary of the Fixer, who got the place that might have been the Uncle's.
- **Elder heir**: resents the Fixer; wary of the Host, the Hostess ("be patient"), the Uncle (the
  "eldest son" remarks) and her brother (not his fault). Fond of the Housekeeper, who raised her.
- **Younger heir**: fond of nearly everyone; wary of the Host since the row.
- **Detective**: wary of the Host, whose company they once investigated; fond of the Hostess, the old friend who invited them. Wary of anyone who might know what happened back then.

### What it drives
- **The reaction to the death**: picked by how the guest feels about the victim (after the card
  shift): F from a fond pool, · from a polite pool, W or R from a cold pool. Pools in `docs/story.md`;
  the polite pool is still to write.
- **Whether a guest starts warm with her** is unchanged: reversed guests start cold. She is the
  stranger, so the grid is not about her.
- **Later**: pair threads, and what guests say about each other, lean on the same grid.
- **To check when built**: talk sets are built from a seed, never from a `Case`; the victim's id comes
  from the seating shuffle, not the killer, so passing it in keeps that rule.

## Card pairs

Tarot pairs (Emperor and Empress, Magician and High Priestess, Devil and Lovers) open a thread between
the two people holding them ("{other} won't look at me tonight").

Hand-picked pairs, not every combination (21 pairs × 4 reading combinations for the core 7 cards is
about 250 lines, mostly never seen). Start with 4 to 6 pairs whose roles already suggest a story:
- Host + Hostess (the marriage)
- Elder heir + Younger heir (rivals for the house)
- Host + Elder heir (succession)
- Host + Uncle (the old quarrel)
- Host + Financier (debt)
- Detective + Conjurer (the one who sees through tricks and the one who makes them)

A pair thread only comes up when both are seated (10-guest pool, 7 seated). Beats 1 and 2 are shared;
the two readings pick only beat 3 (both upright: they make up; both reversed: they fall out for good;
one of each: only one of them still cares). Check how a pair thread fits with "one thread per suspect"
in `docs/talk-threads.md`.

## Shared card

Two suspects can't share a home card (tarot mode labels would clash), but they can share tonight's
secondary card. Their upright/reversed rolls decide how it goes: both upright, kindred spirits; both
reversed, rivals who are too alike; one of each, one-sided. Aim for about one case in three having a
pair; start with the 4 or 5 most borrowed cards (about 3 lines per type each).

## The `heard` trigger

Hearing about B from A opens B's next beat ("The Financier has been very generous lately" opens the
Financier's thread). It uses only what she has seen, so it's safe.

## No alibis

Relationship lines say how people feel, never where they were or when (rule 3; a witness never vouches
for themselves).

## Victim threads (owner, 2026-10-22; campaign only)

Each seated guest has a thread about how they knew the victim, the whodunit "everyone had a reason".
- Fixed by who the guest is and who died, never by the killer, and every guest gets one so the killer's
  doesn't stand out (rule 5).
- Victims get no roll of their own: round 1's is the next guest in the seating shuffle (built
  2026-10-22, the 8th in a campaign), rounds 2 and 3 are her wrong accusations, so a victim thread gives
  nothing away.
- Proposed size: a few relationship types (owes them money, old rival, secret fondness, family), each a
  2 or 3 beat thread per reading with `{victim}`; the pair's type comes from the who-knows-whom map or
  the cards, not 90 hand-written pairs.
- Decide how it shares the thread slot with the guest's own thread.
- `docs/secrets.md` (2026-10-25) proposes a secret per guest whose tell follows the victim thread in the
  chain; settle the two together.
- The campaign opening (2026-10-23, `docs/campaign-opening.md`) also needs one short
  victim-relationship line per guest, said in their first conversation: make the thread's first beat
  work as that line.

## Quick play

Quick play stays puzzles first: guests are window dressing there, with loose lines and their own thread
only; no pair or victim threads. Its victim is named (`Case.victim`, 2026-10-22). Threads still are not
built on who it is.

## Alongside the theme content work
The Theme content session (`docs/theme-content.md`, planned 2026-10-26) fills the card pools at the same
time. To keep the two apart:
- A prequel and cast sheets (`docs/prequel.md`, `docs/cast-sheets.md`) are planned as its improvement
  step, after the main work. If they exist by then, draw pair and victim threads from them.
- Victim threads are written here. Theme content leaves the placeholder `victimLines` alone.
- Build after its step 1 lands: it splits the talk content into `src/content/talk/` and creates empty
  `victims.ts` and `pairs.ts` for this work, and it changes `src/engine/sets.ts` too. Design can start any time.
- Use its style sheet (`.claude/handoff/theme-lines.md`) for the final pair and victim copy.
- Share one storage prefix bump with it and part B if the timing allows. Each bump discards her saved
  progress, so otherwise bump only when she's between campaigns.
