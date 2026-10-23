import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cats } from '../content/index.ts';
import { catCoats, dogCoat, playerPortrait, portraits, type PortraitParts } from '../content/portraits.ts';
import {
  catShapes, dogShapes, FRAME, GUEST_CROP, guestCropBox, portraitShapes, type Layer, type Tint,
} from './portrait.ts';
import { accentStyles, costumeStyles, hairStyles, headwearStyles, shade, skinTones } from './portraitParts.ts';

const THEME_IDS = [
  'host', 'hostess', 'butler', 'conjurer', 'housekeeper', 'financier', 'uncle', 'elder-heir', 'younger-heir', 'detective',
];

test('shade multiplies and clamps channels', () => {
  assert.equal(shade('#808080', 0.5), '#404040');
  assert.equal(shade('#c0c0c0', 2), '#ffffff');
  assert.equal(skinTones('#f3d2b0').shadow, '#c9946e');
});

test('every theme id has parts whose style ids all resolve', () => {
  assert.deepEqual(Object.keys(portraits).sort(), [...THEME_IDS].sort());
  for (const parts of [...Object.values(portraits), playerPortrait]) {
    assert.ok(Object.hasOwn(hairStyles, parts.hair.style), parts.hair.style);
    assert.ok(Object.hasOwn(costumeStyles, parts.costume.style), parts.costume.style);
    if (parts.headwear) assert.ok(Object.hasOwn(headwearStyles, parts.headwear.style), parts.headwear.style);
    if (parts.accent) assert.ok(Object.hasOwn(accentStyles, parts.accent.style), parts.accent.style);
    assert.doesNotThrow(() => portraitShapes(parts));
  }
});

test('the ten guests differ in hair, headwear or costume', () => {
  const keys = Object.values(portraits).map((p) => [p.hair.style, p.headwear?.style ?? '', p.costume.style].join('|'));
  assert.equal(new Set(keys).size, keys.length);
  const hairKeys = Object.values(portraits).map((p) => `${p.hair.style}|${p.headwear?.style ?? ''}`);
  assert.equal(new Set(hairKeys).size, hairKeys.length, 'head silhouettes must differ for the 32px counter');
});

test('shapes are deterministic', () => {
  for (const parts of Object.values(portraits)) {
    assert.deepEqual(portraitShapes(parts, 'warm'), portraitShapes(parts, 'warm'));
  }
  assert.deepEqual(catShapes(catCoats[0]), catShapes(catCoats[0]));
});

const HEX = /^#[0-9a-f]{6}$/;
const apply = (l: Layer, x: number, y: number): [number, number] =>
  l.transform ? [x * l.transform.sx + l.transform.tx, y * l.transform.sy + l.transform.ty] : [x, y];

function checkLayers(layers: Layer[], what: string) {
  for (const l of layers) {
    for (const s of l.shapes) {
      assert.match(s.fill === 'none' ? '#000000' : s.fill, HEX, `${what} ${l.id} fill`);
      const pts: [number, number][] =
        s.t === 'poly' ? s.pts : s.t === 'circle' ? [[s.cx - s.r, s.cy - s.r], [s.cx + s.r, s.cy + s.r]] : [[s.x, s.y], [s.x + s.w, s.y + s.h]];
      for (const [x, y] of pts) {
        const [fx, fy] = apply(l, x, y);
        assert.ok(Number.isFinite(fx) && fx >= -8 && fx <= FRAME.width + 8, `${what} ${l.id} x ${fx}`);
        assert.ok(Number.isFinite(fy) && fy >= -8 && fy <= FRAME.height + 8, `${what} ${l.id} y ${fy}`);
      }
    }
  }
}

test('all points sit in a sane box', () => {
  for (const [id, parts] of [...Object.entries(portraits), ['player', playerPortrait] as const]) {
    checkLayers(portraitShapes(parts, 'hostile'), id);
  }
  for (const coat of catCoats) checkLayers(catShapes(coat, 'warm'), 'cat');
  for (const tint of ['hostile', 'none', 'warm'] as const) checkLayers(dogShapes(dogCoat, tint), 'dog');
});

test('the tint overlay is only there for warm and hostile', () => {
  const butler = portraits.butler;
  const has = (t: Tint) => portraitShapes(butler, t).some((l) => l.id === 'tint');
  assert.equal(has('none'), false);
  assert.equal(has('warm'), true);
  assert.equal(has('hostile'), true);
  const tint = (t: Tint) => portraitShapes(butler, t).find((l) => l.id === 'tint')!.shapes[0];
  assert.deepEqual(tint('warm'), { t: 'rect', x: 0, y: 0, w: 100, h: 120, fill: '#e8a040', o: 0.16 });
  assert.deepEqual(tint('hostile'), { t: 'rect', x: 0, y: 0, w: 100, h: 120, fill: '#2a4a6a', o: 0.24 });
});

test('one cat coat per cat, and the player uses the guest model', () => {
  assert.equal(catCoats.length, cats.length);
  const player: PortraitParts = playerPortrait;
  assert.ok(player.hair && player.costume && player.skin && player.background);
  assert.equal(guestCropBox(player), GUEST_CROP.join(' '));
  assert.equal(guestCropBox(portraits.conjurer), '25 6 50 50');
  assert.ok(portraitShapes(player).some((l) => l.id === 'head'));
});
