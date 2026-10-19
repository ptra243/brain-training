# Tell me again: settled design

Status: designed in chat, not built. This replaces the earlier "Tell me again" text in the
"Questioning variants — Build Plan" doc. Intended to be pasted into that doc, then this file deleted.
Related: `docs/theme-draft.md` (tangent and motive lines).

A memory-flavoured questioning style, the light one. One suspect, 5 questions, all asked, so no gamble.

## How it plays
1. **First telling: a picture slideshow, not text.** She asks the 5 questions. Each answer appears as one
   snapshot for a few seconds: the suspect's counter on the room's colour, plus a weapon token.
   - Negative fact ("never touched the candlestick"): the token with a red-pencil cross over it.
   - Next door: two counters either side of a wall.
   - Where something was: the token on a coloured room tile.
   - Captions are 5 words or fewer. After the fifth, all five snapshots turn face down.
2. **Retelling: a conversation.** The same five questions appear as short chips ("The Hall?"). She taps them in
   any order (so the order does not match the slideshow). Each tap: typing dots (tap to skip), then one bubble:
   the answer in new words plus a short tangent. About 25 words or fewer, about three lines at 360px.
   She must ask all five. The chat log scrolls and stays; she can reread it as much as she likes.
3. **Her answer is a picture.** After all five are asked, she taps the face-down snapshot whose fact the
   retelling changed. It flips up, the suspect confesses, and the case is marked won.

## No fail state
- Wrong tap: the cat says "Not that one." The snapshot stays face up and greyed out. The hint counter goes up by one.
  The story is not highlighted.
- No strikes, no cap. With 5 snapshots she can always finish. The counter is a record only and does not change the reward.
- Solve button as everywhere (`Dialog`, "Are you sure? This can't be undone"): reveals the answer, still unlocks the
  clue, recorded as `revealed`.

## Hint button (a ladder; each press adds to the counter)
1. Peek: one snapshot the lie isn't turns face up for a few seconds.
2. Show a match: the cat highlights the bubble that matches one innocent snapshot.
3. Narrow: the cat rules out snapshots until two are left.
4. Point: the cat highlights the bubble holding the lie, without saying which snapshot it belongs to.
The cat never names the lie.

## Difficulty
- Easy: one answer changed (the lie flips to the truth).
- Medium: the lie flips to the truth, and one true answer is reworded to sound different (a decoy).
- Hard: two answers change: the lie, and a true answer that swaps in a different true detail. One pinned evidence
  card disproves the lie's first telling and not the other. The swap should be negative-to-negative
  ("no poison in the Bedroom" to "no poison in the Study") so it does not hand out a free positive fact.

## Reward
The confession. On medium and hard the corrected answer also joins the casebook.

## Fairness and checks
- Meaning is judged by the underlying fact, never by wording. Each reply is `{fact, answer clause, tangent}`;
  the solver confirms exactly one fact changed (two on hard) and the evidence card disproves only the lie.
- Tangent rules (full list in `docs/theme-draft.md`): topic-related or dinner/weather; may hint at a motive for
  the speaker or someone else; never says where anyone was, what they held, or when; never changes the meaning of
  the answer clause; no seating or time; nothing outdoors.
- Watch for surface tells: only the lie changes polarity ("never touched" to "in my hands"). On medium the decoy
  needs a similar surface change. Lies in the current generator are often positive facts while true answers are
  mostly negative, so check the distribution.
- `wording.ts` has one template for some fact types; each needs 2 to 3 phrasings to reword.
- Rolling uses its own seeded `Rng` stream. Adding the style to the rotation changes existing cases and
  `generate.test.ts` asserts the rotation set; keep it off by default, or bump the storage prefix. Dump and diff.
- Weapons have only a name in content; each needs an icon field for the snapshots.

## Wiring
The style picker covers the campaign too (third questioning style). Open question carried over: should the
current spot-the-lie game get pinned evidence and 4 questions instead of 8? I lean yes to pinned evidence,
no to cutting questions without playtesting.

## Open
- How the picture slideshow looks (tableau art, timing, tap to advance).
- Layout at 360px: chips, bubbles, five snapshots, hint and Solve all on one phone screen.
- The unlock and the hint-peek feel.
