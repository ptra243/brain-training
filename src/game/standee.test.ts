import assert from 'node:assert/strict';
import { test } from 'node:test';
import { portraits, standees } from '../content/portraits.ts';
import { jacketStyles, poseStyles, STANDEE_VIEW_BOX, standeeShapes, trouserStyles } from './standee.ts';

test('every standee belongs to a guest and its styles exist', () => {
  for (const [id, s] of Object.entries(standees)) {
    assert.ok(Object.hasOwn(portraits, id), `${id} is not a portrait id`);
    assert.ok(Object.hasOwn(poseStyles, s.pose), s.pose);
    assert.ok(Object.hasOwn(jacketStyles, s.jacket), s.jacket);
    assert.ok(Object.hasOwn(trouserStyles, s.trousers.style), s.trousers.style);
  }
});

test('standeeShapes layers the lower body and arms under the portrait, without its background', () => {
  assert.equal(STANDEE_VIEW_BOX, '-30 0 160 240');
  for (const [id, s] of Object.entries(standees)) {
    const layers = standeeShapes(portraits[id], s);
    const ids = layers.map((l) => l.id);
    assert.deepEqual(ids.slice(0, 2), ['lower', 'arms']);
    assert.ok(ids.includes('head') && ids.includes('body'));
    assert.ok(!ids.includes('background'));
    assert.ok(layers.every((l) => l.shapes.length > 0));
    assert.deepEqual(layers, standeeShapes(portraits[id], s));
  }
});

test('an unknown standee style throws', () => {
  assert.throws(() => standeeShapes(portraits.host, { ...standees.host, pose: 'nope' }), /Unknown standee pose/);
});
