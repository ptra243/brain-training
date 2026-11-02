// Motive threads: one guest on one card, in one reading (docs/motive-outlines.xlsx).
// When a guest rolls a pair listed here, this replaces the card's shared thread.
// Beats are said by the guest, in order: the story, how the room treats them,
// then why talk points at them. `{victim}` is the victim's name, always at the
// start of a sentence (names read "The Host"). Same rules as every thread: no
// card, guest, room or weapon names, no times or alibis.

import type { TalkContent } from '../../engine/types.ts';

export const motives: TalkContent['motives'] = [
  // The Lawyer (id `financier`): guarded questioning, `asks` are her line before each beat.
  {
    suspect: 'financier',
    card: 'devil',
    reversed: false,
    asks: [
      "You must know what's in the will.",
      'One of the guests told me exactly what\'s in the will. How would they know that?',
      '{victim} is dead.',
    ],
    thread: [
      "Every word. I've been this family's lawyer for twenty years. I hold the will, the prenup and the shareholders' agreement. People are always very polite to me.",
      "Did they. People ask to see it. One did, once, and paid for my time. Lawyers get struck off for less, so I'd be grateful if you didn't repeat that.",
      "A death sends a family straight to its paperwork. Whoever paid me will be nervous now, and nervous people talk. I'd very much like them not to. I can hear how that sounds.",
    ],
  },
  {
    suspect: 'financier',
    card: 'devil',
    reversed: true,
    asks: [
      'How did you come to work for this family?',
      'I overheard someone say you owe somebody here. They sounded pleased about it.',
      '{victim} is dead. Does that settle it?',
    ],
    thread: [
      'Twenty years ago they needed a lawyer quickly, and I needed a client. Nothing more romantic than that.',
      "Twenty years ago I agreed to one favour, for the family's account. No paper, no questions, whenever asked. It was called in this spring, and that's all you're getting.",
      "That depends who held it, and I won't say. If it was {victim}, I'm free for the first time in twenty years. If it wasn't, I still owe it. You'll notice I'm not telling you which.",
    ],
  },
  {
    suspect: 'financier',
    card: 'emperor',
    reversed: false,
    asks: [
      "You're handling the sale for the family?",
      "Someone told me you're holding up the sale.",
      '{victim} is dead. What happens to the sale?',
    ],
    thread: [
      "The family's side of it. I've spent twenty years arranging this company to pass neatly to an heir. Every share, every trust, every signature. It's the best work I've ever done.",
      "I'm thorough, and they call it slow. This family is nearly all my firm's work, and a buyer brings its own lawyers. If the sale closes, eleven people lose their jobs, and I'm one of them. So every page gets read twice.",
      "It stops. No buyer signs for a company in the middle of a murder inquiry. I couldn't have slowed it better myself.",
    ],
  },
  {
    suspect: 'financier',
    card: 'emperor',
    reversed: true,
    asks: [
      'People keep talking about a will. Is there one?',
      'Someone said a new will was signed this year.',
      '{victim} is dead. Will anyone ask about the will now?',
    ],
    thread: [
      'There is, in the safe. Signed, witnessed and none of your business.',
      "Suppose one was. Suppose it cut out someone who did nothing to deserve it, and suppose it never reached the safe. I'd call that a kindness. A court would call it something else.",
      "After a death, everyone asks about wills. Someone will want that safe opened, and will want to know if that's all there is. I'd do a good deal to make sure it is.",
    ],
  },
  {
    suspect: 'financier',
    card: 'justice',
    reversed: false,
    asks: [
      "You didn't look like you were enjoying yourself at dinner.",
      'Does client legal privilege have any exceptions? For a murder, say?',
      '{victim} is dead. Does your rule still hold?',
    ],
    thread: [
      "I'm not paid to enjoy this family. I'm paid to listen to them and keep quiet. Client legal privilege. Whatever they tell me, I take to the grave.",
      "Only a crime that hasn't happened yet. Once it's done, I can't repeat a word, however bad it was. And some of it was bad. I've sat across a table from one client every Christmas for twenty years, knowing what they did.",
      "It holds for the dead too, so I can't tell you whether {victim} was that client. I can tell you I've spent twenty years wishing someone would do what the law couldn't. Make of that what you like.",
    ],
  },
  {
    suspect: 'financier',
    card: 'justice',
    reversed: true,
    asks: [
      'You look tired.',
      'Someone told me you lost a lot of money last year.',
      "{victim} is dead. What about the buyer's checks?",
    ],
    thread: [
      "It's been a long year. The sale, and now the buyer wants to see the family trust. I sign for it once a year, and nobody has ever asked before.",
      'Someone reads the business pages. It was a sure thing, I was told. It took everything I had. And every cent will be back in the trust before the buyer\'s accountants look, so you can stop staring.',
      'Postponed, naturally. A murder inquiry buys me a few months, and a few months is all I\'ve ever needed. Things are going to turn. I said that last year as well.',
    ],
  },
  // The Fixer (id `butler`): guarded questioning, `asks` are her line before each beat.
  {
    suspect: 'butler',
    card: 'hierophant',
    reversed: false,
    asks: [
      "You've been here longer than most of the family.",
      "I overheard someone say the company pays your wife's family double for those nuts.",
      'And now {victim} is dead.',
    ],
    thread: [
      "Thirty years. I started on the wrapping line at seventeen. These days I look after the suppliers, which mostly means one hazelnut orchard. Every bar we've ever made has their nuts in it.",
      "Whoever said it is right. I met my wife at my first harvest, and I've gone back every autumn since. We pay well because their nuts are why the bar tastes the way it does. The buyer's people have already said they'll switch to cheaper ones.",
      "{victim} is dead, and nobody's selling anything this weekend. Every month the sale waits is another harvest for my wife's family. I know exactly how that sounds.",
    ],
  },
  {
    suspect: 'butler',
    card: 'hierophant',
    reversed: true,
    asks: [
      "Everyone says you're the one who makes problems go away.",
      "Someone told me the police looked into the company's books once, and the case vanished in a week.",
      '{victim} is dead. Was that one of your problems?',
    ],
    thread: [
      "That's a nice way of putting it. Someone has a problem, they bring it to me, and after a while they don't have it any more. It's mostly paperwork. Most things are.",
      "It didn't vanish. The boss rang me the night it started, and I spent a week making sure there was nothing to find. There wasn't. Nobody has asked me how since. That's the job.",
      "If {victim} had become a problem for this family, everyone at this table knows who'd have been asked to deal with it. I'm aware of that. So is everyone else.",
    ],
  },
  {
    suspect: 'butler',
    card: 'emperor',
    reversed: false,
    asks: [
      'Who actually runs this company?',
      'I noticed the boss checks with you before answering anything about the company.',
      '{victim} is dead. Does that change who gets the top job?',
    ],
    thread: [
      "The boss's name is on the box. I just make sure there's something in it. Suppliers, staff, the machines, the bank. If it breaks, I fix it.",
      "Thirty years will do that. When hazelnut prices doubled, the plan that saved us was mine. The boss presented it and took the applause at the Christmas party. I clapped along. I'm good at clapping.",
      "Any death in this family moves the pieces around. Fewer voices at the table, and the boss with more on their mind than tradition. I'd be a fool not to see who that might help.",
    ],
  },
  {
    suspect: 'butler',
    card: 'emperor',
    reversed: true,
    asks: [
      'What happens to this place without you?',
      'Nobody else seems to know the supplier passwords, or how the safe opens. Only you.',
      '{victim} is dead. Does that change anything for you?',
    ],
    thread: [
      'Five years ago the boss tried to find out. Brought in a new manager, very clever, lovely suit. Lasted six weeks.',
      "Not on purpose. Nobody else ever bothered to learn. The boss's kids? One left, and the other has spent eight years being \"nearly ready\". Someone has to hold the keys.",
      'There was talk of replacing me once the sale went through. A death puts every plan on hold, that one included. Funny how things work out.',
    ],
  },
  {
    suspect: 'butler',
    card: 'high-priestess',
    reversed: false,
    asks: [
      "You don't seem surprised by much.",
      "I've been going through the old files. Every form from the year of the fire has your signature on it. Only yours.",
      "{victim} is dead, and there's a sale on the table.",
    ],
    thread: [
      "Twenty years here does that. I've seen this company nearly go under twice. The second time, the old factory burned down and the insurance paid for the new one. Lucky, everyone said.",
      "I was twenty-two, and proud to be trusted with it. The delivery notes, the night log, the insurance claim. Nobody asked me to sign anything else that year. I've only lately wondered why.",
      "The buyer's lawyers were going to start on the old files next week. With a death in the house, nobody's buying anything for a while, and those files stay in their boxes. I can see what that looks like.",
    ],
  },
  {
    suspect: 'butler',
    card: 'high-priestess',
    reversed: true,
    asks: [
      'Does anyone here have a reason to be scared of you?',
      "Someone said you keep copies of everything. Including the factory's waste reports.",
      '{victim} is dead. What happens to your copies now?',
    ],
    thread: [
      "Scared is a strong word. Careful, maybe. I've been here a long time, and I read everything that crosses my desk. People forget that.",
      "Then someone has been in my desk. Yes. The river below the factory has been dead for ten years. I never reported it. I mentioned once to the boss that I'd kept copies, and my job has been very safe since.",
      "There are two kinds of people at this table: the ones who'd pay to keep those reports quiet, and the ones who'd love them in a newspaper. {victim} was one or the other. Either way, my copies are worth more now.",
    ],
  },
  // The Elder heir (id `elder-heir`): settled 2026-11-03.
  {
    suspect: 'elder-heir',
    card: 'chariot',
    reversed: false,
    asks: [
      "Everyone says this place will be yours one day.",
      "I saw an order for a new production line. It's signed by you, not the company.",
      "{victim} is dead. What happens to the announcement?",
    ],
    thread: [
      "Everyone has said that for eight years. I've been \"nearly ready\" since I was twenty-four. In the meantime I do the job, and there's always someone standing between me and the title.",
      "It's for the new range, and it's the right call. The bank wanted security, so I put up my own flat. The moment I'm named at breakfast, the company takes it over, and nobody will remember it was ever a risk.",
      "Nothing happens, and that's my problem. Nobody hands over a company in a house full of police, and the bank won't wait as politely as I have. This is the worst week it could have happened.",
    ],
  },
  {
    suspect: 'elder-heir',
    card: 'chariot',
    reversed: true,
    asks: [
      "You don't look like you're celebrating.",
      "I overheard someone say a doctor was asked whether your father is still fit to run things.",
      "{victim} is dead. Where does that leave you?",
    ],
    thread: [
      "Fifty years, and a speech about how he did it all himself. I've waited eight years for my father to step aside, and he keeps finding reasons not to. Someone has to move him.",
      "Asked, not told. He forgets meetings, he repeats himself, and he's about to give a company away over breakfast. If I were the one who asked, I'd call it looking after the business. I imagine you'd call it pushing him out.",
      "Everyone in this house is watching everyone else now. If it comes out what I've been asking for, they'll say I was clearing the way, one person at a time. I know how that sounds.",
    ],
  },
  {
    suspect: 'elder-heir',
    card: 'empress',
    reversed: false,
    asks: [
      "What would you change, if it were yours?",
      "Someone told me people the company let go last year are still being paid.",
      "{victim} is dead. What does that mean for your workshop?",
    ],
    thread: [
      "Less sugar, more cocoa, smaller bars. It's what people buy now, and the numbers say so. My father tried one of mine and said it tasted like a tax.",
      "Not by the company, as far as the company knows. Six of the best people we ever had are in a little workshop, making the bars my father won't. It comes out of my budget, if you squint. The buyer's accountants won't squint.",
      "No sale this weekend, so nobody checks my budget. Six people keep their jobs a while longer. I'd never have wished for it, but I won't pretend it doesn't help.",
    ],
  },
  {
    suspect: 'elder-heir',
    card: 'empress',
    reversed: true,
    asks: [
      "Do you ever stop working?",
      "You keep a hand on your back when you stand up.",
      "{victim} is dead. What happens to the announcement now?",
    ],
    thread: [
      "Not in eight years. If I slow down, I've lost interest. If I don't, I'm hard work. Nobody says either of those to the men in this family.",
      "Eight years at a desk. Fine. If you've guessed, keep it to yourself. In this family a woman with a baby is \"stepping back\", and I'd never be allowed to step forward again.",
      "It waits, and I can't. In a few months nobody will need to guess. I needed my name on that door before then.",
    ],
  },
  {
    suspect: 'elder-heir',
    card: 'devil',
    reversed: false,
    asks: [
      "The lawyer goes very quiet whenever you come near.",
      "I found a loan statement with your name on it. The amount made me sit down.",
      "{victim} is dead. Does that worry you?",
    ],
    thread: [
      "Lawyers are paid to be quiet. That one knows what everyone here is worth on paper, me included, and enjoys it.",
      "I needed a way out in case they never let me in, so I started something of my own. The lenders asked what I'd inherit, and I gave them a generous figure. I happen to know exactly how generous.",
      "Now there'll be police and lawyers going through everybody's affairs, and mine won't stand up to much going through. I'd rather nobody looked closely at anything for a while.",
    ],
  },
  {
    suspect: 'elder-heir',
    card: 'devil',
    reversed: true,
    asks: [
      "What do you make of the buyer?",
      "One of the guests told me the buyer has the real figures, not the published ones.",
      "{victim} is dead. Is your deal off?",
    ],
    thread: [
      "Clever, patient, and the only person this weekend who has asked what I think. That shouldn't be rare in my own family.",
      "Then somebody in the family gave them. My father has had eight years to hand me this company. If he won't, I'll run it for whoever he sells it to, and they'll know exactly who made that possible.",
      "It stops, and an inquiry reads everyone's messages. Mine with the buyer won't look much like family loyalty. I'd have liked the sale to go through first.",
    ],
  },
];
