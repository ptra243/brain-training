import type { TalkCard } from '../../engine/types.ts';
import { reading } from './reading.ts';

export const magician: TalkCard = {
  upright: reading(
    [
      'A good trick is about making them look the other way. Works on relatives too.',
      "I'm only here to entertain, truly. The applause is a bonus.",
      'Everything is possible with the right patter. Some things with the right lighting.',
      'I can always find a way, given a moment and a sturdy sleeve.',
      "Skill is just practice that learned to smile. I've practised the smile too.",
      "Give me an audience of one and I'll still give the full show.",
    ],
    [
      "Give me a pack of cards and I'll make a room full of friends. Give me two and I'll make a rival.",
      'A coin from behind the ear wins over the most doubtful audience.',
      "I've pulled flowers from sleeves, coins from ears and once, by mistake, a sock.",
      "My top hat has a false bottom. So does my patter, but that's a trade secret.",
    ],
    [
      ['I heard a coin trick once got a very sulky child to laugh.', 'Rumour has it the child grew up to be quite a serious person.', 'They still ask for the coin back, I am told.'],
      ['Rumour has it a chosen card once turned up baked inside a pie.', 'I heard the cook was furious and the guests were delighted.', "Nobody has ever explained how, and I'm told nobody wants to."],
    ],
  ),
  reversed: reading(
    [
      "I never plan the second half of a trick. That's what the first half is for.",
      "I've bet on worse odds than this and won, twice, which is exactly the problem.",
      'A little sleight of hand never hurt anyone. Usually. Mostly the same person.',
      'Charm is persuasion without the brakes.',
      "I've talked my way out of worse than this, or into it. It's hard to tell.",
      "Honesty is a lovely trick. I've never managed to make it look natural.",
    ],
    [
      "The trick is never in the hands. It's in the questions. I stopped asking mine.",
      "I've owed money to better gamblers than anyone here. They all wanted it back too.",
      'My best trick is leaving before the applause turns into questions.',
      'I once made a whole deck vanish. The debt that came with it was less obliging.',
    ],
    [
      ['Rumour has it a trick once went wrong in front of a very important audience.', "I heard the audience applauded anyway, which was somehow worse.", 'The patter that followed, I am told, was magnificent.'],
      ["I heard a wager was once made on a trick that hadn't been invented yet.", 'Rumour has it it was invented on the spot, and very nearly worked.', "The loser, I'm told, still insists on a rematch."],
    ],
  ),
  objects: {
    candlestick: {
      upright: [
        'Strange how a candlestick can vanish and turn up where it was.',
        'Rumour has it a guest once borrowed it for a trick, and gave it back warm.',
        'It has always seemed a little too eager to return.',
      ],
      reversed: [
        'That candlestick has sold itself twice to two different families.',
        'I heard it was lost once in a card game and won back before anyone counted the silver.',
        "The one on show isn't the real one.",
      ],
    },
    rope: {
      upright: [
        'That rope was cut in half once in front of a whole dinner party, and came back in one piece.',
        'Rumour has it the trick was taught by a travelling performer who never gave a name.',
        "I'm told nobody has worked out the knot since.",
      ],
      reversed: [
        'That rope was meant for an escape act that went rather badly.',
        'I heard the knots held far better than anyone intended.',
        'Rumour has it the act was retired, and the rope was kept.',
      ],
    },
    poison: {
      upright: [
        'That poison once had a part in a stage act, playing itself.',
        'Rumour has it the bottle was swapped for coloured water before every show.',
        'I heard the audience never knew which one they were watching.',
      ],
      reversed: [
        'That poison was sold once as a cure for bad luck.',
        "I heard the buyer's luck got no better, and the buyer got no refund.",
        'Rumour has it the seller is still selling it to anyone who asks nicely.',
      ],
    },
  },
};
