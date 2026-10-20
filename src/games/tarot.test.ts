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
  assert.ok(turnReady(s));
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
  // A miss using the peeked card leaves it up.
  const wrong = nonJoker(b).find((i) => i !== first && i !== pairOf(b, first))!;
  s = resolveTurn(b, flip(b, s, 3, wrong), 3);
  assert.equal(s.peek, first);
  // Matching it turns a new one up for free.
  s = resolveTurn(b, flip(b, flip(b, s, 3, first), 3, pairOf(b, first)), 3);
  assert.ok(s.peek !== null && s.peek !== first && !s.matched.includes(s.peek));
  assert.equal(s.matched.length, 2);
  // Joker flipped again does nothing.
  assert.deepEqual(flip(b, s, 3, jokerAt(b)), s);
});

test('peek counts as the first pick: one tap pairs, match stays, miss keeps the peek up and lets her retry', () => {
  const b = deal(3, 6);
  let s = flip(b, tarotInitial(), 3, jokerAt(b));
  const p = s.peek!;
  assert.deepEqual(flip(b, s, 3, p), s); // tapping the peek itself does nothing
  const wrong = nonJoker(b).filter((i) => i !== p && i !== pairOf(b, p));
  const t = flip(b, s, 3, wrong[0]);
  assert.deepEqual(t.picked, [p, wrong[0]]);
  assert.ok(turnReady(t));
  assert.deepEqual(flip(b, t, 3, wrong[1]), t); // nothing more while judging
  s = resolveTurn(b, t, 3);
  assert.deepEqual([s.picked, s.matched, s.peek, s.peekFresh], [[], [], p, false]); // miss: peek stays up, no longer automatic
  // Free choice again: B then C are an ordinary pair of picks (the third-card bug).
  s = flip(b, s, 3, wrong[1]);
  assert.deepEqual(s.picked, [wrong[1]]);
  s = flip(b, s, 3, wrong[2]);
  assert.deepEqual(s.picked, [wrong[1], wrong[2]]);
  s = resolveTurn(b, s, 3);
  assert.deepEqual([s.picked, s.peek], [[], p]);
  s = resolveTurn(b, flip(b, flip(b, s, 3, p), 3, pairOf(b, p)), 3); // tap the peek to pair it on purpose
  assert.deepEqual([...s.matched].sort(), [p, pairOf(b, p)].sort());
  assert.ok(s.peek !== null && s.peek !== p && !s.matched.includes(s.peek) && s.peekFresh);
});

test('peek up with one ordinary pick made: two ordinary picks resolve as before, peek untouched', () => {
  const b = deal(3, 6);
  const x = nonJoker(b)[0];
  let s = flip(b, flip(b, tarotInitial(), 3, x), 3, jokerAt(b));
  const p = s.peek!;
  const y = nonJoker(b).find((i) => i !== x && i !== p && i !== pairOf(b, x))!;
  s = flip(b, s, 3, y);
  assert.deepEqual(s.picked, [x, y]);
  s = resolveTurn(b, s, 3);
  assert.deepEqual([s.picked, s.matched, s.peek, s.peekFresh], [[], [], p, true]);
  // The fresh peek is still her next first pick; after that miss she can go on freely.
  const z = nonJoker(b).find((i) => i !== p && i !== pairOf(b, p))!;
  s = resolveTurn(b, flip(b, s, 3, z), 3);
  assert.equal(s.peekFresh, false);
  s = flip(b, flip(b, s, 3, x), 3, y);
  assert.deepEqual(s.picked, [x, y]);
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
      const down = () => b.map((_, i) => i).filter((i) => !s.matched.includes(i) && !s.picked.includes(i) && b[i] !== JOKER && s.jokerGone !== i);
      const fresh = () => down().filter((i) => !s.seen.includes(i));
      // With a peek up her tap pairs with it, so she only follows a hint that points at its partner.
      const peekUp = s.peek !== null && s.peekFresh && s.picked.length === 0;
      const useGhost = ghost !== null && (!peekUp || b[ghost] === b[s.peek!]);
      const first = useGhost ? ghost! : rng.pick(fresh().length ? fresh() : down());
      s = flip(b, s, seed, first);
      const partner = pairOf(b, first);
      const second = s.seen.includes(partner) && !s.picked.includes(partner) ? partner : rng.pick(fresh().length ? fresh() : down().filter((i) => !s.picked.includes(i)));
      s = flip(b, s, seed, second);
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
      if (turnReady(s)) {
        s = resolveTurn(b, s, seed);
        continue;
      }
      const moves = b.map((_, i) => i).filter((i) => flip(b, s, seed, i) !== s);
      assert.ok(moves.length > 0, 'no move available');
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
