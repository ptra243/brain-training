// Words for case names ("The Black Dahlia Scandal at Ashcombe"). A name is
// another way to write a case code, so it can be typed back to replay the case.
// Never change, reorder or add to these lists: every saved or remembered name
// would then point at a different case (a test pins a few names).
// Kept out of `content` so they never change which words a puzzle may use.

import type { CaseNameWords } from '../engine/caseRef.ts';

export const caseNameWords: CaseNameWords = {
  // 100 of each: colours, then other descriptors.
  adjectives: [
    'amber', 'apricot', 'azure', 'black', 'blue', 'blush', 'bronze', 'burgundy', 'cherry', 'chestnut',
    'cinnamon', 'cobalt', 'copper', 'coral', 'crimson', 'damson', 'ebony', 'emerald', 'fawn', 'garnet',
    'gold', 'golden', 'green', 'grey', 'honey', 'indigo', 'ivory', 'jade', 'lemon', 'lilac',
    'magenta', 'maroon', 'mauve', 'mint', 'mulberry', 'ochre', 'olive', 'opal', 'orange', 'peach',
    'pearl', 'pink', 'plum', 'purple', 'red', 'rose', 'ruby', 'russet', 'saffron', 'sable',
    'sapphire', 'scarlet', 'silver', 'tawny', 'teal', 'topaz', 'turquoise', 'vermilion', 'white', 'yellow',
    'crooked', 'curious', 'drowned', 'faded', 'fallen', 'forgotten', 'frosted', 'gilded', 'hidden', 'hollow',
    'hushed', 'lonely', 'lost', 'lucky', 'midnight', 'misty', 'moonlit', 'mournful', 'painted', 'quiet',
    'restless', 'secret', 'shadowed', 'silent', 'silken', 'sleeping', 'smoky', 'stolen', 'stormy', 'strange',
    'sunken', 'tangled', 'thirteenth', 'twilight', 'veiled', 'velvet', 'wandering', 'whispering', 'wicked', 'wild',
  ],
  // Cats, then flowers.
  nouns: [
    'tabby', 'kitten', 'tomcat', 'mouser', 'whisker', 'paw', 'purr', 'pounce', 'calico', 'siamese',
    'persian', 'manx', 'moggy', 'puss', 'catnip', 'catmint', 'mouse', 'yarn', 'collar', 'cushion',
    'basket', 'pawprint', 'claw', 'kitty', 'alleycat', 'prowler', 'sardine', 'kipper', 'mittens', 'tuxedo',
    'bengal', 'burmese', 'sphynx', 'ragdoll', 'abyssinian', 'cheshire', 'lynx', 'ocelot', 'panther', 'puma',
    'bobcat', 'leopard', 'jaguar', 'tiger', 'lion', 'cougar', 'cheetah', 'serval', 'caracal', 'wildcat',
    'anemone', 'aster', 'azalea', 'begonia', 'bellflower', 'bluebell', 'buttercup', 'camellia', 'carnation', 'clover',
    'cornflower', 'cowslip', 'crocus', 'cyclamen', 'daffodil', 'dahlia', 'clematis', 'edelweiss', 'foxglove', 'freesia',
    'gardenia', 'geranium', 'heather', 'hollyhock', 'honeysuckle', 'hyacinth', 'iris', 'jasmine', 'larkspur', 'lavender',
    'lily', 'lupin', 'magnolia', 'marigold', 'mimosa', 'narcissus', 'nasturtium', 'orchid', 'pansy', 'peony',
    'periwinkle', 'petunia', 'poppy', 'primrose', 'snapdragon', 'snowdrop', 'sunflower', 'sweetpea', 'verbena', 'wisteria',
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
