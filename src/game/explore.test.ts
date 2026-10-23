import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content, houseDetails } from '../content/index.ts';
import { campaignCast, campaignRound, type CampaignRef } from '../engine/campaign.ts';
import { isSceneGame } from '../engine/gameKinds.ts';
import type { Case, Room } from '../engine/types.ts';
import { atMidnight, canOpen, centreCell, clockAfterNext, clockLine, clockTime, gamesLeft, roomContents, roomsSeen, roundPuzzles, standSpots } from './explore.ts';
import { emptyProgress, reduce, sceneText, sceneUnlocked, type Progress } from './state.ts';
import { questioningOf } from './talk.ts';

const refs: CampaignRef[] = [
  { mode: 'campaign', code: 'ABCDE', difficulty: 'easy' },
  { mode: 'campaign', code: 'K7QF2', difficulty: 'medium' },
  { mode: 'campaign', code: 'ZZZZZ', difficulty: 'hard', perPuzzle: 1 },
];

/** Every round of a campaign, losing the first innocent each time. */
function rounds(ref: CampaignRef): Case[] {
  const killer = campaignCast(content, ref).killer;
  const victims: string[] = [];
  const out: Case[] = [];
  for (let r = 0; r < 3; r++) {
    const rc = campaignRound(content, ref, victims);
    out.push(rc);
    victims.push(rc.suspects.find((s) => s !== killer)!);
  }
  return out;
}
const all = refs.flatMap(rounds);

test('the same case has the same contents', () => {
  for (const c of all) assert.deepEqual(roomContents(houseDetails, c), roomContents(houseDetails, c));
});

test('every guest is in exactly one room, no victim appears, no weapon is listed', () => {
  for (const c of all) {
    const rooms = roomContents(houseDetails, c);
    assert.deepEqual(Object.keys(rooms).sort(), [...c.rooms].sort());
    const seen = Object.values(rooms).flatMap((r) => r.guests);
    assert.deepEqual([...seen].sort(), [...c.suspects].sort());
    for (const v of c.campaign?.victims ?? []) assert.ok(!seen.includes(v));
    const text = JSON.stringify(rooms).toLowerCase();
    for (const item of content.items) assert.ok(!text.includes(`"${item.name.toLowerCase()}"`));
  }
});

test('every puzzle but the scene word games and guests\' questioning is an object, placed once', () => {
  for (const c of all) {
    const placed = Object.values(roomContents(houseDetails, c)).flatMap((r) => r.objects.map((o) => o.kind));
    const expected = c.games.filter((g) => !isSceneGame(g) && ![...c.suspects].some((s) => questioningOf(c, s) === g)).map((g) => g.kind);
    assert.deepEqual([...placed].sort(), [...expected].sort());
    assert.equal(roundPuzzles(c).objects.length, expected.length);
    for (const o of Object.values(roomContents(houseDetails, c)).flatMap((r) => r.objects)) assert.match(o.label, /^The \w+$/);
  }
});

test('objects spread over different rooms while there are rooms to spare', () => {
  for (const c of all) {
    const rooms = Object.values(roomContents(houseDetails, c));
    const most = Math.max(...rooms.map((r) => r.objects.length));
    assert.ok(most <= Math.ceil(roundPuzzles(c).objects.length / c.rooms.length));
  }
});

test('every room has something to look at, from the house details', () => {
  for (const c of all) for (const room of Object.values(roomContents(houseDetails, c))) {
    assert.ok(room.looks.length > 0);
    for (const l of room.looks) assert.ok(houseDetails.includes(l));
  }
});

test('contents do not depend on the truth: the same seed with another solution gives the same rooms', () => {
  const c = all[0];
  const other = { ...c, murderer: c.suspects.find((s) => s !== c.murderer)!, sceneRoom: c.rooms.find((r) => r !== c.sceneRoom)! };
  assert.deepEqual(roomContents(houseDetails, other), roomContents(houseDetails, c));
});

const withBudget = (c: Case, budget: number): Case => ({ ...c, campaign: { ...c.campaign!, budget } });

/** A round with four plain puzzles, `done` of them finished (alternately won and revealed). */
const KINDS = ['a', 'b', 'c', 'd'];
const fake = { ...all[0], games: KINDS.map((k) => ({ kind: k, unlocksScene: false, clues: [] })) } as unknown as Case;
const finished = (done: number): Progress => ({
  ...emptyProgress(),
  games: Object.fromEntries(KINDS.slice(0, done).map((k, i) => [k, { status: i % 2 ? 'revealed' : 'won' }])),
}) as Progress;

test('the clock: budget 4 moves 45 minutes a puzzle, budget 3 an hour', () => {
  const four = withBudget(fake, 4);
  assert.deepEqual([0, 1, 2, 3, 4].map((n) => clockTime(four, finished(n))), ['9:00', '9:45', '10:30', '11:15', 'Midnight']);
  const three = withBudget(fake, 3);
  assert.deepEqual([0, 1, 2, 3, 4].map((n) => clockTime(three, finished(n))), ['9:00', '10:00', '11:00', 'Midnight', 'Midnight']);
  assert.equal(gamesLeft(three, finished(3)), 0);
  assert.ok(atMidnight(three, finished(3)));
  assert.ok(!atMidnight(three, finished(2)));
  assert.equal(clockLine(three, finished(1)), '10:00 (2 games left)');
  assert.equal(clockLine(three, finished(2)), '11:00 (1 game left)');
  assert.equal(clockAfterNext(three, finished(0)), '10:00');
  assert.equal(clockAfterNext(four, finished(0)), '9:45');
});

test('a puzzle can be opened when picked or a pick is left, never at midnight or once done', () => {
  const c = withBudget(all[0], 2);
  const kind = c.games.find((g) => !isSceneGame(g))!.kind;
  assert.ok(canOpen(c, emptyProgress(), kind, [], 1));
  assert.ok(canOpen(c, emptyProgress(), kind, [kind], 0));
  assert.ok(!canOpen(c, emptyProgress(), kind, [], 0));
  assert.ok(!canOpen(c, reduce(c, emptyProgress(), { type: 'game-finish', kind, status: 'won', data: null }), kind, [kind], 0));
});

test('in an exploring round the scene is known from the start; others are unchanged', () => {
  const c = all[0];
  assert.ok(!sceneUnlocked(c, emptyProgress()));
  const e: Case = { ...c, explore: true };
  assert.ok(sceneUnlocked(e, emptyProgress()));
  assert.match(sceneText(e, emptyProgress())!, /^The body was found in the \w+/);
  assert.equal(sceneText(c, emptyProgress()), null);
});

test('move sets the room she is in, only a room in play, and remembers the destination', () => {
  const c = all[0];
  const scene = c.sceneRoom;
  const room = c.rooms.find((r) => r !== scene)!;
  const onward = c.rooms.find((r) => r !== scene && r !== room)!;
  assert.ok(onward, 'a round has a third room');

  assert.deepEqual(roomsSeen(c, emptyProgress()), [scene]);

  const there = reduce(c, emptyProgress(), { type: 'move', room });
  assert.equal(there.at, room);
  assert.deepEqual(there.seen, [room]);
  assert.deepEqual([...roomsSeen(c, there)].sort(), [scene, room].sort());

  const left = reduce(c, there, { type: 'move', room: onward });
  assert.equal(left.at, onward);
  assert.deepEqual(left.seen, [room, onward]);
  assert.deepEqual([...roomsSeen(c, left)].sort(), [scene, room, onward].sort());

  const bad = reduce(c, left, { type: 'move', room: 'nowhere' });
  assert.equal(bad.at, onward);
  assert.deepEqual(bad.seen, [room, onward]);
  assert.equal(reduce(c, left, { type: 'move', room: onward }), left);

  const back = reduce(c, left, { type: 'move', room: scene });
  assert.equal(back.at, scene);
  assert.deepEqual(back.seen, [room, onward]);
  assert.equal(reduce(c, emptyProgress(), { type: 'move', room: 'nowhere' }).at, undefined);
});

test('people stand on their own cells, and share one only when the room is full', () => {
  const room = content.house.rooms[0];
  assert.equal(room.cells.length, 6);
  const [cr, cc] = centreCell(room);
  const guests = ['a', 'b', 'c', 'd'];
  const spots = standSpots(room, guests, true);
  const player = spots.find((s) => s.id === 'player')!;
  assert.deepEqual([player.r, player.col], [cr + 0.5, cc + 0.5]);
  const theirs = spots.filter((s) => s.id !== 'player');
  assert.deepEqual(theirs.map((s) => s.id), guests);
  assert.equal(new Set(theirs.map((s) => `${s.r},${s.col}`)).size, guests.length);
  assert.ok(theirs.every((s) => s.r !== player.r || s.col !== player.col));
  assert.ok(guests.length + 1 <= room.cells.length);

  const free = room.cells.filter((cell) => cell[0] !== cr || cell[1] !== cc).slice();
  free.sort((a, b) => {
    const da = (a[0] - cr) ** 2 + (a[1] - cc) ** 2;
    const db = (b[0] - cr) ** 2 + (b[1] - cc) ** 2;
    return da - db || a[0] - b[0] || a[1] - b[1];
  });
  assert.deepEqual([theirs[0].r, theirs[0].col], [free[0][0] + 0.5, free[0][1] + 0.5]);

  const nook: Room = { id: 'nook', name: 'Nook', tint: '#fff', objects: [], things: [], cells: [[4, 1]] };
  const shared = standSpots(nook, ['a', 'b'], false);
  assert.equal(shared.length, 2);
  assert.deepEqual(shared.map((s) => s.r), [4.5, 4.5]);
  assert.deepEqual(shared.map((s) => s.col), [1.3, 1.7]);
});

test('no object is named with a word any puzzle of the round hides', () => {
  for (const c of all) {
    const text = JSON.stringify(c.games).toUpperCase();
    for (const room of Object.values(roomContents(houseDetails, c)))
      for (const o of room.objects) assert.ok(!text.includes(o.label.replace(/^The /, '').toUpperCase()), `${c.code}: ${o.label}`);
  }
});
