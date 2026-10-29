// Motive threads: one guest on one card, in one reading (docs/motive-outlines.xlsx).
// When a guest rolls a pair listed here, this replaces the card's shared thread.
// Beats are said by the guest, in order: the story, how the room treats them,
// then why talk points at them. `{victim}` is the victim's name, always at the
// start of a sentence (names read "The Host"). Same rules as every thread: no
// card, guest, room or weapon names, no times or alibis.

import type { TalkContent } from '../../engine/types.ts';

export const motives: TalkContent['motives'] = [
  {
    suspect: 'financier',
    card: 'devil',
    reversed: false,
    thread: [
      "I lend money to people who can't ask their families. They're very grateful, right up until it falls due.",
      "Everyone at this table is pleasant to me. I've yet to meet one who was glad to see me arrive.",
      "{victim} owed me, and made a joke of it in front of everyone. I don't kill people who owe me. It's terrible for collections.",
    ],
  },
  {
    suspect: 'financier',
    card: 'devil',
    reversed: true,
    thread: [
      'Years ago I made a bargain on a handshake. No paper. It seemed very gentlemanly at the time.',
      "It falls due this year, and I can't remember the terms. I haven't slept properly since, and I'm told it shows.",
      '{victim} was the other hand in that handshake. Now nobody can tell me what I agreed to, and I can see how that looks.',
    ],
  },
  {
    suspect: 'financier',
    card: 'emperor',
    reversed: false,
    thread: [
      "I've asked to see this family's accounts. Done properly, that's all. You'd think I'd asked to read their letters.",
      'Nobody here likes me for asking, and I understand why. A proper look would bring the roof in.',
      '{victim} had been dragging the family name round every club in town, and I said so. Somebody has to mind. I know minding looks like a motive tonight.',
    ],
  },
  {
    suspect: 'financier',
    card: 'emperor',
    reversed: true,
    thread: [
      'There are two sets of books in this house. I have the one that is true.',
      "I don't show it to anyone. I only mention it, now and then, and watch the colour leave the room.",
      "{victim} had found out what's in it and meant to tell the table. I'd rather it came from me. It still might.",
    ],
  },
  {
    suspect: 'financier',
    card: 'hanged-man',
    reversed: false,
    thread: [
      'I put a great deal into a sure thing. It went wrong some weeks ago.',
      "I'm being very calm about it. People keep telling me how calm I am, in the voice you'd use near a ticking parcel.",
      "{victim} talked me into it. I'd have every reason to be furious, which is why I'm being so very calm.",
    ],
  },
  {
    suspect: 'financier',
    card: 'hanged-man',
    reversed: true,
    thread: [
      'The sure thing went wrong, and I covered the loss before anyone noticed.',
      'Not with my own money, you understand. It all goes back the moment things turn. Things are going to turn.',
      '{victim} never noticed the money was gone. Now nobody will, unless somebody looks.',
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
];
