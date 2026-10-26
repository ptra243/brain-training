import type { TalkCard } from '../../engine/types.ts';
import { reading } from './reading.ts';

export const devil: TalkCard = {
  upright: reading(
    [
      'Everyone here wants something. I simply make it possible.',
      'I never forget a favour, or a debt. I do forget birthdays.',
      "It's only business, my dear. It's always only business.",
      "I like to be useful to people who can't manage without me. It's a hobby.",
      'Temptation is only an offer. Nobody is made to accept. That\'s rather the charm.',
      "I can find anyone exactly what they want. The bill comes later, and it's very reasonable at first.",
      'Nobody has ever regretted an introduction from me. Not out loud.',
      'People are happiest when they owe a little. It gives them a reason to write.',
    ],
    [
      'A loan is just friendship with terms and conditions.',
      "I keep a little book of who owes what. It's the only book in the family anyone reads twice.",
    ],
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
      "I said yes once without reading the small print. I've been reading it ever since.",
      'Getting out of a bargain is harder than getting in. Nobody puts that on the invitation.',
      'I keep telling myself I could stop whenever I liked. I keep not liking.',
    ],
    [
      "Some debts can't be settled the way they used to be. I read the post nervously.",
      "I've lent to the wrong people, and been repaid in other ways. I sleep with the lamp on.",
      "My accounts balance beautifully. It's the people in them who don't.",
    ],
    [
      ["I heard an old bargain is about to come due, and nobody will say whose.", 'Rumour has it the terms were never written down.', 'That, I am told, is the worrying part.'],
      ['Rumour has it a favour was called in recently, and not gently.', "I'm told the answer was a very long pause.", 'Nobody has been the same colour since.'],
    ],
  ),
  objects: {
    knife: {
      upright: [
        "That knife was part of a bargain once, I'm told.",
        'Rumour has it it changed hands for a favour nobody could name.',
        'The family considers it a fair price.',
      ],
      reversed: [
        'That knife came with strings, they say.',
        "I heard a debt was settled with it that wasn't quite a debt.",
        "Folk who've been offered it tend to owe someone afterwards.",
      ],
    },
    rope: {
      upright: [
        'Rope is just a way of making a promise hold.',
        'Rumour has it a deal was once sealed with one end each.',
        'People remember a deal like that.',
      ],
      reversed: [
        'That rope has been used to hold more than boxes.',
        'I heard it kept someone to a bad bargain.',
        "They still won't look at it.",
      ],
    },
    poison: {
      upright: [
        "That poison came into the family as part of a deal, I'm told.",
        'Rumour has it the other side wanted the label more than the bottle.',
        'Nobody has ever been sure who got the better end.',
      ],
      reversed: [
        'That little bottle of poison has been promised to three different people, they say.',
        'I heard each of them was told it was a secret.',
        "It's the only promise in the house nobody has tried to collect.",
      ],
    },
  },
};
