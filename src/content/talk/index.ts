// Talk content for the ten guests. Loose lines (neutral N, bound B) are copied
// from docs/theme-draft.md. Threads that are not in the draft (everything
// except the Hanged Man reversed "Gambling" thread) are a first pass for the
// Theme content session to polish.
//
// Rules for content:
// - Never name a card, guest, room or weapon in a line or beat.
// - Loose lines never state times or alibis ("all night", "for hours", where
//   someone was). They are colour, not evidence.
// - A thread is 2 to 3 beats, heard in order, as hearsay that can't be checked.
//   It must fit every guest who may roll that card (motive threads in
//   motives.ts are the exception: they belong to one guest on one card).
// - Kept out of `content` (like `cats`) so it never changes a case.

import type { TalkContent } from '../../engine/types.ts';
import { emperor } from './emperor.ts';
import { empress } from './empress.ts';
import { hierophant } from './hierophant.ts';
import { magician } from './magician.ts';
import { highPriestess } from './high-priestess.ts';
import { devil } from './devil.ts';
import { hermit } from './hermit.ts';
import { chariot } from './chariot.ts';
import { sun } from './sun.ts';
import { justice } from './justice.ts';
import { lovers } from './lovers.ts';
import { star } from './star.ts';
import { death } from './death.ts';
import { hangedMan } from './hanged-man.ts';
import { moon } from './moon.ts';
import { motives } from './motives.ts';

export const talk: TalkContent = {
  suspects: {
    host: { card: 'emperor', mayAlsoRoll: ['hierophant', 'hanged-man'] },
    hostess: { card: 'empress', mayAlsoRoll: ['star', 'lovers'] },
    butler: { card: 'hierophant', mayAlsoRoll: ['emperor', 'high-priestess'] },
    conjurer: { card: 'magician', mayAlsoRoll: ['star', 'devil'] },
    housekeeper: { card: 'high-priestess', mayAlsoRoll: ['hermit', 'death'] },
    financier: { card: 'devil', mayAlsoRoll: ['emperor', 'hanged-man'] },
    uncle: { card: 'hermit', mayAlsoRoll: ['death', 'hanged-man'] },
    'elder-heir': { card: 'chariot', mayAlsoRoll: ['emperor', 'devil'] },
    'younger-heir': { card: 'sun', mayAlsoRoll: ['lovers', 'star'] },
    detective: { card: 'justice', mayAlsoRoll: ['high-priestess', 'hermit'] },
  },
  cards: {
    emperor,
    empress,
    hierophant,
    magician,
    'high-priestess': highPriestess,
    devil,
    hermit,
    chariot,
    sun,
    justice,
    lovers,
    star,
    death,
    'hanged-man': hangedMan,
    moon,
  },
  greetings: {
    firstCold: [
      "Ask someone else. Or don't.",
      'Make it quick.',
      "Oh. It's you.",
      "Yes? I'm listening, more or less.",
      'Go on, then. Impress me.',
      'Was there something, or just the staring?',
    ],
    secondCold: [
      "I've a great deal of nothing to do, and I'd like to get back to it.",
      "I'm not in the mood, and the mood is not improving.",
      "If this is going to be long, I'd like it noted that I disagree.",
      "Do come in. Don't stay.",
      "I'd say it's a pleasure, but I'm not that sort of liar.",
      "Very well. Ask, and I'll decide whether to answer.",
    ],
    warm: [
      'Oh, hello. Do sit down.',
      'Back again? Good.',
      'Come in, come in.',
      "Ah, there you are. I was hoping you'd look in.",
      'You again? Splendid. Pull up a chair.',
      'Good to see you. I kept the good chair for you.',
    ],
  },
  motives,
  borrowed: [
    { suspect: 'host', card: 'hierophant', reversed: false, line: "We've always done it this way here, and I'll not have anyone say otherwise." },
    { suspect: 'host', card: 'hanged-man', reversed: true, line: "I've spent so long holding this house up that I can't put it down." },
    { suspect: 'hostess', card: 'star', reversed: false, line: "A house this big deserves a bit of sparkle, and I'm the one who polishes it." },
    { suspect: 'hostess', card: 'lovers', reversed: true, line: "I've matched half the county and been thanked by none of it." },
    { suspect: 'butler', card: 'emperor', reversed: false, line: 'I run the staff the way the master runs the house. One of us has to be tidy.' },
    { suspect: 'butler', card: 'high-priestess', reversed: true, line: "I know what goes on below stairs and above them, and I'm paid to look surprised." },
    { suspect: 'conjurer', card: 'star', reversed: false, line: "Give me an audience and a good lamp and I'll show you my best." },
    { suspect: 'conjurer', card: 'devil', reversed: true, line: "Everything I've ever pulled out of a hat had a price on it." },
    { suspect: 'housekeeper', card: 'hermit', reversed: false, line: "I keep to the back stairs. They've better company and fewer opinions." },
    { suspect: 'housekeeper', card: 'death', reversed: true, line: "I've aired the black crepe more often than anyone should." },
    { suspect: 'financier', card: 'emperor', reversed: false, line: 'I run my affairs like a good host runs a table: everyone served, nobody shortchanged.' },
    { suspect: 'financier', card: 'hanged-man', reversed: true, line: 'I once backed a sure thing upside down. The market took the other view.' },
    { suspect: 'uncle', card: 'death', reversed: false, line: "I'm old enough to know the last chapter is the best. I'd not hurry it." },
    { suspect: 'uncle', card: 'hanged-man', reversed: true, line: "I've been hanging about this family for years, waiting for someone to ask me to get down." },
    { suspect: 'elder-heir', card: 'emperor', reversed: false, line: 'I learned from the best, who never let me forget it.' },
    { suspect: 'elder-heir', card: 'devil', reversed: true, line: "I've borrowed against the future so often that the future has started sending reminders." },
    { suspect: 'younger-heir', card: 'lovers', reversed: false, line: 'I fall for people easily. I just never fall for the same one twice.' },
    { suspect: 'younger-heir', card: 'star', reversed: true, line: "Everyone says I'll go far. I'd like to go further, in a better carriage." },
    { suspect: 'detective', card: 'high-priestess', reversed: false, line: 'A good detective knows what to leave unsaid until the right moment.' },
    { suspect: 'detective', card: 'hermit', reversed: true, line: 'I do my best thinking alone, mostly because nobody else can keep up.' },
  ],
};

// Closing lines for face-to-face questioning (placeholders). No names, no
// placeholders; said to her. `innocent` is the narrator/cat voice, the others
// are the guest speaking.
export const faceLines = {
  innocent: [
    'It all lines up. Perhaps they really are innocent.',
    "Every answer held together. I can't fault a word of it.",
    'Nothing is out of place. You may have the wrong guest.',
    'The story is tidy and the nerves are steady. That is rarely a guilty mix.',
    'No cracks anywhere. This one may simply be telling the truth.',
    'Everything checks out, down to the last crumb.',
    'There is nothing here to catch. Best look elsewhere.',
    'It all fits, and not a single thing was forced. Innocent, I think.',
  ],
  confession: [
    "All right. It was me. I'm tired of pretending.",
    "You've got me. I won't insult you by denying it.",
    "Yes. I did it. There, I've said it.",
    "I knew you'd work it out. I'd only hoped it would take longer.",
    "It was me, and I'm not proud of it.",
    "Enough. I can't keep this up. I did it.",
    "You'd never believe the rest, so here is the truth: it was me.",
    "No more lies. It was me, and that's all I'll say.",
  ],
  dodge: [
    "Fine, I wasn't straight with you. You'll never pin the rest on me.",
    "All right, I wasn't telling the whole truth. That proves nothing.",
    "So I fibbed a little. Fibbing isn't murder.",
    'Yes, I left a bit out. Leaving things out is not a crime.',
    "You caught me out. Still, you've got the wrong idea about the rest.",
    "I'll give you that one. You haven't got the rest.",
    "Very clever. I'll admit the slip, and nothing more.",
    "Fine, I stretched the truth. You still can't prove a thing.",
  ],
  retort: [
    "That doesn't contradict a word I've said.",
    "I don't see how that changes anything I told you.",
    'That fits my story perfectly well, thank you.',
    'Is that all? It proves nothing of the sort.',
    "You'll have to do better than that.",
    'That says nothing against me. Try something else.',
    "Nothing I've said clashes with that.",
    "I'm afraid that doesn't catch me out at all.",
  ],
};

// PLACEHOLDER COPY for the Theme content session, for the campaign opening
// (`src/game/opening.ts`). Kept outside `Content` so it never changes a case.
// No card, guest, room or weapon names. Victim lines are about feelings and
// never say where anyone was. Placeholders: `{victim}`; `{n}`, `{total}`,
// `{names}` in the skip copy; `{room}` and `{scene}` in `dragMarks`.
// Who each guest is to the house, and the exact family ties. `opening.ts` turns these into a key of `victimLines`.
export type GuestRole = 'family' | 'estranged' | 'staff' | 'hired' | 'outsider';
export const guestRoles: Readonly<Record<string, GuestRole>> = {
  host: 'family',
  hostess: 'family',
  'elder-heir': 'family',
  'younger-heir': 'family',
  uncle: 'estranged',
  butler: 'staff',
  housekeeper: 'staff',
  conjurer: 'hired',
  financier: 'outsider',
  detective: 'outsider',
};
/** Pairs of guest ids. */
export const guestTies = {
  spouses: [['host', 'hostess']],
  /** [parent, child] */
  parentChild: [['host', 'elder-heir'], ['host', 'younger-heir'], ['hostess', 'elder-heir'], ['hostess', 'younger-heir']],
  siblings: [['elder-heir', 'younger-heir']],
} as const;

// One entry per tie: the four exact ones, then speaker role about victim role (collapsed).
export const victimLines = {
  spouse: [
    "We were married a long time. I knew every one of {victim}'s moods, or thought I did.",
    'Years beside {victim}. The house will be very quiet, and I am not sure I know what to do with quiet.',
  ],
  parent: [
    '{victim} was my child, whatever else they were. I keep listening for them on the stairs.',
    'I wanted so much for {victim}. Perhaps I wanted too much, and said it too often.',
  ],
  child: [
    '{victim} was my parent, and we never found an easy way to talk. I thought there would be time.',
    'I spent years trying to be what {victim} wanted. I am not sure they noticed, or that I minded.',
  ],
  sibling: [
    "{victim} and I fought like cats, and I'd have fought anyone who bothered them.",
    'Growing up, {victim} was the one person who knew exactly how to annoy me. I miss it already.',
  ],
  'family-estranged': [
    '{victim} and the family had an old quarrel. I never understood it, and now I never will.',
    "We kept {victim} at arm's length for years. It seems a poor way to have treated them.",
  ],
  'family-staff': [
    '{victim} worked for us, and I never asked how they felt about it. I wish I had.',
    '{victim} was there when we needed them and quietly gone when we did not. I took that for granted.',
  ],
  'family-outsider': [
    '{victim} was a guest, and a difficult one. I feel odd mourning someone I never quite trusted.',
    'I invited {victim} out of politeness. I would give a good deal to have the evening back.',
  ],
  'estranged-family': [
    'I have stayed away from {victim} and theirs for years. Pride is a poor thing to be left with.',
    'There was a quarrel, and I let it set like plaster. I had hoped {victim} would be the one to break it.',
  ],
  'estranged-other': [
    'I hardly knew {victim}, and I find I mind rather more than I expected.',
    '{victim} was civil to me, which is more than most managed. I will remember that.',
  ],
  'staff-family': [
    'I served {victim} for twenty years. They never once said thank you, and I never expected it.',
    "I have kept {victim}'s secrets longer than I can say. It is a strange thing to have no one left to keep them for.",
  ],
  'staff-staff': [
    '{victim} and I worked side by side, and rarely spoke of anything but the work. I wish we had.',
    'Nobody notices good staff until they are gone. I noticed {victim}, though, and now it is very quiet.',
  ],
  'staff-other': [
    '{victim} was a guest, and I treated them as one. I feel I ought to have felt more.',
    'I did not know {victim} well. It is not my place to have feelings about the guests, but I find I do.',
  ],
  'hired-family': [
    "I was paid to be charming for {victim}'s family. Tonight I would happily have done it for free.",
    'Everyone in that family clapped when I did my tricks except {victim}, and I liked them the better for it.',
  ],
  'hired-other': [
    'I only met {victim} tonight. They gave me a wink during the cards, and I find I will not forget it.',
    '{victim} was kind to me, and no one is kind to the hired help. I mean to remember that.',
  ],
  'outsider-family': [
    "I came as a guest of {victim}'s family, and I leave feeling I have trampled something precious.",
    '{victim} treated me well, and I am not certain I deserved it.',
  ],
  'outsider-other': [
    '{victim} and I were never close. Even so, a death at a dinner has a way of making everyone sentimental.',
    'I knew {victim} only slightly, and I am surprised how much it unsettles me.',
  ],
} as const;

export const opening = {
  culprit: 'Someone in this room is the culprit.',
  connectors: [
    'The cat has been watching everyone closely. It has opinions.',
    'Nobody has said much yet. That will not last.',
    'Everyone has gone quiet. It is a very loud sort of quiet.',
    'Somebody here knows more than they are saying.',
  ],
  catIntro: [
    'The house cat pads over and sits at your feet. It looks as though it has something to show you.',
    'The cat appears at your elbow, tail up, with the air of someone who has already solved it.',
    'A soft meow from the rug. The cat has been busy and wants you to know it.',
  ],
  catClueLead: 'The cat drops something at your feet.',
  skipTitle: 'Skip the introductions?',
  skipBody: 'Every clue still goes in your casebook. You have heard from {n} of {total} guests so far.',
  skipMissed: "You haven't heard from {names} yet.",
  finished: 'That is everyone. Time to have a look around.',
  disperse: 'The guests go their own ways.',
  dragMarks: 'The body was found in the {room}, but drag marks on the floor lead back to the {scene}.',
} as const;
