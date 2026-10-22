// What the cat did, for each grid hint, in a sentence.

import type { Clue } from '../engine/types.ts';
import type { GridCell, GridHint } from './gridHints.ts';
import { itemName, roomName, suspectName } from './names.ts';

const count = (n: number, one: string, many: string) => (n === 1 ? one : `${n} ${many}`);

/** A name inside a sentence: "The Butler" -> "the Butler". */
const inSentence = (name: string) => name.replace(/^The /, 'the ');

/** "the Butler and the Kitchen" */
function square({ kind, row, col }: GridCell, guests: readonly string[]): string {
  switch (kind) {
    case 'suspect-room':
      return `${inSentence(suspectName(row, guests))} and the ${roomName(col)}`;
    case 'suspect-item':
      return `${inSentence(suspectName(row, guests))} and the ${itemName(col)}`;
    case 'item-room':
      return `the ${itemName(row)} and the ${roomName(col)}`;
  }
}

/** "The Butler wasn't in the Kitchen." */
function settled({ kind, row, col }: GridCell, yes: boolean, guests: readonly string[]): string {
  switch (kind) {
    case 'suspect-room':
      return `${suspectName(row, guests)} ${yes ? 'was' : "wasn't"} in the ${roomName(col)}.`;
    case 'suspect-item':
      return `${suspectName(row, guests)} ${yes ? 'had' : "didn't have"} the ${itemName(col)}.`;
    case 'item-room':
      return `The ${itemName(row)} ${yes ? 'was' : "wasn't"} in the ${roomName(col)}.`;
  }
}

export function gridHintText(cat: string, h: GridHint, clues: readonly Clue[], sceneKnown: boolean, guests: readonly string[]): string {
  switch (h.kind) {
    case 'wrong': {
      const n = Object.keys(h.marks).length;
      return `${cat} pads across your casebook and sits on ${count(n, "a mark that isn't right", "marks that aren't right")}. ${n === 1 ? "It's" : "They're"} circled in red pencil on the grid.`;
    }
    case 'nudge':
      return `${cat} curls up on the square for ${square(h.cell, guests)}. What you know already settles it.`;
    case 'why': {
      if (h.again) {
        const where = h.reason.type === 'marks' ? 'your marks along its row' : h.reason.clues.length === 1 ? 'that clue' : 'those clues';
        return `${cat} won't budge from the square for ${square(h.cell, guests)}, and keeps a paw on ${where}. If it still won't come, another puzzle's clues may help.`;
      }
      if (h.reason.type === 'marks') return `${cat} taps along that square's row: your other marks already settle it.`;
      const ids = h.reason.clues;
      if (ids.length === 1) {
        const clue = clues.find((cl) => cl.id === ids[0]);
        return `${cat} puts a paw on a clue: ${clue?.text ?? 'one in your drawer'}`;
      }
      return `${cat} paws at ${ids.length} clues in your drawer. Put them together for that square.`;
    }
    case 'fill':
      return `${cat} knocks a pencil onto the grid. ${settled(h.cell, h.value === 'o', guests)}`;
    case 'more-clues':
      return `${cat} yawns. Your clues don't settle any more squares yet. Play another puzzle on the Clues tab to find more.`;
    case 'done':
      return sceneKnown
        ? `${cat} purrs. Every square is right, so you can make your accusation.`
        : `${cat} purrs. Every square is right. Solve a word game on the Clues tab to learn where the body was found.`;
  }
}
