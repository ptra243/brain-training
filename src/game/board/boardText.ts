// Words for the case board, in plain sentence case from her point of view.
// Names come from the content through `names.ts`; nothing here knows a name.

import { UNKNOWN } from '../../engine/boardTypes.ts';
import { itemName, roomName, suspectName } from '../names.ts';
import type { Block, Clash, Rules } from './boardSave.ts';
import { pieceNumber } from './boardSave.ts';

export const sectionName = (s: string) => (s === UNKNOWN ? 'Unknown' : roomName(s));
export const theSection = (s: string) => (s === UNKNOWN ? 'Unknown' : `the ${roomName(s)}`);
export const lowerThe = (s: string) => s.replace(/^The /, 'the ').replace(/^A /, 'a ');
export const shortName = (id: string) => suspectName(id).replace(/^The /, '');
export const capital = (s: string) => s[0].toUpperCase() + s.slice(1);
const sentence = (s: string) => capital(s) + '.';

export function listAnd(xs: readonly string[], word = 'and') {
  return xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${word} ${xs[xs.length - 1]}`;
}

/** What a piece is called: "The Butler (piece 1 of 2)", "The knife", "A missing piece". */
export function pieceName(r: Rules, pid: string): string {
  const p = r.piece[pid];
  if (p.kind === 'guest') {
    const n = pieceNumber(r, pid);
    return suspectName(p.who as string) + (n ? ` (piece ${n.n} of ${n.of})` : '');
  }
  if (p.kind === 'weapon') return `The ${itemName(p.who as string)}`;
  if (p.kind === 'grey') return 'A missing piece';
  if (p.kind === 'fog') return 'Filler';
  return 'The body';
}

/** The short caption under a piece in the tray. */
export function caption(r: Rules, pid: string): string {
  const p = r.piece[pid];
  if (p.kind === 'guest') return shortName(p.who as string);
  if (p.kind === 'weapon') return capital(itemName(p.who as string));
  return p.kind === 'grey' ? 'Missing' : capital(p.kind);
}

/** Why a drop was refused, as one sentence (the clue itself is shown beside it). */
export function blockText(r: Rules, pid: string, section: string, b: Block): string {
  const lead = `Won't go in ${theSection(section)}.`;
  switch (b.code) {
    case 'grey':
      return `${lead} Missing pieces only fit in Unknown: they stand for a puzzle you didn't play.`;
    case 'not':
    case 'only':
      return b.clue ? lead : `${lead} The clues rule it out.`;
    case 'touch-pinned':
      return `${lead} Its ${b.sym} has to touch ${lowerThe(pieceName(r, b.other as string))}, which is pinned in ${theSection(b.otherSection as string)}.`;
    case 'apart-pinned':
      return `${lead} It can't share a room with ${lowerThe(pieceName(r, b.other as string))}, which is pinned there.`;
    case 'same-pinned': {
      const who = r.piece[pid].who as string;
      return `${lead} All of ${lowerThe(suspectName(who))}'s pieces go in the same place, and one is pinned in ${theSection(b.otherSection as string)}.`;
    }
  }
}

export function clashText(r: Rules, c: Clash): string {
  const n = (id: string) => lowerThe(pieceName(r, id));
  if (c.kind === 'touch') {
    return `The ${c.sym} pieces have to touch, but ${n(c.ids[0])} is in ${theSection(c.sections[0])} and ${n(c.ids[1])} is in ${theSection(c.sections[1])}. One of them is in the wrong place.`;
  }
  if (c.kind === 'apart') return `${pieceName(r, c.ids[0])} and ${n(c.ids[1])} were never in the same room, but both are in ${theSection(c.sections[0])}.`;
  const who = r.piece[c.ids[0]].who as string;
  return `All of ${lowerThe(suspectName(who))}'s pieces go in the same place, but they're in ${listAnd(c.sections.map(theSection))}.`;
}

/** A piece's own rules as lower-case phrases, to build sentences from. */
function ruleBits(r: Rules, pid: string): string[] {
  const p = r.piece[pid];
  const out: string[] = [];
  if (p.kind === 'grey') out.push("fits only in Unknown: it stands for a puzzle you didn't play");
  for (const room of p.marks.not) out.push(`can't go in ${theSection(room)}`);
  if (p.marks.only) out.push(`only fits ${listAnd(p.marks.only.map(theSection), 'or')}`);
  for (const t of r.touch.filter((t) => t.a === pid || t.b === pid)) out.push(`has a ${t.sym} that must touch ${lowerThe(pieceName(r, t.a === pid ? t.b : t.a))}`);
  for (const t of r.anti.filter((t) => t.a === pid || t.b === pid)) out.push(`can't share a room with ${lowerThe(pieceName(r, t.a === pid ? t.b : t.a))}`);
  return out;
}

/** The rules a piece carries, in sentences. A guest with several pieces also gets the others' rules. */
export function rulesOf(r: Rules, pid: string, finished: boolean): string[] {
  const p = r.piece[pid];
  if (p.kind === 'fog') return ['Space in Unknown that nothing is known about. It never moves.'];
  if (p.kind === 'body') return ['Where the body was found. It never moves.'];
  if (p.hidden && !finished) return ["This piece comes from this puzzle's own clue. What it says stays hidden until the board is finished."];
  const own = ruleBits(r, pid);
  const out = own.length ? own.map(sentence) : ['Nothing limits where it goes. Its shape does the work.'];
  const mates = r.siblings[pid] ?? [];
  if (p.kind === 'guest' && mates.length) {
    for (const q of mates) {
      const theirs = ruleBits(r, q);
      const n = pieceNumber(r, q);
      if (theirs.length && !r.piece[q].hidden) out.push(`${suspectName(p.who as string)}'s other piece${n ? ` (${n.n} of ${n.of})` : ''} ${listAnd(theirs)}.`);
    }
    out.push(`All of ${lowerThe(suspectName(p.who as string))}'s pieces go in the same place: the same room, or all in Unknown.`);
  }
  return out;
}
