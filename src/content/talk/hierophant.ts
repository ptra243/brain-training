import type { TalkCard } from '../../engine/types.ts';
import { reading } from './reading.ts';

export const hierophant: TalkCard = {
  upright: reading(
    [
      "There's a right way of doing things, and it's usually written down. Somewhere. Probably in a drawer nobody can find.",
      'Tradition holds a house together. Mostly by being too heavy to move.',
      'I keep my word, and expect the same. It saves on paperwork.',
      'Manners are the rules everyone agreed on, then forgot they\'d agreed to.',
      'The old ways have lasted this long for a reason. Usually that nobody had the nerve to change them.',
      'A proper household runs on habit. Habit is just a rule that stopped arguing.',
    ],
    [
      "I know where every key in this house is kept. That's all I'll say.",
      'I polish the silver myself. Some traditions are worth the elbow grease.',
      "I've laid this table the same way for years. The forks know where to go before I do.",
      'I was trained by someone who was trained by someone who did it properly. I take that seriously.',
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
      "I follow the rules to the letter. It's amazing what the letter doesn't cover.",
      "Tradition says a great deal. I've learned to quote only the useful parts.",
    ],
    [
      "I've been asked to look the other way more than once. I have excellent peripheral vision.",
      "It isn't my place to say what the household books really say. It is my place to read them.",
      'Some bottles in the wine cellar are better left uncounted.',
      "I've served this family through every scandal, and in the same tone of voice.",
      'My uniform has never had a crease. My conscience has a few.',
    ],
    [
      ['I heard a rule was once invented on the spot to settle an argument.', 'Rumour has it it was written up afterwards to look old.', 'It has been quoted solemnly ever since.'],
      ['Rumour has it a list of exceptions is kept, and that it is longer than the list of rules.', "I'm told the exceptions all belong to the same few people.", 'Nobody has asked who wrote them down.'],
    ],
  ),
  objects: {
    knife: {
      upright: [
        "That knife was carried in a procession once, I'm told, for a feast day.",
        'Rumour has it it was blessed alongside the bread.',
        "The family still lowers its voice when it's mentioned.",
      ],
      reversed: [
        "That knife has been 'blessed' three times, by three different men.",
        'I heard the blessings were sold by the slice.',
        'Nobody has dared ask for a refund.',
      ],
    },
    candlestick: {
      upright: [
        "The candlestick was blessed once, I'm told, by a visiting bishop.",
        'Rumour has it a vow was made over it, long ago.',
        'Whoever breaks that vow, the family says, will not sleep easy.',
      ],
      reversed: [
        'The candlestick was never blessed. Somebody paid for the story.',
        'I heard the bishop was no bishop at all.',
        'The family would rather that stayed in the drawer.',
      ],
    },
    poison: {
      upright: [
        "That poison was an old family remedy for rats, I'm told.",
        'Rumour has it the label was written out in the same careful hand for three generations.',
        'Custom says it belongs on the highest shelf, and custom is rarely questioned here.',
      ],
      reversed: [
        'That poison was once sold to the family as a tonic, with a very solemn blessing.',
        'I heard the recipe was called sacred, which kept anyone from reading it.',
        'Nobody has had the nerve to throw out something so holy.',
      ],
    },
  },
};
