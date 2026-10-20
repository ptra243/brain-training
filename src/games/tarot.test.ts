import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { Rng } from '../engine/rng.ts';
import { JOKER, buildTarot, flip, resolveTurn, tarotHint, tarotInitial, tarotRevealAll, tarotSolved, turnReady, type TarotBoard, type TarotState } from './tarot.ts';

// Opaque ids by order, the way the case maps its entities to cards.
const deck = Array.from({ length: 20 }, (_, i) => `major-${i}`);
const clues = { reward: ['major-3', 'major-9', 'major-12'], other: ['major-1', 'major-5', 'major-7', 'major-15'] };
const deal = (seed: number, pairs = 8) => buildTarot(deck, clues, pairs, new Rng(seed));

test('same seed gives the same board, other seeds differ', () => {
  assert.deepEqual(deal(5), deal(5));
  assert.notDeepEqual(deal(5), deal(6));
});

test('reward cards are always dealt, even past the pair count, then other clues, then decoys', () => {
  for (let seed = 0; seed < 30; seed++) {
    const b = deal(seed, 6);
    for (const id of clues.reward) assert.equal(b.filter((c) => c === id).length, 2);
    assert.equal(b.length, 13);
  }
  const small = deal(1, 2);
  assert.equal(small.length, 7); // reward cards never dropped
  const big = deal(1, 10);
  assert.equal(big.filter((c) => c.startsWith('major-')).length, 14); // 7 clue cards
  assert.equal(big.filter((c) => /^(cups|wands|swords|pentacles)-\d+$/.test(c)).length, 6); // 3 decoy pairs
});

test('every card has exactly one partner, plus one joker', () => {
  for (let seed = 0; seed < 30; seed++) {
    const b = deal(seed, 10);
    assert.equal(b.length, 21);
    assert.equal(b.filter((c) => c === JOKER).length, 1);
    for (const id of new Set(b)) if (id !== JOKER) assert.equal(b.filter((c) => c === id).length, 2);
  }
});

test('no card id names a suspect, item or room', () => {
  const names = [...content.suspects.map((s) => s.name), ...content.items.map((i) => i.name), ...content.house.rooms.map((r) => r.name)].map((n) => n.toLowerCase());
  for (const id of [...deal(1, 12), JOKER]) for (const n of names) assert.ok(!id.toLowerCase().includes(n), `${id} contains ${n}`);
});

const pairOf = (b: TarotBoard, i: number) => b.findIndex((c, j) => j !== i && c === b[i]);
const nonJoker = (b: TarotBoard) => b.map((_, i) => i).filter((i) => b[i] !== JOKER);

test('miss turns both back down, match stays up', () => {
  const b = deal(2);
  const a = nonJoker(b)[0];
  const p = pairOf(b, a);
  const other = nonJoker(b).find((i) => i !== a && i !== p)!;
  let s = flip(b, tarotInitial(), 2, a);
  s = flip(b, s, 2, other);
  assert.ok(turnReady(b, s));
  assert.deepEqual(flip(b, s, 2, p), s); // third pick ignored
  s = resolveTurn(b, s, 2);
  assert.deepEqual([s.picked, s.matched], [[], []]);
  s = resolveTurn(b, flip(b, flip(b, s, 2, a), 2, p), 2);
  assert.deepEqual([...s.matched].sort(), [a, p].sort());
});

const jokerAt = (b: TarotBoard) => b.indexOf(JOKER);

test('joker: removed on flip, turns one unmatched card up, which stays up until matched, then a new one', () => {
  const b = deal(3, 6);
  let s = flip(b, tarotInitial(), 3, jokerAt(b));
  assert.equal(s.jokerGone, jokerAt(b));
  assert.ok(s.peek !== null && b[s.peek] !== JOKER);
  assert.equal(s.picked.length, 0);
  const first = s.peek!;
  // A miss leaves the free card up.
  const wrong = nonJoker(b).filter((i) => i !== first && i !== pairOf(b, first));
  s = resolveTurn(b, flip(b, flip(b, s, 3, wrong[0]), 3, wrong[1]), 3);
  assert.equal(s.peek, first);
  // Joker flipped again does nothing.
  assert.deepEqual(flip(b, s, 3, jokerAt(b)), s);
});

test('tapping the free card does nothing, before any flip and with one flip made', () => {
  const b = deal(3, 6);
  let s = flip(b, tarotInitial(), 3, jokerAt(b));
  const p = s.peek!;
  assert.equal(flip(b, s, 3, p), s);
  assert.deepEqual(s.picked, []);
  const x = nonJoker(b).find((i) => i !== p && i !== pairOf(b, p))!;
  s = flip(b, s, 3, x);
  assert.equal(flip(b, s, 3, p), s);
  assert.deepEqual(s.picked, [x]);
});

test('partner as first flip: ready at once, taps ignored, resolve matches it with the free card and turns up a new one', () => {
  const b = deal(3, 6);
  let s = flip(b, tarotInitial(), 3, jokerAt(b));
  const p = s.peek!;
  const partner = pairOf(b, p);
  const other = nonJoker(b).find((i) => i !== p && i !== partner)!;
  s = flip(b, s, 3, partner);
  assert.deepEqual(s.picked, [partner]);
  assert.ok(turnReady(b, s));
  assert.equal(flip(b, s, 3, other), s);
  s = resolveTurn(b, s, 3);
  assert.deepEqual([...s.matched].sort(), [p, partner].sort());
  assert.deepEqual(s.picked, []);
  assert.ok(s.peek !== null && s.peek !== p && !s.matched.includes(s.peek));
  assert.ok(!turnReady(b, s));
});

test('partner as second flip: only the free card and partner match, the other flip turns back', () => {
  const b = deal(3, 6);
  let s = flip(b, tarotInitial(), 3, jokerAt(b));
  const p = s.peek!;
  const partner = pairOf(b, p);
  const x = nonJoker(b).find((i) => i !== p && i !== partner)!;
  s = flip(b, s, 3, x);
  assert.ok(!turnReady(b, s));
  s = flip(b, s, 3, partner);
  assert.ok(turnReady(b, s));
  s = resolveTurn(b, s, 3);
  assert.deepEqual([...s.matched].sort(), [p, partner].sort());
  assert.ok(!s.matched.includes(x));
  assert.deepEqual(s.picked, []);
  assert.ok(s.peek !== null && s.peek !== p);
});

test('two ordinary flips with a free card up: a match keeps the free card, a miss keeps it too', () => {
  const b = deal(3, 6);
  const s = flip(b, tarotInitial(), 3, jokerAt(b));
  const p = s.peek!;
  const ord = nonJoker(b).filter((i) => i !== p && i !== pairOf(b, p));
  const x = ord[0];
  const y = ord.find((i) => i !== x && i !== pairOf(b, x))!;
  const miss = resolveTurn(b, flip(b, flip(b, s, 3, x), 3, y), 3);
  assert.deepEqual([miss.picked, miss.matched, miss.peek], [[], [], p]);
  const hit = resolveTurn(b, flip(b, flip(b, s, 3, x), 3, pairOf(b, x)), 3);
  assert.deepEqual([...hit.matched].sort(), [x, pairOf(b, x)].sort());
  assert.deepEqual([hit.picked, hit.peek], [[], p]);
});

test('joker flipped with one card picked: if the new free card is its partner the turn is ready and matches', () => {
  const b = deal(3, 6);
  const x = nonJoker(b)[0];
  const partner = pairOf(b, x);
  let found = false;
  for (let seed = 0; seed < 300 && !found; seed++) {
    let s = flip(b, flip(b, tarotInitial(), seed, x), seed, jokerAt(b));
    assert.notEqual(s.peek, x);
    if (s.peek !== partner) {
      assert.ok(!turnReady(b, s));
      continue;
    }
    found = true;
    assert.ok(turnReady(b, s));
    s = resolveTurn(b, s, seed);
    assert.deepEqual([...s.matched].sort(), [x, partner].sort());
    assert.deepEqual(s.picked, []);
    assert.notEqual(s.peek, partner);
  }
  assert.ok(found, 'no seed made the joker turn up the partner');
});

test('hint points at the free card partner once she has seen it', () => {
  const b = deal(3, 6);
  const [x, y] = nonJoker(b).filter((i, _, all) => i === all[0] || b[i] !== b[all[0]]).slice(0, 2);
  let found = false;
  for (let seed = 0; seed < 300 && !found; seed++) {
    // A missed turn shows x and y; then the joker may turn up x's partner while x is face down again.
    const missed = resolveTurn(b, flip(b, flip(b, tarotInitial(), seed, x), seed, y), seed);
    const s = flip(b, missed, seed, jokerAt(b));
    if (s.peek !== pairOf(b, x)) continue;
    assert.equal(tarotHint(b, s, seed).ghost, x);
    found = true;
  }
  assert.ok(found, 'no seed made the joker turn up the partner');
});

test('an old save with the free card in picked never matches it with itself', () => {
  const b = deal(3, 6);
  const s = flip(b, tarotInitial(), 3, jokerAt(b));
  const p = s.peek!;
  const x = nonJoker(b).find((i) => i !== p && i !== pairOf(b, p))!;
  assert.deepEqual(resolveTurn(b, { ...s, picked: [p, x] }, 3), { ...s, picked: [] }); // a miss
  const hit = resolveTurn(b, { ...s, picked: [p, pairOf(b, p)] }, 3);
  assert.deepEqual([...hit.matched].sort(), [p, pairOf(b, p)].sort());
});

test('joker with no unmatched cards left turns nothing up', () => {
  const b = deal(4, 2);
  let s: TarotState = tarotInitial();
  for (const id of new Set(nonJoker(b).map((i) => b[i]))) {
    const [x, y] = b.map((c, i) => (c === id ? i : -1)).filter((i) => i >= 0);
    s = resolveTurn(b, flip(b, flip(b, s, 4, x), 4, y), 4);
  }
  s = flip(b, s, 4, jokerAt(b));
  assert.equal(s.peek, null);
  assert.ok(tarotSolved(b, s));
});

test('joker peek is replayable and never picks an already picked card', () => {
  const b = deal(7);
  const s1 = flip(b, flip(b, tarotInitial(), 7, nonJoker(b)[0]), 7, jokerAt(b));
  const s2 = flip(b, flip(b, tarotInitial(), 7, nonJoker(b)[0]), 7, jokerAt(b));
  assert.deepEqual(s1, s2);
  assert.notEqual(s1.peek, nonJoker(b)[0]);
});

test('hint: nothing seen means no ghost and no hint spent; same state gives same ghost', () => {
  const b = deal(8);
  assert.deepEqual(tarotHint(b, tarotInitial(), 8), { state: tarotInitial(), ghost: null });
  let s = flip(b, tarotInitial(), 8, 0);
  s = flip(b, s, 8, b.findIndex((c, i) => i !== 0 && c !== b[0] && c !== JOKER));
  s = resolveTurn(b, s, 8);
  const h = tarotHint(b, s, 8);
  assert.ok(h.ghost !== null && s.seen.includes(h.ghost) && !s.matched.includes(h.ghost));
  assert.equal(h.state.hints, 1);
  assert.deepEqual(tarotHint(b, s, 8), h);
});

test('following hints always reaches a win', () => {
  for (let seed = 0; seed < 60; seed++) {
    const b = deal(seed, 6 + (seed % 3) * 2);
    let s = tarotInitial();
    const rng = new Rng(seed + 1000);
    let turns = 0;
    while (!tarotSolved(b, s)) {
      assert.ok(++turns < 200, 'did not finish');
      // Turn the hinted card, then its partner if she has seen it, else a new face-down card.
      const { state, ghost } = tarotHint(b, s, seed);
      s = state;
      const down = () => b.map((_, i) => i).filter((i) => !s.matched.includes(i) && !s.picked.includes(i) && b[i] !== JOKER && s.jokerGone !== i && s.peek !== i);
      const fresh = () => down().filter((i) => !s.seen.includes(i));
      const first = ghost !== null ? ghost : rng.pick(fresh().length ? fresh() : down());
      s = flip(b, s, seed, first);
      if (!turnReady(b, s)) {
        const partner = pairOf(b, first);
        const second = s.seen.includes(partner) && !s.picked.includes(partner) ? partner : rng.pick(fresh().length ? fresh() : down());
        s = flip(b, s, seed, second);
      }
      s = resolveTurn(b, s, seed);
      // Now and then she flips the joker too.
      if (turns === 2 && s.jokerGone === null) s = flip(b, s, seed, jokerAt(b));
    }
  }
});

test('no deadlock: random taps (joker included) always reach a win, a move always exists', () => {
  for (let seed = 0; seed < 60; seed++) {
    const b = deal(seed, 6 + (seed % 3) * 2);
    let s = tarotInitial();
    const rng = new Rng(seed + 5000);
    for (let n = 0; !tarotSolved(b, s); n++) {
      assert.ok(n < 3000, 'did not finish');
      if (turnReady(b, s)) {
        s = resolveTurn(b, s, seed);
        continue;
      }
      const moves = b.map((_, i) => i).filter((i) => flip(b, s, seed, i) !== s);
      assert.ok(moves.length > 0, 'no move available');
      assert.ok(!tarotSolved(b, s));
      s = flip(b, s, seed, rng.pick(moves));
    }
  }
});

test('solve reveals everything', () => {
  const b = deal(9);
  const s = tarotRevealAll(b, tarotInitial());
  assert.ok(tarotSolved(b, s));
  assert.equal(s.matched.length, b.length - 1);
});
