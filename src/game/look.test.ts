import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { LOOK_KEY, loadLook, opensShelf, saveLook } from './look.ts';

const g = globalThis as { localStorage?: unknown };

afterEach(() => {
  delete g.localStorage;
});

function fakeStorage(data: Record<string, string>) {
  g.localStorage = {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
}

test('defaults to classic, and when storage is missing or throws', () => {
  assert.equal(loadLook(), 'classic');
  fakeStorage({});
  assert.equal(loadLook(), 'classic');
  g.localStorage = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  };
  assert.equal(loadLook(), 'classic');
  assert.doesNotThrow(() => saveLook('shelf'));
});

test('saves and reads the choice; junk falls back to classic', () => {
  const data: Record<string, string> = {};
  fakeStorage(data);
  saveLook('shelf');
  assert.equal(data[LOOK_KEY], 'shelf');
  assert.equal(loadLook(), 'shelf');
  saveLook('classic');
  assert.equal(loadLook(), 'classic');
  data[LOOK_KEY] = 'wat';
  assert.equal(loadLook(), 'classic');
});

test('which addresses open the shelf', () => {
  assert.equal(opensShelf('', 'shelf'), true);
  assert.equal(opensShelf('', 'classic'), false);
  assert.equal(opensShelf('#shelf', 'classic'), true);
  assert.equal(opensShelf('#shelf/soon', 'classic'), true);
  assert.equal(opensShelf('#dev', 'shelf'), false);
  assert.equal(opensShelf('#other', 'shelf'), false);
  assert.equal(opensShelf('#shelfy', 'shelf'), false);
});
