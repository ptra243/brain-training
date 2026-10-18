// Words for case names ("The Velvet Jackdaw Affair at Ashcombe"). A name is
// another way to write a case code, so it can be typed back to replay the case.
// Never change, reorder or add to these lists: every saved or remembered name
// would then point at a different case (a test pins a few names).
// Kept out of `content` so they never change which words a puzzle may use.

import type { CaseNameWords } from '../engine/caseRef.ts';

export const caseNameWords: CaseNameWords = {
  // 100 of each.
  adjectives: [
    'amber', 'ashen', 'bitter', 'black', 'bronze', 'broken', 'burning', 'cobalt', 'cold', 'copper',
    'cracked', 'crimson', 'crooked', 'crystal', 'curious', 'dark', 'distant', 'drowned', 'dusky', 'early',
    'ebony', 'emerald', 'empty', 'faded', 'fallen', 'final', 'forgotten', 'frosted', 'frozen', 'gilded',
    'glass', 'golden', 'green', 'grey', 'hidden', 'hollow', 'hushed', 'idle', 'iron', 'ivory',
    'jade', 'lamplit', 'last', 'late', 'lilac', 'linen', 'lonely', 'lost', 'lucky', 'marble',
    'midnight', 'misty', 'mournful', 'muddy', 'narrow', 'nervous', 'oaken', 'olive', 'painted', 'pale',
    'opal', 'pearl', 'quiet', 'ragged', 'restless', 'rose', 'ruby', 'rusty', 'sable', 'saffron',
    'sapphire', 'scarlet', 'secret', 'shadowed', 'silent', 'silken', 'silver', 'sleeping', 'slow', 'smoky',
    'sombre', 'stolen', 'stormy', 'strange', 'sunken', 'tangled', 'tarnished', 'tawny', 'thirteenth', 'twilight',
    'veiled', 'velvet', 'violet', 'wandering', 'weary', 'whispering', 'wicked', 'wild', 'winter', 'yellow',
  ],
  nouns: [
    'acorn', 'almanac', 'anvil', 'badger', 'bluebell', 'bonnet', 'bracelet', 'brooch', 'button', 'cameo',
    'canary', 'carriage', 'chessman', 'clover', 'cobweb', 'compass', 'cravat', 'crow', 'cuckoo', 'cufflink',
    'daffodil', 'domino', 'dormouse', 'dragonfly', 'falcon', 'feather', 'fiddle', 'fox', 'foxglove', 'garnet',
    'gazebo', 'goblet', 'gondola', 'gramophone', 'hare', 'harlequin', 'harp', 'hatpin', 'hedgehog', 'heron',
    'hourglass', 'beetle', 'jackdaw', 'kestrel', 'kingfisher', 'kite', 'lantern', 'lark', 'lily', 'locket',
    'magpie', 'mandolin', 'marigold', 'mermaid', 'mistletoe', 'monocle', 'moth', 'nightingale', 'nutmeg', 'orchid',
    'otter', 'owl', 'parasol', 'peacock', 'pelican', 'pendulum', 'penny', 'pheasant', 'pigeon', 'poppy',
    'quail', 'quince', 'raven', 'ribbon', 'robin', 'saucer', 'scarab', 'shilling', 'skylark', 'slipper',
    'snuffbox', 'sparrow', 'stag', 'starling', 'sundial', 'swan', 'tinderbox', 'telegram', 'thimble', 'thistle',
    'thrush', 'tiara', 'tortoise', 'toucan', 'trinket', 'tassel', 'unicorn', 'valise', 'walnut', 'wren',
  ],
  // 50 of each; a place is a start and an end ("Ash" + "combe").
  placeStarts: [
    'alder', 'ash', 'barrow', 'beech', 'bishops', 'black', 'bramble', 'briar', 'brock', 'chalk',
    'clay', 'cran', 'crow', 'dun', 'elm', 'fair', 'fox', 'glen', 'hart', 'hazel',
    'heath', 'high', 'holly', 'kings', 'lark', 'long', 'marsh', 'mill', 'moss', 'nether',
    'north', 'oak', 'old', 'pen', 'queens', 'raven', 'red', 'rook', 'rose', 'rush',
    'salt', 'sedge', 'stone', 'thorn', 'whit', 'willow', 'wind', 'wolf', 'wych', 'yarrow',
  ],
  placeEnds: [
    'bury', 'by', 'combe', 'cote', 'croft', 'dale', 'den', 'don', 'field', 'ford',
    'gate', 'ham', 'haven', 'holm', 'hurst', 'leigh', 'ley', 'mere', 'minster', 'moor',
    'mouth', 'ness', 'ridge', 'stead', 'stoke', 'thorpe', 'ton', 'wick', 'well', 'wood',
    'worth', 'brook', 'bridge', 'cliffe', 'cross', 'dean', 'end', 'fold', 'garth', 'grove',
    'hill', 'hope', 'howe', 'mead', 'pool', 'shaw', 'side', 'stow', 'wold', 'keld',
  ],
  // 18: one for each difficulty, length and cast.
  kinds: [
    'affair', 'mystery', 'riddle', 'matter', 'business', 'incident', 'enigma', 'secret', 'scandal',
    'mischief', 'problem', 'adventure', 'episode', 'conundrum', 'tragedy', 'intrigue', 'question', 'case',
  ],
};
