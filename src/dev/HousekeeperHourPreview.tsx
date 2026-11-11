// #dev/housekeeper: the Housekeeper's hour as a playable text prototype. Nothing is saved.
// All the rules live in src/games/housekeeperHour.ts; this holds her moves and which screen she is on.

import { useState } from 'react';
import { housekeeperHour as hour } from '../content/housekeeperHour.ts';
import { content } from '../content/index.ts';
import { campaignHouseId, campaignRound, type CampaignRef } from '../engine/campaign.ts';
import { generateCase } from '../engine/generate.ts';
import type { Case, Difficulty } from '../engine/types.ts';
import { buildEvening, eveningInput, reportFor, statementFor, ROUNDS, JOBS, type Evening, type Moves } from '../games/housekeeperHour.ts';
import styles from './HousekeeperHourPreview.module.css';

const TIMES = ['8:00', '8:15', '8:30'];
const DEFAULT_REF = 'case-1-easy';

function caseFromRef(text: string): Case | null {
  const t = text.trim();
  const num = /^(?:case-)?(\d+)-(easy|medium|hard)$/.exec(t);
  if (num) return generateCase(content, Number(num[1]), num[2] as Difficulty);
  const camp = /^campaign-([A-Z0-9]{5})-(easy|medium|hard)$/.exec(t);
  if (camp) {
    const ref: CampaignRef = { mode: 'campaign', code: camp[1], difficulty: camp[2] as Difficulty };
    return campaignRound(content, { ...ref, houseId: campaignHouseId(ref) }, []);
  }
  return null;
}

interface Deal {
  ref: string;
  evening: Evening | null;
  error: string | null;
}

function deal(ref: string): Deal {
  const c = caseFromRef(ref);
  if (!c) return { ref, evening: null, error: 'I can’t read that code. Try case-1-easy.' };
  const input = eveningInput(c, hour);
  if (!input) return { ref, evening: null, error: 'The Housekeeper isn’t at this dinner.' };
  return { ref, evening: buildEvening(hour, input), error: null };
}

const staffName = (id: string) => hour.staff.find((s) => s.id === id)?.name ?? id;
const noticeOf = (kind: string) => (kind === 'gossip' ? 'hears things' : kind === 'detail' ? 'notices details' : 'fixes things');

type Phase = 'plan' | 'reports' | 'statement';

export function HousekeeperHourPreview() {
  const [text, setText] = useState(DEFAULT_REF);
  const [current, setCurrent] = useState<Deal>(() => deal(DEFAULT_REF));
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('plan');
  const [draft, setDraft] = useState<(string | null)[]>(() => Array(JOBS).fill(null));
  const [sends, setSends] = useState<string[][]>([]);
  const [ticks, setTicks] = useState<(number | null)[]>([]);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [checked, setChecked] = useState(false);

  const startOver = () => {
    setRound(0);
    setPhase('plan');
    setDraft(Array(JOBS).fill(null));
    setSends([]);
    setTicks([]);
    setAnswers([]);
    setChecked(false);
  };

  const doDeal = (ref: string) => {
    setCurrent(deal(ref.trim()));
    startOver();
  };

  const nextSeated = () => {
    const m = /^(?:case-)?(\d+)-(easy|medium|hard)$/.exec(text.trim());
    if (!m) return;
    for (let n = Number(m[1]) + 1; n < Number(m[1]) + 400; n++) {
      const ref = `case-${n}-${m[2]}`;
      const d = deal(ref);
      if (d.evening) {
        setText(ref);
        setCurrent(d);
        startOver();
        return;
      }
    }
  };

  const evening = current.evening;
  const nameOf = (id: string) => evening?.names[id] ?? id;
  const roomOf = (r: number, j: number) => {
    const job = evening!.rounds[r][j];
    return evening!.roomNames[job.room] ?? job.room;
  };

  const pick = (job: number, staffId: string) => {
    setDraft((d) => d.map((cur, k) => (k === job ? (cur === staffId ? null : staffId) : cur === staffId ? null : cur)));
  };

  const send = () => {
    setSends((s) => [...s.slice(0, round), draft as string[]]);
    setPhase('reports');
  };

  const tick = (job: number) => {
    setTicks((t) => {
      const next = [...t];
      while (next.length < ROUNDS) next.push(null);
      next[round] = next[round] === job ? null : job;
      return next;
    });
  };

  const next = () => {
    if (round + 1 < ROUNDS) {
      setRound(round + 1);
      setDraft(Array(JOBS).fill(null));
      setPhase('plan');
    } else {
      setPhase('statement');
    }
  };

  const moves: Moves = { sends, ticks: Array.from({ length: ROUNDS }, (_, r) => ticks[r] ?? null), answers: answers as string[] };

  const header = (
    <>
      <h1>The Housekeeper’s hour</h1>
      <div className={styles.dealRow}>
        <input aria-label="Case code" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} autoCapitalize="off" />
        <button type="button" className={`${styles.btn} ${styles.primary}`} onClick={() => doDeal(text)}>
          Deal
        </button>
      </div>
    </>
  );

  if (!evening) {
    return (
      <main className={styles.page} data-testid="housekeeper">
        {header}
        <p className={styles.muted}>{current.error}</p>
        <button type="button" className={styles.btn} onClick={nextSeated}>
          Next case she is in
        </button>
      </main>
    );
  }

  let body;
  if (phase === 'plan') {
    const ready = draft.every((d) => d !== null);
    body = (
      <>
        <h2>{TIMES[round]}</h2>
        <p className={styles.muted}>Pick someone for each job. Each person can only do one.</p>
        {evening.rounds[round].map((job, j) => {
          const def = hour.requests.find((d) => d.id === job.request)!;
          return (
            <section key={j} className={styles.card} aria-label={`Job ${j + 1}`}>
              <h3>{nameOf(job.guest)}</h3>
              <p className={styles.room}>
                {roomOf(round, j)}: “{def.words}”
              </p>
              <div className={styles.staffRow}>
                {hour.staff.map((s) => {
                  const on = draft[j] === s.id;
                  const busy = !on && draft.includes(s.id);
                  return (
                    <button key={s.id} type="button" aria-pressed={on} className={`${styles.staff} ${on ? styles.staffOn : ''} ${busy ? styles.staffBusy : ''}`} onClick={() => pick(j, s.id)}>
                      {s.name}
                      <small>{noticeOf(s.kind)}</small>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
        <button type="button" className={`${styles.btn} ${styles.primary}`} disabled={!ready} onClick={send}>
          Send them
        </button>
      </>
    );
  } else if (phase === 'reports') {
    const cur = sends[round];
    body = (
      <>
        <h2>{TIMES[round]}: what they said</h2>
        <p className={styles.muted}>Tap the one you want to remember.</p>
        {cur.map((staffId, j) => {
          const rep = reportFor(hour, evening, round, j, staffId);
          const on = ticks[round] === j;
          return (
            <button key={j} type="button" aria-pressed={on} className={`${styles.card} ${styles.reportCard} ${on ? styles.ticked : ''}`} onClick={() => tick(j)}>
              <div className={styles.who}>
                {staffName(staffId)} went to {nameOf(evening.rounds[round][j].guest).replace(/^The /, 'the ')} in the {roomOf(round, j).toLowerCase()}.
              </div>
              {rep.mismatch ? <p className={styles.mismatch}>{rep.mismatch}</p> : null}
              <p className={styles.scene}>{rep.scene}</p>
              <p className={styles.bubble}>“{rep.line}”</p>
              {on ? <div className={styles.tick}>I’ll remember that.</div> : null}
            </button>
          );
        })}
        <button type="button" className={`${styles.btn} ${styles.primary}`} disabled={ticks[round] == null} onClick={next}>
          {round + 1 < ROUNDS ? 'Next' : 'Write my statement'}
        </button>
      </>
    );
  } else {
    const lines = statementFor(hour, evening, { ...moves, answers: answers.map((a) => a ?? '') as string[] }).map((l, i) => ({ ...l, chosen: answers[i] ?? null }));
    const allAnswered = lines.every((l) => l.chosen);
    const right = lines.filter((l) => l.chosen === l.answer).length;
    body = (
      <>
        <h2>Your questions</h2>
        {lines.map((l, i) => (
          <section key={i} className={styles.card} aria-label={`Statement line ${i + 1}`}>
            <p className={styles.question}>{l.question}</p>
            <p className={styles.sentence}>
              {l.before}
              <span className={styles.blank}>{l.chosen ?? '    '}</span>
              {l.after}
            </p>
            <div className={styles.options}>
              {l.options.map((o) => (
                <button
                  key={o}
                  type="button"
                  aria-pressed={l.chosen === o}
                  className={`${styles.opt} ${l.chosen === o ? styles.optOn : ''}`}
                  onClick={() => {
                    setChecked(false);
                    setAnswers((a) => {
                      const n = Array.from({ length: lines.length }, (_, k) => a[k] ?? null);
                      n[i] = o;
                      return n;
                    });
                  }}
                >
                  {o}
                </button>
              ))}
            </div>
            {checked ? (l.chosen === l.answer ? <p className={styles.right}>Right.</p> : <p className={styles.wrong}>No… I remember now. It was {l.answer}.</p>) : null}
            {checked && l.follow ? <p className={styles.follow}>{l.follow}</p> : null}
          </section>
        ))}
        {checked ? (
          <section className={styles.card} aria-label="The ending">
            <p className={styles.endLine}>That fits what I have.</p>
            {evening.clues.map((c, i) => (
              <div key={i} className={styles.clueCard}>
                <h3>New clue</h3>
                <p>{c.text}</p>
              </div>
            ))}
            <p className={styles.muted}>In a case, these are the clues this game would give you.</p>
            <p className={styles.endLine}>
              You remembered {right} of {lines.length}.
            </p>
          </section>
        ) : null}
        <div className={styles.actions}>
          {checked ? null : (
            <button type="button" className={`${styles.btn} ${styles.primary}`} disabled={!allAnswered} onClick={() => setChecked(true)}>
              Check my statement
            </button>
          )}
          <button type="button" className={styles.btn} onClick={startOver}>
            Start over
          </button>
        </div>
      </>
    );
  }

  return (
    <main className={styles.page} data-testid="housekeeper">
      {header}
      {body}
    </main>
  );
}
