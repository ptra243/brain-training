// Content for "the Housekeeper's hour" (prototype, stage 1; see docs/housekeeper-dispatch.md and
// .claude/handoff/housekeeper-hour-text.md). Staff, the requests guests make, what each kind of staff
// member brings back (the threads, in housekeeperThreads.ts). Kept out of `Content`, like the
// cats and the talk, so it never changes a case.
//
// Placeholders in text: `{guest}` (the guest the job is for) and `{other}` (another guest at the dinner,
// picked by the seed; gossip only), plus `{room}` and `{victim}` (filled by the code). Nothing here names a room, a weapon or a guest: the code fills names in.
import { housekeeperThreads } from './housekeeperThreads.ts';

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
  /** What the guest was doing when the staff member arrived: one short past-tense sentence under 60 characters, `{guest}` allowed. */
  scene: string;
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

/** One event in a guest's thread, seen three ways: what each kind of staff member brings back on that visit. */
export type ThreadStep = Readonly<Record<StaffKind, Beat>>;

export interface HousekeeperHourContent {
  /** The guest id of the Housekeeper: the player, who never asks and who is not a suspect's witness. */
  player: string;
  /** The room id the staff start from. A request is never in it (if the house has it). */
  baseRoom: string;
  staff: readonly Staff[];
  requests: readonly RequestDef[];
  /** Guest id to steps, one per round: step N is what the staff bring back on visit N. */
  threads: Readonly<Record<string, readonly ThreadStep[]>>;
}

const staff: readonly Staff[] = [
  { id: 'sam', name: 'Sam', job: 'Bar', kind: 'gossip', icon: 'speech' },
  { id: 'priya', name: 'Priya', job: 'Housekeeping', kind: 'detail', icon: 'eye' },
  { id: 'tom', name: 'Tom', job: 'Handyman', kind: 'physical', icon: 'wrench' },
];

const requests: readonly RequestDef[] = [
  { id: 'coffee', words: 'Black coffee', icon: 'cup', scene: "{guest} was stirring an empty cup.", rooms: ['library', 'study', 'dining', 'games'], askers: ['financier', 'elder-heir', 'conjurer', 'detective'], fits: ['gossip'],
    mismatch: { detail: 'Tidied the cups into a neat tower and forgot the coffee.', physical: 'Took the coffee machine apart to check it worked.' } },
  { id: 'tea', words: 'Tea, please', icon: 'teacup', scene: "{guest} was holding a cold, empty teacup.", rooms: ['library', 'conservatory', 'bedroom'], askers: ['hostess', 'detective'], fits: ['gossip'],
    mismatch: { detail: 'Warmed the pot, then polished it instead of using it.', physical: 'Checked the kettle wiring before filling it.' } },
  { id: 'whisky', words: 'A whisky or brandy', icon: 'glass', scene: "{guest} was holding an empty glass up to the light.", rooms: ['study', 'library', 'games'], askers: ['host', 'uncle'], fits: ['gossip'],
    mismatch: { detail: 'Poured it, then wiped the glass so hard it squeaked.', physical: 'Opened the bottle with a spanner.' } },
  { id: 'wine', words: 'More wine', icon: 'bottle', scene: "{guest} was tipping a glass to see if any was left.", rooms: ['dining', 'games'], askers: 'any', fits: ['gossip'],
    mismatch: { detail: 'Folded a napkin into a swan and left the wine.', physical: 'Checked the cork for structural damage.' } },
  { id: 'chocolate', words: 'Hot chocolate', icon: 'cup', scene: "{guest} was wrapped in a blanket, shivering a little.", rooms: ['study', 'bedroom'], askers: ['host', 'younger-heir'], fits: ['gossip'],
    mismatch: { detail: 'Made it with water, very carefully.', physical: 'Microwaved it in the trophy mug.' } },
  { id: 'snack', words: 'Something to eat', icon: 'tray', scene: "{guest} was peering into an empty biscuit tin.", rooms: ['games', 'library', 'bedroom'], askers: ['younger-heir', 'uncle'], fits: ['gossip'],
    mismatch: { detail: 'Arranged a plate so neatly that nobody dared touch it.', physical: 'Brought a sandwich and a spirit level.' } },
  { id: 'ice', words: 'Ice and lemons', icon: 'ice', scene: "{guest} was frowning into an empty ice bucket.", rooms: 'any', askers: 'any', fits: ['gossip', 'detail'],
    mismatch: { physical: 'Chipped the ice with a hammer and sent lemons flying.' } },
  { id: 'flicker', words: 'Lights flickering', icon: 'bulb', scene: "{guest} was glaring up at the flickering lamp.", rooms: 'any', askers: 'any', fits: ['detail', 'physical'],
    mismatch: { gossip: 'Told everyone about the flickering and fixed none of it.' } },
  { id: 'freezing', words: 'Freezing cold', icon: 'snowflake', scene: "{guest} was rubbing both hands together.", rooms: ['library', 'study', 'bedroom', 'conservatory'], askers: ['hostess', 'uncle', 'younger-heir'], fits: ['physical', 'detail'],
    mismatch: { gossip: 'Chatted by the window until the room got colder.' } },
  { id: 'coldsleep', words: 'Too cold to sleep', icon: 'snowflake', scene: "{guest} was sitting on the bed in a coat.", rooms: ['bedroom'], askers: 'any', fits: ['detail', 'physical'],
    mismatch: { gossip: 'Filled the hot water bottle with mulled wine.' } },
  { id: 'fire', words: 'Fire lit', icon: 'fire', scene: "{guest} was crouched at a cold fireplace.", rooms: ['library', 'study', 'games'], askers: ['host', 'uncle'], fits: ['physical'],
    mismatch: { gossip: 'Offered the fire a drink instead of lighting it.', detail: 'Lit it with the paper still being read.' } },
  { id: 'speech', words: 'Ready for the speech', icon: 'notes', scene: "{guest} was shuffling papers into a pile.", rooms: ['study'], askers: ['host'], fits: ['physical', 'detail'],
    mismatch: { gossip: 'Rehearsed the speech aloud with all the wrong words.' } },
  { id: 'charger', words: "Phone won't charge", icon: 'phone', scene: "{guest} was holding a dead phone and a cable.", rooms: ['bedroom', 'library'], askers: ['younger-heir', 'conjurer', 'elder-heir'], fits: ['detail', 'physical'],
    mismatch: { gossip: 'Asked the phone how its day had been.' } },
  { id: 'signal', words: 'No phone signal', icon: 'signal', scene: "{guest} was holding a phone up to the ceiling.", rooms: ['hall', 'study'], askers: ['conjurer', 'financier', 'butler'], fits: ['physical'],
    mismatch: { gossip: 'Waved the phone about and shared some news instead.', detail: 'Dusted the phone and put it back on its doily.' } },
  { id: 'umbrella', words: 'An umbrella', icon: 'umbrella', scene: "{guest} was looking out at the rain.", rooms: ['hall', 'cloakroom'], askers: 'any', fits: ['physical'],
    mismatch: { gossip: 'Offered a cocktail umbrella from the bar.', detail: 'Found a lovely one and polished it until the rain stopped. It had not.' } },
  { id: 'wellies', words: 'My wellies', icon: 'boots', scene: "{guest} was hopping about in one sock.", rooms: ['cloakroom'], askers: 'any', fits: ['detail'],
    mismatch: { gossip: 'Asked everyone about their feet and returned empty-handed.', physical: 'Hammered the boots into shape. It was a different shape.' } },
  { id: 'banging', words: 'Door banging', icon: 'door', scene: "{guest} was holding a door shut with one foot.", rooms: ['hall', 'conservatory', 'study'], askers: 'any', fits: ['physical'],
    mismatch: { gossip: 'Whispered a secret to the door. It kept banging.', detail: 'Hung a note on it saying please do not bang.' } },
  { id: 'leak', words: 'A leak', icon: 'drop', scene: "{guest} was dodging a drip from the ceiling.", rooms: ['conservatory', 'bedroom'], askers: 'any', fits: ['physical', 'detail'],
    mismatch: { gossip: 'Held a bucket under the drip while telling a long story.' } },
  { id: 'flowers', words: 'Flowers moved', icon: 'flowers', scene: "{guest} was holding an armful of lilies.", rooms: 'any', askers: ['hostess'], fits: ['detail'],
    mismatch: { gossip: 'Told the flowers a long story and left them where they were.', physical: 'Carried the flowers in a wheelbarrow.' } },
  { id: 'book', words: 'Fetch a book', icon: 'book', scene: "{guest} was running a finger along the shelf.", rooms: ['library'], askers: ['detective', 'uncle'], fits: ['detail'],
    mismatch: { gossip: 'Read out the first chapter and kept the book.', physical: 'Checked the bookcase was bolted to the wall.' } },
  { id: 'paper', words: 'Paper and pens', icon: 'paper', scene: "{guest} was patting pockets for a pen.", rooms: ['study', 'library'], askers: ['financier', 'butler'], fits: ['detail'],
    mismatch: { gossip: 'Brought a menu and a cocktail stirrer.', physical: 'Brought a pencil sharpened with a chisel.' } },
  { id: 'printer', words: 'The printer', icon: 'printer', scene: "{guest} was feeding paper into the printer.", rooms: ['study'], askers: ['financier', 'elder-heir', 'butler'], fits: ['physical'],
    mismatch: { gossip: 'Asked the printer what it had heard lately.', detail: 'Dusted the printer until it shone. It still jammed.' } },
  { id: 'table', words: 'Clear the table', icon: 'plate', scene: "{guest} was staring at a table full of plates.", rooms: ['dining'], askers: ['hostess'], fits: ['detail'],
    mismatch: { gossip: 'Cleared the glasses first and tasted the leftovers.', physical: 'Tightened the table legs and cleared nothing.' } },
  { id: 'chair', words: 'A broken chair', icon: 'chair', scene: "{guest} was sitting very carefully on a wobbly chair.", rooms: ['dining', 'games'], askers: 'any', fits: ['physical'],
    mismatch: { gossip: 'Offered the chair a drink to calm it down.', detail: 'Fitted a pretty cushion over the broken part.' } },
  { id: 'cards', words: 'Find the cards', icon: 'cards', scene: "{guest} was looking under the cushions.", rooms: ['games'], askers: ['conjurer', 'younger-heir'], fits: ['detail'],
    mismatch: { gossip: 'Found a pack and told everyone a rumour about the dealer.', physical: 'Looked under the billiard table with a spanner.' } },
];

export const housekeeperHour: HousekeeperHourContent = {
  player: 'housekeeper',
  baseRoom: 'kitchen',
  staff,
  requests,
  threads: housekeeperThreads,
};
