import type { TalkCard } from '../../engine/types.ts';
import { reading } from './reading.ts';

export const justice: TalkCard = {
  upright: reading(
    [
      "A good detective notices what doesn't fit. Mostly it's my own hat.",
      'Facts first, then theories, then a very good sit-down.',
      'I weigh everything twice. Once for the evidence, once for the cut of the coat.',
      "I like a pair of scales that balances. I like it better when I'm the one reading them.",
      "A clue is just a fact that hasn't been introduced properly yet.",
      "Fair is fair, even when it's inconvenient. Especially then, really.",
      'Everyone deserves a hearing. Some deserve a short one.',
    ],
    [
      'I always start with the hands. Hands never learned to lie.',
      "I've solved cases with less than a dinner and a draughty hallway.",
      'Some people here call themselves detectives. I call myself right.',
    ],
    [
      ['I heard a case was once solved from a single dropped glove.', 'Rumour has it the glove belonged to the person who solved it.', 'It was returned with a very short note.'],
      ["I heard someone once turned down a reward because a case wasn't closed to their liking.", 'Rumour has it they reopened it themselves, unpaid.', 'The answer was the same, but far better documented.'],
    ],
  ),
  reversed: reading(
    [
      'I never change my mind. I merely reach the right conclusion before the facts do.',
      'Evidence is a lovely thing, once it agrees with me.',
      'I trust my instincts. Frankly, they\'re better qualified than the evidence.',
      "I've a theory, and I'd hate to waste it on facts.",
      "I can tell who's guilty by the way they hold a teacup. Nobody has ever asked me to prove it.",
      'Fairness is overrated when you already know the answer.',
      "I'd rather be decisive than right. It's quicker, and nobody checks.",
      "Doubt is for people with time on their hands. I've other plans for mine.",
    ],
    [
      'A detective with doubts is just a witness with a notebook.',
      "I've never been wrong. A few cases have been wrong about me.",
    ],
    [
      ['Rumour has it a famous case was once decided before anyone had arrived.', 'I heard the facts were fetched afterwards.', 'They fitted beautifully, I am told.'],
      ['I heard an innocent party was once accused very confidently indeed.', 'Rumour has it the apology was a good deal less confident.', "I'm told it came by post."],
    ],
  ),
  objects: {
    knife: {
      upright: [
        "That knife has been weighed in every kind of argument, I'm told.",
        'Rumour has it a cook demanded a proper hearing over it.',
        'The matter was settled fairly, which satisfied no one.',
      ],
      reversed: [
        'That knife has been blamed for a lot over the years.',
        'I heard it was never given a fair hearing.',
        "It's easier to blame the knife.",
      ],
    },
    poison: {
      upright: [
        "That poison was once the evidence in a very long trial, I'm told.",
        'Rumour has it the jury asked to see the bottle three times.',
        'It turned out to be exactly what the label said, which disappointed everyone.',
      ],
      reversed: [
        'That bottle of poison has been blamed for things it never did, they say.',
        'I heard it was once accused over an upset stomach that turned out to be the oysters.',
        'Nobody apologised to the bottle.',
      ],
    },
    wrench: {
      upright: [
        "That wrench once settled a quarrel between two neighbours over a leaking pipe, I'm told.",
        'Rumour has it each side was sent exactly half the bill.',
        'The pipe, at least, was satisfied.',
      ],
      reversed: [
        'That wrench was found guilty of breaking a boiler it never touched, they say.',
        'I heard the plumber got off with a warning.',
        'It has not been allowed near a boiler since.',
      ],
    },
  },
};
