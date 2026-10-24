// Talk content for the ten guests. Loose lines (neutral N, bound B) are copied
// from docs/theme-draft.md. Threads that are not in the draft (everything
// except the Hanged Man reversed "Gambling" thread) are a first pass for the
// Theme content session to polish.
//
// Rules for content:
// - Never name a card, guest, room or weapon in a line or beat.
// - Loose lines never state times or alibis ("all night", "for hours", where
//   someone was). They are colour, not evidence.
// - A thread is 2 to 3 beats, heard in order, as hearsay that can't be checked.
//   It must fit every guest who may roll that card.
// - Kept out of `content` (like `cats`) so it never changes a case.

import type { CardReading, TalkContent } from '../engine/types.ts';

const reading = (neutral: string[], bound: string[], threads: string[][]): CardReading => ({
  lines: { neutral, bound },
  threads,
});

export const talk: TalkContent = {
  suspects: {
    host: { card: 'emperor', mayAlsoRoll: ['hierophant', 'hanged-man'] },
    hostess: { card: 'empress', mayAlsoRoll: ['star', 'lovers'] },
    butler: { card: 'hierophant', mayAlsoRoll: ['emperor', 'high-priestess'] },
    conjurer: { card: 'magician', mayAlsoRoll: ['star', 'devil'] },
    housekeeper: { card: 'high-priestess', mayAlsoRoll: ['hermit', 'death'] },
    financier: { card: 'devil', mayAlsoRoll: ['emperor', 'hanged-man'] },
    uncle: { card: 'hermit', mayAlsoRoll: ['death', 'hanged-man'] },
    'elder-heir': { card: 'chariot', mayAlsoRoll: ['emperor', 'devil'] },
    'younger-heir': { card: 'sun', mayAlsoRoll: ['lovers', 'star'] },
    detective: { card: 'justice', mayAlsoRoll: ['high-priestess', 'hermit'] },
  },
  cards: {
    emperor: {
      upright: reading(
        [
          "I've never asked for thanks. Only that things be done properly.",
          'I like a plan. I like it even more when it\'s followed.',
          "Rules exist so that nobody has to make a scene. I've still seen several.",
        ],
        [
          'Somebody has to run this household. The household has never volunteered.',
          'Everyone eats at my table. The least they can do is use the right fork.',
          'In my house, nobody goes without. Least of all an opinion.',
        ],
        [
          ['Rumour has it a list of rules was drawn up once for the whole household.', 'I heard nobody read past the first page.', "Order, I'm told, is mostly a matter of who is holding the pen."],
          ["I'm told a decision was made once that nobody was allowed to question.", 'Rumour has it it was the right one, which only made it worse.', 'People still bring it up at dinner, in a whisper.'],
        ],
      ),
      reversed: reading(
        [
          "I don't shout. Shouting is for people who've lost control of the room.",
          "I keep a list. It's longer than anyone would like.",
          'Warmth is overrated. Efficiency has never let anybody down.',
        ],
        [
          "I've given orders in this house for years. The echo is very obedient.",
          "A host's patience is not a bottomless cellar. I've checked the bottom.",
          "I'll not be told how to run my own house. I don't raise my voice about it. I lower the temperature.",
        ],
        [
          ['I heard an order was given once that made no sense to anyone.', 'Rumour has it it was followed to the letter, purely to make a point.', 'Nobody has dared give one like it since.'],
          ['Rumour has it a ledger of favours is kept, and not by the person who owes them.', "I'm told it's very thorough, with footnotes.", "I wouldn't like to be in it. I'd like even less to be left out."],
        ],
      ),
    },
    empress: {
      upright: reading(
        [
          'I only ever wanted everyone fed and happy. Fed is the easier half.',
          "I've always looked after my own. A few of them have even noticed.",
          'A kind word costs nothing, and it goes a long way. Pudding goes further.',
          "I can't bear to see anyone go without. I'm told it's a flaw.",
        ],
        [
          'A house like this should feel like a home, not a museum. Museums don\'t do seconds.',
          "There's always a spare bed and a warm plate in this house. Usually a spare hot-water bottle too.",
        ],
        [
          ['I heard a recipe was handed down in this family and never written out.', 'Rumour has it a cousin once tried to copy it and got it wrong on purpose.', 'The real one, I am told, is still perfectly safe.'],
          ["I'm told someone once cried over a plate of leftovers, and nobody asked why.", 'Rumour has it a kind word would have fixed it.', 'It is the sort of thing that sticks.'],
        ],
      ),
      reversed: reading(
        [
          "I've been told I fuss. I prefer to call it managing everyone's welfare.",
          "When I'm not at the centre of things, I tend to rearrange things until I am.",
          "Everyone's welcome to my opinion on their life. It comes with the soup.",
          'I do look rather well in this light, whatever else is said.',
        ],
        [
          "Some here would like to see me out of this house. They'd miss the cooking, mind.",
          'A home can feel like a cage with the wrong people in it. I do keep the door shut, for their own good.',
        ],
        [
          ['I heard somebody was told they looked tired, three times in one evening.', 'Rumour has it that was a hint, not a kindness.', 'They have not worn that colour since.'],
          ["Rumour has it a family portrait was moved because someone didn't like the angle.", 'I heard it was a very pointed sort of gift.', 'Nobody has mentioned it since, to be safe.'],
        ],
      ),
    },
    hierophant: {
      upright: reading(
        [
          "There's a right way of doing things, and it's usually written down. Somewhere. Probably in a drawer nobody can find.",
          'Tradition holds a house together. Mostly by being too heavy to move.',
          'I keep my word, and expect the same. It saves on paperwork.',
          'Manners are the rules everyone agreed on, then forgot they\'d agreed to.',
        ],
        [
          "I know where every key in this house is kept. That's all I'll say.",
          'I polish the silver myself. Some traditions are worth the elbow grease.',
        ],
        [
          ['I heard a visiting relative once broke a custom, quite by accident.', 'Rumour has it nobody said a word, which was the punishment.', "They never did get a second invitation, I'm told."],
          ["I'm told there is a very old toast that is meant to be given every year.", 'Rumour has it nobody remembers the second verse.', 'Everyone mumbles through it, and nobody admits it.'],
        ],
      ),
      reversed: reading(
        [
          "Rules are rules, and I have a surprising number I haven't mentioned yet.",
          'Propriety is a fine cloak for all sorts of things. Mine is rather tweedy.',
          "I've bent a rule or two. I did it correctly.",
        ],
        [
          "I've been asked to look the other way more than once. I have excellent peripheral vision.",
          "It isn't my place to say what the household books really say. It is my place to read them.",
          'Some bottles in the wine cellar are better left uncounted.',
        ],
        [
          ['I heard a rule was once invented on the spot to settle an argument.', 'Rumour has it it was written up afterwards to look old.', 'It has been quoted solemnly ever since.'],
          ['Rumour has it a list of exceptions is kept, and that it is longer than the list of rules.', "I'm told the exceptions all belong to the same few people.", 'Nobody has asked who wrote them down.'],
        ],
      ),
    },
    magician: {
      upright: reading(
        [
          'A good trick is about making them look the other way. Works on relatives too.',
          "I'm only here to entertain, truly. The applause is a bonus.",
          'Everything is possible with the right patter. Some things with the right lighting.',
          'I can always find a way, given a moment and a sturdy sleeve.',
        ],
        [
          "Give me a pack of cards and I'll make a room full of friends. Give me two and I'll make a rival.",
          'A coin from behind the ear wins over the most doubtful audience.',
        ],
        [
          ['I heard a coin trick once got a very sulky child to laugh.', 'Rumour has it the child grew up to be quite a serious person.', 'They still ask for the coin back, I am told.'],
        ],
      ),
      reversed: reading(
        [
          "I never plan the second half of a trick. That's what the first half is for.",
          "I've bet on worse odds than this and won, twice, which is exactly the problem.",
          'A little sleight of hand never hurt anyone. Usually. Mostly the same person.',
          'Charm is persuasion without the brakes.',
          "I've talked my way out of worse than this, or into it. It's hard to tell.",
        ],
        [
          "The trick is never in the hands. It's in the questions. I stopped asking mine.",
        ],
        [
          ['Rumour has it a trick once went wrong in front of a very important audience.', "I heard the audience applauded anyway, which was somehow worse.", 'The patter that followed, I am told, was magnificent.'],
        ],
      ),
    },
    'high-priestess': {
      upright: reading(
        [
          "I notice things. It's rather what I'm for.",
          'Some things are better left unsaid. Usually the interesting ones.',
          'Listening is quieter than talking, and teaches more. Also, nobody interrupts.',
          "I keep what I'm told to myself. It's the only fireproof place.",
        ],
        [
          "A house has secrets, and I'm the one they trust. The house isn't chatty either.",
          'Every door in this house creaks differently. I know them all.',
        ],
        [
          ['I heard somebody once confided something at dinner, very quietly.', 'Rumour has it three other people pretended not to hear.', 'None of them have mentioned it since, which is how I know it was good.'],
          ["I'm told there is a family secret that everyone knows and nobody says.", 'Rumour has it it is really quite small.', 'That is why it has lasted so long.'],
        ],
      ),
      reversed: reading(
        [
          'I know more than I ought, and I enjoy that you can tell.',
          "I could say something. I'd rather watch you wonder.",
          'Silence has a price, and I do like to be asked.',
          'Being underestimated is the nicest compliment anyone pays me.',
        ],
        [
          "I know where every skeleton in this house is kept. They're very well dusted.",
          "Nobody asks the quiet ones what they think. They'd be surprised.",
        ],
        [
          ['Rumour has it a secret changed hands once for a very small favour.', "I heard the favour was never repaid, on purpose.", 'Whoever holds it now is enjoying themselves.'],
          ["I'm told somebody here has been keeping a very neat file on the rest of us.", 'Rumour has it nobody has seen it, which is how it stays effective.', "I'd say more, but then I'd have to keep a file."],
        ],
      ),
    },
    devil: {
      upright: reading(
        [
          'Everyone here wants something. I simply make it possible.',
          'I never forget a favour, or a debt. I do forget birthdays.',
          "It's only business, my dear. It's always only business.",
          "I like to be useful to people who can't manage without me. It's a hobby.",
          'Temptation is only an offer. Nobody is made to accept. That\'s rather the charm.',
        ],
        ['A loan is just friendship with terms and conditions.'],
        [
          ['I heard somebody was lent a great deal once, with a smile and no paperwork.', 'Rumour has it the smile was the paperwork.', 'They have been very polite ever since.'],
          ["Rumour has it a bet was made at dinner for something other than money.", 'I heard both sides thought they had won.', 'Neither has quite got over it.'],
        ],
      ),
      reversed: reading(
        [
          "I've done things I'd rather this house didn't hear of. It's a house with good ears.",
          "I'm trying to put old dealings behind me. They keep following me to dinner.",
          'A hold over someone cuts both ways, and I\'ve been cut.',
          'Everyone has a price. I lie awake wondering what mine is.',
        ],
        [
          "Some debts can't be settled the way they used to be. I read the post nervously.",
          "I've lent to the wrong people, and been repaid in other ways. I sleep with the lamp on.",
        ],
        [
          ["I heard an old bargain is about to come due, and nobody will say whose.", 'Rumour has it the terms were never written down.', 'That, I am told, is the worrying part.'],
          ['Rumour has it a favour was called in recently, and not gently.', "I'm told the answer was a very long pause.", 'Nobody has been the same colour since.'],
        ],
      ),
    },
    hermit: {
      upright: reading(
        [
          'I prefer my own company, and the quiet that comes with it. It rarely interrupts.',
          'Age teaches you who to trust. Not many, in the end. Fewer at dinner.',
          "I don't need much from anyone here. A chair, mostly.",
          'A short conversation and a long silence suit me best.',
          "I've learned more from sitting still than from any lecture.",
        ],
        ["There's an old quarrel in this family, and I'd as soon let it lie. It's the one thing in the house that's stayed put."],
        [
          ['I heard somebody once walked out of a family gathering and was missed by no one for an hour.', 'Rumour has it that was the point.', 'They say it was the most peaceful hour of the year.'],
          ["I'm told there is a chair that nobody else sits in.", 'Rumour has it nobody remembers why.', 'It is, apparently, the best chair.'],
        ],
      ),
      reversed: reading(
        [
          "Oh, don't mind me. I'll just fade into the wallpaper, as ever.",
          'I shall say nothing. Loudly, and at length.',
          'I would leave, but then who would sigh at the lot of you?',
          "Solitude is lovely until it's all you're offered. Then it's a performance.",
        ],
        [
          "I've nursed that old quarrel a long while. It keeps me warm.",
          'I was here before most of them, and I intend to be insufferable about it.',
        ],
        [
          ['I heard a letter once went unanswered for a very long time.', "Rumour has it the reply was written, and kept, and rewritten.", 'It was never sent, out of principle.'],
          ["Rumour has it someone stormed out of a family gathering years ago and left their coat.", "I'm told the coat has been kept, brushed, every year since.", 'Nobody will say if that is spite or hope.'],
        ],
      ),
    },
    chariot: {
      upright: reading(
        [
          "I don't wait for things to happen. I tap them on the shoulder.",
          "Fortune favours the early riser, and I've been up since the invention of breakfast.",
          'Eyes forward, hands steady, clear road ahead. A person can dream.',
          "I'd rather be doing than talking, and I'm doing an awful lot of talking.",
        ],
        [
          'One day this will all be mine, and I intend to have it properly organised.',
          "I've been practising being in charge since I could walk. The walking was the harder part.",
        ],
        [
          ['I heard somebody once drew up a plan for the whole family, uninvited.', 'Rumour has it it was colour-coded.', 'The family kept it and used it for something else.'],
        ],
      ),
      reversed: reading(
        [
          "I've never met a speed limit I respected.",
          "Brakes are for people who aren't sure where they're going.",
          "I won't be told to wait. I never did learn how.",
          "If there's a shortcut, I've already taken it and sent back for the luggage.",
        ],
        [
          "Being next in line is a dreadful thing to be. I'd like to skip the line.",
          "I've been promised this house since I was small. Promises have a way of ageing.",
        ],
        [
          ['Rumour has it a promise was made long ago about who would be in charge one day.', 'I heard it was said in front of the wrong person.', 'It has been repeated, with improvements, ever since.'],
        ],
      ),
    },
    sun: {
      upright: reading(
        [
          'I like everyone. It saves ever so much time.',
          "Sunshine is free, you know, and I'm generous with it.",
          "I've never met a stranger, only a person I haven't made laugh yet.",
          'Worry is a waste of a perfectly good face.',
        ],
        [
          'My sibling takes the house terribly seriously. I take the biscuits seriously.',
          "I grew up in this house and it's always been kind to me. I've tried to return the favour.",
        ],
        [
          ['I heard somebody once made a whole room laugh at a funeral, very gently.', 'Rumour has it nobody minded, least of all the family.', 'They say it was the kindest thing anyone did that day.'],
        ],
      ),
      reversed: reading(
        [
          "I don't see why I should have to ask twice.",
          'Sulking is only sunshine that\'s been told no.',
          "I've never had to want something for very long, and I'm not keen on starting.",
          "It's terribly unfair when things don't go my way. I have it on good authority.",
        ],
        [
          'I was told I could have the run of the house. Nobody mentioned rules.',
          'My sibling gets the serious talks. I get the allowance, and I\'d like it raised.',
        ],
        [
          ['I heard a birthday present was once returned because it was the wrong shade.', 'Rumour has it the giver was made to apologise.', 'The shade has been named, in private, ever since.'],
        ],
      ),
    },
    justice: {
      upright: reading(
        [
          "A good detective notices what doesn't fit. Mostly it's my own hat.",
          'Facts first, then theories, then a very good sit-down.',
          'I weigh everything twice. Once for the evidence, once for the cut of the coat.',
        ],
        [
          'I always start with the hands. Hands never learned to lie.',
          "I've solved cases with less than a dinner and a draughty hallway.",
          'Some people here call themselves detectives. I call myself right.',
        ],
        [
          ['I heard a case was once solved from a single dropped glove.', 'Rumour has it the glove was the detective\'s own.', 'It was returned with a very short note.'],
        ],
      ),
      reversed: reading(
        [
          'I never change my mind. I merely reach the right conclusion before the facts do.',
          'Evidence is a lovely thing, once it agrees with me.',
          'I trust my instincts. Frankly, they\'re better qualified than the evidence.',
          "I've a theory, and I'd hate to waste it on facts.",
        ],
        [
          'A detective with doubts is just a witness with a notebook.',
          "I've never been wrong. A few cases have been wrong about me.",
        ],
        [
          ['Rumour has it a famous case was once decided before anyone had arrived.', 'I heard the facts were fetched afterwards.', 'They fitted beautifully, I am told.'],
        ],
      ),
    },
    lovers: {
      upright: reading(
        [
          "I'm a sucker for a happy ending. Even other people's.",
          'Some things are worth the fuss, which is usually where the fuss comes from.',
          "I've been told I wear my heart on my sleeve. It's murder on the laundry.",
          'Love is mostly noticing, and then pretending you haven\'t.',
          'A good match is hard to find and impossible to arrange. I\'ve tried.',
          'I believe in following the heart, and then checking where the exits are.',
        ],
        [],
        [
          ['I heard somebody once arranged a match between two people who then refused to speak to each other.', 'Rumour has it they married other people, separately, out of spite.', 'The matchmaker takes full credit.'],
          ["Rumour has it a wedding toast once went on for so long that the cake collapsed.", 'I heard the couple were quietly grateful.', 'It is still the best-attended wedding anyone remembers.'],
        ],
      ),
      reversed: reading(
        [
          "I've nearly said yes to the wrong thing more than once.",
          'Choosing is the hardest part. I put it off with great skill.',
          'Hearts break, but it\'s the china that really hurts.',
          "I've been torn between two things and picked neither, thoroughly.",
          "There's a letter I wrote once and never sent. It's the best thing I've ever written.",
          'Some affections are better admired from a safe distance.',
        ],
        [],
        [
          ["I heard an engagement was called off over a matter of seating.", 'Rumour has it nobody has ever said what the seating was.', 'The ring, I am told, is still in a drawer.'],
          ['Rumour has it a letter was written, and torn up, and written again.', "I'm told the third version was the worst.", 'It is probably still being carried about.'],
        ],
      ),
    },
    star: {
      upright: reading(
        [
          'I believe things tend to come good, given patience and a decent candle.',
          'A little hope is the cheapest thing in the house and does the most work.',
          "I like to be looked at, I'll admit it, but kindly.",
          'Wishing is free, which is why I do so much of it.',
          'Even in a storm the sky is still up there, being optimistic.',
          'I tell myself things will get better. It keeps the washing-up from mattering.',
        ],
        [],
        [
          ['I heard somebody once made a wish out loud and was gently told off for it.', 'Rumour has it it came true anyway, in a roundabout way.', 'They are very careful with wishes now.'],
          ["Rumour has it a performance once ended in a standing ovation for the wrong person.", 'I heard the right person was gracious about it.', 'Their smile has been rather bright since.'],
        ],
      ),
      reversed: reading(
        [
          'I wished on something once. It sent a polite refusal.',
          'Being admired is lovely. Being relied on to sparkle is a job.',
          "I've dimmed myself for company before. The company didn't notice.",
          'Hope is a lovely thing to lose in company. Everyone looks away politely.',
          "I put on a brave face. It's a good one, but it never quite fits.",
          "There's nothing like the silence after applause that doesn't come.",
        ],
        [],
        [
          ['I heard a bright young thing was once told to tone it down.', 'Rumour has it they did, and it was noticed at once.', 'It was the dullest evening anyone remembers.'],
          ["Rumour has it a toast was prepared and then not given.", "I'm told it was very good.", 'It is probably still in a pocket somewhere.'],
        ],
      ),
    },
    death: {
      upright: reading(
        [
          'Everything comes to an end sooner or later. Usually the pudding first.',
          "I've learned to let things go. The house has learned to let me.",
          'A clean break is kinder than a slow fade. Ask any candle.',
          "Endings aren't gloomy. They're the last page, and I like a tidy last page.",
          "Change comes for everyone. I'd rather meet it with a clean collar.",
          "I don't fear endings. I fear the speeches that go with them.",
        ],
        [],
        [
          ['I heard somebody once cleared out a whole wardrobe in a single afternoon.', 'Rumour has it they felt lighter and slightly cold.', 'They say it was the best decision they ever regretted.'],
          ["Rumour has it a very old habit was given up one morning, quite without ceremony.", 'I heard nobody noticed for a week.', 'That, I am told, was the part that stung.'],
        ],
      ),
      reversed: reading(
        [
          "I'm not keen on change, and I've been called stubborn for it.",
          'Some things are over and refuse to be told.',
          "I've clung to a few things long past their best. Cheese included.",
          'I keep waiting for things to end properly, and they keep not.',
          "I've sat through more goodbyes than a railway platform.",
          'Letting go is easy to say over dinner.',
        ],
        [],
        [
          ["I heard somebody kept every birthday card they were ever sent.", 'Rumour has it there is a box for each year, labelled.', 'Nobody has dared suggest a tidy-up.'],
          ["Rumour has it a farewell was held twice, because the first one didn't take.", "I'm told the second was even more awkward.", 'The guest of honour is still around.'],
        ],
      ),
    },
    'hanged-man': {
      upright: reading(
        [
          'Sometimes you have to stop pushing and see what the day does instead.',
          "I've found that looking at things upside down helps. Mostly with the soup.",
          "Waiting is an underrated skill, and I've been practising.",
          'I let go of a lot, years ago. It was surprisingly light.',
          'A change of view costs nothing and is worth several dinners.',
          'Giving up a little control is freeing, or so I tell myself.',
        ],
        [],
        [
          ['I heard somebody once gave up a long-held argument halfway through dinner.', 'Rumour has it everyone was too surprised to pick it up again.', 'They say the soup was better that night.'],
          ["Rumour has it a very stubborn person once agreed to wait, for no reason anyone could name.", "I'm told it was the calmest they've ever been.", 'The reason has never come out.'],
        ],
      ),
      reversed: reading(
        [
          "I've been stuck on the same problem for years. We've become close.",
          'Sacrifice is lovely when someone else is making it.',
          'I let go of things I should have held, and held things I should have let go.',
          'Standing still looks wise until it\'s just standing still.',
          "I keep saying I'll move on. The armchair keeps saying otherwise.",
          "I've waited so long for things to improve that I've forgotten what I was waiting for.",
        ],
        [],
        [
          ["My son has had a run of bad luck, I'm told.", 'Rumour has it the family has stopped covering what he owes.', "I heard he's been cut out of the will, or near enough."],
          ['I heard somebody once gave up a great deal, and has been mentioning it ever since.', 'Rumour has it nobody asked them to.', 'The sacrifice, I am told, was mostly a hat.'],
        ],
      ),
    },
    moon: {
      upright: reading(
        [
          "I dream of this house sometimes, and it's always bigger.",
          "I'm never sure what I saw as a child, only how it felt.",
          'Old memories are like old coats: warm, and slightly the wrong shape.',
          'I wonder if I invented half my childhood. It was a good half.',
          'I can never tell if a feeling is a memory or a draught.',
          'Half the things I recall happened, and the other half deserved to.',
        ],
        [],
        [
          ['I heard somebody once swore they saw a strange light at the window as a child.', 'Rumour has it nobody else ever did.', 'They still check, every year, just in case.'],
        ],
      ),
      reversed: reading(
        [
          "I don't trust my memory, and I trust other people's less.",
          "I've told a story so often I can't find the real one underneath.",
          'Half-truths keep better than whole ones, I find.',
          'I get frightened of shadows I put there myself.',
          "I'd swear to an old memory in the dark and take it back by lamplight.",
          'I frighten myself with dreams, and then blame the cheese.',
        ],
        [],
        [
          ['Rumour has it a family story has been told so often that it has changed twice.', 'I heard the original is nothing like the version people prefer.', 'Nobody wants to be the one to check.'],
        ],
      ),
    },
  },
  greetings: {
    cold: ['Make it quick.', 'Fine, sit down.'],
    warm: ['Oh, hello. Do sit down.', 'Back again? Good.', 'Come in, come in.'],
  },
};

// Closing lines for face-to-face questioning (placeholders). No names, no
// placeholders; said to her. `innocent` is the narrator/cat voice, the others
// are the guest speaking.
export const faceLines = {
  innocent: [
    "It all lines up. Maybe they're innocent.",
    "Every answer held together. I can't fault a word of it.",
    'Nothing here is out of place. Perhaps you have the wrong person.',
    'The story is tidy and the nerves are steady. That is rarely a guilty mix.',
    'No cracks anywhere. This one may simply be telling the truth.',
    'Everything checks out, down to the last detail.',
    'There is nothing here to catch. Best look elsewhere.',
    'It all fits, and not a single thing was forced. Innocent, I think.',
  ],
  confession: [
    "All right. It was me. I'm tired of pretending.",
    "You've got me. I won't insult you by denying it.",
    'Yes. I did it. There, I said it.',
    "I knew you'd work it out. I just hoped it would take longer.",
    "It was me, and I'm not proud of it.",
    "Enough. I can't keep this up. I did it.",
    "You were never going to believe the rest, so here is the truth. It was me.",
    "I'm done lying. It was me, and that's all there is to it.",
  ],
  dodge: [
    "Fine, I was there. But you'll never pin that on me.",
    "All right, I wasn't telling the whole truth. That proves nothing.",
    "So I fibbed a little. It doesn't make me guilty.",
    "Yes, I was nearby. Being nearby is not a crime.",
    "You caught me out. Still, you've got the wrong idea about the rest.",
    "I'll give you that one. You haven't got the rest.",
    "Very clever. I'll admit the slip, and nothing more.",
    "Fine, I stretched the truth. You still can't prove a thing.",
  ],
  retort: [
    "That doesn't contradict anything.",
    "I don't see how that changes what I said.",
    "That fits my story perfectly well, thank you.",
    "Is that all? It doesn't prove anything of the sort.",
    "You'll have to do better than that.",
    "That says nothing against me. Try again.",
    "I've said nothing that clashes with that.",
    "I'm afraid that doesn't catch me out at all.",
  ],
};

// PLACEHOLDER COPY for the Theme content session, for the campaign opening
// (`src/game/opening.ts`). Kept outside `Content` so it never changes a case.
// No card, guest, room or weapon names. Victim lines are about feelings and
// never say where anyone was. Placeholders: `{victim}`; `{n}`, `{total}`,
// `{names}` in the skip copy; `{room}` and `{scene}` in `dragMarks`.
export const victimLines = {
  debt: [
    'I owed {victim} more than I ever let on.',
    "{victim} never mentioned the money. That was somehow worse than being asked.",
  ],
  rival: [
    "{victim} and I never agreed on anything. I'd have missed the arguing, I suppose.",
    "Everyone assumed {victim} and I couldn't stand each other. They were mostly right.",
  ],
  fondness: [
    "I was fonder of {victim} than I ever said. That's the trouble with saying things late.",
    'I always meant to tell {victim} how much I liked them. I kept it for a better moment.',
  ],
  family: [
    '{victim} was family. You do not get to choose that, and I would not have.',
    "Families are complicated, and {victim} was one of mine. I'm still sorting out how I feel.",
  ],
} as const;

export const opening = {
  culprit: 'Someone in this room is the culprit.',
  connectors: [
    'The cat has been watching all evening. It has opinions.',
    'Nobody has said much yet. That will not last.',
    'Everyone has gone quiet. It is a very loud sort of quiet.',
    'Somebody here knows more than they are saying.',
  ],
  catIntro: [
    'The house cat pads over and sits at your feet. It looks as though it has something to show you.',
    'The cat appears at your elbow, tail up, with the air of someone who has already solved it.',
    'A soft meow from the rug. The cat has been busy, and wants you to know.',
  ],
  catClueLead: 'The cat drops something at your feet.',
  skipTitle: 'Skip the introductions?',
  skipBody: 'Every clue still goes in your casebook. {n} of {total} guests have spoken so far.',
  skipMissed: 'You have not yet heard from {names}.',
  finished: 'That is everyone. Now it is time to look around.',
  disperse: 'The guests go their own ways.',
  dragMarks: 'The body was found in the {room}, but drag marks on the floor lead back to the {scene}.',
} as const;
