import assert from 'node:assert/strict';
import { test } from 'node:test';
import { content } from '../content/index.ts';
import { newPlayCase } from '../engine/caseRef.ts';
import { emptyProgress, reduce, visibleClues } from '../game/state.ts';
import { DEFAULT_TAB, finishFor, tabForCase, tabsFor, afterMapTap, afterSwipe, parseTab, peekLine, placeAction, placementLine, ringedSubject, subjectClues, subjectTitle } from './notebook.ts';

const { c } = newPlayCase(content, () => 0.5);

test('the peek line counts unused found clues', () => {
  let p = emptyProgress();
  assert.equal(peekLine(c, p), 'Notebook · no clues yet');
  p = reduce(c, p, { type: 'game-finish', kind: c.games[0].kind, status: 'won', data: null });
  const n = visibleClues(c, p).length;
  assert.ok(n > 0);
  assert.equal(peekLine(c, p), `Notebook · ${n} of ${n} to use`);
  p = reduce(c, p, { type: 'toggle-used', clue: visibleClues(c, p)[0].id });
  assert.equal(peekLine(c, p), n === 1 ? 'Notebook · all clues used' : `Notebook · ${n - 1} of ${n} to use`);
});

test('a saved tab that is not ours falls back to Clues', () => {
  assert.equal(parseTab('grid'), 'grid');
  assert.equal(parseTab('map'), DEFAULT_TAB);
  assert.equal(parseTab(null), DEFAULT_TAB);
});

test('a subject page lists only found clues that name it', () => {
  const p = emptyProgress();
  const s = { kind: 'suspect' as const, id: c.suspects[0] };
  assert.deepEqual(subjectClues(c, p, s), []);
  const done = reduce(c, p, { type: 'game-finish', kind: c.games[0].kind, status: 'won', data: null });
  for (const clue of subjectClues(c, done, s)) assert.ok(visibleClues(c, done).includes(clue));
  assert.ok(subjectTitle(c, s).length > 0);
  assert.match(subjectTitle(c, { kind: 'item', id: c.items[0] }), /^The /);
});

test('placement says where she put a guest or weapon', () => {
  let p = emptyProgress();
  const guest = { kind: 'suspect' as const, id: c.suspects[0] };
  const weapon = { kind: 'item' as const, id: c.items[0] };
  assert.equal(placementLine(c, p, guest), 'Not placed yet');
  assert.equal(placementLine(c, p, weapon), 'Not placed yet');
  p = reduce(c, p, { type: 'place', suspect: guest.id, room: c.rooms[0] });
  assert.match(placementLine(c, p, guest), /^You've placed them in the /);
  p = reduce(c, p, { type: 'place-item', item: weapon.id, room: c.rooms[1] });
  assert.match(placementLine(c, p, weapon), /^You've put it in the /);
});

test('a map tap raises the strip to half and leaves a raised notebook where it is', () => {
  assert.equal(afterMapTap('peek'), 'half');
  assert.equal(afterMapTap('half'), 'half');
  assert.equal(afterMapTap('full'), 'full');
});

test('swipes go full height up and to the strip down', () => {
  assert.equal(afterSwipe('up'), 'full');
  assert.equal(afterSwipe('down'), 'peek');
});

test('only a raised notebook on a guest or weapon page rings a piece on the map', () => {
  const guest = { kind: 'suspect' as const, id: c.suspects[0] };
  assert.deepEqual(ringedSubject('half', guest), guest);
  assert.deepEqual(ringedSubject('full', guest), guest);
  assert.equal(ringedSubject('peek', guest), null);
  assert.equal(ringedSubject('half', null), null);
  assert.equal(ringedSubject('half', { kind: 'room', id: c.rooms[0] }), null);
});

test('choosing a room on a subject page does what dragging onto the room does', () => {
  const room = c.rooms[1];
  const guest = { kind: 'suspect' as const, id: c.suspects[0] };
  const weapon = { kind: 'item' as const, id: c.items[0] };
  const dragged = reduce(c, emptyProgress(), { type: 'place', suspect: guest.id, room });
  assert.deepEqual(reduce(c, emptyProgress(), placeAction(guest, room)!), dragged);
  assert.equal(placementLine(c, dragged, guest).includes('placed them'), true);
  const put = reduce(c, emptyProgress(), placeAction(weapon, room)!);
  assert.equal(placementLine(c, put, weapon).startsWith("You've put it in"), true);
  assert.equal(placeAction({ kind: 'room', id: room }, room), null);
});

const quickCase = { ...c, sceneGiven: undefined };
const quickRef = { mode: 'quick' as const, code: 'K7QF2', difficulty: 'medium' as const, length: 'normal' as const };

test('Jigsaw takes the place of Grid in a Jigsaw-finish Quick case, and Play cases show both', () => {
  assert.equal(finishFor(quickCase, { ...quickRef, endBoard: true }), 'jigsaw');
  assert.equal(finishFor(quickCase, quickRef), 'grid');
  assert.equal(finishFor(c, { ...quickRef, endBoard: true }), 'both'); // a Play case (scene given)
  assert.equal(finishFor(c, { mode: 'play', code: 'K7QF2' }), 'both');
  assert.equal(finishFor(quickCase, null, true), 'jigsaw');
  assert.equal(finishFor(quickCase, null), 'grid');
  assert.deepEqual(tabsFor('jigsaw').map((t) => t.id), ['clues', 'jigsaw', 'guests']);
  assert.deepEqual(tabsFor('grid').map((t) => t.id), ['clues', 'grid', 'guests']);
  assert.deepEqual(tabsFor('both').map((t) => t.id), ['clues', 'grid', 'jigsaw', 'guests']);
});

test('a saved Grid or Jigsaw tab opens the one this case has', () => {
  assert.equal(tabForCase('grid', 'jigsaw'), 'jigsaw');
  assert.equal(tabForCase('jigsaw', 'grid'), 'grid');
  assert.equal(tabForCase('jigsaw', 'jigsaw'), 'jigsaw');
  assert.equal(tabForCase('grid', 'both'), 'grid');
  assert.equal(tabForCase('jigsaw', 'both'), 'jigsaw');
  assert.equal(tabForCase('guests', 'jigsaw'), 'guests');
  assert.equal(tabForCase('you', 'both'), 'clues'); // no You tab in Quick cases
  assert.equal(tabForCase('you', 'grid'), 'clues');
  assert.equal(parseTab('jigsaw'), 'jigsaw');
});

test('the Accuse button on a guest page: label, weapon and whether it submits', async () => {
  const { accuseAction, accuseLabel, accuseRequest } = await import('./notebook.ts');
  const guest = { kind: 'suspect' as const, id: c.suspects[0] };
  let p = emptyProgress();
  const none = accuseRequest(c, p, guest)!;
  assert.deepEqual(none, { suspect: guest.id, submit: false });
  assert.equal(accuseLabel(c, none), 'Accuse them…');
  assert.equal(accuseAction(none), null);
  const cell = { kind: 'suspect-item' as const, row: guest.id, col: c.items[1] };
  p = reduce(c, reduce(c, p, { type: 'cycle', ...cell }), { type: 'cycle', ...cell });
  const given = accuseRequest(c, p, guest)!;
  assert.deepEqual(given, { suspect: guest.id, item: c.items[1], submit: true });
  assert.match(accuseLabel(c, given), /^Accuse .+ with the .+$/);
  assert.deepEqual(accuseAction(given), { type: 'accuse', suspect: guest.id, item: c.items[1] });
  // Not on weapons or rooms, and not once solved.
  assert.equal(accuseRequest(c, p, { kind: 'item', id: c.items[0] }), null);
  assert.equal(accuseRequest(c, p, { kind: 'room', id: c.rooms[0] }), null);
  assert.equal(accuseRequest(c, { ...p, solved: true }, guest), null);
});
