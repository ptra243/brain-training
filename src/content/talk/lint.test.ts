import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../index.ts';
import { extraRoomMeta } from '../extraRooms.ts';
import { faceLines, opening, talk, victimLines } from '../talk.ts';

/** Exact lines the name check skips. Empty once those lines were reworded. */
const NAME_ALLOW = new Set<string>([]);

const CARD_PHRASES = [
  'the emperor',
  'the empress',
  'the hierophant',
  'high priestess',
  'the magician',
  'the hermit',
  'the chariot',
  'hanged man',
  'the fool',
  'the tower',
  'the lovers',
  'the devil',
  'the star',
  'the sun',
  'the moon',
];

const OBJECTS: Record<string, readonly string[]> = {
  emperor: ['knife', 'candlestick', 'vase'],
  empress: ['rope', 'wrench', 'vase'],
  hierophant: ['knife', 'candlestick', 'poison'],
  magician: ['candlestick', 'rope', 'poison'],
  'high-priestess': ['wrench', 'poison', 'vase'],
  devil: ['knife', 'rope', 'poison'],
  hermit: ['candlestick', 'wrench', 'vase'],
  chariot: ['knife', 'candlestick', 'wrench'],
  sun: ['rope', 'candlestick', 'wrench'],
  justice: ['knife', 'poison', 'wrench'],
  lovers: ['wrench', 'vase', 'rope'],
  star: ['wrench', 'vase', 'poison'],
  death: ['rope', 'poison', 'knife'],
  'hanged-man': ['rope', 'knife', 'vase'],
  moon: ['candlestick', 'poison', 'knife'],
};

const WEAPONS = ['knife', 'rope', 'candlestick', 'wrench', 'vase', 'poison', 'poison bottle'] as const;

interface Said {
  text: string;
  where: string;
  /** Set when this beat belongs to that object's threads. */
  objectId?: string;
}

const phrase = (name: string) => new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');

function spoken(): Said[] {
  const out: Said[] = [];
  const add = (text: string, where: string, objectId?: string) => out.push({ text, where, objectId });
  for (const [cardId, card] of Object.entries(talk.cards)) {
    for (const side of ['upright', 'reversed'] as const) {
      const reading = card[side];
      reading.lines.neutral.forEach((text, i) => add(text, `${cardId} ${side} neutral ${i}`));
      reading.lines.bound.forEach((text, i) => add(text, `${cardId} ${side} bound ${i}`));
      reading.threads.forEach((thread, ti) => thread.forEach((text, bi) => add(text, `${cardId} ${side} thread ${ti}.${bi}`)));
    }
    for (const [item, threads] of Object.entries(card.objects)) {
      for (const side of ['upright', 'reversed'] as const) {
        const beats = threads[side];
        if (beats.length === 0) continue;
        beats.forEach((text, i) => add(text, `${cardId} ${item} ${side} ${i}`, item));
      }
    }
  }
  for (const pool of ['firstCold', 'secondCold', 'warm'] as const) {
    talk.greetings[pool].forEach((text, i) => add(text, `greetings.${pool} ${i}`));
  }
  talk.borrowed.forEach((e, i) => add(e.line, `borrowed ${e.suspect} ${e.card} ${e.reversed} ${i}`));
  talk.motives.forEach((e, i) => e.thread.forEach((text, bi) => add(text, `motive ${e.suspect} ${e.card} ${e.reversed} ${i}.${bi}`)));
  talk.motives.forEach((e, i) => e.asks?.forEach((text, bi) => add(text, `motive ask ${e.suspect} ${e.card} ${e.reversed} ${i}.${bi}`)));
  for (const [pool, lines] of Object.entries(faceLines)) lines.forEach((text, i) => add(text, `face ${pool} ${i}`));
  for (const [key, lines] of Object.entries(victimLines)) lines.forEach((text, i) => add(text, `victim ${key} ${i}`));
  const walk = (value: unknown, where: string) => {
    if (typeof value === 'string') add(value, where);
    else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${where}[${i}]`));
    else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) walk(v, `${where}.${k}`);
  };
  walk(opening, 'opening');
  return out;
}

const lines = spoken();

const names = [
  ...new Set([
    ...content.suspects.flatMap((s) => [s.name, s.alone?.name ?? '']),
    ...content.house.rooms.map((r) => r.name),
    ...Object.values(extraRoomMeta).map((r) => r.name),
  ]),
].filter((n) => n.length > 0);

test('spoken lines are non-empty, and a filled object side is three beats', () => {
  assert.ok(lines.length > 100);
  for (const s of lines) assert.notEqual(s.text, '', s.where);
  for (const [cardId, card] of Object.entries(talk.cards)) {
    for (const [item, threads] of Object.entries(card.objects)) {
      for (const side of ['upright', 'reversed'] as const) {
        const beats = threads[side];
        if (beats.length === 0) continue;
        assert.equal(beats.length, 3, `${cardId} ${item} ${side}`);
        for (const beat of beats) assert.notEqual(beat, '', `${cardId} ${item} ${side}`);
      }
    }
  }
});

test('no spoken string is used twice', () => {
  const seen = new Map<string, string>();
  for (const s of lines) {
    const prev = seen.get(s.text);
    assert.equal(prev, undefined, `${s.where} repeats ${prev}: ${s.text}`);
    seen.set(s.text, s.where);
  }
});

test('no time phrase', () => {
  const time = [/\ball night\b/i, /\bo'clock\b/i, /\bhours\b/i];
  for (const s of lines) for (const re of time) assert.equal(re.test(s.text), false, `${s.where}: ${s.text}`);
});

test('placeholders are only the allowed ones', () => {
  for (const s of lines) {
    const stripped = s.text.replace(/\{(victim|other|n|total|names|room|scene)\}/g, '');
    assert.equal(/[{}]/.test(stripped), false, `${s.where}: ${s.text}`);
  }
});

test('no guest, room or card name', () => {
  const hits: string[] = [];
  for (const s of lines) {
    if (NAME_ALLOW.has(s.text)) continue;
    for (const name of names) if (phrase(name).test(s.text)) hits.push(`${s.where} names ${name}: ${s.text}`);
    for (const name of CARD_PHRASES) if (phrase(name).test(s.text)) hits.push(`${s.where} says ${name}: ${s.text}`);
  }
  assert.deepEqual(hits, []);
});

test('weapon words stay inside that object\'s threads', () => {
  for (const s of lines) {
    for (const word of WEAPONS) {
      if (!phrase(word).test(s.text)) continue;
      const own = word === 'poison bottle' ? 'poison' : word;
      assert.equal(s.objectId, own, `${s.where} says ${word}: ${s.text}`);
    }
  }
});

test('motive threads are for a card the guest can roll, 2 to 3 beats, one per guest, card and reading', () => {
  const seen = new Set<string>();
  for (const e of talk.motives) {
    const me = talk.suspects[e.suspect];
    assert.ok(me, e.suspect);
    assert.ok(e.card === me.card || me.mayAlsoRoll.includes(e.card), `${e.suspect} ${e.card}`);
    assert.ok(e.thread.length >= 2 && e.thread.length <= 3, `${e.suspect} ${e.card}`);
    if (e.asks) assert.equal(e.asks.length, e.thread.length, `${e.suspect} ${e.card} asks`);
    const key = `${e.suspect}|${e.card}|${e.reversed}`;
    assert.equal(seen.has(key), false, key);
    seen.add(key);
  }
});

test('a first cold greeting never says again', () => {
  for (const line of talk.greetings.firstCold) assert.equal(/\bagain\b/i.test(line), false, line);
});

test('each card\'s objects are the table, all 45 pairs are filled, and each item is on 7 or 8 cards', () => {
  assert.deepEqual(Object.keys(talk.cards), Object.keys(OBJECTS));
  let filled = 0;
  const counts: Record<string, number> = {};
  for (const [id, keys] of Object.entries(OBJECTS)) {
    const objects = talk.cards[id].objects;
    assert.deepEqual(Object.keys(objects), [...keys], id);
    for (const key of keys) {
      counts[key] = (counts[key] ?? 0) + 1;
      const side = objects[key];
      if (side.upright.length > 0 && side.reversed.length > 0) filled++;
    }
  }
  assert.equal(filled, 45, `filled ${filled}`);
  for (const [item, n] of Object.entries(counts)) assert.ok(n === 7 || n === 8, `${item} is on ${n} cards`);
});
