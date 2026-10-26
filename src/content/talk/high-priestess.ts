import type { TalkCard } from '../../engine/types.ts';
import { reading } from './reading.ts';

export const highPriestess: TalkCard = {
  upright: reading(
    [
      "I notice things. It's rather what I'm for.",
      'Some things are better left unsaid. Usually the interesting ones.',
      'Listening is quieter than talking, and teaches more. Also, nobody interrupts.',
      "I keep what I'm told to myself. It's the only fireproof place.",
      "People tell me things without meaning to. I've never once asked them to stop.",
      'I trust a feeling before I trust a fact. Then I check the fact.',
    ],
    [
      "A house has secrets, and I'm the one they trust. The house isn't chatty either.",
      'Every door in this house creaks differently. I know them all.',
      "I've aired every linen cupboard in this house. You'd be amazed what the linen hears.",
      "This house has its moods, and I know every one. It's been sulking since the spring cleaning.",
    ],
    [
      ['I heard somebody once confided something at dinner, very quietly.', 'Rumour has it three other people pretended not to hear.', 'None of them have mentioned it since, which is how I know it was good.'],
      ["I'm told there is a family secret that everyone knows and nobody says.", 'Rumour has it it is really quite small.', 'That is why it has lasted so long.'],
    ],
  ),
  reversed: reading(
    [
      'I know more than I ought, and I enjoy that you can tell.',
      "I could say something. I'd rather watch you wonder.",
      'Silence has a price, and I do like to be asked.',
      'Being underestimated is the nicest compliment anyone pays me.',
      "I don't gossip. I simply let other people find out at the wrong moment.",
      'Intuition is a fine thing. Mine is mostly suspicion with good manners.',
    ],
    [
      "I know where every skeleton in this house is kept. They're very well dusted.",
      "Nobody asks the quiet ones what they think. They'd be surprised.",
      "There's a cupboard in this house only I can open. I've never said which.",
      "I've cleaned up after this family for years, and not only the crumbs.",
    ],
    [
      ['Rumour has it a secret changed hands once for a very small favour.', "I heard the favour was never repaid, on purpose.", 'Whoever holds it now is enjoying themselves.'],
      ["I'm told somebody here has been keeping a very neat file on the rest of us.", 'Rumour has it nobody has seen it, which is how it stays effective.', "I'd say more, but then I'd have to keep a file."],
    ],
  ),
  objects: {
    wrench: {
      upright: [
        'The wrench lives in the one drawer nobody dusts.',
        'Rumour has it the house keeps odd tools for odder jobs.',
        'Some doors in this house only open to that.',
      ],
      reversed: [
        'Nobody asks who last oiled the wrench.',
        'I heard it was used to open a door that should have stayed locked.',
        'The key it replaced is somewhere in the house, still.',
      ],
    },
    poison: {
      upright: [
        'That poison has been kept under lock since before anyone here can remember.',
        'Rumour has it only one person was ever trusted to know what it was for.',
        "I'm told they never did tell, and seemed to enjoy that.",
      ],
      reversed: [
        'That bottle of poison was never labelled, and I heard that was deliberate.',
        'Rumour has it someone once mistook it for cordial until they sniffed the cork.',
        'Nobody in the family will say whose nose it was.',
      ],
    },
    vase: {
      upright: [
        'That vase is said to hum faintly whenever the house is about to have news.',
        'Rumour has it a fortune-teller once read the cracks in its glaze.',
        "I'm told the reading was never repeated, and nobody asked what it said.",
      ],
      reversed: [
        'That vase has a crack that nobody will admit to making.',
        'I heard it was glued back together in secret, without a word to anyone.',
        'Whoever mended it has kept the secret ever since.',
      ],
    },
  },
};
