# Theme draft: dinner party, hidden tarot layer

Status: draft, nothing built. Decided in a design chat; the cast and lines below are a first pass to judge tone.
Related: `docs/tell-me-again.md` (the minigame that uses the tangent lines).

## Premise
A dinner party at a large estate. Time period agnostic: no phones, modern slang, dates or named events.
The murder happens after dinner. Everyone is staying over because of the weather, so nobody came or went:
one of the guests did it. After dinner the guests drift into different rooms, holding different things.
Chosen 2026-10-22: the 10-guest cast, its bios and the drafted line pools are in `src/content/`
(`index.ts`, `talk.ts`). Card threads beyond the two drafted here are a first pass, still to polish.

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
Six lines per card per reading. Tone (decided 2026-10-22): funnier. Cosy-mystery comedy with dry asides; still never lying, never naming a card.

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
| The Elder heir | Chariot | drafted |
| The Younger heir | Sun | drafted |
| The Detective | Justice | drafted |

- Seating needs no engine work: `campaignCast` and `generate.ts` already shuffle `content.suspects` and
  take the first 7 (or the level's count), from the case ref, before the killer is picked. Adding 3 guests
  to content changes cases, so bump the storage prefix with the theme.
- Role labels can depend on who is seated, never on the killer: with both heirs seated they're the elder
  and younger child; with one, that one is "the Heir". Built 2026-10-22 as content (`alone: { kin, name }`
  on a guest). "Present" counts the victim too, so a dead elder heir keeps the younger one "the Younger heir".
- Pair threads (see `docs/next-sessions.md`, Relationships) only come up when both guests are seated.
- Borrowed cards (`mayAlsoRoll`, decided 2026-10-22). Each guest borrows at most one of these per case (about 35%).
  The Moon is the only wandering card. A guest's role-bound (B) lines never travel; a role-neutral (N) line must
  fit every guest who may roll that card.

  | Guest | Home | May also roll |
  |---|---|---|
  | The Host | Emperor | Hierophant, Hanged Man |
  | The Hostess | Empress | Star, Lovers |
  | The Butler | Hierophant | Emperor, High Priestess |
  | The Conjurer | Magician | Star, Devil |
  | The Housekeeper | High Priestess | Hermit, Death |
  | The Financier | Devil | Emperor, Hanged Man |
  | The Uncle | Hermit | Death, Hanged Man |
  | The Elder heir | Chariot | Emperor, Devil |
  | The Younger heir | Sun | Lovers, Star |
  | The Detective | Justice | High Priestess, Hermit |

  Who rolls each card: Emperor (Host; Butler, Financier, Elder heir), Hierophant (Butler; Host),
  High Priestess (Housekeeper; Butler, Detective), Hermit (Uncle; Housekeeper, Detective), Devil (Financier;
  Conjurer, Elder heir), Star (Hostess, Conjurer, Younger heir), Lovers (Hostess, Younger heir),
  Hanged Man (Host, Financier, Uncle), Death (Housekeeper, Uncle). Empress, Magician, Chariot, Sun and Justice
  are home only, so their N lines need only fit the home guest (keep the tag for side characters later).
- Settled 2026-10-22: no guest is always seated. Anyone may sit out or be the victim, the Host included.

### The Host: The Emperor
Master of the estate; everything runs by their say-so. Reversed: cold control. Rolled by the Host, and borrowed by the Butler, Financier and Elder heir, so N lines must fit anyone who gives orders or runs affairs, not only the master of the house.
- Upright
  - B: "Somebody has to run this household. The household has never volunteered."
  - B: "Everyone eats at my table. The least they can do is use the right fork."
  - N: "I've never asked for thanks. Only that things be done properly."
  - N: "I like a plan. I like it even more when it's followed."
  - N: "Rules exist so that nobody has to make a scene. I've still seen several."
  - B: "In my house, nobody goes without. Least of all an opinion."
- Reversed
  - B: "I've given orders in this house for years. The echo is very obedient."
  - B: "A host's patience is not a bottomless cellar. I've checked the bottom."
  - B: "I'll not be told how to run my own house. I don't raise my voice about it. I lower the temperature."
  - N: "I don't shout. Shouting is for people who've lost control of the room."
  - N: "I keep a list. It's longer than anyone would like."
  - N: "Warmth is overrated. Efficiency has never let anybody down."

### The Hostess: The Empress
Generous, fond of comfort, protective of the family. Reversed: smothering, and a little vain. Home guest only (no one borrows the Empress).
- Upright
  - N: "I only ever wanted everyone fed and happy. Fed is the easier half."
  - B: "A house like this should feel like a home, not a museum. Museums don't do seconds."
  - N: "I've always looked after my own. A few of them have even noticed."
  - N: "A kind word costs nothing, and it goes a long way. Pudding goes further."
  - B: "There's always a spare bed and a warm plate in this house. Usually a spare hot-water bottle too."
  - N: "I can't bear to see anyone go without. I'm told it's a flaw."
- Reversed
  - N: "I've been told I fuss. I prefer to call it managing everyone's welfare."
  - B: "Some here would like to see me out of this house. They'd miss the cooking, mind."
  - N: "When I'm not at the centre of things, I tend to rearrange things until I am."
  - N: "Everyone's welcome to my opinion on their life. It comes with the soup."
  - N: "I do look rather well in this light, whatever else is said."
  - B: "A home can feel like a cage with the wrong people in it. I do keep the door shut, for their own good."

### The Butler: The Hierophant
Keeper of the household's traditions and proprieties; takes in the old Solicitor. Reversed: rule-lawyer pettiness. Rolled by the Butler, and borrowed by the Host, so N lines must fit someone who runs the house as well as someone who serves it.
- Upright
  - N: "There's a right way of doing things, and it's usually written down. Somewhere. Probably in a drawer nobody can find."
  - B: "I know where every key in this house is kept. That's all I'll say."
  - N: "Tradition holds a house together. Mostly by being too heavy to move."
  - N: "I keep my word, and expect the same. It saves on paperwork."
  - B: "I polish the silver myself. Some traditions are worth the elbow grease."
  - N: "Manners are the rules everyone agreed on, then forgot they'd agreed to."
- Reversed
  - N: "Rules are rules, and I have a surprising number I haven't mentioned yet."
  - B: "I've been asked to look the other way more than once. I have excellent peripheral vision."
  - B: "It isn't my place to say what the household books really say. It is my place to read them."
  - N: "Propriety is a fine cloak for all sorts of things. Mine is rather tweedy."
  - N: "I've bent a rule or two. I did it correctly."
  - B: "Some bottles in the wine cellar are better left uncounted."

### The Conjurer: The Magician
The entertainer the host hired for the evening, with quick hands and a quicker tongue. Reversed: recklessness and bluff. Home guest only.
- Upright
  - B: "Give me a pack of cards and I'll make a room full of friends. Give me two and I'll make a rival."
  - N: "A good trick is about making them look the other way. Works on relatives too."
  - N: "I'm only here to entertain, truly. The applause is a bonus."
  - N: "Everything is possible with the right patter. Some things with the right lighting."
  - B: "A coin from behind the ear wins over the most doubtful audience."
  - N: "I can always find a way, given a moment and a sturdy sleeve."
- Reversed
  - N: "I never plan the second half of a trick. That's what the first half is for."
  - N: "I've bet on worse odds than this and won, twice, which is exactly the problem."
  - N: "A little sleight of hand never hurt anyone. Usually. Mostly the same person."
  - B: "The trick is never in the hands. It's in the questions. I stopped asking mine."
  - N: "Charm is persuasion without the brakes."
  - N: "I've talked my way out of worse than this, or into it. It's hard to tell."

### The Housekeeper: The High Priestess
Quiet, watchful; knows what the house keeps to itself. Reversed: smug about it. Rolled by the Housekeeper, and borrowed by the Butler and Detective, so N lines must fit anyone who notices things.
- Upright
  - N: "I notice things. It's rather what I'm for."
  - B: "A house has secrets, and I'm the one they trust. The house isn't chatty either."
  - N: "Some things are better left unsaid. Usually the interesting ones."
  - N: "Listening is quieter than talking, and teaches more. Also, nobody interrupts."
  - B: "Every door in this house creaks differently. I know them all."
  - N: "I keep what I'm told to myself. It's the only fireproof place."
- Reversed
  - B: "I know where every skeleton in this house is kept. They're very well dusted."
  - N: "I know more than I ought, and I enjoy that you can tell."
  - N: "I could say something. I'd rather watch you wonder."
  - N: "Silence has a price, and I do like to be asked."
  - N: "Being underestimated is the nicest compliment anyone pays me."
  - B: "Nobody asks the quiet ones what they think. They'd be surprised."

### The Financier: The Devil
Lends freely and remembers every debt. Reversed: afraid it will all catch up. Rolled by the Financier, and borrowed by the Conjurer and Elder heir.
- Upright
  - N: "Everyone here wants something. I simply make it possible."
  - N: "I never forget a favour, or a debt. I do forget birthdays."
  - N: "It's only business, my dear. It's always only business."
  - B: "A loan is just friendship with terms and conditions."
  - N: "I like to be useful to people who can't manage without me. It's a hobby."
  - N: "Temptation is only an offer. Nobody is made to accept. That's rather the charm."
- Reversed
  - N: "I've done things I'd rather this house didn't hear of. It's a house with good ears."
  - N: "I'm trying to put old dealings behind me. They keep following me to dinner."
  - B: "Some debts can't be settled the way they used to be. I read the post nervously."
  - N: "A hold over someone cuts both ways, and I've been cut."
  - B: "I've lent to the wrong people, and been repaid in other ways. I sleep with the lamp on."
  - N: "Everyone has a price. I lie awake wondering what mine is."

### The Uncle: The Hermit
Keeps to the margins; has an old quarrel with the family. Reversed: theatrical grumpiness. Rolled by the Uncle, and borrowed by the Housekeeper and Detective.
- Upright
  - N: "I prefer my own company, and the quiet that comes with it. It rarely interrupts."
  - N: "Age teaches you who to trust. Not many, in the end. Fewer at dinner."
  - N: "I don't need much from anyone here. A chair, mostly."
  - N: "A short conversation and a long silence suit me best."
  - B: "There's an old quarrel in this family, and I'd as soon let it lie. It's the one thing in the house that's stayed put."
  - N: "I've learned more from sitting still than from any lecture."
- Reversed
  - N: "Oh, don't mind me. I'll just fade into the wallpaper, as ever."
  - N: "I shall say nothing. Loudly, and at length."
  - N: "I would leave, but then who would sigh at the lot of you?"
  - B: "I've nursed that old quarrel a long while. It keeps me warm."
  - N: "Solitude is lovely until it's all you're offered. Then it's a performance."
  - B: "I was here before most of them, and I intend to be insufferable about it."

### The Elder heir: The Chariot
Son or daughter of the house who wants to be its head, and will do anything for it. Threads with the Host
(succession) and the Financier (debts against the inheritance). Reversed: ambition with no brakes. Home guest only (the Elder heir borrows the Emperor and Devil, but no one borrows the Chariot).
- Upright
  - B: "One day this will all be mine, and I intend to have it properly organised."
  - N: "I don't wait for things to happen. I tap them on the shoulder."
  - N: "Fortune favours the early riser, and I've been up since the invention of breakfast."
  - B: "I've been practising being in charge since I could walk. The walking was the harder part."
  - N: "Eyes forward, hands steady, clear road ahead. A person can dream."
  - N: "I'd rather be doing than talking, and I'm doing an awful lot of talking."
- Reversed
  - B: "Being next in line is a dreadful thing to be. I'd like to skip the line."
  - N: "I've never met a speed limit I respected."
  - N: "Brakes are for people who aren't sure where they're going."
  - B: "I've been promised this house since I was small. Promises have a way of ageing."
  - N: "I won't be told to wait. I never did learn how."
  - N: "If there's a shortcut, I've already taken it and sent back for the luggage."

### The Younger heir: The Sun
The other child: cheerful, open, everyone's favourite. With the Elder heir seated, the two are rivals for the
house (a strong pair thread). Reversed: spoilt, used to getting their way. Home guest only (the Younger heir borrows the Lovers and Star).
- Upright
  - N: "I like everyone. It saves ever so much time."
  - B: "My sibling takes the house terribly seriously. I take the biscuits seriously."
  - N: "Sunshine is free, you know, and I'm generous with it."
  - N: "I've never met a stranger, only a person I haven't made laugh yet."
  - B: "I grew up in this house and it's always been kind to me. I've tried to return the favour."
  - N: "Worry is a waste of a perfectly good face."
- Reversed
  - N: "I don't see why I should have to ask twice."
  - B: "I was told I could have the run of the house. Nobody mentioned rules."
  - N: "Sulking is only sunshine that's been told no."
  - N: "I've never had to want something for very long, and I'm not keen on starting."
  - B: "My sibling gets the serious talks. I get the allowance, and I'd like it raised."
  - N: "It's terribly unfair when things don't go my way. I have it on good authority."

### The Detective: Justice
A rival detective at the party, the Fool's counterpart; a suspect like the rest. Lines are about method and
pride, never conclusions: they never name a suspect, room or weapon and never vouch for anyone. Reversed: has
already decided, and bends the facts to fit. A natural Confidant arc (rivalry to respect). Home guest only (the Detective borrows the High Priestess and Hermit).
- Upright
  - B: "I always start with the hands. Hands never learned to lie."
  - N: "A good detective notices what doesn't fit. Mostly it's my own hat."
  - B: "I've solved cases with less than a dinner and a draughty hallway."
  - N: "Facts first, then theories, then a very good sit-down."
  - B: "Some people here call themselves detectives. I call myself right."
  - N: "I weigh everything twice. Once for the evidence, once for the cut of the coat."
- Reversed
  - N: "I never change my mind. I merely reach the right conclusion before the facts do."
  - B: "A detective with doubts is just a witness with a notebook."
  - N: "Evidence is a lovely thing, once it agrees with me."
  - N: "I trust my instincts. Frankly, they're better qualified than the evidence."
  - B: "I've never been wrong. A few cases have been wrong about me."
  - N: "I've a theory, and I'd hate to waste it on facts."

### Extra cards (borrowed or wandering)
No home guest. All N lines, written to fit every borrower, so they stay at feelings and old memories and never
make a claim about tonight. The Tower is the storm, not a character.

#### Lovers
Rolled by the Hostess and Younger heir (borrowed).
- Upright
  - N: "I'm a sucker for a happy ending. Even other people's."
  - N: "Some things are worth the fuss, which is usually where the fuss comes from."
  - N: "I've been told I wear my heart on my sleeve. It's murder on the laundry."
  - N: "Love is mostly noticing, and then pretending you haven't."
  - N: "A good match is hard to find and impossible to arrange. I've tried."
  - N: "I believe in following the heart, and then checking where the exits are."
- Reversed
  - N: "I've nearly said yes to the wrong thing more than once."
  - N: "Choosing is the hardest part. I put it off with great skill."
  - N: "Hearts break, but it's the china that really hurts."
  - N: "I've been torn between two things and picked neither, thoroughly."
  - N: "There's a letter I wrote once and never sent. It's the best thing I've ever written."
  - N: "Some affections are better admired from a safe distance."

#### Star
Rolled by the Hostess, Conjurer and Younger heir (borrowed).
- Upright
  - N: "I believe things tend to come good, given patience and a decent candle."
  - N: "A little hope is the cheapest thing in the house and does the most work."
  - N: "I like to be looked at, I'll admit it, but kindly."
  - N: "Wishing is free, which is why I do so much of it."
  - N: "Even in a storm the sky is still up there, being optimistic."
  - N: "I tell myself things will get better. It keeps the washing-up from mattering."
- Reversed
  - N: "I wished on something once. It sent a polite refusal."
  - N: "Being admired is lovely. Being relied on to sparkle is a job."
  - N: "I've dimmed myself for company before. The company didn't notice."
  - N: "Hope is a lovely thing to lose in company. Everyone looks away politely."
  - N: "I put on a brave face. It's a good one, but it never quite fits."
  - N: "There's nothing like the silence after applause that doesn't come."

#### Death
Rolled by the Housekeeper and Uncle (borrowed). Endings and change, with a wink; never about a person dying.
- Upright
  - N: "Everything comes to an end sooner or later. Usually the pudding first."
  - N: "I've learned to let things go. The house has learned to let me."
  - N: "A clean break is kinder than a slow fade. Ask any candle."
  - N: "Endings aren't gloomy. They're the last page, and I like a tidy last page."
  - N: "Change comes for everyone. I'd rather meet it with a clean collar."
  - N: "I don't fear endings. I fear the speeches that go with them."
- Reversed
  - N: "I'm not keen on change, and I've been called stubborn for it."
  - N: "Some things are over and refuse to be told."
  - N: "I've clung to a few things long past their best. Cheese included."
  - N: "I keep waiting for things to end properly, and they keep not."
  - N: "I've sat through more goodbyes than a railway platform."
  - N: "Letting go is easy to say over dinner."

#### Hanged Man
Rolled by the Host, Financier and Uncle (borrowed). Surrender and a new view; reversed, stuck and martyred.
- Upright
  - N: "Sometimes you have to stop pushing and see what the day does instead."
  - N: "I've found that looking at things upside down helps. Mostly with the soup."
  - N: "Waiting is an underrated skill, and I've been practising."
  - N: "I let go of a lot, years ago. It was surprisingly light."
  - N: "A change of view costs nothing and is worth several dinners."
  - N: "Giving up a little control is freeing, or so I tell myself."
- Reversed
  - N: "I've been stuck on the same problem for years. We've become close."
  - N: "Sacrifice is lovely when someone else is making it."
  - N: "I let go of things I should have held, and held things I should have let go."
  - N: "Standing still looks wise until it's just standing still."
  - N: "I keep saying I'll move on. The armchair keeps saying otherwise."
  - N: "I've waited so long for things to improve that I've forgotten what I was waiting for."

#### Moon
Wandering card: no home guest. Each case deals it to one suspect (see Hidden tarot layer), so these lines fit any
guest. Dreams, half-truths and old memories only; never a claim about tonight that could clash with a clue.
- Upright
  - N: "I dream of this house sometimes, and it's always bigger."
  - N: "I'm never sure what I saw as a child, only how it felt."
  - N: "Old memories are like old coats: warm, and slightly the wrong shape."
  - N: "I wonder if I invented half my childhood. It was a good half."
  - N: "I can never tell if a feeling is a memory or a draught."
  - N: "Half the things I recall happened, and the other half deserved to."
- Reversed
  - N: "I don't trust my memory, and I trust other people's less."
  - N: "I've told a story so often I can't find the real one underneath."
  - N: "Half-truths keep better than whole ones, I find."
  - N: "I get frightened of shadows I put there myself."
  - N: "I'd swear to an old memory in the dark and take it back by lamplight."
  - N: "I frighten myself with dreams, and then blame the cheese."

### Borrowed lines (guest + borrowed card)
One line for each guest + borrowed card in the table. Each fits only that guest with that card (treat as B), and
is rolled only when the guest borrows that card.

| Guest + card | Reading | Line |
|---|---|---|
| Host + Hierophant | Upright | "We've always done it this way here, and I'll not have anyone say otherwise." |
| Host + Hanged Man | Reversed | "I've spent so long holding this house up that I can't put it down." |
| Hostess + Star | Upright | "A house this big deserves a bit of sparkle, and I'm the one who polishes it." |
| Hostess + Lovers | Reversed | "I've matched half the county and been thanked by none of it." |
| Butler + Emperor | Upright | "I run the staff the way the master runs the house. One of us has to be tidy." |
| Butler + High Priestess | Reversed | "I know what goes on below stairs and above them, and I'm paid to look surprised." |
| Conjurer + Star | Upright | "Give me an audience and a good lamp and I'll show you my best." |
| Conjurer + Devil | Reversed | "Everything I've ever pulled out of a hat had a price on it." |
| Housekeeper + Hermit | Upright | "I keep to the back stairs. They've better company and fewer opinions." |
| Housekeeper + Death | Reversed | "I've aired the black crepe more often than anyone should." |
| Financier + Emperor | Upright | "I run my affairs like a good host runs a table: everyone served, nobody shortchanged." |
| Financier + Hanged Man | Reversed | "I once backed a sure thing upside down. The market took the other view." |
| Uncle + Death | Upright | "I'm old enough to know the last chapter is the best. I'd not hurry it." |
| Uncle + Hanged Man | Reversed | "I've been hanging about this family for years, waiting for someone to ask me to get down." |
| Elder heir + Emperor | Upright | "I learned from the best, who never let me forget it." |
| Elder heir + Devil | Reversed | "I've borrowed against the future so often that the future has started sending reminders." |
| Younger heir + Lovers | Upright | "I fall for people easily. I just never fall for the same one twice." |
| Younger heir + Star | Reversed | "Everyone says I'll go far. I'd like to go further, in a better carriage." |
| Detective + High Priestess | Upright | "A good detective knows what to leave unsaid until the right moment." |
| Detective + Hermit | Reversed | "I do my best thinking alone, mostly because nobody else can keep up." |

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

Other cards for variety: see "Extra cards (borrowed or wandering)" above. The Tower is the storm.

## Shared tangents (any suspect, tagged by what the question is about)
No names, seating, times or outdoors (rules 2 and 3). 8 per tag for all five; 40 in all.
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
  - "That wind won't leave the windows alone."
  - "The lights keep flickering. I wish they wouldn't."
  - "I've never heard rain like it."
  - "The thunder rattled every glass in the house."
  - "A storm like this makes the whole place groan."
  - "There's no point asking when it will clear. It never says."
  - "Listen to those chimneys howl."
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
  - "The pipes in these walls have opinions, and they share them."
  - "Doors in this house don't close so much as consider it."
  - "Every cough in this place gets a round of applause from the echo."
  - "Even a sigh finds its way down the corridor."

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
      traded it for a card game, and the host never noticed." / "The one on show isn't the real one."
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
  - Knife + Hierophant
    - Up: "That knife was carried in a procession once, I'm told, for a feast day." / "Rumour has it it was
      blessed alongside the bread." / "The family still lowers its voice when it's mentioned."
    - Rev: "That knife has been 'blessed' three times, by three different men." / "I heard the blessings
      were sold by the slice." / "Nobody has dared ask for a refund."
  - Knife + Devil
    - Up: "That knife was part of a bargain once, I'm told." / "Rumour has it it changed hands for a favour
      nobody could name." / "The family considers it a fair price."
    - Rev: "That knife came with strings, they say." / "I heard a debt was settled with it that wasn't quite
      a debt." / "Folk who've been offered it tend to owe someone afterwards."
  - Candlestick + Emperor
    - Up: "That candlestick stood at the head of every great dinner this house ever gave." / "Rumour has it
      a rule was made that it be lit first and snuffed last." / "The house has run on it ever since, one way or another."
    - Rev: "That candlestick was a gift from someone the house would rather forget." / "I heard it was put
      away whenever the head of the house was in a temper." / "It's been put away rather a lot."
  - Candlestick + Hermit
    - Up: "That candlestick is said to have belonged to someone who liked to read alone." / "Rumour has it
      they burnt through a hundred candles before they'd share one." / "The house has been a little dimmer since."
    - Rev: "Nobody likes to say who that candlestick was left burning for." / "I heard a letter was read by
      it and never answered." / "The wax is still there."
  - Hanged Man + rope
    - Up: "That rope was bought from a failed enterprise at a very good price." / "Rumour has it its former
      owner lost everything but the rope." / "They say it was the best investment anyone ever made in this house."
    - Rev: "That rope was bought in a hurry from someone who'd lost everything." / "I heard the sale wasn't
      entirely the owner's idea." / "Nobody asks what else came with it."
  - Death + rope
    - Up: "That rope once lowered a coffin, I'm told, very gently." / "Rumour has it it was kept afterwards
      out of respect." / "Nobody in the house would dream of tying a parcel with it."
    - Rev: "That rope has seen things it won't talk about." / "I heard it was used on the last day of
      something." / "The house has been waiting for it to be thrown out ever since."
  - Lovers + wrench
    - Up: "A wrench is a romantic object, if you know the story." / "Rumour has it two people met over a
      dripping tap and have never agreed on anything since." / "They're still very fond of each other, in a thorough way."
    - Rev: "That wrench was left on a windowsill in a huff." / "I heard it was thrown, though it missed." /
      "The tap is still dripping, and so is the feeling."
  - Star + wrench
    - Up: "A famous actress once fixed a dressing-room tap with that wrench, to prove a point." / "Rumour has it a
      theatre company borrowed it for a prop." / "It got better reviews than the play."
    - Rev: "That wrench was a prop in a play nobody liked." / "I heard it got the only good notice." / "It's
      been resting ever since."
  - Justice + knife
    - Up: "That knife has been weighed in every kind of argument, I'm told." / "Rumour has it a cook
      demanded a proper hearing over it." / "The matter was settled fairly, which satisfied no one."
    - Rev: "That knife has been blamed for a lot over the years." / "I heard it was never given a fair
      hearing." / "It's easier to blame the knife."
  - Moon + candlestick
    - Up: "That candlestick is said to burn bluer when rain is on the way." / "Rumour has it a guest saw a
      face in the flame once." / "They put it down to the wine."
    - Rev: "That candlestick has a way of leaving shadows where none belong." / "I heard a guest swore it
      moved, and was laughed at." / "Nobody laughed the second time."
- Gaps, toward about 3 objects per card: Chariot and Sun have no pair yet; Empress, Magician, High Priestess,
  Hanged Man, Death, Lovers, Star, Justice and Moon have one object each and need two more; Emperor, Hierophant,
  Devil and Hermit have two and need one more. Objects so far: knife 4 cards, candlestick 5, rope 4, wrench 4.

## Cold greetings (hostile reading)
Cold follows the reversed roll (`docs/talk-threads.md`, "Hostile to warm"), so there is no new roll; the warm
greetings stay as they are. Curt, rude, never a lie, never about tonight's facts, never aimed at a named or
specific person. Greetings are ordered by beats heard and the first one greets her on meeting them, so it never says "again" (no "You again?" at 0 heard).
- "Ask someone else. Or don't."
- "Make it quick."
- "Oh. It's you."
- "I've a great deal of nothing to do, and I'd like to get back to it."
- "I'm not in the mood, and the mood is not improving."
- "If this is going to be long, I'd like it noted that I disagree."
- "Speak, if you must."
- "Do come in. Don't stay."
- "I'd say it's a pleasure, but I'm not that sort of liar."
- "Go on, then. Impress me."
- "Was there something, or just the staring?"


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
- Pool size: 6 lines per reading repeats within a few cases (rule 7 is per case only). Aim for 10 to 12
  per reading on the core cast before the campaign.
- Threads first: one thread per suspect (`docs/talk-threads.md`) needs one card thread per card per
  reading (14 for the core seven; 2 drafted). Card pairs are in the "Relationships" session.
- How tarot mode unlocks.
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
  never by the killer. Rounds 2 and 3 already make a wrongly accused guest the body. Built 2026-10-22, and
  every mode names its victim the same way (the next guest after the seated ones); the owner dropped
  "Quick play keeps the unnamed body".
- **Opening**: a line or two per victim on why they mattered to the house ("Nobody expected the Financier
  to be the first"). 10 guests × 2 or 3 lines. About the victim only, never the killer.
- **Ending**: after she solves it, why the killer did it, from the killer's card (reversed pool, `{victim}`
  filled in). Safe because she already knows. One pool per card, not one per killer + victim pair (90).
- **Victim threads** (campaign only, 2026-10-22): each seated guest's thread about how they knew the victim;
  designed in the "Relationships between characters" session. Quick play keeps guests as window dressing.
- No storyline per case: cases are generated. The story is made of who's seated, the victim, the readings,
  each guest's next chapter and the seated pairs, framed by the opening and the ending.
- Next: write each character's 5-chapter arc, the openings and the endings (a content session), then wire
  chapters into the thread slot for campaign mode and name the first victim.
