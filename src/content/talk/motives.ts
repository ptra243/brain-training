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
];
