import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../content/index.ts';
import { faceLines, talk } from '../content/talk.ts';
import { campaignCast, campaignRound } from '../engine/campaign.ts';
import { moodFor } from '../engine/sets.ts';
import type { Case } from '../engine/types.ts';
import { generateCase } from '../engine/generate.ts';
import { emptyProgress, reduce, type Progress } from './state.ts';
import { gamesAbout, greeting, moodTint, questioningOf, readyBeats, setsFor } from './talk.ts';

const c = generateCase(content, 5);
const finish = (p: Progress, kinds: readonly string[], status: 'won' | 'revealed' | 'playing' = 'won'): Progress => ({
  ...p,
  games: { ...p.games, ...Object.fromEntries(kinds.map((k) => [k, { status }])) },
});
const kinds = c.games.map((g) => g.kind);

test('gamesAbout lists the guests a game names, and the guest in a questioning', () => {
  for (const g of c.games) {
    const about = gamesAbout(c, g);
    for (const s of about) assert.ok(c.suspects.includes(s));
    const q = questioningOf(c, 'nobody');
    assert.equal(q, undefined);
  }
  const q = c.games.find((g) => g.kind === 'interrogation');
  if (q && 'interrogation' in q) assert.ok(gamesAbout(c, q).includes(q.interrogation.suspect));
});

test('ready beats: one to start, a beat for each game about them, one per two other games', () => {
  const s = c.suspects[0];
  const about = c.games.filter((g) => gamesAbout(c, g).includes(s)).map((g) => g.kind);
  const others = kinds.filter((k) => !about.includes(k));
  assert.equal(readyBeats(c, emptyProgress(), s, 3), 1);
  assert.equal(readyBeats(c, finish(emptyProgress(), about), s, 99), 1 + about.length);
  assert.equal(readyBeats(c, finish(emptyProgress(), others), s, 99), 1 + Math.floor(others.length / 2));
  assert.equal(readyBeats(c, finish(emptyProgress(), kinds), s, 2), 2, 'never more than the thread');
});

test('only finished games count, won or revealed', () => {
  const s = c.suspects[0];
  assert.equal(readyBeats(c, finish(emptyProgress(), kinds, 'playing'), s, 99), 1);
  assert.equal(readyBeats(c, finish(emptyProgress(), kinds, 'revealed'), s, 99), readyBeats(c, finish(emptyProgress(), kinds, 'won'), s, 99));
});

test('a solved case has every beat ready', () => {
  assert.equal(readyBeats(c, { ...emptyProgress(), solved: true }, c.suspects[0], 3), 3);
});

test('greetings: cold guests warm up a step per beat, warm ones stay warm', () => {
  const g = talk.greetings;
  const cold = { mood: 0 };
  const mid = { mood: 1 };
  assert.equal(greeting(cold, 0, g), g.cold[0]);
  assert.equal(greeting(cold, 1, g), g.cold[1]);
  const warmAt = (heard: number) => g.warm[Math.min(heard, g.warm.length - 1)]; // never the first-meeting line once they've talked
  assert.equal(greeting(cold, 2, g), warmAt(2));
  assert.equal(greeting(cold, 9, g), warmAt(9));
  assert.equal(greeting(mid, 0, g), g.cold[1]);
  assert.equal(greeting(mid, 1, g), warmAt(1));
  assert.ok(g.warm.includes(greeting({ mood: g.cold.length }, 0, g)));
  assert.ok(g.warm.includes(greeting({ mood: g.cold.length }, 5, g)));
});

test('mood tint: hostile at the coldest step, warm at the top, none between', () => {
  const g = talk.greetings;
  const top = g.cold.length;
  assert.equal(moodTint({ mood: 0 }, 0, g), 'hostile');
  assert.equal(moodTint({ mood: 0 }, 1, g), top > 1 ? 'none' : 'warm');
  assert.equal(moodTint({ mood: 0 }, top, g), 'warm');
  assert.equal(moodTint({ mood: 0 }, 9, g), 'warm');
  assert.equal(moodTint({ mood: 1 }, 0, g), top > 1 ? 'none' : 'warm');
  assert.equal(moodTint({ mood: top - 1 }, 1, g), 'warm');
  assert.equal(moodTint({ mood: top }, 0, g), 'warm');
  assert.equal(moodTint({ mood: top }, 5, g), 'warm');
  for (let mood = 0; mood <= top; mood++) {
    for (let heard = 0; heard < 6; heard++) {
      const warm = mood >= top || mood + heard >= top;
      const expected = warm ? 'warm' : mood + heard === 0 ? 'hostile' : 'none';
      assert.equal(moodTint({ mood }, heard, g), expected);
      // tint agrees with the greeting shown
      assert.equal(warm, g.warm.includes(greeting({ mood }, heard, g)));
    }
  }
});

test('talk-hear raises the count by one and never past the ready beats', () => {
  const s = c.suspects[0];
  const len = setsFor(c)[s].thread.length;
  let p = emptyProgress();
  p = reduce(c, p, { type: 'talk-hear', suspect: s });
  assert.equal(p.talk?.[s], 1);
  const again = reduce(c, p, { type: 'talk-hear', suspect: s });
  assert.equal(again.talk?.[s], 1, 'beat 2 is not ready yet');
  p = { ...p, solved: true };
  for (let i = 0; i < 6; i++) p = reduce(c, p, { type: 'talk-hear', suspect: s });
  assert.equal(p.talk?.[s], len);
  assert.equal(reduce(c, emptyProgress(), { type: 'talk-hear', suspect: 'nobody' }).talk, undefined);
});

const ref = { mode: 'campaign', code: 'ABCDE', difficulty: 'easy' } as const;
const walk = (pickLast: boolean) => {
  const killer = campaignCast(content, ref).killer;
  const victims: string[] = [];
  const rounds: Case[] = [];
  for (let r = 0; r < 3; r++) {
    const rc = campaignRound(content, ref, victims);
    rounds.push(rc);
    const others = rc.suspects.filter((s) => s !== killer);
    victims.push(pickLast ? others[others.length - 1] : others[0]);
  }
  return rounds;
};

test('a campaign keeps each guest\'s card, thread and lines every round, whoever has been lost', () => {
  const rounds = walk(false);
  const first = setsFor(rounds[0]);
  for (const rc of rounds.slice(1)) {
    const later = setsFor(rc);
    for (const s of rc.suspects) {
      const fixed = (x: typeof first[string]) => ({ ...x, mood: 0, cold: false });
      assert.deepEqual(fixed(later[s]), fixed(first[s]));
    }
  }
});

test('campaign moods: the same whatever the killer or her choices, at most a step a round, in range', () => {
  const top = talk.greetings.cold.length;
  const a = walk(false);
  const b = walk(true); // a different wrong guess each round
  for (let r = 0; r < 3; r++) for (const s of a[r].suspects) if (b[r].suspects.includes(s)) assert.equal(setsFor(a[r])[s].mood, setsFor(b[r])[s].mood);
  for (let i = 0; i < 300; i++) {
    for (const s of ['cook', 'doctor']) {
      let prev = moodFor(`k${i}`, s, 0, s === 'cook' ? 0 : top, top);
      for (let r = 1; r < 3; r++) {
        const m = moodFor(`k${i}`, s, r, s === 'cook' ? 0 : top, top);
        assert.ok(Math.abs(m - prev) <= 1 && m >= 0 && m <= top);
        prev = m;
      }
    }
  }
});

test('mood shifts are about 50% stay, 25% warmer, 25% colder when not clamped', () => {
  const top = talk.greetings.cold.length;
  const mid = 1;
  const n = 4000;
  let up = 0;
  let down = 0;
  for (let i = 0; i < n; i++) {
    const m = moodFor(`m${i}`, 'cook', 1, mid, top);
    if (m > mid) up++;
    if (m < mid) down++;
  }
  assert.ok(Math.abs(up / n - 0.25) < 0.03, `up ${up / n}`);
  assert.ok(Math.abs(down / n - 0.25) < 0.03, `down ${down / n}`);
});

test('face lines: each pool has 8 distinct non-empty lines', () => {
  for (const [pool, lines] of Object.entries(faceLines)) {
    assert.equal(lines.length, 8, pool);
    assert.equal(new Set(lines).size, 8, pool);
    for (const l of lines) assert.ok(l.trim().length > 0 && !/[{}]/.test(l), pool);
  }
});
