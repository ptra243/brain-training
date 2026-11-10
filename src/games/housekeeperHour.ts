// The Housekeeper's hour (prototype, stage 1: no UI). Three rounds of three jobs for three hired staff,
// then a statement. Pure functions; see .claude/handoff/housekeeper-hour-text.md.
//
// Killer-blind by construction: `buildEvening` takes only an `EveningInput`, which has no murderer,
// weapon, scene room, solution or clue list. `eveningInput` is the one place a `Case` is read.

import { content as baseContent } from '../content/index.ts';
import { houseById } from '../content/houses.ts';
import { Rng, hashSeed } from '../engine/rng.ts';
import { guestNames } from '../engine/guestNames.ts';
import type { Case, Content } from '../engine/types.ts';
import type { Beat, HousekeeperHourContent, RequestDef, Staff, StaffKind } from '../content/housekeeperHour.ts';

export const ROUNDS = 3;
export const JOBS = 3;

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
}

export interface Job {
  guest: string;
  room: string;
  request: string;
  /** Another guest at the dinner (not the subject, not the Housekeeper), for gossip that names someone. */
  other: string;
}

export interface Evening {
  seed: number;
  houseId: string;
  rounds: readonly (readonly Job[])[];
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
  /** The speech bubble, names filled in. */
  line: string;
  /** Null for a repeat visit (the fallback line). */
  beat: Beat | null;
  /** A fallback report cannot be ticked. */
  tickable: boolean;
}

export interface StatementLine {
  kind: 'send' | 'beat';
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

/** The narrowed input for a case, or null when the game is not offered (the player is not seated). */
export function eveningInput(c: Case, hour: HousekeeperHourContent, content: Content = baseContent): EveningInput | null {
  if (!c.suspects.includes(hour.player)) return null;
  const house = houseById(c.houseId);
  return {
    seed: hashSeed('housekeeper-' + c.seed),
    houseId: c.houseId,
    guests: c.guests,
    victim: c.victim,
    suspects: c.suspects,
    names: guestNames(content, c.guests),
    roomNames: Object.fromEntries(house.rooms.map((r) => [r.id, r.name])),
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
 * Three jobs per round for three rounds. Draws only from `Rng(input.seed)`. A round is found by a
 * seeded search; if a round has no answer the whole evening is rolled again.
 */
export function buildEvening(hour: HousekeeperHourContent, input: EveningInput): Evening {
  const houseRooms = Object.keys(input.roomNames);
  const askers = input.guests.filter((g) => g !== hour.player);
  const rng = new Rng(input.seed);
  for (let attempt = 0; attempt < 200; attempt++) {
    const used = new Set<string>();
    const counts = new Map(askers.map((g) => [g, 0]));
    const rounds: Job[][] = [];
    let ok = true;
    for (let r = 0; r < ROUNDS && ok; r++) {
      // Fewest appearances first, ties in a seeded order.
      const order = rng.shuffle(askers).sort((a, b) => counts.get(a)! - counts.get(b)!);
      const jobs = pickRound(hour, order, houseRooms, used, rng);
      if (!jobs) {
        ok = false;
        break;
      }
      for (const j of jobs) {
        used.add(j.request);
        counts.set(j.guest, counts.get(j.guest)! + 1);
        const others = input.guests.filter((g) => g !== j.guest && g !== hour.player);
        j.other = rng.pick(others);
      }
      rounds.push(jobs);
    }
    if (!ok) continue;
    return {
      seed: input.seed,
      houseId: input.houseId,
      rounds,
      askJob: rng.int(JOBS),
      names: input.names,
      roomNames: input.roomNames,
    };
  }
  throw new Error('Could not build an evening');
}

/** Depth-first: guests in `order`, each with an unused request and a room. */
function pickRound(hour: HousekeeperHourContent, order: readonly string[], houseRooms: readonly string[], used: ReadonlySet<string>, rng: Rng): Job[] | null {
  const chosen: Job[] = [];
  const usedHere = new Set<string>();
  const go = (from: number): boolean => {
    if (chosen.length === JOBS) return true;
    for (let i = from; i < order.length; i++) {
      const guest = order[i];
      const defs = rng.shuffle(hour.requests.filter((d) => !used.has(d.id) && !usedHere.has(d.id) && (d.askers === 'any' || d.askers.includes(guest))));
      for (const def of defs) {
        const rooms = roomsFor(def, houseRooms, hour.baseRoom);
        if (rooms.length === 0) continue;
        const room = rng.pick(rooms);
        chosen.push({ guest, room, request: def.id, other: '' });
        usedHere.add(def.id);
        if (go(i + 1)) return true;
        chosen.pop();
        usedHere.delete(def.id);
      }
    }
    return false;
  };
  return go(0) ? chosen : null;
}

// ---------- Text ----------

/** Fill `{guest}` and `{other}` in. "The Host" keeps its capital at the start of a sentence and is "the Host" elsewhere. */
export function fill(text: string, evening: Pick<Evening, 'names'>, job: Job): string {
  return text.replace(/{(guest|other)}/g, (_m, which: 'guest' | 'other', offset: number) => {
    const name = evening.names[which === 'guest' ? job.guest : job.other] ?? '';
    const before = text.slice(0, offset).trimEnd();
    const startsSentence = before === '' || /[.!?]$/.test(before);
    return startsSentence ? name : name.replace(/^The /, 'the ');
  });
}

const roomName = (evening: Evening, job: Job): string => (evening.roomNames[job.room] ?? job.room).toLowerCase();

// ---------- Reports ----------

/**
 * What a staff member brings back from a job. `earlier` is the sends of the rounds before this one:
 * the same kind of staff visiting the same guest again brings the fallback line, which cannot be ticked.
 */
export function reportFor(hour: HousekeeperHourContent, evening: Evening, round: number, job: number, staffId: string, earlier: readonly (readonly string[])[]): Report {
  const j = evening.rounds[round][job];
  const s = staffOf(hour, staffId);
  const def = requestOf(hour, j.request);
  const mismatch = def.fits.includes(s.kind) ? null : (def.mismatch[s.kind] ?? null);
  const repeat = earlier.some((sends, r) => r < round && sends.some((id, k) => id === staffId && evening.rounds[r][k].guest === j.guest));
  if (repeat) {
    return { staff: staffId, kind: s.kind, mismatch, line: fill(hour.fallback[s.kind], evening, j), beat: null, tickable: false };
  }
  const beat = hour.beats[j.guest][s.kind];
  return { staff: staffId, kind: s.kind, mismatch, line: fill(beat.line, evening, j), beat, tickable: true };
}

// ---------- The statement ----------

/**
 * The statement for complete moves: the round-1 send, one line per tick that landed on a real
 * report.
 */
export function statementFor(hour: HousekeeperHourContent, evening: Evening, moves: Moves): StatementLine[] {
  const lines: StatementLine[] = [];
  let asked = 0;
  const chosen = () => moves.answers[asked++] ?? null;

  const first = evening.rounds[0][evening.askJob];
  const sentTo = staffOf(hour, moves.sends[0][evening.askJob]);
  lines.push({
    kind: 'send',
    before: 'At eight o’clock I sent ',
    after: ` to the ${roomName(evening, first)}.`,
    options: new Rng(hashSeed(`${evening.seed}-send`)).shuffle(hour.staff.map((s) => s.name)),
    answer: sentTo.name,
    round: 0,
    job: evening.askJob,
    chosen: chosen(),
  });

  for (let r = 0; r < evening.rounds.length; r++) {
    const t = moves.ticks[r];
    if (t === null || t === undefined) continue;
    const staffId = moves.sends[r][t];
    const report = reportFor(hour, evening, r, t, staffId, moves.sends.slice(0, r));
    if (!report.beat) continue;
    const j = evening.rounds[r][t];
    const intro = fill(`I sent ${staffOf(hour, staffId).name} to {guest} in the ${roomName(evening, j)}. `, evening, j);
    lines.push({
      kind: 'beat',
      before: intro + fill(report.beat.pre, evening, j),
      after: fill(report.beat.post, evening, j),
      options: new Rng(hashSeed(`${evening.seed}-opt-${r}-${t}`)).shuffle([report.beat.answer, ...report.beat.decoys]),
      answer: report.beat.answer,
      round: r,
      job: t,
      chosen: chosen(),
    });
  }

  return lines;
}
