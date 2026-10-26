import type { TalkCard } from '../../engine/types.ts';
import { reading } from './reading.ts';

export const chariot: TalkCard = {
  upright: reading(
    [
      "I don't wait for things to happen. I tap them on the shoulder.",
      "Fortune favours the early riser, and I've been up since the invention of breakfast.",
      'Eyes forward, hands steady, clear road ahead. A person can dream.',
      "I'd rather be doing than talking, and I'm doing an awful lot of talking.",
      "Give me a goal and I'll be halfway there before anyone has found the map.",
      'I like a race. I like it even more once I know I have won it.',
      "Steering is easy. It's the passengers who make it difficult.",
    ],
    [
      'One day this will all be mine, and I intend to have it properly organised.',
      "I've been practising being in charge since I could walk. The walking was the harder part.",
      "This family needs someone to take the reins. I've been holding them out for years, just in case.",
    ],
    [
      ['I heard somebody once drew up a plan for the whole family, uninvited.', 'Rumour has it it was colour-coded.', "I'm told it now holds a door open very nicely."],
      ['I heard someone once organised a family wedding down to the last sandwich.', 'Rumour has it the happy couple were handed a timetable.', 'They were, I am told, married exactly on schedule.'],
    ],
  ),
  reversed: reading(
    [
      "I've never met a speed limit I respected.",
      "Brakes are for people who aren't sure where they're going.",
      "I won't be told to wait. I never did learn how.",
      "If there's a shortcut, I've already taken it and sent back for the luggage.",
      'Patience is a virtue. So is getting there first.',
      "I've charged through more polite conversations than I can count. They had it coming.",
      'Slow down, they tell me. I tell them to keep up.',
    ],
    [
      "Being next in line is a dreadful thing to be. I'd like to skip the line.",
      "I've been promised this house since I was small. Promises have a way of ageing.",
      "Everyone keeps saying my turn will come. I'd like a firmer date.",
    ],
    [
      ['Rumour has it a promise was made long ago about who would be in charge one day.', 'I heard it was said in front of the wrong person.', 'It has been repeated, with improvements, ever since.'],
      ['Rumour has it someone once rearranged the family portraits in order of importance.', 'I heard their own ended up at the front.', 'The portraits went back, but nobody has forgotten.'],
    ],
  ),
  objects: {
    knife: {
      upright: [
        "That knife was a prize once, I'm told.",
        'Rumour has it it was won in a race nobody else knew they were running.',
        'It has been polished to within an inch of its life ever since.',
      ],
      reversed: [
        'That knife has cut a few corners in its time, they say.',
        "I heard it once opened a letter before it was anyone's turn to read it.",
        'The letter, apparently, was worth the hurry.',
      ],
    },
    candlestick: {
      upright: [
        "That candlestick was meant to light the way for the next in line, I'm told.",
        'Rumour has it it was handed down with a short speech about duty.',
        'The speech has been handed down too, and grows longer each time.',
      ],
      reversed: [
        'Nobody waits for that candlestick to be lit properly, they say.',
        'I heard it was once marched up and down the stairs to hurry a party along.',
        'The wax went everywhere. The party did not hurry.',
      ],
    },
    wrench: {
      upright: [
        "That wrench once kept a very old hoist running, I'm told.",
        'Rumour has it nobody else was allowed near the works.',
        'It still goes beautifully, mostly in one direction.',
      ],
      reversed: [
        'That wrench once made a slow old hoist rather faster than it was built to be, they say.',
        'I heard it went beautifully until the trays arrived first.',
        'Rumour has it the cook was less impressed.',
      ],
    },
  },
};
