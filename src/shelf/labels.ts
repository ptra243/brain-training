// The pure parts of the #shelf puzzle labels: stars for a level, a slight angle from the case ref
// (the shelf's string hash, never the engine Rng, so no case changes) and the colour of each kind.

import { hashSeed } from '../engine/rng.ts';
import type { Difficulty } from '../engine/types.ts';

/** What sort of game a label is for: sets the border colour. `final` is the finale's gold variant. */
export type LabelKind = 'words' | 'logic' | 'people' | 'final';

export const KIND_COLOUR: Record<LabelKind, string> = {
  words: '#34436a',
  logic: '#4f7a54',
  people: '#7b5a78',
  final: '#b8902f',
};

export const FINALE_PAPER = '#fff8e6';
export const LABEL_PAPER = '#fffdf6';

const STARS: Record<Difficulty, string> = { easy: '★☆☆', medium: '★★☆', hard: '★★★' };

/** Printed stars for a level; empty when the game has no level. */
export function starsText(level: Difficulty | undefined): string {
  return level === undefined ? '' : STARS[level];
}

/** The name printed on a label: the finale is "Final puzzle" whatever its screen is called. */
export const labelName = (kind: LabelKind, gameName: string): string => (kind === 'final' ? 'Final puzzle' : gameName);

/** A slight tilt in degrees, -2 to 2 in tenths, the same for the same case ref and key. */
export function labelAngle(ref: string, key: string, salt = ''): number {
  return (hashSeed(`${ref}-${key}-tilt${salt}`) % 41) / 10 - 2;
}
