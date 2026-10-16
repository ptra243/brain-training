// How clues read. Every clue is a true statement, told one of two ways:
// - testimony: a quote from one of the suspects (free clues and sudoku clues)
// - evidence: something the cats found (cat-puzzle clues)
//
// Placeholders: {s}/{S} suspect mid-sentence/start of sentence ("the Cook" /
// "The Cook"), {a}/{b} and {A}/{B} the two suspects in pair clues, {i} item,
// {r}/{r2} rooms. Room templates always write "the {r}" so a sudoku clue can
// swap in "the room at row 3, column 4".

import type { ClueFact, ClueSource, ClueType, Content } from './types.ts';
import type { Rng } from './rng.ts';

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

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const midSentence = (name: string) => name.replace(/^The /, 'the ');

/** People in a pair clue speak for themselves; otherwise the witness is someone else in the case. */
function pickSpeaker(fact: ClueFact, suspects: readonly string[], rng: Rng): string {
  if ('suspects' in fact) return fact.suspects[0];
  const others = suspects.filter((s) => !('suspect' in fact) || s !== fact.suspect);
  return rng.pick(others);
}

export function wordClue(
  fact: ClueFact,
  source: ClueSource,
  content: Content,
  suspects: readonly string[],
  rng: Rng,
  located = false,
): Worded {
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

  let template = rng.pick((source === 'testimony' ? TESTIMONY : EVIDENCE)[fact.type]);
  if (located) {
    if (!template.includes('the {r}') || 'rooms' in fact) throw new Error(`${fact.type} can't be located`);
    template = template.replace('the {r}', LOCATION_TOKEN);
  }
  const body = template.replace(/\{(\w+)\}/g, (_, k: string) => fill[k] ?? k);
  const speaker = source === 'testimony' ? pickSpeaker(fact, suspects, rng) : undefined;
  if (!located) return { speaker, body };
  const [before, after] = body.split(LOCATION_TOKEN);
  return { speaker, body: body.replace(LOCATION_TOKEN, `the ${fill.r}`), located: { before, after } };
}

/** Whether a clue names exactly one room, so a sudoku can point to it on the map. */
export const canLocate = (fact: ClueFact): fact is Extract<ClueFact, { room: string }> => 'room' in fact;

/** Plain one-line version, e.g. for the dev page: `The Maid: "…"` or the evidence sentence. */
export function plainText(w: Worded, content: Content): string {
  if (!w.speaker) return w.body;
  const name = content.suspects.find((s) => s.id === w.speaker)?.name ?? w.speaker;
  return `${name}: "${w.body}"`;
}
