import type { TalkCard } from '../../engine/types.ts';
import { reading } from './reading.ts';

export const death: TalkCard = {
  upright: reading(
    [
      'Everything comes to an end sooner or later. Usually the pudding first.',
      "I've learned to let things go. The house has learned to let me.",
      'A clean break is kinder than a slow fade. Ask any soufflé.',
      "Endings aren't gloomy. They're the last page, and I like a tidy last page.",
      "Change comes for everyone. I'd rather meet it with a clean collar.",
      "I don't fear endings. I fear the speeches that go with them.",
      "I've shut up more rooms than I've opened. Dust sheets are very restful.",
      'Every ending clears a little space, and I have always valued space.',
    ],
    [],
    [
      ['I heard somebody once cleared out a whole wardrobe in a single afternoon.', 'Rumour has it they felt lighter and slightly cold.', 'They say it was the best decision they ever regretted.'],
      ['Rumour has it a very old habit was given up one morning, quite without ceremony.', 'I heard nobody noticed for a week.', 'That, I am told, was the part that stung.'],
    ],
  ),
  reversed: reading(
    [
      "I'm not keen on change, and I've been called stubborn for it.",
      'Some things are over and refuse to be told.',
      "I've clung to a few things long past their best. Cheese included.",
      'I keep waiting for things to end properly, and they keep not.',
      "I've sat through more goodbyes than a railway platform.",
      'Letting go is easy to say over dinner.',
      'I keep things in case they come back into fashion. Some have, twice.',
      'I say goodbye properly, and then I find another reason to stay.',
    ],
    [],
    [
      ['I heard somebody kept every birthday card they were ever sent.', 'Rumour has it there is a box for each year, labelled.', 'Nobody has dared suggest a tidy-up.'],
      ["Rumour has it a farewell was held twice, because the first one didn't take.", "I'm told the second was even more awkward.", 'The guest of honour is still around.'],
    ],
  ),
  objects: {
    rope: {
      upright: [
        "That rope once carried a coffin down the stairs, I'm told, very gently.",
        'Rumour has it it was kept afterwards out of respect.',
        'Nobody in the house would dream of tying a parcel with it.',
      ],
      reversed: [
        "That rope has seen things it won't talk about.",
        'I heard it was used on the last day of something.',
        'The house has been waiting for it to be thrown out ever since.',
      ],
    },
    poison: {
      upright: [
        'That poison has been in the house longer than anyone now living in it.',
        'Rumour has it it was bought for rats in a hard winter.',
        'The rats left of their own accord, and the bottle stayed.',
      ],
      reversed: [
        'That bottle was meant to be thrown out at the end of an era.',
        'I heard it was put on a high shelf instead, just for now.',
        'Just for now has lasted rather a long time.',
      ],
    },
    knife: {
      upright: [
        'That knife carved the last roast of a very long tradition.',
        'Rumour has it the cook wept into the gravy and nobody minded.',
        'It has stayed in its box ever since, out of respect.',
      ],
      reversed: [
        'That knife was meant to be retired years ago.',
        'I heard it was given a farewell, with a speech.',
        'It turned up in the drawer again the following week.',
      ],
    },
  },
};
