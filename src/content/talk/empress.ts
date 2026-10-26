import type { TalkCard } from '../../engine/types.ts';
import { reading } from './reading.ts';

export const empress: TalkCard = {
  upright: reading(
    [
      'I only ever wanted everyone fed and happy. Fed is the easier half.',
      "I've always looked after my own. A few of them have even noticed.",
      'A kind word costs nothing, and it goes a long way. Pudding goes further.',
      "I can't bear to see anyone go without. I'm told it's a flaw.",
      'Nobody leaves my company hungry. Some leave it slightly heavier.',
      "A house needs a few flowers and a great deal of butter. I've never been short of either.",
    ],
    [
      'A house like this should feel like a home, not a museum. Museums don\'t do seconds.',
      "There's always a spare bed and a warm plate in this house. Usually a spare hot-water bottle too.",
      "I've fed every face in this family at one time or another. A few still owe me a thank-you note.",
      "I chose every curtain in this house. They've outlasted two arguments about the curtains.",
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
      'I give and I give. I do keep rather good track of the giving.',
      "I'm not jealous. I simply notice when someone else's pudding gets more praise.",
    ],
    [
      "Some here would like to see me out of this house. They'd miss the cooking, mind.",
      'A home can feel like a cage with the wrong people in it. I do keep the door shut, for their own good.',
      "This family would fall apart without me, and I've made very sure they know it.",
      'I like the house full. Full of people who agree with me, ideally.',
    ],
    [
      ['I heard somebody was told they looked tired, three times in one evening.', 'Rumour has it that was a hint, not a kindness.', 'They have not worn that colour since.'],
      ["Rumour has it a family portrait was moved because someone didn't like the angle.", 'I heard it was a very pointed sort of gift.', 'Nobody has mentioned it since, to be safe.'],
    ],
  ),
  objects: {
    rope: {
      upright: [
        'A rope like that once held up a swing for the children.',
        'Rumour has it a child tied their first knot with it.',
        'Nobody could bear to throw it out.',
      ],
      reversed: [
        'That rope was left coiled in the cellar when the nursery closed.',
        'I heard a child was punished with it, once.',
        'Nobody speaks of the swing now.',
      ],
    },
    wrench: {
      upright: [
        'That wrench mended the nursery radiator the winter the children were small.',
        'Rumour has it it was kept wrapped in a tea towel afterwards, like something precious.',
        "I'm told the nursery was never cold again, which seems unlikely, but there it is.",
      ],
      reversed: [
        'That wrench was taken to the boiler once in a fit of temper.',
        'I heard the boiler never quite forgave the house.',
        'Rumour has it the hot water still sulks on bath nights.',
      ],
    },
    vase: {
      upright: [
        'That vase has held flowers for every christening this family ever had.',
        'Rumour has it it was never once allowed to stand empty.',
        "I'm told fresh blooms were found for it even in the hardest winter.",
      ],
      reversed: [
        'That vase was given as a peace offering after a quarrel over a wedding.',
        "I heard it was filled with the couple's least favourite flower.",
        'It has been filled with them every anniversary since, out of devotion or spite.',
      ],
    },
  },
};
