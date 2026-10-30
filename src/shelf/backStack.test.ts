import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBackStack, startRootGuard } from './backStack.ts';

/** A browser history with the shelf's own entry at 0. `settle` delivers queued traversals. */
function setup() {
  const entries = ['shelf'];
  let idx = 0;
  let popHandler: () => void = () => {};
  const tasks: (() => void)[] = [];
  const traversals: number[] = [];
  const history = {
    pushState(_s: unknown, _t: string, url?: string) {
      entries.length = idx + 1;
      entries.push(url ?? '');
      idx++;
    },
    go(n: number) {
      traversals.push(n);
    },
  };
  const stack = createBackStack({
    history,
    href: () => '#shelf',
    onPopState: (fn) => (popHandler = fn),
    soon: (fn) => tasks.push(fn),
  });
  return {
    stack,
    get idx() {
      return idx;
    },
    traversals,
    /** Run the microtasks (batched releases). */
    tick() {
      while (tasks.length) tasks.shift()!();
    },
    /** The browser finishes queued go() calls. */
    settle() {
      for (const n of traversals.splice(0)) {
        idx = Math.max(0, idx + n);
        popHandler();
      }
    },
    /** She presses Back. */
    back() {
      if (idx > 0) {
        idx--;
        popHandler();
      }
    },
  };
}

test('Back closes the top layer, one per press, and leaves no entry behind', () => {
  const t = setup();
  const closed: string[] = [];
  t.stack.ensureGuard();
  t.stack.pushLayer(() => closed.push('book'));
  t.stack.pushLayer(() => closed.push('dialog'));
  assert.equal(t.idx, 3);
  t.back();
  assert.deepEqual(closed, ['dialog']);
  t.back();
  assert.deepEqual(closed, ['dialog', 'book']);
  assert.equal(t.idx, 1);
});

test('Back at the bare shelf re-pushes the guard and stays', () => {
  const t = setup();
  t.stack.ensureGuard();
  assert.equal(t.idx, 1);
  t.back();
  assert.equal(t.idx, 1);
  t.back();
  assert.equal(t.idx, 1);
});

test('closing on screen goes back once, ignores its own popstate, and does not close another layer', () => {
  const t = setup();
  const closed: string[] = [];
  t.stack.ensureGuard();
  t.stack.pushLayer(() => closed.push('book'));
  const release = t.stack.pushLayer(() => closed.push('dialog'));
  release();
  t.tick();
  assert.deepEqual(t.traversals, [-1]);
  t.settle();
  assert.deepEqual(closed, []);
  assert.equal(t.stack.depth(), 1);
  t.back();
  assert.deepEqual(closed, ['book']);
  assert.equal(t.idx, 1);
});

test('releases in one tick batch into one go(-n)', () => {
  const t = setup();
  t.stack.ensureGuard();
  const a = t.stack.pushLayer(() => {});
  const b = t.stack.pushLayer(() => {});
  a();
  b();
  t.tick();
  assert.deepEqual(t.traversals, [-2]);
  t.settle();
  assert.equal(t.idx, 1);
  assert.equal(t.stack.depth(), 0);
});

test('a layer popped by Back does nothing when its owner then releases it', () => {
  const t = setup();
  t.stack.ensureGuard();
  let release = () => {};
  release = t.stack.pushLayer(() => release());
  t.back();
  t.tick();
  assert.deepEqual(t.traversals, []);
  assert.equal(t.idx, 1);
});

test('a layer opened as another closes in the same tick takes over its entry', () => {
  const t = setup();
  t.stack.ensureGuard();
  const first = t.stack.pushLayer(() => {});
  first();
  t.stack.pushLayer(() => {});
  t.tick();
  assert.deepEqual(t.traversals, []);
  assert.equal(t.idx, 2);
});

test('a layer opened while a traversal is in flight waits for it', () => {
  const t = setup();
  t.stack.ensureGuard();
  const first = t.stack.pushLayer(() => {});
  first();
  t.tick();
  const closed: string[] = [];
  t.stack.pushLayer(() => closed.push('second'));
  assert.equal(t.idx, 2);
  t.settle();
  assert.equal(t.idx, 2);
  t.back();
  assert.deepEqual(closed, ['second']);
});

test('the guard goes in on the first gesture only', () => {
  const t = setup();
  const target = new EventTarget();
  startRootGuard(target, t.stack);
  assert.equal(t.idx, 0);
  target.dispatchEvent(new Event('pointerdown'));
  target.dispatchEvent(new Event('keydown'));
  assert.equal(t.idx, 1);
});
