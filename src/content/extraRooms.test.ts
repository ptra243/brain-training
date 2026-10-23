import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { content } from './index.ts';
import { extraRoomMeta } from './extraRooms.ts';
import { parseWords } from '../games/dictionary.ts';
import { themeWords } from '../game/sceneGames.ts';

const dictionary = parseWords(readFileSync(new URL('../../public/words.txt', import.meta.url), 'utf8'));

test('extra rooms: objects and things follow the room content rules', () => {
  const rooms = Object.entries(extraRoomMeta);
  assert.deepEqual(rooms.map(([k]) => k), ['dining', 'pantry', 'cloakroom', 'games']);
  const tints = new Set([...content.house.rooms.map((r) => r.tint)]);
  const theme = themeWords(content);
  for (const [key, r] of rooms) {
    assert.equal(r.id, key);
    assert.ok(!tints.has(r.tint), `${r.name}: tint reused`);
    tints.add(r.tint);
    assert.match(r.tint, /^#[0-9a-f]{6}$/);
    assert.ok(r.objects.length >= 8 && r.objects.length <= 11, r.name);
    assert.equal(r.things.length, 8, r.name);
    for (const w of r.objects) {
      assert.match(w, /^[A-Z]{5}$/, `${r.name}: ${w}`);
      assert.ok(dictionary.has(w), w);
      assert.ok(!['KNIFE', 'ROPE', 'VASE'].includes(w), w);
    }
    for (const w of r.things) {
      assert.match(w, /^[A-IK-WY]{4,9}$/, `${r.name}: ${w}`);
      assert.ok(!theme.has(w), `${r.name}: ${w} is a theme word`);
      assert.ok(!r.objects.includes(w), w);
    }
  }
});
