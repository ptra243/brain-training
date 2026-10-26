import type { TalkCard } from '../../engine/types.ts';
import { reading } from './reading.ts';

export const hangedMan: TalkCard = {
  upright: reading(
    [
      'Sometimes you have to stop pushing and see what the day does instead.',
      "I've found that looking at things upside down helps. Mostly with the soup.",
      "Waiting is an underrated skill, and I've been practising.",
      'I let go of a lot, years ago. It was surprisingly light.',
      'A change of view costs nothing and is worth several dinners.',
      'Giving up a little control is freeing, or so I tell myself.',
      'I once gave up pudding for a whole season to prove I could. I have never needed to prove it again.',
      'Being patient with a problem is half the work. The other half is being patient with advice.',
    ],
    [],
    [
      ['I heard somebody once gave up a long-held argument halfway through dinner.', 'Rumour has it everyone was too surprised to pick it up again.', 'They say the soup was better that night.'],
      ["Rumour has it a very stubborn person once agreed to wait, for no reason anyone could name.", "I'm told it was the calmest they've ever been.", 'The reason has never come out.'],
    ],
  ),
  reversed: reading(
    [
      "I've been stuck on the same problem for years. We've become close.",
      'Sacrifice is lovely when someone else is making it.',
      'I let go of things I should have held, and held things I should have let go.',
      'Standing still looks wise until it\'s just standing still.',
      "I keep saying I'll move on. The armchair keeps saying otherwise.",
      "I've waited so long for things to improve that I've forgotten what I was waiting for.",
      "I've held out for so long that the holding out has become the point.",
      'I gave something up once, and in my own opinion I am still owed for it.',
    ],
    [],
    [
      ['I heard somebody I know has had a long run of bad luck at cards.', 'Rumour has it the relatives have quietly stopped paying the debts.', "I'm told the will has been redrafted, or near enough."],
      ['I heard somebody once gave up a great deal, and has been mentioning it ever since.', 'Rumour has it nobody asked them to.', 'The sacrifice, I am told, was mostly a hat.'],
    ],
  ),
  objects: {
    rope: {
      upright: [
        'That rope was bought from a failed enterprise at a very good price.',
        'Rumour has it its former owner lost everything but the rope.',
        'They say it was the best investment anyone ever made in this house.',
      ],
      reversed: [
        "That rope was bought in a hurry from someone who'd lost everything.",
        "I heard the sale wasn't entirely the owner's idea.",
        'Nobody asks what else came with it.',
      ],
    },
    knife: {
      upright: [
        'That knife was handed over to settle a debt, and was worth more than the debt.',
        'Rumour has it the lender was too proud to say so.',
        'They say both sides came away feeling generous.',
      ],
      reversed: [
        'That knife was bought for a grand carving that never happened.',
        'I heard the dinner was called off at the last minute, for reasons.',
        'The knife has been waiting for its moment ever since, very patiently.',
      ],
    },
    vase: {
      upright: [
        'That vase was kept upside down for years and used as a doorstop.',
        'Rumour has it a visitor crouched to read the mark and nearly fainted at the price.',
        'It has been the right way up ever since, and rather smug about it.',
      ],
      reversed: [
        'That vase was sold to pay a bill and then bought back at twice the price.',
        'I heard the dealer still laughs about it.',
        'Nobody in the house finds it quite as funny.',
      ],
    },
  },
};
