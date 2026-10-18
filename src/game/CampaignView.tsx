import { useEffect, useMemo, useState } from 'react';
import { content } from '../content/index.ts';
import { ROUNDS, campaignCast } from '../engine/campaign.ts';
import { AccusePanel } from './AccusePanel.tsx';
import { Casebook, DIFFICULTY_LABEL } from './Casebook.tsx';
import { Dialog } from './Dialog.tsx';
import { itemName, suspectName } from './names.ts';
import { currentRound, pick, puzzlesLeft, roundCase, stillPossible, updateRound, type CampaignSave, type Verdict } from './campaign.ts';
import { reduce, type Action, type Progress } from './state.ts';

/** When each round's body is found. */
export const ROUND_TIMES = ['9pm', 'Midnight', '3am'];

const lower = (name: string) => name.replace(/^The /, 'the ');

interface Props {
  save: CampaignSave;
  onSave: (save: CampaignSave) => void;
  onHome: () => void;
}

/** The campaign: one round at a time, earlier rounds to look back at, and what each accusation leads to. */
export function CampaignView({ save, onSave, onHome }: Props) {
  const now = currentRound(save);
  const [viewing, setViewing] = useState(now);
  const [notice, setNotice] = useState<Verdict | null>(null);
  useEffect(() => setViewing(now), [now]);

  // Each round is rebuilt from the campaign and the victims before it; only rebuild when they change.
  const victimsKey = save.victims.join('|');
  const cases = useMemo(
    () => save.rounds.map((_, i) => roundCase(content, save, i)),
    [save.ref.code, save.ref.difficulty, victimsKey, save.rounds.length],
  );
  const c = cases[viewing];
  const progress = save.rounds[viewing];
  const isNow = viewing === now;
  const readOnly = !isNow || save.outcome === 'escaped';

  const onProgress = (update: (p: Progress) => Progress) => {
    if (readOnly) return;
    const { save: next, verdict } = updateRound(save, cases[now], update(save.rounds[now]));
    onSave(next);
    if (verdict === 'next-body' || verdict === 'escaped') setNotice(verdict);
  };
  const dispatch = (a: Action) => onProgress((p) => reduce(c, p, a));

  // The "only possible killers" option: who her clues, over every round so far, still allow.
  const allowed = useMemo(
    () => (save.ref.possibleOnly && isNow ? stillPossible(content, save, cases.slice(0, now + 1)) : c.suspects),
    [save, cases, now, isNow, c],
  );

  const tabs = (
    <nav className="round-tabs" aria-label="Rounds">
      {ROUND_TIMES.slice(0, ROUNDS).map((time, i) => (
        <button
          key={time}
          className="chip"
          aria-pressed={i === viewing}
          disabled={i >= save.rounds.length}
          onClick={() => {
            setViewing(i);
            window.scrollTo(0, 0);
          }}
        >
          {time}
        </button>
      ))}
    </nav>
  );

  const killer = campaignCast(content, save.ref).killer;
  const accuse = !isNow ? (
    <section className="panel">
      <article className="card verdict">
        <h2>{ROUND_TIMES[viewing]}: the wrong person</h2>
        <p className="verdict-line">
          You accused {lower(suspectName(save.victims[viewing]))}. They weren't the killer, and they were the next body.
        </p>
      </article>
    </section>
  ) : save.outcome === 'escaped' ? (
    <section className="panel">
      <article className="card verdict">
        <h2>The killer got away</h2>
        <p className="verdict-line">
          It was {lower(suspectName(killer))}, with the {itemName(c.weapon)}.
        </p>
        <p className="muted">Three wrong guesses, and by dawn they were gone.</p>
        <button className="primary" onClick={onHome}>
          Back to the start
        </button>
      </article>
    </section>
  ) : (
    <AccusePanel
      c={c}
      progress={progress}
      dispatch={dispatch}
      onNextCase={onHome}
      campaign
      suspects={allowed}
      nextLabel="Back to the start"
    />
  );

  const victim = save.victims.at(-1);
  return (
    <>
      <Casebook
        key={`${save.ref.code}-${viewing}`}
        c={c}
        progress={progress}
        onProgress={onProgress}
        onHome={onHome}
        onNewCase={onHome}
        title={ROUND_TIMES[viewing]}
        subtitle={`Round ${viewing + 1} of ${ROUNDS} · ${DIFFICULTY_LABEL[save.ref.difficulty]}, ${c.suspects.length} guests${isNow && save.outcome === 'caught' ? ', solved' : ''}`}
        banner={tabs}
        gate={
          isNow && save.outcome === 'playing' && c.campaign
            ? { budget: c.campaign.budget, left: puzzlesLeft(save, c), picked: save.picked[now], onPick: (kind) => onSave(pick(save, c, kind)) }
            : undefined
        }
        accuse={accuse}
        readOnly={readOnly}
      />

      {notice === 'next-body' && victim && (
        <Dialog placement="center" labelId="next-body-title" onClose={() => setNotice(null)}>
          <h2 id="next-body-title">{suspectName(victim)} wasn't the killer</h2>
          <p className="dialog-text">
            Later that night, {lower(suspectName(victim))} is found dead. The killer is still among the guests, and
            {ROUNDS - save.victims.length === 1 ? ' this is your last chance.' : ` you have ${ROUNDS - save.victims.length} accusations left.`}
          </p>
          <div className="dialog-actions single">
            <button
              data-autofocus
              className="primary"
              onClick={() => {
                setNotice(null);
                window.scrollTo(0, 0);
              }}
            >
              On to {ROUND_TIMES[now].toLowerCase()}
            </button>
          </div>
        </Dialog>
      )}
      {notice === 'escaped' && victim && (
        <Dialog placement="center" labelId="escaped-title" onClose={() => setNotice(null)}>
          <h2 id="escaped-title">The killer got away</h2>
          <p className="dialog-text">
            {suspectName(victim)} wasn't the killer either. By dawn, {lower(suspectName(killer))} was gone, with the{' '}
            {itemName(c.weapon)}.
          </p>
          <div className="dialog-actions single">
            <button data-autofocus className="primary" onClick={() => setNotice(null)}>
              See the case
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
