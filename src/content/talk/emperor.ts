import type { TalkCard } from '../../engine/types.ts';
import { reading } from './reading.ts';

export const emperor: TalkCard = {
  upright: reading(
    [
      "I've never asked for thanks. Only that things be done properly.",
      'I like a plan. I like it even more when it\'s followed.',
      "Rules exist so that nobody has to make a scene. I've still seen several.",
      'A thing worth doing is worth doing in the proper order. I have the order written down.',
      "I don't need to be liked. Being obeyed is far less work for everyone.",
    ],
    [
      'Somebody has to run this household. The household has never volunteered.',
      'Everyone eats at my table. The least they can do is use the right fork.',
      'In my house, nobody goes without. Least of all an opinion.',
      'Head of the house is a title. I treat it as a job description.',
      'The portraits on these walls all look stern. I picked the painter for exactly that.',
    ],
    [
      ['Rumour has it a list of rules was drawn up once for the whole household.', 'I heard nobody read past the first page.', "Order, I'm told, is mostly a matter of who is holding the pen."],
      ["I'm told a decision was made once that nobody was allowed to question.", 'Rumour has it it was the right one, which only made it worse.', 'People still bring it up at dinner, in a whisper.'],
    ],
  ),
  reversed: reading(
    [
      "I don't shout. Shouting is for people who've lost control of the room.",
      "I keep a list. It's longer than anyone would like.",
      'Warmth is overrated. Efficiency has never let anybody down.',
      "I don't need anyone's approval. I do keep a note of who withholds it.",
      "Feelings are fine in their place. Their place is somewhere I'm not.",
    ],
    [
      "I've given orders in this house for years. The echo is very obedient.",
      "A host's patience is not a bottomless cellar. I've checked the bottom.",
      "I'll not be told how to run my own house. I don't raise my voice about it. I lower the temperature.",
      "My family thinks I'm stern. I prefer 'consistent', and I've told them so in writing.",
      'This house runs to my rules, down to the last teaspoon. The teaspoons have never complained.',
    ],
    [
      ['I heard an order was given once that made no sense to anyone.', 'Rumour has it it was followed to the letter, purely to make a point.', 'Nobody has dared give one like it since.'],
      ['Rumour has it a ledger of favours is kept, and not by the person who owes them.', "I'm told it's very thorough, with footnotes.", "I wouldn't like to be in it. I'd like even less to be left out."],
    ],
  ),
  objects: {
    knife: {
      upright: [
        'That knife carved the first joint ever served at this table.',
        'Rumour has it only the head of the house was ever meant to use it.',
        'It has not left its case for a lesser hand since.',
      ],
      reversed: [
        'That knife was a gift, and a poor one.',
        'I heard the giver wanted something for it.',
        'It was never used, out of spite.',
      ],
    },
    candlestick: {
      upright: [
        'That candlestick stood at the head of every great dinner this house ever gave.',
        'Rumour has it a rule was made that it be lit first and snuffed last.',
        'The house has run on it ever since, one way or another.',
      ],
      reversed: [
        'That candlestick was a gift from someone the house would rather forget.',
        'I heard it was put away whenever the head of the house was in a temper.',
        "It's been put away rather a lot.",
      ],
    },
    vase: {
      upright: [
        'That vase was the first thing bought for this house, before the furniture.',
        'Rumour has it a whole wing was planned around it.',
        "I'm told it has been dusted on a strict schedule ever since, and woe betide the schedule.",
      ],
      reversed: [
        'That vase was bought to impress a visitor who never came back.',
        'I heard nobody in the family was allowed to admit they found it ugly.',
        'It has been admired very loudly, by order, ever since.',
      ],
    },
  },
};
