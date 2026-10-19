# Theme draft: dinner party, hidden tarot layer

Status: draft, nothing built. Decided in a design chat; the cast and lines below are a first pass to judge tone.
Related: `docs/tell-me-again.md` (the minigame that uses the tangent lines).

## Premise
A dinner party at a large estate. Time period agnostic: no phones, modern slang, dates or named events.
The murder happens after dinner. Everyone is staying over because of the weather, so nobody came or went:
one of the guests did it. After dinner the guests drift into different rooms, holding different things.
CLAUDE.md still says the theme is placeholder; update that line when this is chosen.

## The player
The Fool, the unnumbered tarot card: the innocent wanderer with a little dog. The house cat that gives hints
(`cats` in `src/content/`) is the Fool's dog. The Fool is never a suspect.

## Hidden tarot layer
- Each suspect has an everyday name and role (the Butler) and a hidden **home card** (the Hierophant).
- Home cards are unique per suspect. Tarot mode shows only the home card, so there are no duplicates.
- **Normal play shows no card.** The card only decides which motive and tangent lines a suspect can roll.
- **Tarot mode changes labels only**: card names instead of roles, the cat as the Fool's dog. It must not
  change which lines were rolled or the generated case. Test: same cases with the mode on and off.
- Each suspect also has a short list of **secondary cards** whose lines they may roll. A butler can draw
  Emperor lines (complaining things aren't done properly). Line pools belong to the card, not the suspect.
- Roll weights: home card about 60 to 70%, the rest from secondaries.
- **Upright or reversed** is rolled per suspect per case. Reversed is the darker side of the same card.
- Content fields needed per suspect: `card`, `mayAlsoRoll`. Per card: two line pools (upright, reversed),
  each split into role-neutral lines (any suspect with the card may use them) and role-bound lines (home suspect only).
- How she unlocks tarot mode is open: earned after N cases, discovered (tap the cat), or a plain setting.

## Rules for the lines
1. Motive lines are background, never case facts. They never say where anyone was, what anyone held, or when.
2. No suspect, room or weapon names in a tangent unless the answer it sits in already names them.
3. No seating, who was beside whom, or times. Dinner food and weather are fine. Nothing outdoors.
4. Never name a card in normal play. Lines imply the card ("He liked things done his way").
5. Lines are fixed by who the suspect is and the roll; never by who the killer is.
   Test: the killer is not an outlier in reversed rolls or in motive lines.
6. A tangent never changes the meaning of the answer it follows. Fact checks look at the answer clause only.
7. Within one case a given line is used once; the second draw re-rolls.
8. Motive lines are not clues: never in the casebook, never tappable.
9. Lines about someone else need a `{other}` placeholder in `wording.ts`; not drafted yet.
10. Rolling uses its own seeded `Rng` stream so existing cases do not shift. Dump and diff before and after.

## Draft cast (placeholder roles; first-person lines, no pronouns)

**The Host: The Emperor.** Master of the estate; everything runs by their say-so.
- Upright: "Somebody has to keep this household in order." / "Every guest here eats at my table. I like to think that counts for something." / "I've never asked for thanks. Only that things be done properly."
- Reversed: "I'll not be told how to run my own house." / "They all expect me to pay, and none of them to ask." / "Order matters. Some people just don't seem to understand that."

**The Hostess: The Empress.** Generous, fond of comfort, protective of the family.
- Upright: "I only ever wanted everyone fed and happy." / "A house like this should feel like a home, not a museum." / "I've always looked after my own."
- Reversed: "I give and give, and see what it buys me." / "Some here would like to see me out of this house." / "It's hard being generous when everyone expects it."

**The Solicitor: The Hierophant.** Keeper of the family's papers and its proprieties.
- Upright: "There's a right way of doing things, and it's usually written down." / "I know where every document is kept. That's all I'll say." / "Tradition holds a house together, you know."
- Reversed: "Rules are only as good as the person reading them." / "I've been asked to look the other way more than once." / "It isn't my place to say what the papers really contain."

**The Conjurer: The Magician.** A guest with quick hands and a quicker tongue.
- Upright: "Give me a pack of cards and I'll make a room full of friends." / "A good trick is about making them look the other way." / "I'm only here to entertain, truly."
- Reversed: "People believe what they want to. It's rather useful." / "I've told a few stories tonight, and not all of them quite true." / "A little sleight of hand never hurt anyone. Usually."

**The Housekeeper: The High Priestess.** Quiet, watchful; knows what the house keeps to itself.
- Upright: "I notice things. It's rather what I'm for." / "A house has secrets, and I'm the one they trust." / "Some things are better left unsaid."
- Reversed: "I've kept this family's secrets for years, and got little for it." / "I know more than I ought, and they know it." / "Silence has a price, and nobody's paying."

**The Financier: The Devil.** Lends freely and remembers every debt.
- Upright: "Everyone here wants something. I simply make it possible." / "I never forget a favour, or a debt." / "It's only business, my dear."
- Reversed: "I've done things I'd rather this house didn't hear of." / "I'm trying to put old dealings behind me, believe it or not." / "Some debts can't be settled the way they used to be."

**The Uncle: The Hermit.** Keeps to the margins; has an old quarrel with the family.
- Upright: "I prefer my own company, and the quiet that comes with it." / "Age teaches you who to trust. Not many, in the end." / "I don't need much from anyone here."
- Reversed: "Nobody here ever asked how I was." / "I've held my tongue for years, and see where that got me." / "They'd all rather I'd stayed away."

Other cards for variety: the Lovers (secret engagement), Justice (a judge guest), the Moon (deceiver), the Star
(actress), Death (the doctor, with a wink), the Hanged Man (failed investor). The Tower is the storm.

## Shared tangents (any suspect, tagged by what the question is about)
- Dinner: "The soup was cold by the time it reached me." / "Someone left half the pudding, I noticed." / "The wine was far too good to waste on an argument."
- Weather: "That wind's been at the windows all night." / "The lights flickered twice during the toast." / "I've never heard rain like it."
- Room: "That room always did have a draught." / "The fire in there was low as ever." / "Terrible smell of polish in that corridor."
- Object: "Heavier than it looks, that." / "It's been in the family longer than I have." / "Someone's always fussing over it."
- Next door: "These walls are thin, you know." / "You hear everything in this house."

## Open
- Tone: warm with a little bite (this draft), funnier, or darker.
- How tarot mode unlocks.
- The pool needs to be larger: about 6 lines per card per reading, role-neutral lines marked, plus about 40 shared tangents.
- Ids: reuse the old placeholder ids (saves load, wrong lines) or bump the storage prefix in `src/game/storage.ts`.
- Name length of cards on counters at 360px (High Priestess, Hierophant); check before committing.
