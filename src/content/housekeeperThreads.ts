// The Housekeeper's hour: what the hired staff bring back about each guest.
//
// One thread per guest, three steps (one per round). Each step is one event seen three ways:
// what the bar heard (gossip), what housekeeping saw lying about (detail), what the handyman
// noticed (physical). She only ever sees one side of a step, so any mix must read as one story.
//
// DRAFT, written from a placeholder secret per guest until docs/secrets.md is content. Rules:
// - True and innocent whoever the killer is; each thread has an innocent ending (the comment
//   above it) that the end of the case must tell her.
// - Never a weapon, violence, another guest's name, or where anyone is at nine.
// - `line` is the speech bubble, under 60 characters. `pre` + answer + `post` is her statement;
//   the answer and decoys are things a picture could show.
// - No guest gender except the Host, Hostess, Uncle, the heirs and the Fixer (docs/story.md).
import type { ThreadStep } from './housekeeperHour.ts';

export const housekeeperThreads: Readonly<Record<string, readonly ThreadStep[]>> = {
  // The speech keeps changing. Ending: he is announcing a gift to the staff, not a new heir.
  host: [
    {
      gossip: { line: "He asked who's coming to hear the speech.", pre: '{guest} asked me who was coming to hear the ', post: '.', answer: 'speech', decoys: ['concert', 'sermon'] },
      detail: { line: 'His speech notes are half crossed out.', pre: "Half of {guest}'s ", post: ' were crossed out.', answer: 'speech notes', decoys: ['accounts', 'postcards'] },
      physical: { line: "He's pacing. There's a track worn in the rug.", pre: '{guest} had paced a track into the ', post: '.', answer: 'rug', decoys: ['lawn', 'stairs'] },
    },
    {
      gossip: { line: 'He asked me if a toast can be bad news.', pre: '{guest} asked me whether a ', post: ' could be bad news.', answer: 'toast', decoys: ['telegram', 'birthday card'] },
      detail: { line: "A new first page. The old one's in the bin.", pre: "The old first page of {guest}'s speech was in the ", post: '.', answer: 'bin', decoys: ['teapot', 'piano'] },
      physical: { line: 'His reading glasses are snapped clean in two.', pre: '{guest} had snapped his ', post: ' in two.', answer: 'reading glasses', decoys: ['pencil', 'walking stick'] },
    },
    {
      gossip: { line: "He says it ends with a name nobody expects.", pre: '{guest} said the speech would end with a ', post: ' nobody expected.', answer: 'name', decoys: ['song', 'conjuring trick'] },
      detail: { line: "The speech is one page now, sealed in an envelope.", pre: "{guest}'s speech was down to one page, sealed in an ", post: '.', answer: 'envelope', decoys: ['biscuit tin', 'hatbox'] },
      physical: { line: "He's put on his jacket, with a flower in the lapel.", pre: '{guest} had put a ', post: ' in his lapel.', answer: 'flower', decoys: ['medal', 'feather'] },
    },
  ],

  // Things are leaving the house. Ending: she has given them to the school's sale, as a surprise.
  hostess: [
    {
      gossip: { line: 'She asked what a painting like that might fetch.', pre: '{guest} asked me what a ', post: ' like that might fetch.', answer: 'painting', decoys: ['piano', 'grandfather clock'] },
      detail: { line: 'A little notebook, with a list of the furniture.', pre: '{guest} had a notebook with a list of the ', post: '.', answer: 'furniture', decoys: ['wines', 'neighbours'] },
      physical: { line: "Dust on her gloves. She's been up in the attic.", pre: '{guest} had dust on her gloves from the ', post: '.', answer: 'attic', decoys: ['coal cellar', 'greenhouse'] },
    },
    {
      gossip: { line: 'She asked if the van could come before breakfast.', pre: '{guest} asked whether the ', post: ' could come before breakfast.', answer: 'van', decoys: ['doctor', 'piano tuner'] },
      detail: { line: 'A stack of paper labels, each with a number.', pre: '{guest} had a stack of numbered ', post: '.', answer: 'paper labels', decoys: ['raffle tickets', 'playing cards'] },
      physical: { line: 'Three tea chests in the passage, nailed shut.', pre: 'Three ', post: ' stood in the passage, nailed shut.', answer: 'tea chests', decoys: ['suitcases', 'picnic hampers'] },
    },
    {
      gossip: { line: "She says it all goes to the school. Not a word.", pre: '{guest} said it was all going to the ', post: ', and I was not to say a word.', answer: 'school', decoys: ['bank', 'museum'] },
      detail: { line: "A receipt book. Every page says 'gift'.", pre: "Every page of {guest}'s receipt book said ", post: '.', answer: 'gift', decoys: ['sold', 'owed'] },
      physical: { line: 'The chests are gone. Tyre tracks on the gravel.', pre: 'The chests were gone, and there were ', post: ' on the gravel.', answer: 'tyre tracks', decoys: ['hoof prints', 'feathers'] },
    },
  ],

  // He looks ready to leave tonight. Ending: he was fetching a surprise visitor from the station.
  butler: [
    {
      gossip: { line: 'He asked for a taxi firm that runs after midnight.', pre: '{guest} asked me for a ', post: ' firm that runs after midnight.', answer: 'taxi', decoys: ['removal', 'laundry'] },
      detail: { line: 'A folder with a red label, kept face down.', pre: '{guest} kept a ', post: ' with a red label face down.', answer: 'folder', decoys: ['ledger', 'photograph'] },
      physical: { line: 'His overnight bag is packed, by the door.', pre: "{guest}'s ", post: ' was packed and waiting by the door.', answer: 'overnight bag', decoys: ['toolbox', 'picnic basket'] },
    },
    {
      gossip: { line: 'He rang the taxi. He booked it for two.', pre: '{guest} booked the taxi for ', post: '.', answer: 'two people', decoys: ['one person', 'four people'] },
      detail: { line: "The folder's gone. A train timetable instead.", pre: "{guest}'s folder was gone, and a ", post: ' lay in its place.', answer: 'train timetable', decoys: ['road map', 'wine list'] },
      physical: { line: "His bag's in the car boot. The boot's still open.", pre: "{guest}'s bag was in the ", post: ', which was still open.', answer: 'car boot', decoys: ['wheelbarrow', 'coal shed'] },
    },
    {
      gossip: { line: "He cancelled it. 'She's coming by train instead.'", pre: '{guest} cancelled the taxi and said someone was coming by ', post: ' instead.', answer: 'train', decoys: ['boat', 'bicycle'] },
      detail: { line: 'The folder is back, with a ribbon round it.', pre: "{guest}'s folder was back, with a ", post: ' round it.', answer: 'ribbon', decoys: ['padlock', 'belt'] },
      physical: { line: "The bag's back indoors, and his shoes are wet.", pre: "{guest}'s bag was back indoors, and his ", post: ' were wet.', answer: 'shoes', decoys: ['gloves', 'spectacles'] },
    },
  ],

  // Money trouble. Ending: the debt was an old friend's, and the watch paid it off.
  financier: [
    {
      gossip: { line: '{guest} asked me if the phone line is private.', pre: '{guest} asked me whether the ', post: ' was private.', answer: 'phone line', decoys: ['summerhouse', 'wine cellar'] },
      detail: { line: 'A briefcase with two locks, both shut.', pre: '{guest} had a ', post: ' with two locks, both shut.', answer: 'briefcase', decoys: ['violin case', 'sewing box'] },
      physical: { line: "The briefcase catch has been forced before.", pre: "The briefcase had a ", post: ' that had been forced before.', answer: 'catch', decoys: ['hinge', 'handle'] },
    },
    {
      gossip: { line: "{guest} was on the phone: 'Friday. I promise.'", pre: '{guest} promised someone on the phone it would be ', post: '.', answer: 'Friday', decoys: ['Christmas', 'next year'] },
      detail: { line: 'The briefcase is open. Letters with red borders.', pre: 'The briefcase was open, full of letters with red ', post: '.', answer: 'borders', decoys: ['ribbons', 'wax seals'] },
      physical: { line: 'Torn envelopes, pushed down the side of a chair.', pre: '{guest} had pushed torn ', post: ' down the side of a chair.', answer: 'envelopes', decoys: ['napkins', 'banknotes'] },
    },
    {
      gossip: { line: '{guest} asked me what a pocket watch is worth.', pre: '{guest} asked me what a ', post: ' is worth.', answer: 'pocket watch', decoys: ['fountain pen', 'wedding ring'] },
      detail: { line: 'A pawn ticket, used as a bookmark.', pre: '{guest} was using a ', post: ' as a bookmark.', answer: 'pawn ticket', decoys: ['bus ticket', 'pressed flower'] },
      physical: { line: 'A watch chain on the waistcoat, and no watch.', pre: "{guest}'s watch chain had no ", post: ' on the end of it.', answer: 'watch', decoys: ['whistle', 'key'] },
    },
  ],

  // Out digging in the storm. Ending: a tin he and the victim buried as boys.
  uncle: [
    {
      gossip: { line: 'He grumbled about the old family shares.', pre: '{guest} grumbled about the old family ', post: '.', answer: 'shares', decoys: ['recipes', 'portraits'] },
      detail: { line: 'An old photo album, open at the factory.', pre: '{guest} had an old photo album open at the ', post: '.', answer: 'factory', decoys: ['seaside', 'wedding'] },
      physical: { line: "His umbrella's dripping. He's been out already.", pre: "{guest}'s ", post: ' was dripping, so he had been out already.', answer: 'umbrella', decoys: ['fishing net', 'top hat'] },
    },
    {
      gossip: { line: 'He asked who has the key to the old gate.', pre: '{guest} asked me who had the key to the old ', post: '.', answer: 'gate', decoys: ['boathouse', 'clock tower'] },
      detail: { line: 'One photograph is missing from the album.', pre: 'One ', post: " was missing from {guest}'s album.", answer: 'photograph', decoys: ['stamp', 'pressed leaf'] },
      physical: { line: 'Mud to his knees, and a spade by the door.', pre: '{guest} was muddy to the knees and had left a ', post: ' by the door.', answer: 'spade', decoys: ['ladder', 'fishing rod'] },
    },
    {
      gossip: { line: "He said, 'Forty years, and it was still there.'", pre: '{guest} said that after ', post: ' years it was still there.', answer: 'forty', decoys: ['two', 'a hundred'] },
      detail: { line: 'A rusty biscuit tin on his knee, lid off.', pre: '{guest} had a rusty ', post: ' on his knee with the lid off.', answer: 'biscuit tin', decoys: ['bird cage', 'lantern'] },
      physical: { line: "Earth under his nails, and he's smiling.", pre: '{guest} had ', post: ' under his nails and was smiling.', answer: 'earth', decoys: ['ink', 'flour'] },
    },
  ],

  // Practising her father's handwriting. Ending: a copy of the founder's first recipe, as a present.
  'elder-heir': [
    {
      gossip: { line: 'She asked which pen her father always uses.', pre: '{guest} asked me which ', post: ' her father always uses.', answer: 'pen', decoys: ['armchair', 'teacup'] },
      detail: { line: "Old letters of her father's, laid out in rows.", pre: "{guest} had laid out her father's old ", post: ' in rows.', answer: 'letters', decoys: ['medals', 'neckties'] },
      physical: { line: "Cocoa dust on her cuffs. She's been at the factory.", pre: '{guest} had ', post: ' on her cuffs from the factory.', answer: 'cocoa dust', decoys: ['chalk', 'soot'] },
    },
    {
      gossip: { line: 'She asked if old paper can be bought new.', pre: '{guest} asked me whether old ', post: ' can be bought new.', answer: 'paper', decoys: ['wine', 'lace'] },
      detail: { line: 'A sheet of his signature, over and over.', pre: "{guest} had a sheet covered in her father's ", post: ', over and over.', answer: 'signature', decoys: ['portrait', 'thumbprint'] },
      physical: { line: 'Ink on her fingers, and blotting paper everywhere.', pre: '{guest} had ', post: ' all over her fingers.', answer: 'ink', decoys: ['jam', 'glue'] },
    },
    {
      gossip: { line: 'She says it needs a frame before the speech.', pre: '{guest} said it needed a ', post: ' before the speech.', answer: 'frame', decoys: ['stamp', 'witness'] },
      detail: { line: 'One sheet kept in her laptop bag. The rest torn up.', pre: '{guest} kept one sheet in her ', post: ' and tore up the rest.', answer: 'laptop bag', decoys: ['shoe', 'umbrella'] },
      physical: { line: 'Her hands are scrubbed pink. Not a spot of ink.', pre: '{guest} had scrubbed her ', post: ' pink.', answer: 'hands', decoys: ['boots', 'spectacles'] },
    },
  ],

  // Cards for money. Ending: a tournament he ran to buy his sister's birthday present.
  'younger-heir': [
    {
      gossip: { line: 'He asked me what beats a full house.', pre: '{guest} asked me what beats a ', post: '.', answer: 'full house', decoys: ['pair of twos', 'joker'] },
      detail: { line: 'A pack of cards, and a list of initials.', pre: '{guest} had a pack of cards and a list of ', post: '.', answer: 'initials', decoys: ['recipes', 'train times'] },
      physical: { line: 'His phone is cracked, and it never stops buzzing.', pre: "{guest}'s cracked ", post: ' never stopped buzzing.', answer: 'phone', decoys: ['alarm clock', 'doorbell'] },
    },
    {
      gossip: { line: "He said, 'Double or nothing, after pudding.'", pre: '{guest} said it would be double or nothing after ', post: '.', answer: 'pudding', decoys: ['breakfast', 'church'] },
      detail: { line: 'Numbers beside the initials now. Big ones.', pre: '{guest} had written big ', post: ' beside the initials.', answer: 'numbers', decoys: ['hearts', 'question marks'] },
      physical: { line: "His pockets jingle. He's emptied the coin jar.", pre: '{guest} had emptied the ', post: ' into his pockets.', answer: 'coin jar', decoys: ['sugar bowl', 'button box'] },
    },
    {
      gossip: { line: 'He asked me to keep the winnings behind the bar.', pre: '{guest} asked me to keep the ', post: ' behind the bar.', answer: 'winnings', decoys: ['trophy', 'goldfish'] },
      detail: { line: "A fat envelope, marked 'for Saturday'.", pre: "{guest} had a fat envelope marked 'for ", post: "'.", answer: 'Saturday', decoys: ['the vet', 'the vicar'] },
      physical: { line: "The coin jar's back, empty. He's in a paper crown.", pre: '{guest} was wearing a ', post: '.', answer: 'paper crown', decoys: ['false beard', 'eye patch'] },
    },
  ],

  // Measuring up the estate. Ending: a glasshouse, a gift to the house, not a land grab.
  conjurer: [
    {
      gossip: { line: '{guest} keeps hunting for a phone signal.', pre: '{guest} kept hunting for a ', post: '.', answer: 'phone signal', decoys: ['corkscrew', 'lost glove'] },
      detail: { line: 'A tablet, and a map of the estate.', pre: '{guest} had a tablet and a ', post: ' of the estate.', answer: 'map', decoys: ['painting', 'jigsaw'] },
      physical: { line: "Grass seeds on {guest}'s cuffs. Been in the field.", pre: '{guest} had ', post: ' on both cuffs.', answer: 'grass seeds', decoys: ['sawdust', 'feathers'] },
    },
    {
      gossip: { line: '{guest} was on the phone, pricing a field.', pre: '{guest} was on the phone asking the price of a ', post: '.', answer: 'field', decoys: ['racehorse', 'lighthouse'] },
      detail: { line: 'A measuring tape, and numbers on the map now.', pre: '{guest} had written numbers on the map, beside a ', post: '.', answer: 'measuring tape', decoys: ['telescope', 'egg timer'] },
      physical: { line: 'Muddy wooden pegs, sticking out of a coat pocket.', pre: '{guest} had muddy ', post: ' sticking out of a coat pocket.', answer: 'wooden pegs', decoys: ['teaspoons', 'carrots'] },
    },
    {
      gossip: { line: "{guest} says we won't know the meadow by spring.", pre: '{guest} said that by spring we would not know the ', post: '.', answer: 'meadow', decoys: ['harbour', 'village'] },
      detail: { line: 'A drawing of a big glass roof, rolled up tight.', pre: '{guest} had rolled up a drawing of a big ', post: '.', answer: 'glass roof', decoys: ['stone bridge', 'windmill'] },
      physical: { line: '{guest} is wet to the knees, and very pleased.', pre: '{guest} was wet through to the ', post: ' and very pleased.', answer: 'knees', decoys: ['elbows', 'collar'] },
    },
  ],

  // On a case already. Ending: the missing teaspoons were the cat's doing.
  detective: [
    {
      gossip: { line: '{guest} asked how many teaspoons we started with.', pre: '{guest} asked me how many ', post: ' we started with.', answer: 'teaspoons', decoys: ['umbrellas', 'pillows'] },
      detail: { line: "A notebook page headed 'Missing', with a list.", pre: "{guest}'s notebook had a page headed '", post: "'.", answer: 'Missing', decoys: ['Shopping', 'Birthdays'] },
      physical: { line: "Bits of hedge in {guest}'s hair. Been outside.", pre: '{guest} came in with bits of ', post: ' in their hair.', answer: 'hedge', decoys: ['straw', 'cobweb'] },
    },
    {
      gossip: { line: '{guest} asked me where the cat sleeps at night.', pre: '{guest} asked me where the ', post: ' sleeps at night.', answer: 'cat', decoys: ['gardener', 'postman'] },
      detail: { line: 'A sketch in the notebook, of little paw prints.', pre: '{guest} had sketched little ', post: ' in the notebook.', answer: 'paw prints', decoys: ['boot prints', 'thumbprints'] },
      physical: { line: '{guest} is crawling about the floor with a torch.', pre: '{guest} was crawling about the floor with a ', post: '.', answer: 'torch', decoys: ['butterfly net', 'ruler'] },
    },
    {
      gossip: { line: "{guest} said, 'I have my thief. A small one.'", pre: '{guest} said the thief was a ', post: ' one.', answer: 'small', decoys: ['tall', 'noisy'] },
      detail: { line: 'A saucer of cream left on the floor, as bait.', pre: '{guest} had left a saucer of ', post: ' on the floor as bait.', answer: 'cream', decoys: ['mustard', 'marbles'] },
      physical: { line: "Scratches on {guest}'s hand, and a pleased look.", pre: '{guest} had ', post: ' on one hand and a pleased look.', answer: 'scratches', decoys: ['a mitten', 'a bandage'] },
    },
  ],
};
