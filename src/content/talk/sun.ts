import type { TalkCard } from '../../engine/types.ts';
import { reading } from './reading.ts';

export const sun: TalkCard = {
  upright: reading(
    [
      'I like everyone. It saves ever so much time.',
      "Sunshine is free, you know, and I'm generous with it.",
      "I've never met a stranger, only a person I haven't made laugh yet.",
      'Worry is a waste of a perfectly good face.',
      'A smile opens more doors than a key, and it never gets lost down the sofa.',
      "Every party improves once someone laughs first. I've been volunteering for years.",
      "I was a very happy baby, I'm told, and I've seen no reason to stop.",
    ],
    [
      'My sibling takes the house terribly seriously. I take the biscuits seriously.',
      "I grew up in this house and it's always been kind to me. I've tried to return the favour.",
      "Being the youngest means everyone else has already made the mistakes. I'm very grateful to them.",
    ],
    [
      ['I heard somebody once made a whole room laugh at a funeral, very gently.', 'Rumour has it nobody minded, least of all the family.', 'They say it was the kindest thing anyone did that day.'],
      ['I heard someone once got the whole family playing charades, even the stern ones.', 'Rumour has it the stern ones were rather good.', 'Nobody will say what they were acting out.'],
    ],
  ),
  reversed: reading(
    [
      "I don't see why I should have to ask twice.",
      'Sulking is only sunshine that\'s been told no.',
      "I've never had to want something for very long, and I'm not keen on starting.",
      "It's terribly unfair when things don't go my way. I have it on good authority.",
      "I'm not spoiled. I've simply been appreciated very thoroughly.",
      "If nobody's looking at me, I assume something has gone wrong with the lighting.",
      "I don't mind sharing in the least, as long as I go first.",
    ],
    [
      'I was told I could have the run of the house. Nobody mentioned rules.',
      'My sibling gets the serious talks. I get the allowance, and I\'d like it raised.',
      'My sibling had to earn everything. I find it so tiring to watch.',
    ],
    [
      ['I heard a birthday present was once returned because it was the wrong shade.', 'Rumour has it the giver was made to apologise.', 'The shade has been named, in private, ever since.'],
      ['Rumour has it someone once sulked so hard a family party was called off.', 'I heard the sulk lasted longer than the party would have.', 'It was, by all accounts, a very accomplished sulk.'],
    ],
  ),
  objects: {
    rope: {
      upright: [
        "That rope started life as a skipping rope, I'm told.",
        'Rumour has it a whole nursery learned to count on it.',
        'Nobody ever got past twenty without giggling.',
      ],
      reversed: [
        'That rope was once used to tie a door shut during a tantrum, they say.',
        'I heard the tantrum won.',
        'The door still sticks, out of loyalty.',
      ],
    },
    candlestick: {
      upright: [
        "That candlestick has stood on every birthday table in this family, I'm told.",
        'Rumour has it a cake was once balanced on top of it for a dare.',
        'The cake survived. The tablecloth did not.',
      ],
      reversed: [
        'That candlestick was sulked at for a whole party once, they say.',
        'I heard it was the wrong height for the photographs.',
        'It was moved, and the sulk followed it.',
      ],
    },
    wrench: {
      upright: [
        "That wrench was a present for a child who wanted to build a rocket, I'm told.",
        'Rumour has it the rocket was mostly a biscuit tin.',
        'It went nowhere, and everyone clapped anyway.',
      ],
      reversed: [
        'That wrench was taken to a music box once, they say, for playing the wrong tune.',
        'I heard the music box has played nothing but the wrong tune since.',
        'Rumour has it nobody dares to mention it.',
      ],
    },
  },
};
