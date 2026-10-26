import type { TalkCard } from '../../engine/types.ts';
import { reading } from './reading.ts';

export const moon: TalkCard = {
  upright: reading(
    [
      "I dream of this house sometimes, and it's always bigger.",
      "I'm never sure what I saw as a child, only how it felt.",
      'Old memories are like old coats: warm, and slightly the wrong shape.',
      'I wonder if I invented half my childhood. It was a good half.',
      'I can never tell if a feeling is a memory or a draught.',
      'Half the things I recall happened, and the other half deserved to.',
      'In the dark every corridor looks like a different one.',
      'Some nights I wake up certain of something, and by breakfast it has gone.',
    ],
    [],
    [
      ['I heard somebody once swore they saw a strange light at the window as a child.', 'Rumour has it nobody else ever did.', 'They still check, every year, just in case.'],
      ["Rumour has it an old portrait's eyes were once seen to follow a guest about.", 'I heard the guest moved the portrait rather than themselves.', 'It has been slightly crooked ever since.'],
    ],
  ),
  reversed: reading(
    [
      "I don't trust my memory, and I trust other people's less.",
      "I've told a story so often I can't find the real one underneath.",
      'Half-truths keep better than whole ones, I find.',
      'I get frightened of shadows I put there myself.',
      "I'd swear to an old memory in the dark and take it back by lamplight.",
      'I frighten myself with dreams, and then blame the cheese.',
      "I've mistaken a coat on a hook for a stranger more than once.",
      'Things look surer in the morning, though not always truer.',
    ],
    [],
    [
      ['Rumour has it a family story has been told so often that it has changed twice.', 'I heard the original is nothing like the version people prefer.', 'Nobody wants to be the one to check.'],
      ['I heard a sleepwalker once wrote a long letter and posted it before waking.', 'Rumour has it the reply was very confused.', 'They have been writing to each other happily ever since.'],
    ],
  ),
  objects: {
    candlestick: {
      upright: [
        'That candlestick is said to burn bluer when rain is on the way.',
        'Rumour has it a guest saw a face in the flame once.',
        'They put it down to the wine.',
      ],
      reversed: [
        'That candlestick has a way of leaving shadows where none belong.',
        'I heard a guest swore it moved, and was laughed at.',
        'Nobody laughed the second time.',
      ],
    },
    poison: {
      upright: [
        'That bottle of poison glows a little in the dark, or so people insist.',
        'Rumour has it a child once mistook it for a nightlight.',
        'It went up to a higher shelf the next morning, and the story grew.',
      ],
      reversed: [
        'That bottle has an old label nobody can quite read.',
        'I heard three people have guessed what it says, and all three were sure.',
        'None of them agreed.',
      ],
    },
    knife: {
      upright: [
        "That knife is said to reflect a face that isn't in the room.",
        'Rumour has it a guest polished it twice to be sure.',
        'They took up a different hobby afterwards.',
      ],
      reversed: [
        'That knife went missing for a year and came back to the wrong drawer.',
        'I heard everyone swore they had already looked there.',
        'Nobody trusts that drawer now.',
      ],
    },
  },
};
