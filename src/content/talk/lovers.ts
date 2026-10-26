import type { TalkCard } from '../../engine/types.ts';
import { reading } from './reading.ts';

export const lovers: TalkCard = {
  upright: reading(
    [
      "I'm a sucker for a happy ending. Even other people's.",
      'Some things are worth the fuss, which is usually where the fuss comes from.',
      "I've been told I wear my heart on my sleeve. It's hard on the laundry.",
      'Love is mostly noticing, and then pretending you haven\'t.',
      'A good match is hard to find and impossible to arrange. I\'ve tried.',
      'I believe in following the heart, and then checking where the exits are.',
      "I still keep the first note anyone ever passed me. It says 'pass the salt'.",
      'Two people who suit each other make a whole evening warmer.',
    ],
    [],
    [
      ['I heard somebody once arranged a match between two people who then refused to speak to each other.', 'Rumour has it they married other people, separately, out of spite.', 'The matchmaker takes full credit.'],
      ['Rumour has it a wedding toast once went on for so long that the cake collapsed.', 'I heard the couple were quietly grateful.', 'It is still the best-attended wedding anyone remembers.'],
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
      "I've answered a proposal with 'we'll see'. We saw.",
      'Romance is wonderful right up until someone has to choose the wallpaper.',
    ],
    [],
    [
      ['I heard an engagement was called off over the choice of hymns.', 'Rumour has it nobody has ever said which hymns.', 'The ring, I am told, is still in a drawer.'],
      ['Rumour has it a letter was written, and torn up, and written again.', "I'm told the third version was the worst.", 'It is probably still being carried about.'],
    ],
  ),
  objects: {
    wrench: {
      upright: [
        'A wrench is a romantic object, if you know the story.',
        'Rumour has it two people met over a dripping tap and have never agreed on anything since.',
        "They're still very fond of each other, in a thorough way.",
      ],
      reversed: [
        'That wrench was left on a windowsill in a huff.',
        'I heard it was thrown, though it missed.',
        'The tap is still dripping, and so is the feeling.',
      ],
    },
    vase: {
      upright: [
        'That vase was a wedding present, and the only one both sides agreed on.',
        'Rumour has it it was nearly returned twice, once by each of them.',
        'It has outlasted the toaster and two sets of curtains.',
      ],
      reversed: [
        'That vase was a love token, sent back without a note.',
        'I heard it went back and forth by post for a whole summer.',
        'In the end neither would claim it, so the house kept it.',
      ],
    },
    rope: {
      upright: [
        'That rope is said to have tied the actual knot at a wedding, for a photograph.',
        "Rumour has it the couple couldn't get it undone and went to the reception attached.",
        'They say it was the closest they ever were.',
      ],
      reversed: [
        'That rope was used in a parlour tug-of-war between two suitors.',
        'I heard the prize left with a third party while they pulled.',
        'Both suitors still claim they were winning.',
      ],
    },
  },
};
