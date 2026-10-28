// A solver that searches instead of listing every answer. A classic case has
// at most 14,400 possible answers and `solver.ts` simply tries them all; with
// 7 guests sharing 5 rooms and holding 5 weapons there are about 200 million,
// so this keeps, for every guest, the rooms still possible and, for every
// weapon, the guests who could still hold it. Clues shrink those sets as soon
// as they can (a pruning step only ever removes what no answer could use), the
// search fills in the tightest one next, and every complete answer is still
// checked against every clue, so a clue without a pruning step is just checked
// at the end. `searchOracle.ts` keeps the old exhaustive search to compare.

import { compileClue, type ClueContext } from './clues.ts';
import type { ClueFact, Solution } from './types.ts';

/** What's in play, and whether suspects may share a room. */
export interface Space {
  suspects: readonly string[];
  rooms: readonly string[];
  items: readonly string[];
  shared: boolean;
}

const bitCount = (x: number) => {
  let c = 0;
  for (; x !== 0; x &= x - 1) c++;
  return c;
};
const lowBit = (x: number) => x & -x;
const bitIndex = (single: number) => 31 - Math.clz32(single);
const isSingle = (x: number) => x !== 0 && (x & (x - 1)) === 0;

/** Two guests' rooms: for each room of one, the rooms of the other that fit. */
interface Pair {
  a: number;
  b: number;
  ab: Int32Array;
  ba: Int32Array;
}

/**
 * How many answers fit every fact, stopping once the count passes `limit`.
 * Without `shared`, everyone has their own room and their own weapon.
 * `extra` tests are checked on each complete answer.
 */
export function countMatching(
  space: Space,
  facts: readonly ClueFact[],
  ctx: ClueContext,
  limit = Infinity,
  extra: readonly ((sol: Solution) => boolean)[] = [],
): number {
  const { suspects, rooms, items, shared } = space;
  const n = suspects.length;
  const m = items.length;
  const R = rooms.length;
  if (n > 30 || R > 30) throw new Error('search: too many guests or rooms for a bitmask');
  const allRooms = R === 0 ? 0 : (1 << R) - 1;
  const allHolders = n === 0 ? 0 : (1 << n) - 1;
  const V = n + m; // variables: guests' rooms 0..n-1, then each weapon's holder

  // Every complete answer is checked against all of these.
  const tests = [...facts.map((f) => compileClue(f, ctx)), ...extra];

  const dom0 = new Int32Array(V);
  for (let s = 0; s < n; s++) dom0[s] = allRooms;
  for (let j = 0; j < m; j++) dom0[n + j] = allHolders;

  const sIdx = (id: string) => suspects.indexOf(id);
  const iIdx = (id: string) => items.indexOf(id);
  const roomBit = (id: string) => {
    let mask = 0;
    for (let r = 0; r < R; r++) if (rooms[r] === id) mask |= 1 << r;
    return mask;
  };
  const adj = (a: string, b: string) => ctx.adjacency.get(a)?.has(b) ?? false;

  const itemAllow = new Int32Array(m).fill(allRooms); // rooms a weapon may be in
  const pairs: Pair[] = [];
  const alone: number[] = [];
  let dead = false;

  const pairOf = (a: number, b: number, fits: (ra: string, rb: string) => boolean) => {
    const ab = new Int32Array(R);
    const ba = new Int32Array(R);
    for (let x = 0; x < R; x++) {
      for (let y = 0; y < R; y++) {
        if (!fits(rooms[x], rooms[y])) continue;
        ab[x] |= 1 << y;
        ba[y] |= 1 << x;
      }
    }
    pairs.push({ a, b, ab, ba });
  };

  for (const fact of facts) {
    switch (fact.type) {
      case 'suspect-room': {
        const s = sIdx(fact.suspect);
        if (s >= 0) dom0[s] &= roomBit(fact.room);
        break;
      }
      case 'suspect-not-room': {
        const s = sIdx(fact.suspect);
        if (s >= 0) dom0[s] &= ~roomBit(fact.room);
        break;
      }
      case 'suspect-either-room': {
        const s = sIdx(fact.suspect);
        if (s >= 0) dom0[s] &= roomBit(fact.rooms[0]) | roomBit(fact.rooms[1]);
        break;
      }
      case 'suspect-next-to-room': {
        const s = sIdx(fact.suspect);
        if (s < 0) break;
        let mask = 0;
        for (let r = 0; r < R; r++) if (rooms[r] !== fact.room && adj(rooms[r], fact.room)) mask |= 1 << r;
        dom0[s] &= mask;
        break;
      }
      case 'suspect-item': {
        const s = sIdx(fact.suspect);
        const j = iIdx(fact.item);
        if (j < 0) dead = true; // nobody holds a weapon that isn't in play
        else if (s >= 0) dom0[n + j] &= 1 << s;
        break;
      }
      case 'suspect-not-item': {
        const s = sIdx(fact.suspect);
        const j = iIdx(fact.item);
        if (s >= 0 && j >= 0) dom0[n + j] &= ~(1 << s);
        break;
      }
      case 'suspect-empty-handed': {
        const s = sIdx(fact.suspect);
        if (s >= 0) for (let j = 0; j < m; j++) dom0[n + j] &= ~(1 << s);
        break;
      }
      case 'item-room': {
        const j = iIdx(fact.item);
        if (j >= 0) itemAllow[j] &= roomBit(fact.room);
        break;
      }
      case 'item-not-room': {
        const j = iIdx(fact.item);
        if (j >= 0) itemAllow[j] &= ~roomBit(fact.room);
        break;
      }
      case 'suspects-together':
      case 'suspects-apart':
      case 'suspects-adjacent':
      case 'suspects-not-adjacent': {
        const a = sIdx(fact.suspects[0]);
        const b = sIdx(fact.suspects[1]);
        if (a < 0 || b < 0) break;
        if (fact.type === 'suspects-together') pairOf(a, b, (x, y) => x === y);
        else if (fact.type === 'suspects-apart') pairOf(a, b, (x, y) => x !== y);
        else if (fact.type === 'suspects-adjacent') pairOf(a, b, adj);
        else pairOf(a, b, (x, y) => !adj(x, y));
        break;
      }
      case 'suspect-alone': {
        const s = sIdx(fact.suspect);
        if (s >= 0) alone.push(s);
        break;
      }
    }
  }
  if (dead) return 0;

  const itemsWithRoom: number[] = [];
  for (let j = 0; j < m; j++) if (itemAllow[j] !== allRooms) itemsWithRoom.push(j);

  /** Shrinks the sets to a fixpoint. False when some set empties (no answer). */
  const propagate = (d: Int32Array): boolean => {
    for (let v = 0; v < V; v++) if (d[v] === 0) return false;
    let changed = true;
    while (changed) {
      changed = false;
      // Own room for everyone when rooms aren't shared.
      if (!shared) {
        for (let v = 0; v < n; v++) {
          if (!isSingle(d[v])) continue;
          const bit = d[v];
          for (let o = 0; o < n; o++) {
            if (o === v || (d[o] & bit) === 0) continue;
            d[o] &= ~bit;
            if (d[o] === 0) return false;
            changed = true;
          }
        }
      }
      // A guest holds at most one weapon.
      for (let v = n; v < V; v++) {
        if (!isSingle(d[v])) continue;
        const bit = d[v];
        for (let o = n; o < V; o++) {
          if (o === v || (d[o] & bit) === 0) continue;
          d[o] &= ~bit;
          if (d[o] === 0) return false;
          changed = true;
        }
      }
      // A weapon in a room: its holder must be able to be there.
      for (let k = 0; k < itemsWithRoom.length; k++) {
        const j = itemsWithRoom[k];
        const allow = itemAllow[j];
        let holders = d[n + j];
        for (let rest = holders; rest !== 0; rest &= rest - 1) {
          const s = bitIndex(lowBit(rest));
          if ((d[s] & allow) === 0) holders &= ~(1 << s);
        }
        if (holders !== d[n + j]) {
          if (holders === 0) return false;
          d[n + j] = holders;
          changed = true;
        }
        if (isSingle(holders)) {
          const s = bitIndex(holders);
          const rs = d[s] & allow;
          if (rs !== d[s]) {
            if (rs === 0) return false;
            d[s] = rs;
            changed = true;
          }
        }
      }
      // Pairs of guests.
      for (let k = 0; k < pairs.length; k++) {
        const { a, b, ab, ba } = pairs[k];
        const da = d[a];
        const db = d[b];
        let na = 0;
        for (let rest = da; rest !== 0; rest &= rest - 1) {
          const lb = lowBit(rest);
          if ((ab[bitIndex(lb)] & db) !== 0) na |= lb;
        }
        if (na === 0) return false;
        d[a] = na;
        let nb = 0;
        for (let rest = db; rest !== 0; rest &= rest - 1) {
          const lb = lowBit(rest);
          if ((ba[bitIndex(lb)] & na) !== 0) nb |= lb;
        }
        if (nb === 0) return false;
        d[b] = nb;
        if (na !== da || nb !== db) changed = true;
      }
      // Alone: nobody else in a fixed guest's room, and not in anyone else's fixed room.
      for (let k = 0; k < alone.length; k++) {
        const s = alone[k];
        if (isSingle(d[s])) {
          const bit = d[s];
          for (let o = 0; o < n; o++) {
            if (o === s || (d[o] & bit) === 0) continue;
            d[o] &= ~bit;
            if (d[o] === 0) return false;
            changed = true;
          }
        }
        for (let o = 0; o < n; o++) {
          if (o === s || !isSingle(d[o]) || (d[s] & d[o]) === 0) continue;
          d[s] &= ~d[o];
          if (d[s] === 0) return false;
          changed = true;
        }
      }
    }
    return true;
  };

  // One set of domains per depth, so undoing is just going back up.
  const levels = Array.from({ length: V + 1 }, () => new Int32Array(V));
  const room: string[] = new Array(n);
  const item: (string | null)[] = new Array(n);
  const sol: Solution = { room, item };
  let count = 0;

  const search = (depth: number) => {
    const d = levels[depth];
    // The tightest unfixed variable next.
    let best = -1;
    let bestSize = 99;
    for (let v = 0; v < V; v++) {
      if (isSingle(d[v])) continue;
      const size = bitCount(d[v]);
      if (size < bestSize) {
        bestSize = size;
        best = v;
      }
    }
    if (best < 0) {
      for (let s = 0; s < n; s++) {
        room[s] = rooms[bitIndex(d[s])];
        item[s] = null;
      }
      for (let j = 0; j < m; j++) item[bitIndex(d[n + j])] = items[j];
      for (let t = 0; t < tests.length; t++) if (!tests[t](sol)) return;
      count++;
      return;
    }
    const next = levels[depth + 1];
    for (let rest = d[best]; rest !== 0; rest &= rest - 1) {
      next.set(d);
      next[best] = lowBit(rest);
      if (propagate(next)) search(depth + 1);
      if (count > limit) return;
    }
  };

  levels[0].set(dom0);
  if (propagate(levels[0])) search(0);
  return count;
}

/** Whether any answer fits every fact. */
export const anyMatching = (space: Space, facts: readonly ClueFact[], ctx: ClueContext) => countMatching(space, facts, ctx, 0) > 0;

/** Facts that make `suspect` the killer: alone in the scene room. */
const killerAt = (suspect: string, scene: string): ClueFact[] => [
  { type: 'suspect-room', suspect, room: scene },
  { type: 'suspect-alone', suspect },
];

/**
 * Who could be the killer, given the facts: anyone who could have been alone
 * in the scene room holding a weapon.
 */
export function possibleKillers(space: Space, facts: readonly ClueFact[], ctx: ClueContext, scene: string): string[] {
  return space.suspects.filter((suspect) => couldBeKiller(space, facts, ctx, scene, suspect));
}

/**
 * Whether this one guest could have been alone in the scene room holding a
 * weapon. Tried one weapon at a time, so the search can rule a weapon out as
 * soon as it's handed out rather than after everyone is placed.
 */
export function couldBeKiller(space: Space, facts: readonly ClueFact[], ctx: ClueContext, scene: string, suspect: string): boolean {
  const there = [...facts, ...killerAt(suspect, scene)];
  return space.items.some((item) => anyMatching(space, [...there, { type: 'suspect-item', suspect, item }], ctx));
}

/** Which weapons the killer could have used, if they were the killer. */
export function possibleWeapons(space: Space, facts: readonly ClueFact[], ctx: ClueContext, scene: string, killer: string): string[] {
  return space.items.filter((item) => anyMatching(space, [...facts, ...killerAt(killer, scene), { type: 'suspect-item', suspect: killer, item }], ctx));
}

/** Every way to put each suspect in one of the rooms, rooms shared freely: 5^7 = 78,125 for 7 guests. */
export function allRoomings(rooms: readonly string[], n: number): string[][] {
  let out: string[][] = [[]];
  for (let i = 0; i < n; i++) out = out.flatMap((partial) => rooms.map((r) => [...partial, r]));
  return out;
}

/** Every way to hand each weapon to a different suspect, the rest holding nothing: 2,520 for 5 weapons and 7 guests. */
export function allHoldings(items: readonly string[], n: number): (string | null)[][] {
  let out: (string | null)[][] = [new Array<string | null>(n).fill(null)];
  for (const w of items) {
    out = out.flatMap((partial) =>
      partial.flatMap((held, s) => {
        if (held !== null) return [];
        const next = partial.slice();
        next[s] = w;
        return [next];
      }),
    );
  }
  return out;
}

/**
 * `allRoomings` as one flat table, built once per (rooms, n) and shared: row `r`
 * holds each suspect's room as an index into `rooms`, in `allRoomings` order.
 */
const roomingTables = new Map<string, Uint8Array>();
export function roomingTable(roomCount: number, n: number): Uint8Array {
  const key = `${roomCount}/${n}`;
  let table = roomingTables.get(key);
  if (!table) {
    const rows = roomCount ** n;
    table = new Uint8Array(rows * n);
    for (let r = 0; r < rows; r++) {
      let rest = r;
      for (let s = n - 1; s >= 0; s--) {
        table[r * n + s] = rest % roomCount;
        rest = Math.floor(rest / roomCount);
      }
    }
    roomingTables.set(key, table);
  }
  return table;
}

/**
 * `allHoldings` as one flat table, built once per (items, n) and shared: row `r`
 * holds each suspect's weapon as an index into the items (-1 for nothing), in
 * `allHoldings` order.
 */
const holdingTables = new Map<string, Int8Array>();
export function holdingTable(itemCount: number, n: number): Int8Array {
  const key = `${itemCount}/${n}`;
  let table = holdingTables.get(key);
  if (!table) {
    const rows = allHoldings(Array.from({ length: itemCount }, (_, i) => String(i)), n);
    table = new Int8Array(rows.length * n);
    rows.forEach((row, r) => row.forEach((held, s) => (table![r * n + s] = held === null ? -1 : Number(held))));
    holdingTables.set(key, table);
  }
  return table;
}
