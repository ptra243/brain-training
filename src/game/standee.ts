// Full-body standees: the portrait's head and torso on a lower body (legs, shoes, jacket below the
// chest) and a pose's arms. Plain data like portrait.ts; `Standee.tsx` only draws it. Style ids are
// generic shape names; who wears what lives in `standees` (src/content/portraits.ts).

import type { PortraitParts, StandeeParts } from '../content/portraits.ts';
import { portraitShapes, type Layer } from './portrait.ts';
import { circle, poly, shade, skinTones, type Shape, type SkinTones } from './portraitParts.ts';

export const STANDEE_VIEW_BOX = '-30 0 160 240';
/** The cut-out edge drawn under the figure. */
export const STANDEE_EDGE = { colour: '#f4f0e4', width: 3 } as const;

/** Lower jacket in frame space: main colour, shirt (the costume trim) showing at the V. */
export const jacketStyles: Record<string, (m: string, shirt: string, below: string) => Shape[]> = {
  'hip-jacket-one-button': (m, shirt, below) => [
    poly('6,118 50,118 50,148 46,166 22,166 24,150', m),
    poly('50,118 95,118 76,150 78,166 54,166 50,148', shade(m, 0.6)),
    poly('6,118 18,118 26,150 24,150', shade(m, 1.3)),
    poly('46,118 58,118 51,148', shirt),
    poly('51,118 58,118 51,148', shade(shirt, 0.86)),
    poly('44,118 51,118 51,148 46,140', shade(m, 1.45)),
    // cutaway below the button
    poly('50,149 54,166 46,166', below),
    circle(51, 148, 2, '#1a1c1f'),
    // hip pocket flaps
    poly('28,156 40,155 40,158 28,159', shade(m, 1.15)),
    poly('60,155 72,156 72,159 60,158', shade(m, 0.5)),
  ],
};

/** Trousers and shoes in frame space. */
export const trouserStyles: Record<string, (c: string, shoe: string) => Shape[]> = {
  straight: (c, shoe) => [
    poly('26,160 50,160 50,184 38,229 23,229', c),
    poly('50,160 74,160 77,229 62,229 50,184', shade(c, 0.72)),
    poly('26,160 34,160 30,229 23,229', shade(c, 1.3)),
    poly('21,228 39,228 40,236 15,236 16,232', shoe),
    poly('61,228 79,228 84,232 85,236 60,236', shade(shoe, 1.5)),
  ],
};

/** Arms in frame space: sleeve colour, cuff (shirt) colour and the hands' skin tones. */
export const poseStyles: Record<string, (m: string, cuff: string, t: SkinTones) => Shape[]> = {
  'hands-on-hips': (m, cuff, t) => [
    poly('7,104 19,114 -2,146 -16,138', shade(m, 1.12)),
    poly('-16,138 -2,146 20,154 22,144', m),
    poly('-16,138 -9,135 22,144', shade(m, 1.3)),
    poly('18,143 24,144 23,156 17,155', cuff),
    poly('23,143 31,145 31,156 23,157', t.lit),
    poly('27,151 31,149 31,156 26,157', t.shadow),
    poly('93,104 81,114 102,146 116,138', shade(m, 0.55)),
    poly('116,138 102,146 80,154 78,144', shade(m, 0.68)),
    poly('82,143 76,144 77,156 83,155', shade(cuff, 0.8)),
    poly('77,143 69,145 69,156 77,157', t.shadow),
    poly('73,151 69,149 69,156 74,157', t.chin),
  ],
};

const lookup = <T>(table: Record<string, T>, kind: string, id: string): T => {
  const found = Object.hasOwn(table, id) ? table[id] : undefined;
  if (!found) throw new Error(`Unknown standee ${kind} style "${id}"`);
  return found;
};

/** Layers back to front: lower body, arms, then the portrait's layers without its background. */
export function standeeShapes(parts: PortraitParts, standee: StandeeParts): Layer[] {
  const tones = skinTones(parts.skin);
  const { main, trim } = parts.costume;
  const lower: Shape[] = [
    ...lookup(trouserStyles, 'trouser', standee.trousers.style)(standee.trousers.colour, standee.shoes),
    ...lookup(jacketStyles, 'jacket', standee.jacket)(main, trim, standee.trousers.colour),
  ];
  const arms = lookup(poseStyles, 'pose', standee.pose)(main, trim, tones);
  return [
    { id: 'lower', shapes: lower },
    { id: 'arms', shapes: arms },
    ...portraitShapes(parts).filter((l) => l.id !== 'background'),
  ];
}
