// Interrogations: a suspect answers her questions truthfully except once.
// She catches the lie by presenting evidence that disproves it.
//
// Two kinds:
// - self-contained: the game brings 2–3 evidence cards. Easy: one card
//   disproves the lie. Hard: only two cards together do.
// - finale (hard cases): the evidence is her own casebook. Played after the
//   other puzzles; the lie is disproved by what her clues imply together.
//
// Everything is checked with the solver: the lie really is false, it really
// is disproved by the proof set, and every other answer is true.

import { compileClue, type ClueContext } from './clues.ts';
import type { Rng } from './rng.ts';
import { allCandidates } from './solver.ts';
import type { Clue, ClueFact, ClueSource, Content, Interrogation, Question, Solution } from './types.ts';
import { plainText, questionFor, wordClue } from './wording.ts';

export interface CaseFacts {
  suspects: readonly string[];
  rooms: readonly string[];
  items: readonly string[];
  solution: Solution;
  ctx: ClueContext;
}

/** Whether these facts and the lie can't all be true (no assignment satisfies them all). */
export function disproves(cf: CaseFacts, evidence: readonly ClueFact[], lie: ClueFact): boolean {
  const tests = [...evidence, lie].map((f) => compileClue(f, cf.ctx));
  return !allCandidates(cf.rooms, cf.items).some((sol) => tests.every((t) => t(sol)));
}

const isTrue = (cf: CaseFacts, f: ClueFact) => compileClue(f, cf.ctx)(cf.solution);

/** Every statement of the simple kinds about the people, rooms and weapons in play, true or false. */
function allStatements(cf: CaseFacts): ClueFact[] {
  const out: ClueFact[] = [];
  for (const s of cf.suspects) {
    for (const r of cf.rooms) out.push({ type: 'suspect-room', suspect: s, room: r }, { type: 'suspect-not-room', suspect: s, room: r });
    for (const i of cf.items) out.push({ type: 'suspect-item', suspect: s, item: i }, { type: 'suspect-not-item', suspect: s, item: i });
  }
  for (const i of cf.items) for (const r of cf.rooms) out.push({ type: 'item-room', item: i, room: r }, { type: 'item-not-room', item: i, room: r });
  for (let a = 0; a < cf.suspects.length; a++) {
    for (let b = a + 1; b < cf.suspects.length; b++) {
      const pair: [string, string] = [cf.suspects[a], cf.suspects[b]];
      out.push({ type: 'suspects-adjacent', suspects: pair }, { type: 'suspects-not-adjacent', suspects: pair });
    }
  }
  return out;
}

const mentions = (f: ClueFact, ids: Set<string>) =>
  Object.values(f).some((v) => (Array.isArray(v) ? v.some((x) => ids.has(x)) : typeof v === 'string' && ids.has(v)));

const sameFact = (a: ClueFact, b: ClueFact) => JSON.stringify(a) === JSON.stringify(b);

interface Setup {
  cards: ClueFact[];
  lie: ClueFact;
  proof: number[];
}

/** Self-contained evidence: a lie and the cards that catch it. */
function selfContained(cf: CaseFacts, hard: boolean, rng: Rng): Setup {
  const { suspects, rooms, solution } = cf;
  const roomOf = (s: string) => solution.room[suspects.indexOf(s)];
  const itemOf = (s: string) => solution.item[suspects.indexOf(s)];
  const holderOf = (i: string) => suspects[solution.item.indexOf(i)];
  const otherRoom = (r: string) => rng.pick(rooms.filter((x) => x !== r));

  const x = rng.pick(suspects);
  const i = itemOf(x);
  const r = roomOf(x);
  const patterns: (() => Setup)[] = hard
    ? [
        // Prints on the weapon + where they were => where the weapon was.
        () => ({
          cards: [{ type: 'suspect-item', suspect: x, item: i }, { type: 'suspect-room', suspect: x, room: r }],
          lie: { type: 'item-room', item: i, room: otherRoom(r) },
          proof: [0, 1],
        }),
        // Where the weapon was + who had it => where they were.
        () => ({
          cards: [{ type: 'item-room', item: i, room: r }, { type: 'suspect-item', suspect: holderOf(i), item: i }],
          lie: { type: 'suspect-room', suspect: x, room: otherRoom(r) },
          proof: [0, 1],
        }),
        // Where they were + what was in that room => what they held.
        () => ({
          cards: [{ type: 'suspect-room', suspect: x, room: r }, { type: 'item-room', item: i, room: r }],
          lie: { type: 'suspect-not-item', suspect: x, item: i },
          proof: [0, 1],
        }),
      ]
    : [
        () => ({ cards: [{ type: 'suspect-room', suspect: x, room: r }], lie: { type: 'suspect-room', suspect: x, room: otherRoom(r) }, proof: [0] }),
        () => ({ cards: [{ type: 'item-room', item: i, room: r }], lie: { type: 'item-room', item: i, room: otherRoom(r) }, proof: [0] }),
        () => ({ cards: [{ type: 'suspect-item', suspect: x, item: i }], lie: { type: 'suspect-not-item', suspect: x, item: i }, proof: [0] }),
      ];
  const setup = rng.pick(patterns)();

  // One extra card on the same people or things, true but no help on its own: a red herring.
  const near = new Set([x, i, r]);
  const herrings = allStatements(cf).filter(
    (f) =>
      ['suspect-not-room', 'item-not-room', 'suspect-not-item'].includes(f.type) &&
      mentions(f, near) &&
      isTrue(cf, f) &&
      !setup.cards.some((c) => sameFact(c, f)) &&
      !disproves(cf, [f], setup.lie),
  );
  if (herrings.length) setup.cards.splice(rng.int(setup.cards.length + 1), 0, rng.pick(herrings));
  setup.proof = setup.cards.map((_, k) => k).filter((k) => !herrings.some((h) => sameFact(h, setup.cards[k])));
  return setup;
}

/** Finale: find a lie that her clues disprove only in combination, preferring pairs. */
function finaleSetup(cf: CaseFacts, evidence: readonly ClueFact[], rng: Rng): Setup | null {
  const cands = allCandidates(cf.rooms, cf.items);
  const masks = evidence.map((f) => {
    const t = compileClue(f, cf.ctx);
    return cands.map((s) => t(s));
  });
  const lies = rng.shuffle(
    allStatements(cf).filter((f) => !f.type.startsWith('suspects-') && !isTrue(cf, f) && !evidence.some((e) => sameFact(e, f))),
  );
  const holds = (subset: number[], lieMask: boolean[]) => lieMask.some((ok, k) => ok && subset.every((e) => masks[e][k]));
  let fallback: Setup | null = null;
  for (const lie of lies.slice(0, 60)) {
    const t = compileClue(lie, cf.ctx);
    const lieMask = cands.map((s) => t(s));
    const all = evidence.map((_, k) => k);
    if (holds(all, lieMask)) continue; // her clues don't rule it out
    if (all.some((k) => !holds([k], lieMask))) {
      // One clue alone catches it: fine as a fallback, but we'd rather need two.
      const k = all.find((e) => !holds([e], lieMask))!;
      fallback ??= { cards: [], lie, proof: [k] };
      continue;
    }
    for (let a = 0; a < all.length; a++) {
      for (let b = a + 1; b < all.length; b++) {
        if (!holds([a, b], lieMask)) return { cards: [], lie, proof: [a, b] };
      }
    }
  }
  return fallback;
}

export interface BuildOptions {
  cf: CaseFacts;
  content: Content;
  rng: Rng;
  idPrefix: string;
  delivery: 'interrogation' | 'finale';
  /** Self-contained only: does catching the lie need two cards together? */
  hard: boolean;
  /** Finale only: her casebook, as evidence. */
  caseClues?: readonly Clue[];
  /** Avoid giving away true answers the case already states. */
  known?: readonly ClueFact[];
}

export function buildInterrogation(o: BuildOptions): Interrogation {
  const { cf, content, rng, idPrefix, delivery } = o;
  const finale = delivery === 'finale';
  const evidenceFacts = finale ? (o.caseClues ?? []).map((c) => c.fact) : [];

  const setup = finale ? finaleSetup(cf, evidenceFacts, rng) : selfContained(cf, o.hard, rng);
  if (!setup) throw new Error('No lie can be caught with these clues');

  // Whoever is in the chair talks about the lie's subject or someone else.
  const subject = 'suspect' in setup.lie ? setup.lie.suspect : null;
  const suspect = subject && rng.next() < 0.5 ? subject : rng.pick(cf.suspects);

  const word = (fact: ClueFact, source: ClueSource, id: string, speaker?: string): Clue => {
    const w = wordClue(fact, source, content, cf.suspects, rng, false, speaker);
    return { id, fact, delivery, source, speaker: w.speaker, body: w.body, text: plainText(w, content) };
  };

  const cards = setup.cards.map((f, k) => word(f, 'evidence', `${idPrefix}e${k + 1}`));
  const proof = finale ? setup.proof.map((k) => o.caseClues![k].id) : setup.proof.map((k) => cards[k].id);

  // Seven true answers: a couple about the same people and things as the lie
  // (they sound checkable but aren't the lie), the rest about anything.
  const near = new Set(Object.values(setup.lie).flat().filter((v): v is string => typeof v === 'string'));
  const taken = [...setup.cards, ...evidenceFacts, ...(o.known ?? [])];
  const truths = rng.shuffle(
    allStatements(cf).filter(
      (f) =>
        isTrue(cf, f) &&
        !taken.some((t) => sameFact(t, f)) &&
        f.type !== 'suspect-room' &&
        f.type !== 'suspect-item' &&
        // "I could hear X through the wall" only works from someone in the pair.
        (!('suspects' in f) || f.suspects.includes(suspect)),
    ),
  );
  const asked = new Set<string>([questionFor(setup.lie, suspect, content)]);
  const answers: ClueFact[] = [];
  const add = (f: ClueFact) => {
    const q = questionFor(f, suspect, content);
    if (asked.has(q) || answers.length >= 7) return;
    asked.add(q);
    answers.push(f);
  };
  for (const f of truths.filter((f) => mentions(f, near)).slice(0, 4)) if (answers.length < 2) add(f);
  for (const f of truths) add(f);

  const questions: Question[] = rng
    .shuffle([...answers.map((f) => ({ f, lie: false })), { f: setup.lie, lie: true }])
    .map(({ f, lie }, k) => ({
      id: `${idPrefix}q${k + 1}`,
      ask: questionFor(f, suspect, content),
      answer: word(f, 'testimony', `${idPrefix}q${k + 1}`, suspect),
      lie,
    }));

  return {
    suspect,
    cards,
    useCaseClues: finale,
    questions,
    proof,
    maxQuestions: finale ? 6 : 5,
    strikes: 3,
  };
}
