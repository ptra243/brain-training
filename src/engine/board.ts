// Builds the case board (see `boardTypes.ts`): draw a full rectangle first,
// walk it with a Hilbert curve, cut the walk into sections and the sections
// into pieces, then check there is exactly one way to sort the pieces into
// sections (re-cutting or pinning a piece when there isn't). The same solver
// answers "can this partly filled board still be finished?" for the UI.

import { Rng, hashSeed } from './rng.ts';
import { UNKNOWN, boardKey } from './boardTypes.ts';
import type {
  Board,
  BoardCell,
  BoardMarks,
  BoardPiece,
  BoardPieceKind,
  BoardPlan,
} from './boardTypes.ts';
import type { Difficulty } from './types.ts';

type Cell = BoardCell;

const W = 8;
const MAX_H = 12;
const ATTEMPTS = 300;
const TOUCH_SYMBOLS = ['★', '◆', '●', '▲', '♣', '♥', '■', '✦'];
/** Search steps before the builder gives up on an attempt. */
const BUILD_BUDGET = 3_000;
const ATTEMPT_BUDGET = 12_000;
const MAX_SHIFTS = 12;
const MAX_REPAIR_PINS = 8;
const MAX_SLOW_PINS = 2;
/** Search steps before `boardSolvable` stops looking and says "yes, probably". */
const SOLVABLE_BUDGET = 5_000;

// ---------------------------------------------------------------- geometry

const k = (r: number, c: number) => boardKey(r, c);
const nbrs = ([r, c]: Cell): Cell[] => [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]];

const norm = (cells: readonly Cell[]): Cell[] => {
  const r0 = Math.min(...cells.map((c) => c[0]));
  const c0 = Math.min(...cells.map((c) => c[1]));
  return cells.map(([r, c]) => [r - r0, c - c0] as Cell).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
};
const keyOf = (cells: readonly Cell[]) => norm(cells).map((c) => c.join(',')).join(';');
const rotate = (cells: readonly Cell[]): Cell[] => norm(cells.map(([r, c]) => [c, -r] as Cell));
/** The distinct quarter-turns of a shape (no flips), each normalised and sorted row-major. */
function rotations(cells: readonly Cell[]): Cell[][] {
  const out: Cell[][] = [];
  let cur = norm(cells);
  for (let i = 0; i < 4; i++) {
    if (!out.some((o) => keyOf(o) === keyOf(cur))) out.push(cur);
    cur = rotate(cur);
  }
  return out;
}
const shapeKey = (cells: readonly Cell[]) => rotations(cells).map(keyOf).sort()[0];

function connected(cells: readonly Cell[]): boolean {
  if (!cells.length) return false;
  const set = new Set(cells.map(([r, c]) => k(r, c)));
  const seen = new Set([k(cells[0][0], cells[0][1])]);
  const stack: Cell[] = [cells[0]];
  while (stack.length) {
    for (const n of nbrs(stack.pop()!)) {
      const key = k(n[0], n[1]);
      if (set.has(key) && !seen.has(key)) {
        seen.add(key);
        stack.push(n);
      }
    }
  }
  return seen.size === set.size;
}

/** Generalized Hilbert curve over a width x height rectangle (gilbert2d), as [row, col]. */
function gilbert(width: number, height: number): Cell[] {
  const out: Cell[] = [];
  const sgn = (x: number) => Math.sign(x);
  const gen = (x: number, y: number, ax: number, ay: number, bx: number, by: number): void => {
    const w = Math.abs(ax + ay);
    const h = Math.abs(bx + by);
    const dax = sgn(ax), day = sgn(ay), dbx = sgn(bx), dby = sgn(by);
    if (h === 1) {
      for (let i = 0; i < w; i++) { out.push([y, x]); x += dax; y += day; }
      return;
    }
    if (w === 1) {
      for (let i = 0; i < h; i++) { out.push([y, x]); x += dbx; y += dby; }
      return;
    }
    let ax2 = Math.floor(ax / 2), ay2 = Math.floor(ay / 2);
    let bx2 = Math.floor(bx / 2), by2 = Math.floor(by / 2);
    const w2 = Math.abs(ax2 + ay2);
    const h2 = Math.abs(bx2 + by2);
    if (2 * w > 3 * h) {
      if (w2 % 2 && w > 2) { ax2 += dax; ay2 += day; }
      gen(x, y, ax2, ay2, bx, by);
      gen(x + ax2, y + ay2, ax - ax2, ay - ay2, bx, by);
    } else {
      if (h2 % 2 && h > 2) { bx2 += dbx; by2 += dby; }
      gen(x, y, bx2, by2, ax2, ay2);
      gen(x + bx2, y + by2, ax, ay, bx - bx2, by - by2);
      gen(x + (ax - dax) + (bx2 - dbx), y + (ay - day) + (by2 - dby), -bx2, -by2, -(ax - ax2), -(ay - ay2));
    }
  };
  if (width >= height) gen(0, 0, width, 0, 0, height);
  else gen(0, 0, 0, height, width, 0);
  return out;
}

// ------------------------------------------------------------------ rules

/** Sections a piece may sit in, from its marks. Body and fog are fixed, so they may be anywhere. */
function allowedSections(
  kind: BoardPieceKind,
  not: readonly string[],
  only: readonly string[] | null,
  sections: readonly string[],
): string[] {
  if (kind === 'grey') return [UNKNOWN];
  if (kind === 'body' || kind === 'fog') return sections.slice();
  return sections.filter((s) => s === UNKNOWN || (!not.includes(s) && (only === null || only.includes(s))));
}

// ----------------------------------------------------------------- solver

interface SolverPiece {
  id: string;
  kind: BoardPieceKind;
  who: string | null;
  cells: readonly Cell[];
  allowed: string[];
}
interface FixedPiece {
  id: string;
  kind: BoardPieceKind;
  who: string | null;
  section: string;
  cells: readonly Cell[];
}
interface SolveInput {
  sections: readonly string[];
  /** "r,c" → section for every square. */
  squares: Record<string, string>;
  loose: SolverPiece[];
  fixed: FixedPiece[];
  touches: readonly (readonly [string, string])[];
  apart: readonly (readonly [string, string])[];
  limit: number;
  /** Squares each loose piece really sits at (the cut), tried first when tiling. */
  hint?: Record<string, readonly Cell[]>;
  budget: number;
}
interface SolveOutput {
  /** Distinct section assignments (loose piece id → section), up to the limit. */
  found: Record<string, string>[];
  /** The step budget ran out before the search finished. */
  truncated: boolean;
  nodes: number;
}
interface Unit {
  i: number;
  members: SolverPiece[];
  allowed: string[];
  area: number;
  cls: string;
  /** Apart partners of any member (ids). */
  antiPartners: string[];
}

/**
 * Find the ways to sort the loose pieces into sections so every section can be
 * tiled exactly, filling the smallest section first. Pieces that must share a
 * section (a guest's own pieces, touching pairs) are packed as one unit, and
 * interchangeable pieces are tried once, so swaps are not counted.
 */
function solve(inp: SolveInput): SolveOutput {
  const { sections, squares, loose, fixed, touches, apart, limit } = inp;
  const none: SolveOutput = { found: [], truncated: false, nodes: 0 };
  let nodes = 0;
  let truncated = false;
  const tick = () => {
    if (++nodes > inp.budget) truncated = true;
    return truncated;
  };

  // Squares per section in row-major order.
  const coords = Object.keys(squares)
    .map((key) => { const [r, c] = key.split(',').map(Number); return { key, r, c }; })
    .sort((a, b) => a.r - b.r || a.c - b.c);
  const secKeys: Record<string, string[]> = {};
  const secCoords: Record<string, Cell[]> = {};
  const secSet: Record<string, Set<string>> = {};
  for (const s of sections) { secKeys[s] = []; secCoords[s] = []; }
  for (const q of coords) {
    const s = squares[q.key];
    if (!secKeys[s]) return none;
    secKeys[s].push(q.key);
    secCoords[s].push([q.r, q.c]);
  }
  for (const s of sections) secSet[s] = new Set(secKeys[s]);

  // Fixed pieces take their squares.
  const fixedSec = new Map<string, string>();
  const fixedById = new Map<string, FixedPiece>();
  const fixedIn: Record<string, FixedPiece[]> = {};
  const free: Record<string, number> = {};
  for (const s of sections) { fixedIn[s] = []; free[s] = secKeys[s].length; }
  const used0 = new Set<string>();
  for (const f of fixed) {
    if (!secSet[f.section]) return none;
    fixedSec.set(f.id, f.section);
    fixedById.set(f.id, f);
    fixedIn[f.section].push(f);
    for (const [r, c] of f.cells) {
      const key = k(r, c);
      if (!secSet[f.section].has(key) || used0.has(key)) return none;
      used0.add(key);
      free[f.section]--;
    }
  }
  const looseArea = loose.reduce((s, p) => s + p.cells.length, 0);
  if (looseArea !== sections.reduce((s, x) => s + free[x], 0)) return none;

  // Pairs between two fixed pieces are settled now.
  const cellsOfFixed = (id: string) => fixedById.get(id)!.cells;
  const adjacentCells = (a: readonly Cell[], b: readonly Cell[]) => {
    const kb = new Set(b.map(([r, c]) => k(r, c)));
    return a.some((c) => nbrs(c).some((n) => kb.has(k(n[0], n[1]))));
  };
  for (const [a, b] of touches) {
    if (fixedById.has(a) && fixedById.has(b)) {
      if (fixedSec.get(a) !== fixedSec.get(b) || !adjacentCells(cellsOfFixed(a), cellsOfFixed(b))) return none;
    }
  }
  for (const [a, b] of apart) {
    if (fixedById.has(a) && fixedById.has(b)) {
      const sa = fixedSec.get(a)!;
      if (sa === fixedSec.get(b) && sa !== UNKNOWN) return none;
    }
  }

  // Allowed sections, narrowed by fixed relatives.
  const looseById = new Map(loose.map((p) => [p.id, p]));
  const allowed = new Map(loose.map((p) => [p.id, new Set(p.allowed.filter((s) => secSet[s]))]));
  const restrictTo = (id: string, only: string) => {
    const set = allowed.get(id)!;
    for (const s of [...set]) if (s !== only) set.delete(s);
  };
  for (const [a, b] of touches) {
    if (looseById.has(a) && fixedById.has(b)) restrictTo(a, fixedSec.get(b)!);
    if (looseById.has(b) && fixedById.has(a)) restrictTo(b, fixedSec.get(a)!);
  }
  for (const [a, b] of apart) {
    for (const [x, y] of [[a, b], [b, a]] as const) {
      if (looseById.has(x) && fixedById.has(y)) {
        const s = fixedSec.get(y)!;
        if (s !== UNKNOWN) allowed.get(x)!.delete(s);
      }
    }
  }
  for (const p of loose) {
    if (p.kind !== 'guest') continue;
    for (const f of fixed) if (f.kind === 'guest' && f.who === p.who) restrictTo(p.id, f.section);
  }

  // Units: pieces that must share a section.
  const parent = new Map(loose.map((p) => [p.id, p.id]));
  const find = (x: string): string => { while (parent.get(x) !== x) x = parent.get(x)!; return x; };
  const union = (a: string, b: string) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
  for (const p of loose) {
    if (p.kind !== 'guest') continue;
    for (const q of loose) if (q !== p && q.kind === 'guest' && q.who === p.who) union(p.id, q.id);
  }
  for (const [a, b] of touches) if (looseById.has(a) && looseById.has(b)) union(a, b);

  const touchOf = new Map<string, string[]>();
  const antiOf = new Map<string, string[]>();
  const link = (m: Map<string, string[]>, a: string, b: string) => {
    (m.get(a) ?? m.set(a, []).get(a)!).push(b);
    (m.get(b) ?? m.set(b, []).get(b)!).push(a);
  };
  for (const [a, b] of touches) link(touchOf, a, b);
  for (const [a, b] of apart) link(antiOf, a, b);

  const groups = new Map<string, SolverPiece[]>();
  for (const p of loose) {
    const root = find(p.id);
    (groups.get(root) ?? groups.set(root, []).get(root)!).push(p);
  }
  const pieceCls = new Map<string, string>();
  for (const p of loose) {
    const al = [...allowed.get(p.id)!].sort().join('/');
    pieceCls.set(p.id, [p.kind, p.who, shapeKey(p.cells), al, (touchOf.get(p.id) ?? []).slice().sort().join('~'), (antiOf.get(p.id) ?? []).slice().sort().join('~')].join('|'));
  }
  const units: Unit[] = [];
  for (const members of groups.values()) {
    let al: string[] = [...allowed.get(members[0].id)!];
    for (const m of members) al = al.filter((s) => allowed.get(m.id)!.has(s));
    const ids = new Set(members.map((m) => m.id));
    // An apart pair inside one unit can only be satisfied in Unknown.
    if (apart.some(([a, b]) => ids.has(a) && ids.has(b))) al = al.filter((s) => s === UNKNOWN);
    if (!al.length) return none;
    units.push({
      i: units.length,
      members,
      allowed: al,
      area: members.reduce((s, m) => s + m.cells.length, 0),
      cls: members.map((m) => pieceCls.get(m.id)!).sort().join('&'),
      antiPartners: members.flatMap((m) => antiOf.get(m.id) ?? []),
    });
  }
  // Big, awkward units first among candidates.
  units.sort((a, b) => a.allowed.length - b.allowed.length || b.area - a.area || (a.members[0].id < b.members[0].id ? -1 : 1));
  units.forEach((u, i) => (u.i = i));

  // Orientations as offsets from the piece's first square (row-major).
  const offsets = new Map<string, Cell[][]>();
  for (const p of loose) {
    offsets.set(p.id, rotations(p.cells).map((rot) => rot.map(([r, c]) => [r - rot[0][0], c - rot[0][1]] as Cell)));
  }

  // ---- tiling one section with a given set of loose pieces
  const rowsN = coords.length ? coords[coords.length - 1].r + 1 : 0;
  let colsN = 0;
  for (const q of coords) colsN = Math.max(colsN, q.c + 1);
  const grid: Record<string, Int32Array> = {};
  const nbIdx: Record<string, number[][]> = {};
  for (const s of sections) {
    const g = new Int32Array(rowsN * colsN).fill(-1);
    secCoords[s].forEach(([r, c], i) => (g[r * colsN + c] = i));
    grid[s] = g;
    nbIdx[s] = secCoords[s].map(([r, c]) => {
      const out: number[] = [];
      if (r > 0 && g[(r - 1) * colsN + c] >= 0) out.push(g[(r - 1) * colsN + c]);
      if (r + 1 < rowsN && g[(r + 1) * colsN + c] >= 0) out.push(g[(r + 1) * colsN + c]);
      if (c > 0 && g[r * colsN + c - 1] >= 0) out.push(g[r * colsN + c - 1]);
      if (c + 1 < colsN && g[r * colsN + c + 1] >= 0) out.push(g[r * colsN + c + 1]);
      return out;
    });
  }
  const sizeOfPiece = new Map(loose.map((p) => [p.id, p.cells.length]));
  /** Every place a piece fits inside a section, ignoring other pieces. */
  const placementCache = new Map<string, number[][]>();
  function placementsOf(s: string, id: string): number[][] {
    const key = s + '|' + id;
    let out = placementCache.get(key);
    if (out) return out;
    out = [];
    const g = grid[s];
    for (const offs of offsets.get(id)!) {
      for (const [fr, fc] of secCoords[s]) {
        const at: number[] = [];
        for (const [dr, dc] of offs) {
          const r = fr + dr, c = fc + dc;
          const j = r >= 0 && c >= 0 && r < rowsN && c < colsN ? g[r * colsN + c] : -1;
          if (j < 0) break;
          at.push(j);
        }
        if (at.length === offs.length) out.push(at);
      }
    }
    placementCache.set(key, out);
    return out;
  }
  const memo = new Map<string, boolean>();
  function tiles(s: string, ids: string[]): boolean {
    const memoKey = s + ':' + ids.slice().sort().join(',');
    const cached = memo.get(memoKey);
    if (cached !== undefined) return cached;
    const n = secKeys[s].length;
    const g = grid[s];
    const nb = nbIdx[s];
    const occ = new Uint8Array(n);
    const own: string[] = new Array(n).fill('');
    const placedAt = new Map<string, number[]>();
    for (const f of fixedIn[s]) {
      const idxs = f.cells.map(([r, c]) => g[r * colsN + c]);
      placedAt.set(f.id, idxs);
      for (const i of idxs) { occ[i] = 1; own[i] = f.id; }
    }
    const fixedCount = fixedIn[s].reduce((t, f) => t + f.cells.length, 0);
    const adjacentTo = (idxs: readonly number[], partner: string) => idxs.some((i) => nb[i].some((j) => own[j] === partner));
    // The cut itself is a tiling: if the pieces sit at their hinted squares and that fills the section, we're done.
    if (inp.hint && ids.every((id) => inp.hint![id])) {
      let fits = true;
      const seenHint = new Set<number>();
      const hintAt = new Map<string, number[]>();
      for (const id of ids) {
        const idxs: number[] = [];
        for (const [r, c] of inp.hint[id]) {
          const j = r >= 0 && c >= 0 && r < rowsN && c < colsN ? g[r * colsN + c] : -1;
          if (j < 0 || occ[j] || seenHint.has(j)) { fits = false; break; }
          seenHint.add(j);
          idxs.push(j);
        }
        if (!fits) break;
        hintAt.set(id, idxs);
      }
      if (fits && seenHint.size + fixedCount === n) {
        const near = (a: readonly number[], b: readonly number[]) => a.some((i) => nb[i].some((j) => b.includes(j)));
        const got = (id: string) => hintAt.get(id) ?? placedAt.get(id);
        const touchesFine = ids.every((id) => (touchOf.get(id) ?? []).every((p) => { const o = got(p); return !o || near(got(id)!, o); }));
        if (touchesFine) { memo.set(memoKey, true); return true; }
      }
    }
    const usedIds = new Set<string>();
    const stamp = new Int32Array(n);
    let stampNo = 0;
    const queue = new Int32Array(n);
    /** True when some empty pocket can't be filled by the pieces left. */
    const dead = (): boolean => {
      let mask = 1;
      let minSize = Infinity;
      for (const id of ids) {
        if (usedIds.has(id)) continue;
        const sz = sizeOfPiece.get(id)!;
        mask |= mask << sz;
        if (sz < minSize) minSize = sz;
      }
      stampNo++;
      for (let i = 0; i < n; i++) {
        if (occ[i] || stamp[i] === stampNo) continue;
        let head = 0, tail = 0;
        queue[tail++] = i;
        stamp[i] = stampNo;
        while (head < tail) {
          for (const j of nb[queue[head++]]) if (!occ[j] && stamp[j] !== stampNo) { stamp[j] = stampNo; queue[tail++] = j; }
        }
        if (tail < minSize || (tail <= 30 && ((mask >>> tail) & 1) === 0)) return true;
      }
      return false;
    };
    const failed = new Set<string>();
    const cover = new Int32Array(n);
    const go = (): boolean => {
      if (tick()) return false;
      let empties = 0;
      for (let i = 0; i < n; i++) if (!occ[i]) empties++;
      if (!empties) return true;
      const stateKey = [...usedIds].sort().map((u) => ((touchOf.get(u)?.length) ? u + '@' + placedAt.get(u)!.join('.') : u)).join(',') + '|' + occ.join('');
      if (failed.has(stateKey)) return false;
      // Every way each unused piece fits now; branch on the empty square the fewest of them cover.
      const options: { id: string; sig: string; at: number[] }[] = [];
      cover.fill(0);
      for (const id of ids) {
        if (usedIds.has(id)) continue;
        const sig = pieceCls.get(id)!;
        const touchPartners = touchOf.get(id) ?? [];
        let found = 0;
        for (const at of placementsOf(s, id)) {
          let ok = true;
          for (let q = 0; q < at.length; q++) if (occ[at[q]]) { ok = false; break; }
          if (!ok) continue;
          if (touchPartners.length && !touchPartners.every((p) => !placedAt.has(p) || adjacentTo(at, p))) continue;
          options.push({ id, sig, at });
          found++;
          for (let q = 0; q < at.length; q++) cover[at[q]]++;
        }
        if (!found) { if (!truncated) failed.add(stateKey); return false; }
      }
      let best = -1;
      for (let i = 0; i < n; i++) {
        if (occ[i]) continue;
        if (cover[i] === 0) { if (!truncated) failed.add(stateKey); return false; }
        if (best < 0 || cover[i] < cover[best]) best = i;
      }
      const tried = new Set<string>();
      for (const { id, sig, at: placed } of options) {
        if (!placed.includes(best)) continue;
        const dup = sig + '/' + placed.join('.');
        if (tried.has(dup)) continue;
        tried.add(dup);
        for (const j of placed) { occ[j] = 1; own[j] = id; }
        placedAt.set(id, placed);
        let good = true;
        for (const partner of touchOf.get(id) ?? []) {
          if (placedAt.has(partner) && !adjacentTo(placed, partner)) { good = false; break; }
        }
        if (good) {
          usedIds.add(id);
          if (!dead() && go()) return true;
          usedIds.delete(id);
        }
        for (const j of placed) { occ[j] = 0; own[j] = ''; }
        placedAt.delete(id);
        if (truncated) return false;
      }
      if (!truncated) failed.add(stateKey);
      return false;
    };
    const ok = !dead() && go();
    if (!truncated) memo.set(memoKey, ok);
    return ok;
  }

  // ---- choose which units go in which section, smallest section first
  const regs = sections.slice().sort((x, y) => free[x] - free[y]);
  const assigned = new Map<number, string>();
  const found = new Map<string, Record<string, string>>();
  function rec(ri: number): void {
    if (found.size >= limit || truncated) return;
    if (ri === regs.length) {
      if (assigned.size !== units.length) return;
      const bySig = new Map<string, string[]>();
      for (const u of units) (bySig.get(u.cls) ?? bySig.set(u.cls, []).get(u.cls)!).push(assigned.get(u.i)!);
      const sig = [...bySig].map(([c, list]) => c + '=' + list.sort().join('/')).sort().join(';');
      if (!found.has(sig)) {
        const out: Record<string, string> = {};
        for (const u of units) for (const m of u.members) out[m.id] = assigned.get(u.i)!;
        found.set(sig, out);
      }
      return;
    }
    const s = regs[ri];
    const area = free[s];
    const cand = units.filter((u) => !assigned.has(u.i) && u.allowed.includes(s));
    const suffix = new Array<number>(cand.length + 1).fill(0);
    for (let i = cand.length - 1; i >= 0; i--) suffix[i] = suffix[i + 1] + cand[i].area;
    const later = regs.slice(ri + 1);
    const chosen: Unit[] = [];
    const chosenIds = new Set<string>();
    const pick = (idx: number, sum: number, skipped: Set<string>): void => {
      if (found.size >= limit || tick()) return;
      if (sum === area) {
        chosen.forEach((u) => assigned.set(u.i, s));
        const stranded = units.some((u) => !assigned.has(u.i) && !u.allowed.some((r) => later.includes(r)));
        if (!stranded && tiles(s, chosen.flatMap((u) => u.members.map((m) => m.id)))) rec(ri + 1);
        chosen.forEach((u) => assigned.delete(u.i));
        return;
      }
      if (idx === cand.length || sum > area || sum + suffix[idx] < area) return;
      const u = cand[idx];
      if (!skipped.has(u.cls) && sum + u.area <= area && !(s !== UNKNOWN && u.antiPartners.some((x) => chosenIds.has(x)))) {
        chosen.push(u);
        u.members.forEach((m) => chosenIds.add(m.id));
        pick(idx + 1, sum + u.area, skipped);
        u.members.forEach((m) => chosenIds.delete(m.id));
        chosen.pop();
      }
      const sk = new Set(skipped);
      sk.add(u.cls);
      pick(idx + 1, sum, sk);
    };
    pick(0, 0, new Set());
  }
  rec(0);
  return { found: [...found.values()], truncated, nodes };
}

// -------------------------------------------------- reading a built board

/** Touch and apart pairs from the symbols on a board's pieces. */
function pairsFromMarks(pieces: readonly BoardPiece[]) {
  const touches: [string, string][] = [];
  const apart: [string, string][] = [];
  const collect = (get: (m: BoardMarks) => string[], out: [string, string][]) => {
    const bySym = new Map<string, string[]>();
    for (const p of pieces) for (const sym of get(p.marks)) (bySym.get(sym) ?? bySym.set(sym, []).get(sym)!).push(p.id);
    for (const ids of bySym.values()) for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) out.push([ids[i], ids[j]]);
  };
  collect((m) => m.sym, touches);
  collect((m) => m.anti, apart);
  return { touches, apart };
}

/**
 * The ways to sort a board's pieces into sections, with only body and fog
 * fixed, plus any `pinned` ids at their true squares (up to `limit`, not counting swaps of identical pieces). A built
 * board has exactly one.
 */
export function countPackings(board: Board, limit = 2, pinned: readonly string[] = []): number {
  const fixed: FixedPiece[] = [];
  const loose: SolverPiece[] = [];
  for (const p of board.pieces) {
    if (p.kind === 'body' || p.kind === 'fog' || pinned.includes(p.id)) {
      fixed.push({ id: p.id, kind: p.kind, who: p.who, section: board.truth[p.id].section, cells: board.truth[p.id].cells });
    } else {
      loose.push({ id: p.id, kind: p.kind, who: p.who, cells: p.shape, allowed: allowedSections(p.kind, p.marks.not, p.marks.only, board.sections) });
    }
  }
  const { touches, apart } = pairsFromMarks(board.pieces);
  return solve({ sections: board.sections, squares: board.cells, loose, fixed, touches, apart, limit, budget: 5_000_000, hint: truthHint(board) }).found.length;
}

/**
 * Can the rest of the board still be packed? `fixed` pieces sit at exact
 * squares (pinned pieces, whatever she has placed); `at` forces other pieces
 * into a section. Body and fog not listed in `fixed` stay where they were
 * built. True means every other piece can still go somewhere so the whole
 * board is filled and every rule holds. If the search runs out of steps it
 * answers true (never tell her a good board is wrong).
 */
export function boardSolvable(
  board: Board,
  fixed: Record<string, readonly BoardCell[]>,
  at: Record<string, string> = {},
): boolean {
  const byId = new Map(board.pieces.map((p) => [p.id, p]));
  const fixedList: FixedPiece[] = [];
  const taken = new Set<string>();
  const place = (p: BoardPiece, cells: readonly Cell[]): boolean => {
    if (!cells.length) return false;
    const section = board.cells[k(cells[0][0], cells[0][1])];
    if (section === undefined) return false;
    for (const [r, c] of cells) {
      const key = k(r, c);
      if (board.cells[key] !== section || taken.has(key)) return false;
      taken.add(key);
    }
    if (cells.length !== p.shape.length || shapeKey(cells) !== shapeKey(p.shape)) return false;
    if (p.kind !== 'body' && p.kind !== 'fog' && !allowedSections(p.kind, p.marks.not, p.marks.only, board.sections).includes(section)) return false;
    fixedList.push({ id: p.id, kind: p.kind, who: p.who, section, cells });
    return true;
  };
  for (const [id, cells] of Object.entries(fixed)) {
    const p = byId.get(id);
    if (!p || !place(p, cells)) return false;
  }
  for (const p of board.pieces) {
    if ((p.kind === 'body' || p.kind === 'fog') && !(p.id in fixed) && !place(p, board.truth[p.id].cells)) return false;
  }
  const fixedIds = new Set(fixedList.map((f) => f.id));
  for (const [id, section] of Object.entries(at)) {
    const p = byId.get(id);
    if (!p || !board.sections.includes(section)) return false;
    if (fixedIds.has(id) && fixedList.find((f) => f.id === id)!.section !== section) return false;
  }
  const loose: SolverPiece[] = [];
  for (const p of board.pieces) {
    if (fixedIds.has(p.id)) continue;
    let allowed = allowedSections(p.kind, p.marks.not, p.marks.only, board.sections);
    if (p.id in at) allowed = allowed.filter((s) => s === at[p.id]);
    if (!allowed.length) return false;
    loose.push({ id: p.id, kind: p.kind, who: p.who, cells: p.shape, allowed });
  }
  const { touches, apart } = pairsFromMarks(board.pieces);
  const out = solve({ sections: board.sections, squares: board.cells, loose, fixed: fixedList, touches, apart, limit: 1, budget: SOLVABLE_BUDGET, hint: truthHint(board) });
  return out.found.length > 0 || out.truncated;
}

// ---------------------------------------------------------------- building

interface Work {
  id: string;
  kind: BoardPieceKind;
  who: string | null;
  size: number;
  section: string;
  not: string[];
  only: string[] | null;
  sym: string[];
  anti: string[];
  clue: string | null;
  hidden?: boolean;
  cells: Cell[];
}

const alwaysFixed = (p: Work) => p.kind === 'body' || p.kind === 'fog';

/** Check that the plan itself is consistent: its own truth must obey every rule. */
function planIsSound(plan: BoardPlan, sections: string[]): boolean {
  const ids = new Set<string>();
  const sectionOf = new Map<string, string>();
  for (const p of plan.pieces) {
    if (ids.has(p.id) || !sections.includes(p.section)) return false;
    ids.add(p.id);
    sectionOf.set(p.id, p.section);
    if (p.kind === 'fog' && p.section !== UNKNOWN) return false;
    if (!allowedSections(p.kind, p.not, p.only, sections).includes(p.section)) return false;
  }
  const guestSection = new Map<string, string>();
  for (const p of plan.pieces) {
    if (p.kind !== 'guest' || p.who === null) continue;
    const seen = guestSection.get(p.who);
    if (seen !== undefined && seen !== p.section) return false;
    guestSection.set(p.who, p.section);
  }
  for (const [a, b] of plan.touches) {
    if (!ids.has(a) || !ids.has(b) || a === b || sectionOf.get(a) !== sectionOf.get(b)) return false;
  }
  for (const [a, b] of plan.apart) {
    if (!ids.has(a) || !ids.has(b) || a === b) return false;
    const sa = sectionOf.get(a)!;
    if (sa === sectionOf.get(b) && sa !== UNKNOWN) return false;
  }
  return true;
}

/**
 * Build the board for a plan. Same plan, same board. Null when the plan
 * contradicts itself, or when no cut of the board has exactly one packing
 * within the attempts allowed.
 */
export function buildBoard(plan: BoardPlan): Board | null {
  const sections = [...plan.rooms.filter((r) => r !== UNKNOWN), UNKNOWN];
  if (!planIsSound(plan, sections)) return null;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const board = buildAttempt(plan, sections, hashSeed(`${plan.seed}-board-${attempt}`));
    if (board) return board;
  }
  return null;
}

function buildAttempt(plan: BoardPlan, sections: string[], seed: number): Board | null {
  const rng = new Rng(seed);
  const rooms = sections.filter((s) => s !== UNKNOWN);
  const neverPin = new Set(plan.neverPin);

  // ---- pieces and sizes
  const ps: Work[] = [];
  const sizeOf = (kind: BoardPieceKind) =>
    kind === 'guest' ? 3 + rng.int(3) : kind === 'weapon' ? 3 + rng.int(2) : kind === 'grey' ? 4 : kind === 'fog' ? 3 + rng.int(2) : 2;
  for (const p of plan.pieces) {
    ps.push({ id: p.id, kind: p.kind, who: p.who, size: sizeOf(p.kind), section: p.section, not: p.not.slice(), only: p.only ? p.only.slice() : null, sym: [], anti: [], clue: p.clue, hidden: p.hidden, cells: [] });
  }
  const ids = new Set(ps.map((p) => p.id));
  for (let i = 0; i < plan.fog; i++) {
    let id = `fog${i + 1}`;
    while (ids.has(id)) id += '_';
    ids.add(id);
    ps.push({ id, kind: 'fog', who: null, size: sizeOf('fog'), section: UNKNOWN, not: [], only: null, sym: [], anti: [], clue: null, cells: [] });
  }
  let total = ps.reduce((s, p) => s + p.size, 0);
  if (total === 0) return null;
  const H = Math.ceil(total / W);
  if (H > MAX_H) return null;
  const growable = rng.shuffle(ps.filter((p) => p.kind === 'guest' || p.kind === 'weapon'));
  for (let i = 0; growable.length && total < W * H && i < 200; i++) {
    const p = growable[i % growable.length];
    if (p.size < 6) { p.size++; total++; }
  }
  if (total !== W * H) return null;
  const byId = new Map(ps.map((p) => [p.id, p]));

  // ---- walk the rectangle and cut it
  let curve = gilbert(W, H);
  if (rng.next() < 0.5) curve = curve.map(([r, c]) => [r, W - 1 - c] as Cell);
  if (rng.next() < 0.5) curve = curve.map(([r, c]) => [H - 1 - r, c] as Cell);
  for (let i = 1; i < curve.length; i++) {
    if (Math.abs(curve[i][0] - curve[i - 1][0]) + Math.abs(curve[i][1] - curve[i - 1][1]) !== 1) return null;
  }
  const order = rng.next() < 0.5 ? [...rng.shuffle(rooms), UNKNOWN] : [UNKNOWN, ...rng.shuffle(rooms)];
  const touchAdj = new Map<string, string[]>();
  for (const [a, b] of plan.touches) {
    (touchAdj.get(a) ?? touchAdj.set(a, []).get(a)!).push(b);
    (touchAdj.get(b) ?? touchAdj.set(b, []).get(b)!).push(a);
  }
  const degree = (p: Work) => (touchAdj.get(p.id) ?? []).length;
  let at = 0;
  for (const sec of order) {
    // Touching pieces go side by side along the curve so they share an edge.
    const mine = rng.shuffle(ps.filter((p) => p.section === sec)).sort((a, b) => degree(a) - degree(b));
    const seen = new Set<string>();
    const units: Work[][] = [];
    const visit = (p: Work, comp: Work[]) => {
      seen.add(p.id);
      comp.push(p);
      for (const nb of touchAdj.get(p.id) ?? []) {
        const q = byId.get(nb)!;
        if (!seen.has(nb) && q.section === sec) visit(q, comp);
      }
    };
    for (const p of mine) {
      if (seen.has(p.id)) continue;
      const comp: Work[] = [];
      visit(p, comp);
      units.push(comp);
    }
    let seq = units.flat();
    if (sec === UNKNOWN) {
      // Try orders of Unknown's pieces; keep the one where the always-fixed
      // pieces (fog, grey, body) leave the smallest connected open patch.
      let bestNook = Infinity;
      for (let tryNo = 0; tryNo < 60; tryNo++) {
        const cand = (tryNo ? rng.shuffle(units) : units).flat();
        let pos = at;
        const open: Cell[] = [];
        for (const p of cand) {
          const cells = curve.slice(pos, pos + p.size);
          pos += p.size;
          if (!(p.kind === 'fog' || p.kind === 'grey' || p.kind === 'body')) open.push(...cells);
        }
        const left = new Set(open.map(([r, c]) => k(r, c)));
        let biggest = 0;
        while (left.size) {
          const first = [...left][0];
          left.delete(first);
          const stack = [first.split(",").map(Number) as unknown as Cell];
          let size = 1;
          while (stack.length) {
            for (const n of nbrs(stack.pop()!)) {
              const key = k(n[0], n[1]);
              if (left.has(key)) { left.delete(key); stack.push(n); size++; }
            }
          }
          biggest = Math.max(biggest, size);
        }
        if (biggest < bestNook) { bestNook = biggest; seq = cand; }
      }
    }
    for (const p of seq) { p.cells = curve.slice(at, at + p.size); at += p.size; }
  }
  const owner = new Map<string, Work>();
  for (const p of ps) for (const c of p.cells) owner.set(k(c[0], c[1]), p);
  const touching = (a: Work, b: Work) => a.cells.some((c) => nbrs(c).some((x) => owner.get(k(x[0], x[1])) === b));
  const touchesOk = () => plan.touches.every(([a, b]) => touching(byId.get(a)!, byId.get(b)!));
  if (!touchesOk()) return null;

  // ---- exactly one way to sort the pieces?
  const repairPins: string[] = [];
  const squares = () => {
    const out: Record<string, string> = {};
    for (const p of ps) for (const c of p.cells) out[k(c[0], c[1])] = p.section;
    return out;
  };
  const count = (limit: number) => {
    const fixed: FixedPiece[] = [];
    const loose: SolverPiece[] = [];
    const sq = squares();
    for (const p of ps) {
      if (alwaysFixed(p) || repairPins.includes(p.id)) fixed.push({ id: p.id, kind: p.kind, who: p.who, section: p.section, cells: p.cells });
      else loose.push({ id: p.id, kind: p.kind, who: p.who, cells: p.cells, allowed: allowedSections(p.kind, p.not, p.only, sections) });
    }
    const out = solve({ sections, squares: sq, loose, fixed, touches: plan.touches, apart: plan.apart, limit, budget: BUILD_BUDGET, hint: Object.fromEntries(ps.map((p) => [p.id, p.cells])) });
    return { out, loose };
  };
  /** Move one square from a to a neighbouring b in the same section, if both stay whole and touching pairs still touch. */
  const shift = (a: Work, b: Work): boolean => {
    if (a.section !== b.section || alwaysFixed(a) || alwaysFixed(b)) return false;
    for (const c of rng.shuffle(a.cells)) {
      if (!nbrs(c).some((x) => owner.get(k(x[0], x[1])) === b)) continue;
      const na = a.cells.filter((x) => x !== c);
      const nb = [...b.cells, c];
      if (na.length < 2 || nb.length > 7 || !connected(na) || !connected(nb)) continue;
      const before: [Cell[], Cell[]] = [a.cells, b.cells];
      a.cells = na; b.cells = nb; owner.set(k(c[0], c[1]), b);
      if (touchesOk()) return true;
      [a.cells, b.cells] = before; owner.set(k(c[0], c[1]), a);
    }
    return false;
  };
  const truthOk = (loose: SolverPiece[], a: Record<string, string>) => loose.every((p) => a[p.id] === byId.get(p.id)!.section);

  let res = count(2);
  let shifts = 0;
  const pinOne = (pool: Work[]): boolean => {
    if (repairPins.length >= MAX_REPAIR_PINS) return false;
    const ok = pool.filter((p) => !neverPin.has(p.id) && !repairPins.includes(p.id) && !alwaysFixed(p));
    if (!ok.length) return false;
    const quiet = ok.filter((p) => !(p.kind === 'guest' && p.section === UNKNOWN));
    const best = quiet.length ? quiet : ok;
    best.sort((x, y) => y.cells.length - x.cells.length || (x.id < y.id ? -1 : 1));
    repairPins.push(best[0].id);
    return true;
  };
  let spent = 0;
  let slowPins = 0;
  for (let step = 0; step < 80; step++) {
    spent += res.out.nodes;
    if (spent > ATTEMPT_BUDGET) return null;
    const alt = res.out.found.find((a) => !truthOk(res.loose, a));
    if (!alt) {
      if (!res.out.truncated) break; // unique, and it is the truth
      if (++slowPins > MAX_SLOW_PINS) return null;
      // Too much to search: fix a big piece in the roomiest section to shrink the search.
      const freeIn: Record<string, number> = {};
      for (const p of ps) if (!alwaysFixed(p) && !repairPins.includes(p.id)) freeIn[p.section] = (freeIn[p.section] ?? 0) + p.cells.length;
      const roomiest = Object.keys(freeIn).sort((x, y) => freeIn[y] - freeIn[x] || (x < y ? -1 : 1))[0];
      if (!pinOne(ps.filter((p) => p.section === roomiest))) return null;
      pinOne(ps.filter((p) => p.section === roomiest));
      res = count(2);
      continue;
    }
    const moved = res.loose.map((l) => byId.get(l.id)!).filter((p) => alt[p.id] !== p.section);
    let changed = false;
    if (shifts < MAX_SHIFTS) {
      shifts++;
      for (const p of rng.shuffle(moved)) {
        const neighbours = [...new Set(p.cells.flatMap((c) => nbrs(c).map((x) => owner.get(k(x[0], x[1]))).filter((q): q is Work => !!q && q !== p && q.section === p.section)))];
        for (const q of rng.shuffle(neighbours)) {
          if (rng.next() < 0.5 ? shift(p, q) : shift(q, p)) { changed = true; break; }
        }
        if (changed) break;
      }
    }
    if (!changed && !pinOne(moved)) return null;
    res = count(2);
  }
  if (res.out.truncated || res.out.found.length !== 1 || !truthOk(res.loose, res.out.found[0])) return null;

  // ---- pins per level
  const sq = squares();
  const secCells: Record<string, string[]> = {};
  for (const s of sections) secCells[s] = [];
  for (const key of Object.keys(sq)) secCells[sq[key]].push(key);
  const rank = (p: Work) => (p.kind === 'grey' ? 0 : p.kind === 'weapon' ? 1 : p.section !== UNKNOWN ? 2 : 3);
  const pinsFor = (maxOpen: number, maxPins: number): string[] => {
    const pinned = repairPins.slice();
    const biggestOpen = (sec: string) => {
      const shut = new Set(ps.filter((p) => alwaysFixed(p) || pinned.includes(p.id)).flatMap((p) => p.cells.map(([r, c]) => k(r, c))));
      const left = new Set(secCells[sec].filter((key) => !shut.has(key)));
      let biggest = 0;
      while (left.size) {
        const first = [...left][0];
        left.delete(first);
        const stack = [first.split(",").map(Number) as unknown as Cell];
        let size = 1;
        while (stack.length) {
          for (const n of nbrs(stack.pop()!)) {
            const key = k(n[0], n[1]);
            if (left.has(key)) { left.delete(key); stack.push(n); size++; }
          }
        }
        biggest = Math.max(biggest, size);
      }
      return biggest;
    };
    while (pinned.length < maxPins) {
      const pinnable = (sec: string) => ps.filter((p) => p.section === sec && !alwaysFixed(p) && !pinned.includes(p.id) && !neverPin.has(p.id));
      const secs = sections.filter((s) => pinnable(s).length).map((s) => ({ s, open: biggestOpen(s) })).sort((x, y) => y.open - x.open);
      if (!secs.length || secs[0].open <= maxOpen) break;
      const pick = pinnable(secs[0].s).sort((x, y) => rank(x) - rank(y) || y.cells.length - x.cells.length || (x.id < y.id ? -1 : 1))[0];
      pinned.push(pick.id);
    }
    return pinned;
  };
  const pinned: Record<Difficulty, string[]> = { easy: pinsFor(8, 6), medium: pinsFor(12, 4), hard: pinsFor(16, 2) };

  // ---- symbols
  let sym = 0;
  for (const [a, b] of plan.touches) {
    const s = TOUCH_SYMBOLS[sym++] ?? `#${sym}`;
    byId.get(a)!.sym.push(s);
    byId.get(b)!.sym.push(s);
  }
  for (const [a, b] of plan.apart) {
    const s = TOUCH_SYMBOLS[sym++] ?? `#${sym}`;
    byId.get(a)!.anti.push(s);
    byId.get(b)!.anti.push(s);
  }

  const truth: Board['truth'] = {};
  for (const p of ps) truth[p.id] = { section: p.section, cells: p.cells.map(([r, c]) => [r, c] as Cell) };
  return {
    W,
    H,
    sections: [...sections],
    cells: sq,
    pieces: ps.map((p) => ({
      id: p.id,
      kind: p.kind,
      who: p.who,
      shape: norm(rng.pick(rotations(p.cells))),
      marks: { not: p.not, only: p.only, sym: p.sym, anti: p.anti },
      clue: p.clue,
      ...(p.hidden !== undefined ? { hidden: p.hidden } : {}),
    })),
    truth,
    pinned,
  };
}


/** Where every piece really goes: the solver tries this tiling first. */
const truthHint = (board: Board): Record<string, readonly Cell[]> =>
  Object.fromEntries(board.pieces.map((p) => [p.id, board.truth[p.id].cells]));
