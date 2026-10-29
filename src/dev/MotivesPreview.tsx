// The #dev/motives page: talk to any guest on any card, thread and mood without playing a case.
// Builds one CharacterSet by hand and renders the real TalkView. Nothing is saved.

import { useState, type CSSProperties, type ReactNode } from 'react';
import { content } from '../content/index.ts';
import { talk } from '../content/talk.ts';
import { greetingsFor, moodTop, startMood } from '../engine/sets.ts';
import { TalkView } from '../game/TalkSection.tsx';
import { suspectName } from '../game/names.ts';
import { moodTint } from '../game/talk.ts';

const guests = content.suspects.map((s) => s.id);
const DEFAULT_GUEST = guests.includes('financier') ? 'financier' : guests[0];
const control: CSSProperties = { display: 'block', width: '100%', minHeight: 44, font: 'inherit', boxSizing: 'border-box' };
const nameOf = (id: string) => suspectName(id, guests);
const cardName = (id: string) => id.replace(/-/g, ' ');
const firstOther = (guest: string) => guests.find((g) => g !== guest) ?? guest;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: '0.85rem' }}>{label}</span>
      {children}
    </label>
  );
}

interface State {
  guest: string;
  card: string;
  reversed: boolean;
  thread: string;
  victim: string;
  mood: number;
  games: number;
  solved: boolean;
  heard: number;
}

/** Defaults for a guest and card: the motive thread if there is one, mood as at a case start. */
function fresh(guest: string, card: string, reversed: boolean, keep?: Partial<State>): State {
  const hasMotive = talk.motives.some((e) => e.suspect === guest && e.card === card && e.reversed === reversed);
  return {
    guest,
    card,
    reversed,
    thread: hasMotive ? 'motive' : 'card-0',
    victim: firstOther(guest),
    mood: startMood(reversed, moodTop()),
    games: 0,
    solved: false,
    heard: 0,
    ...keep,
  };
}
const homeOf = (guest: string) => talk.suspects[guest].card;
const initial = () => fresh(DEFAULT_GUEST, homeOf(DEFAULT_GUEST), false);

export function MotivesPreview() {
  const [s, setS] = useState<State>(initial);
  const top = moodTop();
  const cards = [homeOf(s.guest), ...talk.suspects[s.guest].mayAlsoRoll];
  const reading = talk.cards[s.card][s.reversed ? 'reversed' : 'upright'];
  const motive = talk.motives.find((e) => e.suspect === s.guest && e.card === s.card && e.reversed === s.reversed);
  const threads: { key: string; label: string; beats: readonly string[]; asks?: readonly string[] }[] = [
    ...(motive ? [{ key: 'motive', label: 'Motive thread', beats: motive.thread, asks: motive.asks }] : []),
    ...reading.threads.map((beats, i) => ({ key: `card-${i}`, label: `Card thread ${i + 1}`, beats })),
  ];
  const chosen = threads.find((t) => t.key === s.thread) ?? threads[0];
  const beats = chosen.beats;
  const ready = s.solved ? beats.length : Math.min(beats.length, 1 + s.games);
  const set = { mood: s.mood, greetings: greetingsFor(talk, 'dev-motives', s.guest), thread: [...beats], asks: chosen.asks ?? null };
  const patch = (p: Partial<State>) => setS({ ...s, ...p });

  return (
    <main className="card" style={{ margin: '16px 12px 40px', display: 'grid', gap: 12 }}>
      <h1 style={{ margin: 0 }}>Motive threads</h1>
      <Field label="Guest">
        <select
          style={control}
          value={s.guest}
          onChange={(e) => setS(fresh(e.target.value, homeOf(e.target.value), false))}
        >
          {guests.map((id) => (
            <option key={id} value={id}>
              {nameOf(id)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Card">
        <select style={control} value={s.card} onChange={(e) => setS(fresh(s.guest, e.target.value, s.reversed, { victim: s.victim }))}>
          {cards.map((id) => (
            <option key={id} value={id}>
              {cardName(id)}
              {id === homeOf(s.guest) ? ' (home)' : ''}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Reading">
        <select
          style={control}
          value={s.reversed ? 'reversed' : 'upright'}
          onChange={(e) => setS(fresh(s.guest, s.card, e.target.value === 'reversed', { victim: s.victim }))}
        >
          <option value="upright">Upright</option>
          <option value="reversed">Reversed</option>
        </select>
      </Field>
      <Field label="Thread">
        <select style={control} value={chosen.key} onChange={(e) => patch({ thread: e.target.value, heard: 0 })}>
          {threads.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Victim">
        <select style={control} value={s.victim} onChange={(e) => patch({ victim: e.target.value })}>
          {guests
            .filter((g) => g !== s.guest)
            .map((id) => (
              <option key={id} value={id}>
                {nameOf(id)}
              </option>
            ))}
        </select>
      </Field>
      <Field label={`Mood this round (0 coldest, ${top} warm)`}>
        <select style={control} value={s.mood} onChange={(e) => patch({ mood: Number(e.target.value) })}>
          {Array.from({ length: top + 1 }, (_, m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Games finished (0 to 5)">
        <input
          style={control}
          type="number"
          min={0}
          max={5}
          value={s.games}
          onChange={(e) => patch({ games: Math.max(0, Math.min(5, Math.floor(Number(e.target.value)) || 0)) })}
        />
      </Field>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
        <input
          type="checkbox"
          style={{ width: 44, height: 44, margin: 0 }}
          checked={s.solved}
          onChange={(e) => patch({ solved: e.target.checked })}
        />
        Case solved
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button className="secondary" onClick={() => patch({ heard: 0 })}>
          Start over
        </button>
        <button className="secondary" onClick={() => patch({ heard: beats.length })}>
          Hear all
        </button>
        <button className="secondary" onClick={() => setS(initial())}>
          Reset
        </button>
      </div>
      <TalkView
        set={set}
        heard={s.heard}
        ready={ready}
        victimName={nameOf(s.victim)}
        onHear={() => patch({ heard: s.heard + 1 })}
      />
      <p style={{ margin: 0, fontSize: '0.85rem' }}>
        {chosen.key === 'motive' ? 'Motive thread' : 'Card thread'} in use. Portrait tint:{' '}
        {moodTint(set, s.heard, set.greetings)}. {ready} of {beats.length} beats ready.
      </p>
    </main>
  );
}
