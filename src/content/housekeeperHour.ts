// Content for "the Housekeeper's hour" (prototype, stage 1; see docs/housekeeper-dispatch.md and
// .claude/handoff/housekeeper-hour-text.md). Staff, the requests guests make, what each kind of staff
// member brings back about each guest, and the lines for a repeat visit. Kept out of `Content`, like the
// cats and the talk, so it never changes a case.
//
// Placeholders in text: `{guest}` (the guest the job is for) and `{other}` (another guest at the dinner,
// picked by the seed; gossip only). Nothing here names a room, a weapon or a guest: the code fills names in.

/** What a staff member notices. Bar = gossip, housekeeping = detail, handyman = physical. */
export type StaffKind = 'gossip' | 'detail' | 'physical';

export const STAFF_KINDS: readonly StaffKind[] = ['gossip', 'detail', 'physical'];

export interface Staff {
  id: string;
  /** Placeholder names. */
  name: string;
  job: string;
  kind: StaffKind;
  /** A name for the picture, unused for now. */
  icon: string;
}

/** A job a guest can ask for. */
export interface RequestDef {
  id: string;
  /** Two to four words, as the card says them. */
  words: string;
  /** A name for the picture, unused for now. */
  icon: string;
  /** Room ids it can be asked in (a room outside the case's house is skipped), or any room. */
  rooms: readonly string[] | 'any';
  /** Guest ids who ask for it, or anyone. */
  askers: readonly string[] | 'any';
  /** The kinds of staff who are a natural fit. */
  fits: readonly StaffKind[];
  /** One funny line for each kind not in `fits`: about the staff member, never about a guest's guilt. */
  mismatch: Partial<Record<StaffKind, string>>;
}

/** What a staff member brings back about a guest: one true, innocent-looking thing. */
export interface Beat {
  /** The staff member's speech bubble (under 60 characters). */
  line: string;
  /** The statement sentence around the blank: `pre` + answer + `post`. */
  pre: string;
  post: string;
  /** Short noun phrases a picture could show. */
  answer: string;
  decoys: readonly [string, string];
}

export interface HousekeeperHourContent {
  /** The guest id of the Housekeeper: the player, who never asks and who is not a suspect's witness. */
  player: string;
  /** The room id the staff start from. A request is never in it (if the house has it). */
  baseRoom: string;
  staff: readonly Staff[];
  requests: readonly RequestDef[];
  /** PLACEHOLDER until docs/secrets.md is content: one beat per guest and kind. */
  beats: Readonly<Record<string, Readonly<Record<StaffKind, Beat>>>>;
  /** Said instead of a beat when the same kind of staff visits the same guest a second time. Cannot be ticked. */
  fallback: Readonly<Record<StaffKind, string>>;
}

const staff: readonly Staff[] = [
  { id: 'sam', name: 'Sam', job: 'Bar', kind: 'gossip', icon: 'speech' },
  { id: 'priya', name: 'Priya', job: 'Housekeeping', kind: 'detail', icon: 'eye' },
  { id: 'tom', name: 'Tom', job: 'Handyman', kind: 'physical', icon: 'wrench' },
];

const requests: readonly RequestDef[] = [
  { id: 'coffee', words: 'Black coffee', icon: 'cup', rooms: ['library', 'study', 'dining', 'games'], askers: ['financier', 'elder-heir', 'conjurer', 'detective'], fits: ['gossip'],
    mismatch: { detail: 'Tidied the cups into a neat tower and forgot the coffee.', physical: 'Took the coffee machine apart to check it worked.' } },
  { id: 'tea', words: 'Tea, please', icon: 'teacup', rooms: ['library', 'conservatory', 'bedroom'], askers: ['hostess', 'detective'], fits: ['gossip'],
    mismatch: { detail: 'Warmed the pot, then polished it instead of using it.', physical: 'Checked the kettle wiring before filling it.' } },
  { id: 'whisky', words: 'A whisky or brandy', icon: 'glass', rooms: ['study', 'library', 'games'], askers: ['host', 'uncle'], fits: ['gossip'],
    mismatch: { detail: 'Poured it, then wiped the glass so hard it squeaked.', physical: 'Opened the bottle with a spanner.' } },
  { id: 'wine', words: 'More wine', icon: 'bottle', rooms: ['dining', 'games'], askers: 'any', fits: ['gossip'],
    mismatch: { detail: 'Folded a napkin into a swan and left the wine.', physical: 'Checked the cork for structural damage.' } },
  { id: 'chocolate', words: 'Hot chocolate', icon: 'cup', rooms: ['study', 'bedroom'], askers: ['host', 'younger-heir'], fits: ['gossip'],
    mismatch: { detail: 'Made it with water, very carefully.', physical: 'Microwaved it in the trophy mug.' } },
  { id: 'snack', words: 'Something to eat', icon: 'tray', rooms: ['games', 'library', 'bedroom'], askers: ['younger-heir', 'uncle'], fits: ['gossip'],
    mismatch: { detail: 'Arranged a plate so neatly that nobody dared touch it.', physical: 'Brought a sandwich and a spirit level.' } },
  { id: 'ice', words: 'Ice and lemons', icon: 'ice', rooms: 'any', askers: 'any', fits: ['gossip', 'detail'],
    mismatch: { physical: 'Chipped the ice with a hammer and sent lemons flying.' } },
  { id: 'flicker', words: 'Lights flickering', icon: 'bulb', rooms: 'any', askers: 'any', fits: ['detail', 'physical'],
    mismatch: { gossip: 'Told everyone about the flickering and fixed none of it.' } },
  { id: 'freezing', words: 'Freezing cold', icon: 'snowflake', rooms: ['library', 'study', 'bedroom', 'conservatory'], askers: ['hostess', 'uncle', 'younger-heir'], fits: ['physical', 'detail'],
    mismatch: { gossip: 'Chatted by the window until the room got colder.' } },
  { id: 'coldsleep', words: 'Too cold to sleep', icon: 'snowflake', rooms: ['bedroom'], askers: 'any', fits: ['detail', 'physical'],
    mismatch: { gossip: 'Filled the hot water bottle with mulled wine.' } },
  { id: 'fire', words: 'Fire lit', icon: 'fire', rooms: ['library', 'study', 'games'], askers: ['host', 'uncle'], fits: ['physical'],
    mismatch: { gossip: 'Offered the fire a drink instead of lighting it.', detail: 'Lit it with the paper still being read.' } },
  { id: 'speech', words: 'Ready for the speech', icon: 'notes', rooms: ['study'], askers: ['host'], fits: ['physical', 'detail'],
    mismatch: { gossip: 'Rehearsed the speech aloud with all the wrong words.' } },
  { id: 'charger', words: "Phone won't charge", icon: 'phone', rooms: ['bedroom', 'library'], askers: ['younger-heir', 'conjurer', 'elder-heir'], fits: ['detail', 'physical'],
    mismatch: { gossip: 'Asked the phone how its day had been.' } },
  { id: 'signal', words: 'No phone signal', icon: 'signal', rooms: ['hall', 'study'], askers: ['conjurer', 'financier', 'butler'], fits: ['physical'],
    mismatch: { gossip: 'Waved the phone about and shared some news instead.', detail: 'Dusted the phone and put it back on its doily.' } },
  { id: 'umbrella', words: 'An umbrella', icon: 'umbrella', rooms: ['hall', 'cloakroom'], askers: 'any', fits: ['physical'],
    mismatch: { gossip: 'Offered a cocktail umbrella from the bar.', detail: 'Found a lovely one and polished it until the rain stopped. It had not.' } },
  { id: 'wellies', words: 'My wellies', icon: 'boots', rooms: ['cloakroom'], askers: 'any', fits: ['detail'],
    mismatch: { gossip: 'Asked everyone about their feet and returned empty-handed.', physical: 'Hammered the boots into shape. It was a different shape.' } },
  { id: 'banging', words: 'Door banging', icon: 'door', rooms: ['hall', 'conservatory', 'study'], askers: 'any', fits: ['physical'],
    mismatch: { gossip: 'Whispered a secret to the door. It kept banging.', detail: 'Hung a note on it saying please do not bang.' } },
  { id: 'leak', words: 'A leak', icon: 'drop', rooms: ['conservatory', 'bedroom'], askers: 'any', fits: ['physical', 'detail'],
    mismatch: { gossip: 'Held a bucket under the drip while telling a long story.' } },
  { id: 'flowers', words: 'Flowers moved', icon: 'flowers', rooms: 'any', askers: ['hostess'], fits: ['detail'],
    mismatch: { gossip: 'Told the flowers a long story and left them where they were.', physical: 'Carried the flowers in a wheelbarrow.' } },
  { id: 'book', words: 'Fetch a book', icon: 'book', rooms: ['library'], askers: ['detective', 'uncle'], fits: ['detail'],
    mismatch: { gossip: 'Read out the first chapter and kept the book.', physical: 'Checked the bookcase was bolted to the wall.' } },
  { id: 'paper', words: 'Paper and pens', icon: 'paper', rooms: ['study', 'library'], askers: ['financier', 'butler'], fits: ['detail'],
    mismatch: { gossip: 'Brought a menu and a cocktail stirrer.', physical: 'Brought a pencil sharpened with a chisel.' } },
  { id: 'printer', words: 'The printer', icon: 'printer', rooms: ['study'], askers: ['financier', 'elder-heir', 'butler'], fits: ['physical'],
    mismatch: { gossip: 'Asked the printer what it had heard lately.', detail: 'Dusted the printer until it shone. It still jammed.' } },
  { id: 'table', words: 'Clear the table', icon: 'plate', rooms: ['dining'], askers: ['hostess'], fits: ['detail'],
    mismatch: { gossip: 'Cleared the glasses first and tasted the leftovers.', physical: 'Tightened the table legs and cleared nothing.' } },
  { id: 'chair', words: 'A broken chair', icon: 'chair', rooms: ['dining', 'games'], askers: 'any', fits: ['physical'],
    mismatch: { gossip: 'Offered the chair a drink to calm it down.', detail: 'Fitted a pretty cushion over the broken part.' } },
  { id: 'cards', words: 'Find the cards', icon: 'cards', rooms: ['games'], askers: ['conjurer', 'younger-heir'], fits: ['detail'],
    mismatch: { gossip: 'Found a pack and told everyone a rumour about the dealer.', physical: 'Looked under the billiard table with a spanner.' } },
];

// PLACEHOLDER beats until docs/secrets.md is content. True and innocent whoever the killer is; never
// about a room, a weapon, violence or where anyone is at nine.
const beats: HousekeeperHourContent['beats'] = {
  host: {
    gossip: { line: "{guest} wants to know who's hearing the speech.", pre: '{guest} asked me who was coming to hear the ', post: '.', answer: 'speech', decoys: ['toast', 'concert'] },
    detail: { line: 'The speech notes are crossed out twice over.', pre: '{guest} had left the speech notes covered in ', post: '.', answer: 'coffee rings', decoys: ['ink blots', 'pencil doodles'] },
    physical: { line: 'Reading glasses on a cord, one arm taped.', pre: "{guest}'s reading glasses were mended with ", post: '.', answer: 'tape', decoys: ['string', 'glue'] },
  },
  hostess: {
    gossip: { line: '{guest} says {other} told a very good joke.', pre: '{guest} told me {other} had told a very good ', post: '.', answer: 'joke', decoys: ['story', 'riddle'] },
    detail: { line: 'A shawl over the chair and a half-drunk tea.', pre: '{guest} had left a shawl and a half-drunk ', post: '.', answer: 'cup of tea', decoys: ['glass of water', 'sherry'] },
    physical: { line: "{guest}'s shawl is damp right down to the hem.", pre: "{guest}'s shawl was damp at the ", post: '.', answer: 'hem', decoys: ['collar', 'fringe'] },
  },
  butler: {
    gossip: { line: '{guest} asked me for a taxi firm number.', pre: '{guest} asked me for the number of a ', post: ' firm.', answer: 'taxi', decoys: ['printing', 'courier'] },
    detail: { line: 'He carries a folder with a red label.', pre: '{guest} carried a folder with a ', post: ' label.', answer: 'red', decoys: ['blue', 'yellow'] },
    physical: { line: 'Car keys on a leather fob, worn smooth.', pre: "{guest}'s car keys hung from a worn ", post: ' fob.', answer: 'leather', decoys: ['brass', 'plastic'] },
  },
  financier: {
    gossip: { line: '{guest} asked if the phone line was working.', pre: '{guest} asked me if the ', post: ' was working.', answer: 'phone line', decoys: ['printer', 'doorbell'] },
    detail: { line: 'A briefcase full of tidy papers.', pre: '{guest} had a briefcase full of ', post: '.', answer: 'papers', decoys: ['photographs', 'sandwiches'] },
    physical: { line: "{guest}'s briefcase has a sticking catch.", pre: "{guest}'s briefcase had a catch that kept ", post: '.', answer: 'sticking', decoys: ['rattling', 'snapping'] },
  },
  uncle: {
    gossip: { line: '{guest} grumbled about the old family shares.', pre: '{guest} grumbled about the family ', post: '.', answer: 'shares', decoys: ['silver', 'portraits'] },
    detail: { line: 'A pipe in his pocket and an old photo album.', pre: '{guest} kept an old photo album and a ', post: ' in his pocket.', answer: 'pipe', decoys: ['comb', 'watch'] },
    physical: { line: "{guest}'s umbrella is dripping and bent.", pre: "{guest}'s umbrella was dripping and had a bent ", post: '.', answer: 'spoke', decoys: ['handle', 'tip'] },
  },
  'elder-heir': {
    gossip: { line: '{guest} asked who is on the guest list.', pre: '{guest} asked me who was on the ', post: '.', answer: 'guest list', decoys: ['rota', 'menu'] },
    detail: { line: 'Laptop open, and a file with a green tab.', pre: '{guest} had a file with a ', post: ' tab.', answer: 'green', decoys: ['orange', 'purple'] },
    physical: { line: 'Cocoa dust on her cuffs.', pre: '{guest} had a dusting of ', post: ' on her cuffs.', answer: 'cocoa', decoys: ['flour', 'chalk'] },
  },
  'younger-heir': {
    gossip: { line: '{guest} asked me for the wifi password.', pre: '{guest} asked me for the ', post: ' password.', answer: 'wifi', decoys: ['phone', 'laptop'] },
    detail: { line: 'Crisps in one pocket and a phone in the other.', pre: '{guest} had a phone in one pocket and ', post: ' in the other.', answer: 'crisps', decoys: ['keys', 'sweets'] },
    physical: { line: "{guest}'s trainers are soaked through.", pre: "{guest}'s trainers were soaked through and covered in ", post: '.', answer: 'mud', decoys: ['sand', 'leaves'] },
  },
  conjurer: {
    gossip: { line: '{guest} is hunting for a phone signal.', pre: '{guest} kept hunting for a phone ', post: '.', answer: 'signal', decoys: ['charger', 'case'] },
    detail: { line: 'A tablet, and a pack of cards in a pocket.', pre: '{guest} had a tablet and a pack of ', post: '.', answer: 'cards', decoys: ['tissues', 'matches'] },
    physical: { line: 'Sparkling water spilled all down a sleeve.', pre: '{guest} had spilled sparkling water down a ', post: '.', answer: 'sleeve', decoys: ['cuff', 'lapel'] },
  },
  detective: {
    gossip: { line: '{guest} asked me a few things about {other}.', pre: "{guest} asked me a few questions about {other}'s ", post: '.', answer: 'hat', decoys: ['gloves', 'scarf'] },
    detail: { line: 'Notebook, magnifying glass, very full teacup.', pre: '{guest} had a notebook, a magnifying glass and a full ', post: '.', answer: 'teacup', decoys: ['ashtray', 'hip flask'] },
    physical: { line: "{guest}'s coat is soaked and has a torn pocket.", pre: "{guest}'s coat was soaked and had a torn ", post: '.', answer: 'pocket', decoys: ['button', 'sleeve'] },
  },
};

export const housekeeperHour: HousekeeperHourContent = {
  player: 'housekeeper',
  baseRoom: 'kitchen',
  staff,
  requests,
  beats,
  fallback: {
    gossip: 'Nothing new. {guest} had nothing more to say.',
    detail: 'Nothing new. The same things were lying about.',
    physical: 'Nothing new. Everything looked just as before.',
  },
};
