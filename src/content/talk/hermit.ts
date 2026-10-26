import type { TalkCard } from '../../engine/types.ts';
import { reading } from './reading.ts';

export const hermit: TalkCard = {
  upright: reading(
    [
      'I prefer my own company, and the quiet that comes with it. It rarely interrupts.',
      'Age teaches you who to trust. Not many, in the end. Fewer at dinner.',
      "I don't need much from anyone here. A chair, mostly.",
      'A short conversation and a long silence suit me best.',
      "I've learned more from sitting still than from any lecture.",
      "People think quiet means I'm not listening. It means I've finished listening.",
      "I keep to myself. It's the only company that never asks for the salt.",
      'A good lamp, a good book and a closed door. I ask for nothing more and usually get less.',
    ],
    [
      "There's an old quarrel in this family, and I'd as soon let it lie. It's the one thing in the house that's stayed put.",
      "I've watched this family grow up, mostly from a safe distance. I recommend it.",
    ],
    [
      ['I heard somebody once walked out of a family gathering and nobody noticed until the pudding.', 'Rumour has it that was the point.', 'They say it was the most peaceful pudding anyone can remember.'],
      ["I'm told there is a chair that nobody else sits in.", 'Rumour has it nobody remembers why.', 'It is, apparently, the best chair.'],
    ],
  ),
  reversed: reading(
    [
      "Oh, don't mind me. I'll just fade into the wallpaper, as ever.",
      'I shall say nothing. Loudly, and at length.',
      'I would leave, but then who would sigh at the lot of you?',
      "Solitude is lovely until it's all you're offered. Then it's a performance.",
      "Nobody ever asks what I think. I've got it all written down, just in case.",
      "I'm perfectly happy alone. I'd just like someone to notice how happy.",
      "I once went off to sulk and came back to find nobody had noticed. I'm still sulking about that.",
    ],
    [
      "I've nursed that old quarrel a long while. It keeps me warm.",
      'I was here before most of them, and I intend to be insufferable about it.',
      'My relations visit me the way people visit a draughty ruin: once, out of duty, in a good coat.',
    ],
    [
      ['I heard a letter once went unanswered for a very long time.', "Rumour has it the reply was written, and kept, and rewritten.", 'It was never sent, out of principle.'],
      ["Rumour has it someone stormed out of a family gathering years ago and left their coat.", "I'm told the coat has been kept, brushed, every year since.", 'Nobody will say if that is spite or hope.'],
    ],
  ),
  objects: {
    candlestick: {
      upright: [
        'That candlestick is said to have belonged to someone who liked to read alone.',
        "Rumour has it they burnt through a hundred candles before they'd share one.",
        'The house has been a little dimmer since.',
      ],
      reversed: [
        'Nobody likes to say who that candlestick was left burning for.',
        'I heard a letter was read by it and never answered.',
        'The wax is still there.',
      ],
    },
    wrench: {
      upright: [
        "That wrench was left behind by someone who didn't stay long.",
        'Rumour has it they preferred fixing things to talking.',
        'The house is a good deal quieter for it.',
      ],
      reversed: [
        'Nobody asked who left that wrench, or why they left.',
        'I heard there was a quarrel, and a door slammed.',
        'It has sat untouched ever since.',
      ],
    },
    vase: {
      upright: [
        "That vase was given to someone who never had visitors to show it to, I'm told.",
        'Rumour has it they kept a single flower in it and talked to the flower.',
        'I heard it was the best conversation in the house.',
      ],
      reversed: [
        'That vase was sent back to the family still in its paper once, they say.',
        "Rumour has it the note with it said only 'No, thank you.'",
        'It has been passed along ever since, from one recluse to the next.',
      ],
    },
  },
};
