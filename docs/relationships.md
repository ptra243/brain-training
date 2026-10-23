# Relationships between characters

Design notes for making characters react to each other, without anything depending on the killer
(rule 5). Moved from `docs/next-sessions.md`. Status: ideas to settle with the owner, nothing built
beyond `Case.victim`. Related: `docs/theme-draft.md` (Follow-up threads, Model, the cast and the
who-knows-whom map), `docs/talk-threads.md` (trigger list, settled).

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
- The campaign opening (2026-10-23, `docs/campaign-opening.md`) also needs one short
  victim-relationship line per guest, said in their first conversation: make the thread's first beat
  work as that line.

## Quick play

Quick play stays puzzles first: guests are window dressing there, with loose lines and their own thread
only; no pair or victim threads. Its victim is named (`Case.victim`, 2026-10-22). Threads still are not
built on who it is.
