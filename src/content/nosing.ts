// Content for "Nosing around": the cat's ladders and snakes, bonuses, lock
// objects and lines. Data only. `rooms` are room ids from the house in
// `./index.ts`, or 'any'. Never name a guest, room or weapon in the copy.

export interface NosingJump {
  id: string;
  name: string;
  /** One line, past tense, from the cat's side. */
  description: string;
  /** Room ids it may start in (the ladder foot or snake head), or 'any'. */
  rooms: readonly string[] | 'any';
}

/** Shortcuts. The cat takes one forward. */
export const nosingLadders: readonly NosingJump[] = [
  {
    id: 'bookshelves',
    name: 'Along the bookshelves',
    description: 'I trotted along the top of the bookshelves, high above everything.',
    rooms: ['library', 'study'],
  },
  {
    id: 'dumbwaiter',
    name: 'The dumbwaiter',
    description: 'I rode the dumbwaiter and popped out somewhere I was not expected.',
    rooms: ['kitchen', 'bedroom', 'hall'],
  },
  {
    id: 'catflap',
    name: 'The cat flap',
    description: 'I squeezed through the cat flap, which is my favourite way to go.',
    rooms: 'any',
  },
  {
    id: 'walls',
    name: 'Behind the walls',
    description: 'I slipped behind the walls, where the mice have their own corridors.',
    rooms: 'any',
  },
  {
    id: 'banister',
    name: 'The banister',
    description: 'I slid along the banister with my tail in the air.',
    rooms: ['hall', 'bedroom'],
  },
];

/** Setbacks. The cat slides back along one. */
export const nosingSnakes: readonly NosingJump[] = [
  {
    id: 'dog',
    name: 'Chased by the dog',
    description: 'The dog spotted me and I ran the wrong way.',
    rooms: 'any',
  },
  {
    id: 'broom',
    name: "The cook's broom",
    description: 'I was shooed along with a broom, and not politely.',
    rooms: ['kitchen', 'hall'],
  },
  {
    id: 'mouse',
    name: 'Chasing a mouse',
    description: 'I chased a mouse and forgot where I was going.',
    rooms: 'any',
  },
  {
    id: 'wool',
    name: 'A ball of wool',
    description: 'A ball of wool got away from me and I followed it all the way back.',
    rooms: 'any',
  },
  {
    id: 'vase',
    name: 'Knocking over a vase',
    description: 'I knocked over a vase and fled the scene.',
    rooms: ['hall', 'library', 'study', 'bedroom'],
  },
];

export type NosingBonusName = 'steps' | 'spareTry' | 'torch' | 'note' | 'reroll' | 'closeEnough';

export interface NosingBonusCopy {
  name: string;
  copy: string;
}

export const nosingBonuses: Readonly<Record<NosingBonusName, NosingBonusCopy>> = {
  steps: { name: 'A few steps on', copy: 'The cat bounds three squares ahead.' },
  spareTry: { name: 'A spare try', copy: 'You get one more try at the lock.' },
  torch: { name: 'A torch', copy: 'It shows a number you will not need at the lock.' },
  note: { name: 'A note from the cat', copy: 'The cat does the first step of the lock for you.' },
  reroll: { name: 'A second roll', copy: 'You may swap one roll for a fresh one.' },
  closeEnough: { name: 'Close enough', copy: 'The lock will accept an answer a little off.' },
};

/** Why a row of the number grid shows red. */
export const nosingGridProblems = {
  divide: "doesn't divide exactly",
  minus: 'goes below 1',
};

/** The dog on a snake head: wording for the fight screen and its end. Sentence case, from her point of view. */
export const nosingDog = {
  title: 'The dog',
  win: 'The dog runs off.',
  /** Finishes with the snake's own line when there is one. */
  lose: (square: string) => `The dog chases the cat down the trail to ${square}.`,
  dogPlays: 'The dog plays',
  handTitle: 'Your cards',
  catLives: 'The cat',
  dogLives: 'The dog',
  attack: (n: number) => `Beat ${n} to hurt the dog, or make ${n * 2} to hurt it twice.`,
  defend: (n: number) => `The dog attacks with ${n}. Meet it or lose a life. Hit ${n} exactly for an extra card.`,
  hint: {
    double: (possible: boolean) => (possible ? 'sizes up your cards: a double is there.' : 'sizes up your cards: no double this time.'),
    exact: (possible: boolean) => (possible ? 'sizes up your cards: an exact hit is there.' : 'sizes up your cards: no exact hit this time.'),
    fill: 'pushes some cards into place.',
  },
  /** The last turn, from the view's `last` data. */
  last: {
    attackTwice: (mine: number, dog: number) => `You made ${mine} against ${dog}. The dog loses 2 lives.`,
    attackOnce: (mine: number, dog: number) => `You made ${mine} against ${dog}. The dog loses a life.`,
    attackMissed: (mine: number, dog: number) => `You made ${mine} against ${dog}. Not enough, the dog is unhurt.`,
    defendLost: (mine: number, dog: number) => `You made ${mine} against ${dog}. The cat loses a life.`,
    defendExact: (mine: number, dog: number) => `You made ${mine} against ${dog}. Exactly right, so you get an extra card.`,
    defendMet: (mine: number, dog: number) => `You made ${mine} against ${dog}. You met the dog's attack.`,
  },
  endTitleWon: 'The dog runs off',
  endTitleLost: 'The dog wins',
  next: 'Continue',
};

export interface NosingLockObject {
  id: string;
  name: string;
  /** Finishes "At the end of the trail, the cat found ...". */
  description: string;
}

/** What the last square opens. */
export const nosingLockObjects: readonly NosingLockObject[] = [
  { id: 'safe', name: 'a small safe', description: 'a small safe with a dial and a very smug look' },
  { id: 'phone', name: "a guest's phone", description: "a guest's phone, locked with a passcode" },
  { id: 'desk', name: 'a writing desk', description: 'a writing desk with a stubborn little drawer' },
  { id: 'trunk', name: 'a travelling trunk', description: 'a travelling trunk with a brass combination lock' },
];

/** "The cat found something": free bonus squares. */
export const nosingCatFindLines: readonly string[] = [
  'The cat found something shiny under a cushion.',
  'The cat nudged a loose floorboard and something rolled out.',
  'The cat dragged out a crumpled paper from behind the curtain.',
  'The cat found something in a dusty corner.',
  'The cat sat down on something interesting.',
  'The cat fished something out from under the furniture.',
  'The cat pawed a small thing out from a gap in the wall.',
];

/** Search lines for a room's search square. `{thing}` is one of that room's `things`. */
export const nosingSearchLines: readonly string[] = [
  'The cat sniffs behind the {thing}.',
  'The cat pokes its nose under the {thing}.',
  'The cat circles the {thing} twice.',
  'The cat paws at the {thing}.',
  'The cat peers over the top of the {thing}.',
  'The cat squeezes in beside the {thing}.',
];
