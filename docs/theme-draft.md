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
- **Wandering cards** (the Moon; maybe the Lovers): no suspect holds one as a home card. Each case deals it
  to one suspect as an extra secondary card, from its own seeded `Rng` stream, never from who the killer is.
  Its lines are role-neutral only (dreams, half-truths, "I'm not sure what I saw"). Fixed home cards are
  known after one game in tarot mode, so a twist story ("not who they claim to be") would surprise once;
  "who is the Moon tonight?" is new each case. Test: the holder is the killer no more often than chance.

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

Marking: **N** = role-neutral (any suspect rolling this card may use it), **B** = role-bound (home suspect only).
Six lines per card per reading. Tone so far: warm with a little bite.

### Guest pool: 10 guests, 7 seated
Decided 2026-10-21. The pool is 10 guests with unique home cards; each case seats 7.

| Guest | Home card | Lines |
|---|---|---|
| The Host | Emperor | drafted |
| The Hostess | Empress | drafted |
| The Butler | Hierophant | drafted (was the Solicitor) |
| The Conjurer | Magician | drafted |
| The Housekeeper | High Priestess | drafted |
| The Financier | Devil | drafted |
| The Uncle | Hermit | drafted |
| The Elder heir | Chariot | to write |
| The Younger heir | Sun | to write |
| The Detective | Justice | to write |

- Seating needs no engine work: `campaignCast` and `generate.ts` already shuffle `content.suspects` and
  take the first 7 (or the level's count), from the case ref, before the killer is picked. Adding 3 guests
  to content changes cases, so bump the storage prefix with the theme.
- Role labels can depend on who is seated, never on the killer: with both heirs seated they're the elder
  and younger child; with one, that one is "the Heir".
- Pair threads (see `docs/next-sessions.md`, Relationships) only come up when both guests are seated.
- Open: should any guest always be seated (the Host: it's their house)? That would be engine work.

### The Host: The Emperor
Master of the estate; everything runs by their say-so.
- Upright
  - B: "Somebody has to keep this household in order."
  - B: "Every guest here eats at my table. I like to think that counts for something."
  - N: "I've never asked for thanks. Only that things be done properly."
  - N: "I like a plan, and I like it followed."
  - N: "Rules exist so that nobody has to make a scene."
  - B: "In my house, nobody goes without. That is simply how it is done."
- Reversed
  - B: "I'll not be told how to run my own house."
  - B: "They all expect me to pay, and none of them to ask."
  - N: "Order matters. Some people just don't seem to understand that."
  - N: "I've given the orders for years, and see how few are heeded."
  - N: "Being obeyed is not the same as being respected. I know the difference."
  - B: "A host's patience is not a bottomless cellar."

### The Hostess: The Empress
Generous, fond of comfort, protective of the family.
- Upright
  - N: "I only ever wanted everyone fed and happy."
  - B: "A house like this should feel like a home, not a museum."
  - N: "I've always looked after my own."
  - N: "A kind word costs nothing, and it goes a long way."
  - B: "There's always a spare bed and a warm plate in this house."
  - N: "I can't bear to see anyone go without."
- Reversed
  - N: "I give and give, and see what it buys me."
  - B: "Some here would like to see me out of this house."
  - N: "It's hard being generous when everyone expects it."
  - N: "Kindness is wasted on some people."
  - N: "I've fussed over a few people too much, I suppose. They never minded the cake."
  - B: "A home can feel like a cage, with the wrong people in it."

### The Butler: The Hierophant
Keeper of the household's traditions and proprieties. Takes in the old Solicitor; role-bound lines about
papers still to be reworded for a butler (keys, the silver, the household books).
- Upright
  - N: "There's a right way of doing things, and it's usually written down."
  - B: "I know where every document is kept. That's all I'll say."
  - N: "Tradition holds a house together, you know."
  - N: "I keep my word, and expect the same."
  - B: "A signature means something, or it ought to."
  - N: "Manners are just the rules everyone agreed on."
- Reversed
  - N: "Rules are only as good as the person reading them."
  - B: "I've been asked to look the other way more than once."
  - B: "It isn't my place to say what the papers really contain."
  - N: "Propriety is a fine cloak for all sorts of things."
  - N: "I've bent a rule or two. Quietly, and for good reason."
  - B: "Some clauses are better left unread."

### The Conjurer: The Magician
A guest with quick hands and a quicker tongue.
- Upright
  - B: "Give me a pack of cards and I'll make a room full of friends."
  - N: "A good trick is about making them look the other way."
  - N: "I'm only here to entertain, truly."
  - N: "Everything is possible with the right patter."
  - B: "A coin from behind the ear wins over the most doubtful audience."
  - N: "I can always find a way, given a moment."
- Reversed
  - N: "People believe what they want to. It's rather useful."
  - N: "I've told a few stories, and not all of them quite true."
  - N: "A little sleight of hand never hurt anyone. Usually."
  - B: "The trick is never in the hands. It's in the questions."
  - N: "Charm is just persuasion with better manners."
  - N: "I've talked my way out of worse than this."

### The Housekeeper: The High Priestess
Quiet, watchful; knows what the house keeps to itself.
- Upright
  - N: "I notice things. It's rather what I'm for."
  - B: "A house has secrets, and I'm the one they trust."
  - N: "Some things are better left unsaid."
  - N: "Listening is quieter than talking, and teaches more."
  - B: "Every door in this house creaks differently. I know them all."
  - N: "I keep what I'm told to myself."
- Reversed
  - B: "I've kept this family's secrets for years, and got little for it."
  - N: "I know more than I ought, and they know it."
  - N: "Silence has a price, and nobody's paying."
  - N: "Being overlooked is useful, until it isn't."
  - N: "Nobody asks the quiet ones what they think."
  - B: "A good servant hears everything and is thanked for none of it."

### The Financier: The Devil
Lends freely and remembers every debt.
- Upright
  - N: "Everyone here wants something. I simply make it possible."
  - N: "I never forget a favour, or a debt."
  - N: "It's only business, my dear."
  - B: "A loan is just friendship with terms."
  - N: "I like to be useful to people who can't manage without me."
  - N: "Temptation is only an offer. Nobody is made to accept."
- Reversed
  - N: "I've done things I'd rather this house didn't hear of."
  - N: "I'm trying to put old dealings behind me, believe it or not."
  - B: "Some debts can't be settled the way they used to be."
  - N: "A hold over someone cuts both ways."
  - B: "I've lent to the wrong people, and been repaid in other ways."
  - N: "Everyone has a price. I'd rather not talk about mine."

### The Uncle: The Hermit
Keeps to the margins; has an old quarrel with the family.
- Upright
  - N: "I prefer my own company, and the quiet that comes with it."
  - N: "Age teaches you who to trust. Not many, in the end."
  - N: "I don't need much from anyone here."
  - N: "A short conversation and a long silence suit me best."
  - B: "There's an old quarrel in this family, and I'd as soon let it lie."
  - N: "I've learned more from sitting still than from any lecture."
- Reversed
  - N: "Nobody here ever asked how I was."
  - N: "I've held my tongue for years, and see where that got me."
  - N: "They'd all rather I'd stayed away."
  - B: "I've nursed that old quarrel a long while. It keeps me warm."
  - N: "Solitude is lovely until it's all you're offered."
  - N: "I was here before most of them, and nobody remembers."

### The Elder heir: The Chariot
Son or daughter of the house who wants to be its head, and will do anything for it. Threads with the Host
(succession) and the Financier (debts against the inheritance). Reversed: ambition with no brakes. Lines to write.

### The Younger heir: The Sun
The other child: cheerful, open, everyone's favourite. With the Elder heir seated, the two are rivals for the
house (a strong pair thread). Reversed: spoilt, used to getting their way. Lines to write.

### The Detective: Justice
A rival detective at the party, the Fool's counterpart; a suspect like the rest. Lines are about method and
pride, never conclusions ("I always start with the hands"): they never name a suspect, room or weapon and
never vouch for anyone. Reversed: has already decided, and bends the facts to fit. A natural Confidant arc
(rivalry to respect). Lines to write.

Other cards for variety: the Lovers (secret engagement), the Moon (deceiver), the Star
(actress), Death (the doctor, with a wink), the Hanged Man (failed investor). The Tower is the storm.

### Major arcana coverage
18 of 22 have a place (10 of them in the guest pool); ideas for the rest. Not every card needs a person: a card can be a non-character (the
Tower), a wandering card, or a secondary-only pool that suspects borrow. A smaller cast with full pools beats 21 thin ones.

| # | Card | Draft | Idea |
|---|---|---|---|
| 0 | Fool | The player; the cat is the Fool's dog | |
| 1 | Magician | The Conjurer | |
| 2 | High Priestess | The Housekeeper | |
| 3 | Empress | The Hostess | |
| 4 | Emperor | The Host | |
| 5 | Hierophant | The Butler | |
| 6 | Lovers | Extra: secret engagement | Wandering card: whose secret is it tonight? |
| 7 | Chariot | The Elder heir | |
| 8 | Strength | — | Nurse or companion to an old relative; reversed, temper held by force |
| 9 | Hermit | The Uncle | |
| 10 | Wheel of Fortune | — | Fortune teller (a gambler would overlap the Hanged Man), or a non-character (fate) |
| 11 | Justice | The Detective | |
| 12 | Hanged Man | Extra: failed investor | |
| 13 | Death | Extra: the doctor | |
| 14 | Temperance | — | The cook: mixes and measures; reversed, at the cooking sherry |
| 15 | Devil | The Financier | |
| 16 | Tower | The storm (non-character) | |
| 17 | Star | Extra: actress | |
| 18 | Moon | Extra: deceiver | Wandering card (see Hidden tarot layer); "deceiver" overlaps the Magician |
| 19 | Sun | The Younger heir | |
| 20 | Judgement | — | Long-lost relative come back (the vicar would overlap the Hierophant) |
| 21 | World | — | World traveller: seen everything; reversed, finishes nothing. Or the house itself |

## Shared tangents (any suspect, tagged by what the question is about)
No names, seating, times or outdoors (rules 2 and 3). 8 per tag for the first four, 4 for next door; 36 in all.
- Dinner
  - "The soup was cold by the time it reached me."
  - "Someone left half the pudding, I noticed."
  - "The wine was far too good to waste on an argument."
  - "There was far too much gravy for anyone's good."
  - "I never did get the second helping of potatoes."
  - "The bread was the best part, and nobody said a word about it."
  - "Somebody's been at the cheese, I'd swear to it."
  - "I'd have liked a smaller portion of the fish."
- Weather
  - "That wind's been at the windows all night."
  - "The lights flickered twice during the toast."
  - "I've never heard rain like it."
  - "The thunder rattled every glass in the house."
  - "A storm like this makes the whole place groan."
  - "There's no point asking when it will clear. It never says."
  - "The chimneys have been howling for hours."
  - "Nobody's going anywhere in this weather, and that's a fact."
- Room
  - "That room always did have a draught."
  - "The fire in there was low as ever."
  - "Terrible smell of polish in that corridor."
  - "The clock in there has never once been right."
  - "Those curtains have been there since before I was born."
  - "The carpet in that room is older than the house, I'd say."
  - "It's a lovely room, if you don't mind the dust."
  - "The lamps in there never give enough light."
- Object
  - "Heavier than it looks, that."
  - "It's been in the family longer than I have."
  - "Someone's always fussing over it."
  - "I wouldn't call it handsome, but it does the job."
  - "That's seen better days, and so have I."
  - "Funny how a thing like that goes unnoticed."
  - "Somebody polishes it far too often."
  - "I'm told it's worth more than it looks."
- Next door
  - "These walls are thin, you know."
  - "You hear everything in this house."
  - "The floorboards tell on everybody."
  - "Sound carries oddly in this place."

## Follow-up threads (mini storylines)
A thread is a short chain of 2 or 3 beats. Beat 1 is an ordinary tangent. Later beats only come up when she
asks the same suspect again, so a suspect she keeps returning to slowly tells a story.

How it works:
- A thread belongs to a card (like line pools), split upright and reversed. It is fixed by who the suspect is
  and the roll, never by who the killer is (rule 5).
- The next beat shows on the next tangent slot for that suspect, once beat 1 has been shown. Order is fixed;
  beats are never skipped or reshuffled. Rule 7 still applies (no repeats within a case).
- Beats are phrased as rumour or hearsay ("Rumour has it...", "I heard..."). They stay unverifiable: no beat
  can be checked against a clue, so none can ever be false (every clue is true).
- Rules 1, 2, 3 and 8 apply to every beat. Gossip about another person uses `{other}`, picked from the
  suspects independently of the killer and never the victim. Same wording gaps as rule 9.
- Threads need their own seeded `Rng` stream and a saved count of beats seen per suspect (her moves).

Draft threads:
- Gambling (Hanged Man, reversed): "My son has had a run of bad luck, I'm told." then "Rumour has it the
  family has stopped covering what he owes." then "I heard he's been cut out of the will, or near enough."
- Old flame (any card, uses `{other}`): "{other} is rather sharp with me, for no reason I can see." then
  "Rumour has it we were once sweet on each other." then "It ended badly. Neither of us will say why."

Case-reactive threads (an object she has ruled out): the risky one.
- Danger: if a story only appears for the decoy, the missing story on the real weapon leaks the answer.
- Safe version: object stories belong to the object type, any object can have one, and the gate is only
  "she already holds a clue about this object". The same stories are available whether or not it is the weapon.
- Draft (a knife): "That knife has been in the family a long while." then "Rumour has it a cook once
  waved it at a guest over a burnt joint." then "Nobody has used it for anything but bread since."
- Content note: object names live only in `src/content/`, so these stories go there, not in code.

## Card + object threads
A thread keyed by a card and an object. It can come up when a suspect with that card (home or secondary) is
asked about that object, or about an object tangent while the object is in play. Objects in `src/content/`
today: knife, rope, candlestick, wrench (the stories go in content, keyed by object id).
- Same safety as above: every card + object pair has a thread, whether or not the object is the weapon, and
  the thread never says who held it, where it was, or when (rules 1 to 3).
- Beats are rumour, upright or reversed per the suspect's roll. Beat 1 is shown first, then 2, then 3.
- Draft pairs (3 beats each; wording first pass):
  - Hierophant + candlestick
    - Up: "The candlestick was blessed once, I'm told, by a visiting bishop." / "Rumour has it a vow was
      made over it, long ago." / "Whoever breaks that vow, the family says, will not sleep easy."
    - Rev: "The candlestick was never blessed. Somebody paid for the story." / "I heard the bishop
      was no bishop at all." / "The family would rather that stayed in the drawer."
  - Emperor + knife
    - Up: "That knife carved the first joint ever served at this table." / "Rumour has it only the head
      of the house was ever meant to use it." / "It has not left its case for a lesser hand since."
    - Rev: "That knife was a gift, and a poor one." / "I heard the giver wanted something for it." / "It
      was never used, out of spite."
  - Empress + rope
    - Up: "A rope like that once held up a swing for the children." / "Rumour has it a child tied
      their first knot with it." / "Nobody could bear to throw it out."
    - Rev: "That rope was left coiled in the cellar when the nursery closed." / "I heard a child
      was punished with it, once." / "Nobody speaks of the swing now."
  - Magician + candlestick
    - Up: "Strange how a candlestick can vanish and turn up where it was." / "Rumour has it a
      guest once borrowed it for a trick, and gave it back warm." / "It has always seemed a little too eager to return."
    - Rev: "That candlestick has sold itself twice to two different families." / "I heard a guest
      traded it for a card game, and the host never noticed." / "The copy in the hall isn't the real one."
  - High Priestess + wrench
    - Up: "The wrench lives in the one drawer nobody dusts." / "Rumour has it the house keeps odd tools
      for odder jobs." / "Some doors in this house only open to that."
    - Rev: "Nobody asks who last oiled the wrench." / "I heard it was used to open a door that should
      have stayed locked." / "The key it replaced is somewhere in the house, still."
  - Devil + rope
    - Up: "Rope is just a way of making a promise hold." / "Rumour has it a deal was once sealed with
      one end each." / "People remember a deal like that."
    - Rev: "That rope has been used to hold more than boxes." / "I heard it kept one man to a bad bargain." / "He still won't look at it."
  - Hermit + wrench
    - Up: "That wrench was left behind by someone who didn't stay long." / "Rumour has it they
      preferred fixing things to talking." / "The house is a good deal quieter for it."
    - Rev: "Nobody asked who left that wrench, or why they left." / "I heard there was a quarrel, and
      a door slammed." / "It has sat untouched ever since."
- Gaps: no pair yet for the Hanged Man, Lovers, Justice, Moon, Star, Death; knife + Hierophant/Devil;
  candlestick + Emperor/Hermit. Aim for about 3 objects per card so most draws find a thread.

## Model: a set per character, triggers, and stage
Settled 2026-10-21 in `docs/talk-threads.md` (Talk on the suspect sheet, when beats are ready, `visit`
dropped, one thread per suspect, hostility). That doc wins where it differs from this section.
- **Set**: at case start each character (suspect or side character) rolls a set from their own seeded `Rng`
  stream: a reading (upright or reversed), their loose tangent lines, and their threads (card threads, plus
  card + object threads for objects in play). Fixed by who they are and the roll, never by the killer.
- **Stage**: per character per thread, the number of beats seen (0 to 3). It is saved as her moves and shared
  by every surface (questioning minigames and Talk), so a beat is never heard twice.
- **Trigger**: when a beat may come up. Each beat has one trigger from a short list:
  - `ask`: she asks this character again, after the previous beat (the default for beats 2 and 3).
  - `object`: she asks about, or holds a clue about, a specific object.
  - `talk`: Talk only (suggested for last beats).
  - `visit`: she comes back to this room after a clue elsewhere.
- Triggers use only what she has already seen or done, never case facts she has not been shown (rules 1 and 5).
- A beat that has no trigger met just waits; it is never forced and never lost.
- Surface limit: a minigame shows at most one beat per answer; Talk can show several in a row.

## Open
- Card + object threads: check rule 8 (never tappable) and that none reads as a hint about a real weapon.
- Tone: warm with a little bite (this draft), funnier, or darker.
- Variety: four of seven reversed pools are the same "nobody appreciates me" note (Emperor, Empress, High
  Priestess, Hermit), three with the same "...and see what/where/how..." shape. Give each reversed reading
  its own feeling (cold control, vanity, recklessness, fear). Upright leans on "X is just Y" sayings.
- Pool size: 6 lines per reading repeats within a few cases (rule 7 is per case only). Aim for 10 to 12
  per reading on the core cast before the campaign.
- Threads first: one thread per suspect (`docs/talk-threads.md`) needs one card thread per card per
  reading (14 for the core seven; 2 drafted). Card pairs are in the "Relationships" session.
- How tarot mode unlocks.
- About 4 more next-door tangents to reach 40, and lines for the extra cards (Lovers, Justice, Moon, Star, Death, Hanged Man).
- Check "all night", "during the toast" and "for hours" against rule 3 (no times) before building.
- Ids: reuse the old placeholder ids (saves load, wrong lines) or bump the storage prefix in `src/game/storage.ts`.
- Name length of cards on counters at 360px (High Priestess, Hierophant); check before committing.

## Extension: Confidants (campaign only)
Status: proposed 2026-10-21, after the base theme and Talk and threads. Inspired by Persona's Confidants.
Goal: she gets more invested in the cast as she plays campaigns. Quick play stays as it is: loose lines
only, no chapters, no ranks, just solve the murder.

A campaign is one evening with 7 of the 10 guests (`src/engine/campaign.ts`), so every campaign is the
same company in a new reading. A guest who isn't seated this campaign just waits; no rank is lost. Each guest's card is a **Confidant with 5 ranks** that carry over between campaigns.

| | What it does |
|---|---|
| Earning a rank | In a campaign, a guest's one thread (`docs/talk-threads.md`) is their next backstory chapter. Hearing all its beats in that campaign earns the rank. Each campaign code counts once; replaying it earns nothing. |
| Chapters | Fixed order per character, 3 beats each: 10 guests × 5 chapters × 3 beats, about 150 lines. About the past, never tonight (rule 1), so a tender chapter still reads fine when that guest is tonight's killer. |
| Reading | Upright or reversed is still rolled per campaign. It colours that campaign's loose lines, not the chapter. |
| Rank 3 | The card is revealed: that guest's counter shows its card face from then on. The hidden layer comes out one person at a time. |
| Rank 5 | The arc ends; the Fool's journey (her deck) gains that card. |
| Tarot mode | Unlocks when all 10 are revealed (settles "How tarot mode unlocks" above). |

- Safe by rule 5: chapters, ranks and reveals depend only on what she has done, never on the killer.
  Ranks are saved as her moves (`src/game/storage.ts`), so cases never change.
- Victims: a guest killed in round 1 can't finish their chapter that campaign. It waits; nothing is lost.
  That gives her a small reason to care who dies.
- Proposed defaults (not settled): 5 ranks, not 10. No perks; if perks are ever added, they're small
  puzzle helps (a free crossword letter), never case clues, which would break the campaign's fairness rules.
  One telling per chapter, not one per reading. No neglect; ignoring a guest never reverses them.
- **Named first victim** (campaign only): the campaign shuffle already orders all 10 guests; the first 7 are
  seated and the 8th is the round 1 victim. No extra roll, so cases don't change; fixed by the campaign code,
  never by the killer. Rounds 2 and 3 already make a wrongly accused guest the body. Quick play keeps the
  unnamed body. This is the only piece here that needs code (`campaignCast` in `src/engine/campaign.ts`).
- **Opening**: a line or two per victim on why they mattered to the house ("Nobody expected the Financier
  to be the first"). 10 guests × 2 or 3 lines. About the victim only, never the killer.
- **Ending**: after she solves it, why the killer did it, from the killer's card (reversed pool, `{victim}`
  filled in). Safe because she already knows. One pool per card, not one per killer + victim pair (90).
- No storyline per case: cases are generated. The story is made of who's seated, the victim, the readings,
  each guest's next chapter and the seated pairs, framed by the opening and the ending.
- Next: write each character's 5-chapter arc, the openings and the endings (a content session), then wire
  chapters into the thread slot for campaign mode and name the first victim.
