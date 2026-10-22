// How clues read. Every clue is a true statement, told one of two ways:
// - testimony: a quote from one of the suspects (free clues and sudoku clues)
// - evidence: something the cats found (cat-puzzle clues)
//
// Placeholders: {s}/{S} suspect mid-sentence/start of sentence ("the Butler" /
// "The Butler"), {a}/{b} and {A}/{B} the two suspects in pair clues, {i} item,
// {r}/{r2} rooms. Room templates always write "the {r}" so a sudoku clue can
// swap in "the room at row 3, column 4".

import type { ClueFact, ClueSource, ClueType, Content } from './types.ts';
import type { Rng } from './rng.ts';
import { capital, fillIn, midSentence } from './text.ts';

const TESTIMONY: Record<ClueType, readonly string[]> = {
  'suspect-room': ['I saw {s} in the {r} all evening.', '{S} was in the {r}. I took them a cup of tea there.'],
  'suspect-not-room': ['{S} never came into the {r}. I would have noticed.', 'I was watching the door of the {r}. {S} never went in.'],
  'suspect-item': ['{S} had the {i} with them all evening.', 'I saw {s} carrying the {i}.'],
  'suspect-not-item': ['{S} never touched the {i}.', "Whatever {s} was holding, it wasn't the {i}."],
  'item-room': ['The {i} was in the {r} when I looked in.', 'I noticed the {i} lying in the {r}.'],
  'item-not-room': ["There was no {i} in the {r}. I'm certain of it.", 'I looked all round the {r}. No {i} anywhere.'],
  'suspect-either-room': ["{S} was in the {r} or the {r2}. I couldn't say which."],
  'suspect-next-to-room': ['I heard {s} through the wall of the {r}, from a room next door.'],
  'suspects-adjacent': ['I could hear {b} through the wall all evening.', '{B} was in the room next to mine.'],
  'suspects-not-adjacent': ["{B} wasn't in a room next to mine. I didn't hear a sound from them."],
  'suspects-together': ['{B} and I were in the same room all evening.', '{B} was with me the whole time.'],
  'suspects-apart': ["{B} wasn't in my room. I'd have seen them."],
  'suspect-alone': ['{S} was on their own all evening. Nobody went in to them.', 'Nobody else was in the room with {s}.'],
  'suspect-empty-handed': ['{S} had nothing in their hands. No weapon at all.', "I saw {s} all evening. They weren't carrying anything."],
};

const EVIDENCE: Record<ClueType, readonly string[]> = {
  'suspect-room': ["The cats found a button from {s}'s coat in the {r}.", "The cats dragged {s}'s handkerchief out from under a chair in the {r}."],
  'suspect-not-room': ['The cats sniffed every corner of the {r}. No trace of {s}.'],
  'suspect-item': ["The cats found {s}'s fingerprints all over the {i}."],
  'suspect-not-item': ["The cats found the {i}. Not one of {s}'s fingerprints on it."],
  'item-room': ['The cats found scratches from the {i} on the floor of the {r}.'],
  'item-not-room': ['The cats searched the {r} from top to bottom. The {i} was never there.'],
  'suspect-either-room': ["The cats followed {s}'s footprints to the {r} or the {r2}. The trail is smudged after that."],
  'suspect-next-to-room': ["The cats found {s}'s glass pressed against a wall of the {r}, from the room next door."],
  'suspects-adjacent': ['The cats found a note from {a} to {b}, slipped under the connecting door between their rooms.'],
  'suspects-not-adjacent': ["The cats checked every connecting door. None joins {a}'s room to {b}'s."],
  'suspects-together': ["The cats found {a}'s glove and {b}'s scarf on the same chair."],
  'suspects-apart': ["The cats followed {a}'s and {b}'s footprints. They never met."],
  'suspect-alone': ["The cats found only one set of footprints in {s}'s room: {s}'s own."],
  'suspect-empty-handed': ["The cats checked every weapon. None has {s}'s fingerprints."],
};

/** A suspect talking about themselves (in an interrogation). */
const FIRST_PERSON: Partial<Record<ClueType, readonly string[]>> = {
  'suspect-room': ['I was in the {r} all evening.', 'The {r}. I was there the whole time.'],
  'suspect-not-room': ['I never set foot in the {r}.', "I wasn't in the {r}, if that's what you're asking."],
  'suspect-item': ['Yes, I had the {i}. What of it?'],
  'suspect-not-item': ['I never touched the {i}.', 'The {i}? Not me.'],
  'suspect-either-room': ['I was in the {r} or the {r2}. I moved about a bit.'],
  'suspect-next-to-room': ["I was in a room next to the {r}. That's all I'll say."],
  'suspect-alone': ['I was on my own all evening.'],
  'suspect-empty-handed': ["I didn't have a weapon. Search me if you like."],
};

/** What she asks to get each kind of answer. Lowercase placeholders are mid-sentence. */
const QUESTIONS: Record<ClueType, { self: string; other: string }> = {
  'suspect-room': { self: 'Did you go into the {r}?', other: 'Was {s} in the {r}?' },
  'suspect-not-room': { self: 'Did you go into the {r}?', other: 'Was {s} in the {r}?' },
  'suspect-either-room': { self: 'Where were you this evening?', other: 'Where was {s} this evening?' },
  'suspect-next-to-room': { self: 'Where were you this evening?', other: 'Where was {s} this evening?' },
  'suspect-item': { self: 'Did you have the {i}?', other: 'Did {s} have the {i}?' },
  'suspect-not-item': { self: 'Did you have the {i}?', other: 'Did {s} have the {i}?' },
  'item-room': { self: 'Where was the {i}?', other: 'Where was the {i}?' },
  'item-not-room': { self: 'Was the {i} in the {r}?', other: 'Was the {i} in the {r}?' },
  'suspects-adjacent': { self: 'Could you hear {b} from your room?', other: 'Were {a} and {b} next door to each other?' },
  'suspects-not-adjacent': { self: 'Could you hear {b} from your room?', other: 'Were {a} and {b} next door to each other?' },
  'suspects-together': { self: 'Were you with {b}?', other: 'Were {a} and {b} together?' },
  'suspects-apart': { self: 'Were you with {b}?', other: 'Were {a} and {b} together?' },
  'suspect-alone': { self: 'Was anyone with you?', other: 'Was anyone with {s}?' },
  'suspect-empty-handed': { self: 'Did you have a weapon?', other: 'Did {s} have a weapon?' },
};

/** Stand-in for a room in a sudoku statement until its two squares are filled. */
export const LOCATION_TOKEN = '\u0000';

export interface Worded {
  /** Suspect id of the witness, for testimony. */
  speaker?: string;
  /** The statement itself (a quote for testimony, a sentence for evidence). */
  body: string;
  /** For sudoku statements: the body split around "the room at row ▢, column ▢". */
  located?: { before: string; after: string };
}

/** People in a pair clue speak for themselves; otherwise the witness is someone else in the case. */
function pickSpeaker(fact: ClueFact, suspects: readonly string[], rng: Rng): string {
  if ('suspects' in fact) return fact.suspects[0];
  const others = suspects.filter((s) => !('suspect' in fact) || s !== fact.suspect);
  return rng.pick(others);
}

/** Pair facts are symmetric for adjacency: put the speaker first so they talk about "my room". */
export function speakerFirst(fact: ClueFact, speaker: string): ClueFact {
  if ('suspects' in fact && fact.suspects[1] === speaker) {
    return { ...fact, suspects: [fact.suspects[1], fact.suspects[0]] } as ClueFact;
  }
  return fact;
}

function fillFor(fact: ClueFact, content: Content): Record<string, string> {
  const suspect = (id: string) => midSentence(content.suspects.find((s) => s.id === id)?.name ?? id);
  const room = (id: string) => content.house.rooms.find((r) => r.id === id)?.name ?? id;
  const item = (id: string) => content.items.find((i) => i.id === id)?.name ?? id;
  const fill: Record<string, string> = {};
  if ('suspect' in fact) {
    fill.s = suspect(fact.suspect);
    fill.S = capital(fill.s);
  }
  if ('suspects' in fact) {
    fill.a = suspect(fact.suspects[0]);
    fill.b = suspect(fact.suspects[1]);
    fill.A = capital(fill.a);
    fill.B = capital(fill.b);
  }
  if ('item' in fact) fill.i = item(fact.item);
  if ('room' in fact) fill.r = room(fact.room);
  if ('rooms' in fact) {
    fill.r = room(fact.rooms[0]);
    fill.r2 = room(fact.rooms[1]);
  }
  return fill;
}

const subjectOf = (fact: ClueFact) => ('suspect' in fact ? fact.suspect : 'suspects' in fact ? fact.suspects[0] : null);

/** The question she asks that this fact answers, from the point of view of `speaker`. */
export function questionFor(fact: ClueFact, speaker: string, content: Content): string {
  const f = speakerFirst(fact, speaker);
  return capital(fillIn(QUESTIONS[f.type][subjectOf(f) === speaker ? 'self' : 'other'], fillFor(f, content)));
}

export function wordClue(
  fact: ClueFact,
  source: ClueSource,
  content: Content,
  suspects: readonly string[],
  rng: Rng,
  located = false,
  /** Force the witness (interrogations: the suspect in the chair). */
  forcedSpeaker?: string,
): Worded {
  if (forcedSpeaker) fact = speakerFirst(fact, forcedSpeaker);
  const fill = fillFor(fact, content);
  const self = forcedSpeaker !== undefined && subjectOf(fact) === forcedSpeaker ? FIRST_PERSON[fact.type] : undefined;
  let template = rng.pick(self ?? (source === 'testimony' ? TESTIMONY : EVIDENCE)[fact.type]);
  if (located) {
    if (!template.includes('the {r}') || 'rooms' in fact) throw new Error(`${fact.type} can't be located`);
    template = template.replace('the {r}', LOCATION_TOKEN);
  }
  const body = fillIn(template, fill);
  const speaker = source === 'testimony' ? (forcedSpeaker ?? pickSpeaker(fact, suspects, rng)) : undefined;
  if (!located) return { speaker, body };
  const [before, after] = body.split(LOCATION_TOKEN);
  return { speaker, body: body.replace(LOCATION_TOKEN, `the ${fill.r}`), located: { before, after } };
}

/** Whether a clue names exactly one room, so a sudoku can point to it on the map. */
export const canLocate = (fact: ClueFact): fact is Extract<ClueFact, { room: string }> => 'room' in fact;

/**
 * Plain one-line version, e.g. for the dev page: `The Butler: "…"` or the evidence sentence.
 * Names come from `content.suspects`, so pass `guestContent(content, case.guests)` (`guestNames.ts`)
 * for a case; `wordClue` and `questionFor` take the same.
 */
export function plainText(w: Worded, content: Content): string {
  if (!w.speaker) return w.body;
  const name = content.suspects.find((s) => s.id === w.speaker)?.name ?? w.speaker;
  return `${name}: "${w.body}"`;
}
