// Portrait shapes (docs/portraits.md): `portraitShapes(parts, tint)` turns a guest's
// parts into layered groups in the 100 x 120 frame; `catShapes(coat)` does the cat.
// Plain data, so it is node-tested; `Portrait.tsx` only draws it.

import { portraits, type CatCoat, type PortraitParts } from '../content/portraits.ts';
import {
  accentStyles, costumeStyles, faceShapes, hairStyles, headwearStyles, neckShapes, poly, shade, skinTones,
  type Shape,
} from './portraitParts.ts';

/** Whether this guest id has a drawn portrait (otherwise keep the initials counter). */
export const hasPortrait = (id: string): boolean => Object.hasOwn(portraits, id);

export type Tint = 'warm' | 'none' | 'hostile';
export type Transform = { tx: number; ty: number; sx: number; sy: number };
export type Layer = { id: string; transform?: Transform; shapes: Shape[] };

export const FRAME = { width: 100, height: 120 } as const;
export const BODY_TRANSFORM: Transform = { tx: -10, ty: 0, sx: 1.2, sy: 1 };
export const HEAD_TRANSFORM: Transform = { tx: -12.5, ty: -7, sx: 1.25, sy: 1.25 };
export const TINT_FILL: Record<'warm' | 'hostile', { fill: string; o: number }> = {
  warm: { fill: '#e8a040', o: 0.16 },
  hostile: { fill: '#2a4a6a', o: 0.24 },
};

/** Counter crops: the head of a person, nearly the whole frame for the cat. */
export const GUEST_CROP: readonly [number, number, number, number] = [25, 20, 50, 50];
export const CAT_CROP: readonly [number, number, number, number] = [4, 6, 92, 92];
export const FULL_VIEW_BOX = `0 0 ${FRAME.width} ${FRAME.height}`;

export const cropViewBox = (crop: readonly number[]): string => crop.join(' ');
export const guestCropBox = (parts: PortraitParts): string => cropViewBox(parts.crop ?? GUEST_CROP);
export const catCropBox = (): string => cropViewBox(CAT_CROP);

export const transformAttr = (t: Transform): string =>
  t.sx === t.sy ? `translate(${t.tx},${t.ty}) scale(${t.sx})` : `translate(${t.tx},${t.ty}) scale(${t.sx},${t.sy})`;

const lookup = <T>(table: Record<string, T>, kind: string, id: string): T => {
  const found = Object.hasOwn(table, id) ? table[id] : undefined;
  if (!found) throw new Error(`Unknown ${kind} style "${id}"`);
  return found;
};

const tintLayer = (tint: Tint): Layer[] =>
  tint === 'none'
    ? []
    : [{ id: 'tint', shapes: [{ t: 'rect', x: 0, y: 0, w: FRAME.width, h: FRAME.height, fill: TINT_FILL[tint].fill, o: TINT_FILL[tint].o }] }];

const background = (colours: readonly [string, string]): Shape[] => [
  poly('0,0 100,0 100,120 0,120', colours[0]),
  poly('0,0 66,0 0,70', colours[1]),
];

/** Layers back to front: background, hair back, body, head, front accents, tint. */
export function portraitShapes(parts: PortraitParts, tint: Tint = 'none'): Layer[] {
  const tones = skinTones(parts.skin);
  const hair = lookup(hairStyles, 'hair', parts.hair.style)(parts.hair.colour, tones);
  const costume = lookup(costumeStyles, 'costume', parts.costume.style)(parts.costume.main, parts.costume.trim, tones);
  const hat = parts.headwear ? lookup(headwearStyles, 'headwear', parts.headwear.style)(parts.headwear.colour) : [];
  const accents = parts.accent ? lookup(accentStyles, 'accent', parts.accent.style)(parts.accent.colour) : [];
  const inSpace = (space: 'head' | 'body' | 'frame') => accents.filter((a) => a.space === space).flatMap((a) => a.shapes);

  const layers: Layer[] = [
    { id: 'background', shapes: background(parts.background) },
    { id: 'hair-back', transform: HEAD_TRANSFORM, shapes: hair.back },
    { id: 'body', transform: BODY_TRANSFORM, shapes: [...neckShapes(tones), ...costume] },
    { id: 'head', transform: HEAD_TRANSFORM, shapes: [...faceShapes(tones), ...hair.front, ...hat, ...inSpace('head')] },
    { id: 'accents-body', transform: BODY_TRANSFORM, shapes: inSpace('body') },
    { id: 'accents-frame', shapes: inSpace('frame') },
    ...tintLayer(tint),
  ];
  return layers.filter((l) => l.shapes.length > 0);
}

/** The cat is its own figure (a chubby tabby), drawn straight in the frame. */
export function catShapes(coat: CatCoat, tint: Tint = 'none'): Layer[] {
  const { base, shade: dark, stripe, chest, nose } = coat;
  const shapes: Shape[] = [
    ...background(['#6e7d70', '#7f8e80']),
    // body mound, side stripes, chest and paws
    poly('0,120 2,92 18,74 82,74 98,92 100,120', shade(base, 0.92)),
    poly('50,80 82,74 98,92 100,120 46,120', shade(dark, 0.9)),
    poly('2,100 14,94 14,100 1,106', stripe),
    poly('86,94 98,100 99,106 86,100', shade(stripe, 0.74)),
    poly('28,84 70,84 64,120 32,120', chest),
    poly('50,86 70,84 64,120 50,120', shade(chest, 0.9)),
    poly('28,111 43,109 45,120 26,120', shade(chest, 1.06)),
    poly('55,109 70,111 72,120 53,120', shade(chest, 0.97)),
    // ears
    poly('14,40 19,6 42,26', shade(base, 0.96)),
    poly('20,16 22,30 34,27', shade(nose, 1.1)),
    poly('60,24 83,4 88,40', shade(dark, 0.92)),
    poly('68,23 80,13 82,32', shade(nose, 0.9)),
    // head: lit left, shadow right, top highlight, cheek ruffs
    poly('10,56 14,36 30,22 50,18 54,50 48,86 32,84 16,74', base),
    poly('50,18 72,22 88,36 92,56 84,74 66,84 48,86 54,50', dark),
    poly('14,36 30,22 50,18 38,36', shade(base, 1.07)),
    poly('5,62 11,52 18,77 9,72', shade(base, 0.93)),
    poly('89,52 96,60 90,73 82,77', shade(dark, 0.87)),
    // forehead "M" and side stripes
    poly('36,24 40,23 42,38', stripe),
    poly('48,19 52,19 51,36', stripe),
    poly('61,21 65,22 58,37', shade(stripe, 0.74)),
    poly('13,45 24,40 20,49', stripe),
    poly('80,40 91,45 84,50', shade(stripe, 0.74)),
    // whisker pads, chin, nose
    poly('34,60 49,56 52,66 44,73 33,68', shade(chest, 1.04)),
    poly('52,56 65,58 67,68 57,73 52,66', shade(chest, 0.94)),
    poly('42,73 57,73 53,81 45,80', chest),
    poly('44,53 54,53 49,59', nose),
  ];
  return [{ id: 'cat', shapes }, ...tintLayer(tint)];
}
