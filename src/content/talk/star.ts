import type { TalkCard } from '../../engine/types.ts';
import { reading } from './reading.ts';

export const star: TalkCard = {
  upright: reading(
    [
      'I believe things tend to come good, given patience and a clean tablecloth.',
      'A little hope is the cheapest thing in the house and does the most work.',
      "I like to be looked at, I'll admit it, but kindly.",
      'Wishing is free, which is why I do so much of it.',
      'Even on a grey day I assume something lovely is on its way. Usually it is the post.',
      'I tell myself things will get better. It keeps the washing-up from mattering.',
      "I'd rather be hopeful and wrong than gloomy and right. The company is better.",
      'A room brightens when you expect it to. I have tested this widely.',
    ],
    [],
    [
      ['I heard somebody once made a wish out loud and was gently told off for it.', 'Rumour has it it came true anyway, in a roundabout way.', 'They are very careful with wishes now.'],
      ['Rumour has it a performance once ended in a standing ovation for the wrong person.', 'I heard the right person was gracious about it.', 'Their smile has been rather bright since.'],
    ],
  ),
  reversed: reading(
    [
      'I wished on something once. It sent a polite refusal.',
      'Being admired is lovely. Being relied on to sparkle is a job.',
      "I've dimmed myself for company before. The company didn't notice.",
      'Hope is a lovely thing to lose in company. Everyone looks away politely.',
      "I put on a brave face. It's a good one, but it never quite fits.",
      "There's nothing like the silence after applause that doesn't come.",
      'Everyone loves a bright spark until it needs a rest.',
      'I used to make wishes in bulk. Now I make fewer, and sulk less.',
    ],
    [],
    [
      ['I heard a bright young thing was once told to tone it down.', 'Rumour has it they did, and it was noticed at once.', 'It was the dullest evening anyone remembers.'],
      ['Rumour has it a toast was prepared and then not given.', "I'm told it was very good.", 'It is probably still in a pocket somewhere.'],
    ],
  ),
  objects: {
    wrench: {
      upright: [
        'A famous performer once fixed a dressing-room tap with that wrench, to prove a point.',
        'Rumour has it a theatre company borrowed it for a prop.',
        'It got better reviews than the play.',
      ],
      reversed: [
        'That wrench was a prop in a play nobody liked.',
        'I heard it got the only good notice.',
        "It's been resting ever since.",
      ],
    },
    vase: {
      upright: [
        'That vase was filled with flowers from an admirer every week for a year.',
        'Rumour has it the admirer never signed a single card.',
        'The vase has looked hopeful ever since.',
      ],
      reversed: [
        'That vase once stood on a stage and was knocked over on opening night.',
        'I heard it was glued back so carefully that nobody can find the crack.',
        'It still flinches at applause, they say.',
      ],
    },
    poison: {
      upright: [
        'That little bottle of poison is the prettiest thing in the cupboard, which is the trouble with it.',
        'Rumour has it someone once mistook it for perfume and praised the scent at length.',
        'They have been very particular about scent ever since.',
      ],
      reversed: [
        'That poison was bought for the mice, and the mice are doing splendidly.',
        'I heard the label was written out in a very hopeful hand.',
        'The bottle has never been opened, which says something about the hope.',
      ],
    },
  },
};
