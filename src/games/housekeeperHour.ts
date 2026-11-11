// The Housekeeper's hour (prototype). Three rounds of three jobs for three hired staff; one watched guest
// calls every round, the rest call unevenly; then an interview. Pure functions; see .claude/handoff/housekeeper-watched-guest.md.
//
// Killer-blind by construction: `buildEvening` takes only an `EveningInput`, which has no murderer,
// weapon, scene room or solution, only two stand-in clues (fact and text). `eveningInput` is the one place a `Case` is read.

import { content as baseContent } from '../content/index.ts';
import { houseById } from '../content/houses.ts';
import { Rng, hashSeed } from '../engine/rng.ts';
import { guestNames } from '../engine/guestNames.ts';
import type { Case, ClueFact, Content } from '../engine/types.ts';
import type { Beat, HousekeeperHourContent, RequestDef, Staff, StaffKind } from '../content/housekeeperHour.ts';

export const ROUNDS = 3;
export const JOBS = 3;
/** The fewest callers the game needs: the watched guest every round and six more jobs shared among the rest. */
export const MIN_CALLERS = 4;
/** When each round's questions are about, in words. */
export const TIME_WORDS = ['eight', 'a quarter past eight', 'half past eight'] as const;

export interface StandInClue {
  fact: ClueFact;
  text: string;
}

/** All the evening builder may know about a case. */
export interface EveningInput {
  seed: number;
  houseId: string;
  guests: readonly string[];
  victim: string;
  suspects: readonly string[];
  /** Display names at this dinner, by guest id. */
  names: Readonly<Record<string, string>>;
  /** Room names of the house, by room id. */
  roomNames: Readonly<Record<string, string>>;
  /** Stand-ins for the clues this game would hand over; they decide who is watched. */
  clues: readonly StandInClue[];
  /**
   * Rooms a clue of the case says a guest was not in ("never set foot in"). No job puts that guest there, so
   * nothing she sees in the hour reads as contradicting a clue.
   */
  denied: readonly { guest: string; room: string }[];
}

export interface Job {
  guest: string;
  room: string;
  request: string;
  /** Another guest at the dinner (not the subject, not the Housekeeper), for gossip that names someone. */
  other: string;
  /** This guest's call number so far (0-based): the step of their thread. */
  step: number;
}

export interface Evening {
  seed: number;
  houseId: string;
  rounds: readonly (readonly Job[])[];
  /** Everyone who calls: the victim, then the seated guests other than the player. */
  callers: readonly string[];
  /** The guest who calls in every round and whose half-past-eight room she is asked. */
  watched: string;
  clues: readonly StandInClue[];
  victim: string;
  /** Which job of round 1 the statement asks about. */
  askJob: number;
  names: Readonly<Record<string, string>>;
  roomNames: Readonly<Record<string, string>>;
}

/** Her moves: who she sent to each job, a tick per round (the job index, or none), the answers she gave. */
export interface Moves {
  sends: string[][];
  ticks: (number | null)[];
  answers: string[];
}

export interface Report {
  staff: string;
  kind: StaffKind;
  /** The funny line when the staff member is not a fit for the job. */
  mismatch: string | null;
  /** What the guest was doing when the staff member arrived, names filled in. */
  scene: string;
  /** The speech bubble, names filled in. */
  line: string;
  /** The beat of this guest's thread for this round. */
  beat: Beat;
}

export interface StatementLine {
  kind: 'send' | 'beat' | 'where';
  /** What she asks the Housekeeper. */
  question: string;
  /** Said under the line once checked. */
  follow?: string;
  /** Text before the blank. */
  before: string;
  /** Text after the blank. */
  after: string;
  options: string[];
  answer: string;
  round?: number;
  job?: number;
  /** What she chose, or null. */
  chosen: string | null;
}

// ---------- The input ----------

const guestsIn = (f: ClueFact): string[] => ('suspect' in f ? [f.suspect] : 'suspects' in f ? [...f.suspects] : []);

/** The guests who can call: the victim, then the seated ones other than the player. */
const callersOf = (hour: HousekeeperHourContent, suspects: readonly string[], victim: string): string[] => [victim, ...suspects.filter((g) => g !== hour.player && g !== victim)];

/**
 * The narrowed input for a case, or null when the game is not offered (the player is not seated, or fewer than
 * MIN_CALLERS can call). The two stand-in clues are the case's own, picked from their own seeded stream.
 */
export function eveningInput(c: Case, hour: HousekeeperHourContent, content: Content = baseContent): EveningInput | null {
  if (!c.suspects.includes(hour.player)) return null;
  if (callersOf(hour, c.suspects, c.victim).length < MIN_CALLERS) return null;
  const house = houseById(c.houseId);
  const pool = c.clues.filter((x) => !x.blank);
  const clues = new Rng(hashSeed('housekeeper-clues-' + c.seed)).shuffle(pool).slice(0, 2).map((x) => ({ fact: x.fact, text: x.text }));
  return {
    seed: hashSeed('housekeeper-' + c.seed),
    houseId: c.houseId,
    guests: c.guests,
    victim: c.victim,
    suspects: c.suspects,
    names: guestNames(content, c.guests),
    roomNames: Object.fromEntries(house.rooms.map((r) => [r.id, r.name])),
    clues,
    denied: c.clues.flatMap((x) => (x.fact.type === 'suspect-not-room' ? [{ guest: x.fact.suspect, room: x.fact.room }] : [])),
  };
}

// ---------- Building the evening ----------

const requestOf = (hour: HousekeeperHourContent, id: string): RequestDef => {
  const r = hour.requests.find((x) => x.id === id);
  if (!r) throw new Error(`No request ${id}`);
  return r;
};

const staffOf = (hour: HousekeeperHourContent, id: string): Staff => {
  const s = hour.staff.find((x) => x.id === id);
  if (!s) throw new Error(`No staff ${id}`);
  return s;
};

/** Rooms a request can be in at this house: its rooms that exist there, never the base room (unless that is all there is). */
function roomsFor(def: RequestDef, houseRooms: readonly string[], baseRoom: string): string[] {
  const pool = def.rooms === 'any' ? houseRooms : houseRooms.filter((r) => (def.rooms as readonly string[]).includes(r));
  return pool.filter((r) => r !== baseRoom);
}

/**
 * Three jobs per round for three rounds. The watched guest calls every round; the other six jobs are shared
 * among the other callers as evenly as possible (everyone at least once, never twice in a round). Draws only
 * from `Rng(input.seed)`. A round is found by a seeded search; if one has no answer the schedule is rolled again.
 */
export function buildEvening(hour: HousekeeperHourContent, input: EveningInput): Evening {
  const houseRooms = Object.keys(input.roomNames);
  const rng = new Rng(input.seed);
  const callers = callersOf(hour, input.suspects, input.victim);
  if (callers.length < MIN_CALLERS) throw new Error('Too few callers');
  const canWatch = input.suspects.filter((g) => g !== hour.player && g !== input.victim);
  const named = input.clues.flatMap((c) => guestsIn(c.fact)).find((g) => canWatch.includes(g));
  const watched = named ?? rng.pick(canWatch);
  const others = rng.shuffle(callers.filter((g) => g !== watched));
  const extra = ROUNDS * (JOBS - 1) - others.length;
  const shares = others.flatMap((g, i) => (i < extra ? [g, g] : [g]));
  for (let attempt = 0; attempt < 200; attempt++) {
    // Deal the shared jobs two to a round, never the same guest twice in a round.
    let pairs: string[][] | null = null;
    for (let t = 0; t < 100 && !pairs; t++) {
      const order = rng.shuffle(shares);
      const p = Array.from({ length: ROUNDS }, (_, r) => order.slice(r * 2, r * 2 + 2));
      if (p.every((x) => x[0] !== x[1])) pairs = p;
    }
    if (!pairs) continue;
    const used = new Set<string>();
    const lastRoom = new Map<string, string>();
    const calls = new Map<string, number>();
    const rounds: Job[][] = [];
    let ok = true;
    for (let r = 0; r < ROUNDS; r++) {
      const jobs = pickRound(hour, rng.shuffle([watched, ...pairs[r]]), houseRooms, used, lastRoom, input.denied, rng);
      if (!jobs) {
        ok = false;
        break;
      }
      for (const j of jobs) {
        used.add(j.request);
        lastRoom.set(j.guest, j.room);
        j.step = calls.get(j.guest) ?? 0;
        calls.set(j.guest, j.step + 1);
        const others2 = input.guests.filter((g) => g !== j.guest && g !== hour.player);
        j.other = rng.pick(others2);
      }
      rounds.push(jobs);
    }
    if (!ok) continue;
    return {
      seed: input.seed,
      houseId: input.houseId,
      rounds,
      callers,
      watched,
      clues: input.clues,
      victim: input.victim,
      askJob: rng.int(JOBS),
      names: input.names,
      roomNames: input.roomNames,
    };
  }
  throw new Error('Could not build an evening');
}

/** Depth-first: each guest in `order` gets an unused request and a room, preferring a room they were not in last round. */
function pickRound(hour: HousekeeperHourContent, order: readonly string[], houseRooms: readonly string[], used: ReadonlySet<string>, lastRoom: ReadonlyMap<string, string>, denied: EveningInput['denied'], rng: Rng): Job[] | null {
  const chosen: Job[] = [];
  const usedHere = new Set<string>();
  const go = (i: number): boolean => {
    if (i === order.length) return true;
    const guest = order[i];
    const defs = rng.shuffle(hour.requests.filter((d) => !used.has(d.id) && !usedHere.has(d.id) && (d.askers === 'any' || d.askers.includes(guest))));
    for (const def of defs) {
      const rooms = roomsFor(def, houseRooms, hour.baseRoom).filter((r) => !denied.some((d) => d.guest === guest && d.room === r));
      if (rooms.length === 0) continue;
      const fresh = rooms.filter((r) => r !== lastRoom.get(guest));
      const room = rng.pick(fresh.length ? fresh : rooms);
      chosen.push({ guest, room, request: def.id, other: '', step: 0 });
      usedHere.add(def.id);
      if (go(i + 1)) return true;
      chosen.pop();
      usedHere.delete(def.id);
    }
    return false;
  };
  return go(0) ? chosen : null;
}

// ---------- Text ----------

/**
 * Fill `{guest}`, `{other}`, `{victim}` and `{room}` in. "The Host" keeps its capital at the start of a
 * sentence and is "the Host" elsewhere; `{room}` is lower case.
 */
export function fill(text: string, evening: Pick<Evening, 'names'> & Partial<Pick<Evening, 'roomNames' | 'victim'>>, job: Job): string {
  return text.replace(/{(guest|other|victim|room)}/g, (_m, which: 'guest' | 'other' | 'victim' | 'room', offset: number) => {
    if (which === 'room') return (evening.roomNames?.[job.room] ?? job.room).toLowerCase();
    const id = which === 'guest' ? job.guest : which === 'other' ? job.other : (evening.victim ?? '');
    const name = evening.names[id] ?? '';
    const before = text.slice(0, offset).trimEnd();
    const startsSentence = before === '' || /[.!?]$/.test(before);
    return startsSentence ? name : name.replace(/^The /, 'the ');
  });
}

const roomName = (evening: Evening, job: Job): string => (evening.roomNames[job.room] ?? job.room).toLowerCase();

// ---------- Reports ----------

/** What a staff member brings back from a job: step `job.step` of the guest's thread, and the scene. */
export function reportFor(hour: HousekeeperHourContent, evening: Evening, round: number, job: number, staffId: string): Report {
  const j = evening.rounds[round][job];
  const s = staffOf(hour, staffId);
  const def = requestOf(hour, j.request);
  const mismatch = def.fits.includes(s.kind) ? null : (def.mismatch[s.kind] ?? null);
  const beat = hour.threads[j.guest][j.step][s.kind];
  return { staff: staffId, kind: s.kind, mismatch, scene: fill(def.scene, evening, j), line: fill(beat.line, evening, j), beat };
}

// ---------- The statement ----------

/**
 * The interview for her moves: who did I send (round 1), what did each ticked report bring back, then where
 * the watched guest was at half past eight. The beat lines do not name the room, so they cannot answer the send line.
 */
export function statementFor(hour: HousekeeperHourContent, evening: Evening, moves: Moves): StatementLine[] {
  const lines: StatementLine[] = [];
  let asked = 0;
  const chosen = () => moves.answers[asked++] ?? null;

  // A ticked line names who went where, so the send question never asks about the job ticked in round 1.
  const askJob = moves.ticks[0] === evening.askJob ? (evening.askJob + 1) % JOBS : evening.askJob;
  const first = evening.rounds[0][askJob];
  const sentTo = staffOf(hour, moves.sends[0][askJob]);
  lines.push({
    kind: 'send',
    question: `Who went to the ${roomName(evening, first)} at ${TIME_WORDS[0]}?`,
    before: 'I sent ',
    after: ` to the ${roomName(evening, first)}.`,
    options: new Rng(hashSeed(`${evening.seed}-send`)).shuffle(hour.staff.map((s) => s.name)),
    answer: sentTo.name,
    round: 0,
    job: askJob,
    chosen: chosen(),
  });

  for (let r = 0; r < evening.rounds.length; r++) {
    const t = moves.ticks[r];
    if (t === null || t === undefined) continue;
    const staffId = moves.sends[r][t];
    const report = reportFor(hour, evening, r, t, staffId);
    const j = evening.rounds[r][t];
    lines.push({
      kind: 'beat',
      question: fill(`What did ${staffOf(hour, staffId).name} bring back about {guest}?`, evening, j),
      before: fill(report.beat.pre, evening, j),
      after: fill(report.beat.post, evening, j),
      options: new Rng(hashSeed(`${evening.seed}-opt-${r}-${t}`)).shuffle([report.beat.answer, ...report.beat.decoys]),
      answer: report.beat.answer,
      round: r,
      job: t,
      chosen: chosen(),
    });
  }

  const last = evening.rounds.length - 1;
  const wj = evening.rounds[last].findIndex((j) => j.guest === evening.watched);
  const watchedJob = evening.rounds[last][wj];
  const answerRoom = roomName(evening, watchedJob);
  const otherRooms = Object.keys(evening.roomNames).filter((id) => id !== watchedJob.room);
  const decoys = new Rng(hashSeed(`${evening.seed}-where`)).shuffle(otherRooms).slice(0, 2).map((id) => (evening.roomNames[id] ?? id).toLowerCase());
  const time = TIME_WORDS[last];
  lines.push({
    kind: 'where',
    question: fill(`Where was {guest} at ${time}?`, evening, watchedJob),
    before: fill('{guest} was in the ', evening, watchedJob),
    after: ` at ${time}.`,
    options: new Rng(hashSeed(`${evening.seed}-where-opts`)).shuffle([answerRoom, ...decoys]),
    answer: answerRoom,
    follow: 'After that I can’t say.',
    round: last,
    job: wj,
    chosen: chosen(),
  });

  return lines;
}
