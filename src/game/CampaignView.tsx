import { useEffect, useMemo, useState } from 'react';
import { content } from '../content/index.ts';
import { ROUNDS, campaignCast } from '../engine/campaign.ts';
import type { Case } from '../engine/types.ts';
import { midSentence } from '../engine/text.ts';
import { AccusePanel } from './AccusePanel.tsx';
import { Casebook } from './Casebook.tsx';
import { Dialog } from './Dialog.tsx';
import { atMidnight } from './explore.ts';
import { DIFFICULTY_LABEL, ROUND_TIMES } from './labels.ts';
import { itemName, suspectName } from './names.ts';
import { NextMurder } from './NextMurder.tsx';
import { currentRound, pick, puzzlesLeft, stillPossible, updateRound, type CampaignSave, type Verdict } from './campaign.ts';
import { generate } from './caseClient.ts';
import { roundsKey } from './caseJobs.ts';
import { Shuffling } from './Shuffling.tsx';
import { reduce, unlockedClueIds, type Action, type Progress } from './state.ts';

interface Props {
  save: CampaignSave;
  onSave: (save: CampaignSave) => void;
  onHome: () => void;
}

/**
 * The campaign: one round at a time, earlier rounds to look back at, and what each accusation leads to.
 * The rounds are built in the background; this holds them and the pop-ups, which must outlast a rebuild.
 */
export function CampaignView({ save, onSave, onHome }: Props) {
  const [built, setBuilt] = useState<{ key: string; cases: Case[] } | null>(null);
  const [notice, setNotice] = useState<Verdict | null>(null);

  // Each round is rebuilt from the campaign and the victims before it; only rebuild when they change.
  const key = roundsKey(save);
  useEffect(() => {
    let live = true;
    generate({ kind: 'campaign-rounds', save }).then(
      (cases) => {
        if (live) setBuilt({ key, cases });
      },
      (err) => console.error(err),
    );
    return () => {
      live = false;
    };
    // `save` is covered by `key`: her progress doesn't change the rounds, so a move mustn't rebuild them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const ready = built && built.key === key ? built.cases : null;
  const now = currentRound(save);
  const victim = save.victims.at(-1);
  const killer = campaignCast(content, save.ref).killer;
  // When the killer escapes the round doesn't change, so the last built case has the weapon.
  const lastCase = built?.cases[Math.min(now, built.cases.length - 1)];

  return (
    <>
      {ready ? <CampaignRounds save={save} cases={ready} onSave={onSave} onHome={onHome} setNotice={setNotice} /> : <Shuffling />}

      {notice === 'next-body' && victim && (
        <NextMurder
          title={`${suspectName(victim)} wasn't the killer`}
          body={`Later that night, ${midSentence(suspectName(victim))} is found dead. The killer is still among the guests, and${
            ROUNDS - save.victims.length === 1 ? ' this is your last chance.' : ` you have ${ROUNDS - save.victims.length} accusations left.`
          }`}
          line={`Tap to go on to ${ROUND_TIMES[now].toLowerCase()}`}
          onContinue={() => {
            setNotice(null);
            window.scrollTo(0, 0);
          }}
        />
      )}
      {notice === 'escaped' && victim && lastCase && (
        <Dialog placement="center" labelId="escaped-title" onClose={() => setNotice(null)}>
          <h2 id="escaped-title">The killer got away</h2>
          <p className="dialog-text">
            {suspectName(victim)} wasn't the killer either. By dawn, {midSentence(suspectName(killer))} was gone, with the{' '}
            {itemName(lastCase.weapon)}.
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

interface RoundsProps extends Props {
  cases: Case[];
  setNotice: (verdict: Verdict) => void;
}

function CampaignRounds({ save, cases: built, onSave, onHome, setNotice }: RoundsProps) {
  // Every campaign round is explored: the scene is known from the start (a flag on the copy, not the engine's case).
  const cases = useMemo(() => built.map((rc): Case => ({ ...rc, explore: true })), [built]);
  const now = currentRound(save);
  const [viewing, setViewing] = useState(now);
  // A new round opens on that round (adjusted during render, not in an effect).
  const [shownNow, setShownNow] = useState(now);
  if (shownNow !== now) {
    setShownNow(now);
    setViewing(now);
  }

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

  // Who her clues, over every round so far, still allow as the killer (the "only possible killers" option
  // limits the Accuse tab to them). Only the clues she has found matter, so key the memo on those (save changes on every move).
  const foundKey = isNow
    ? cases
        .slice(0, now + 1)
        .map((rc, i) => {
          const p = save.rounds[i];
          return p ? [...unlockedClueIds(rc, p)].sort().join(',') : '-';
        })
        .join('|')
    : '';
  const possible = useMemo(
    () => (isNow ? stillPossible(content, save, cases.slice(0, now + 1)) : c.suspects),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- save is read only through the clues that foundKey summarises
    [isNow, foundKey, cases, now, c],
  );
  const allowed = save.ref.possibleOnly && isNow ? possible : c.suspects;

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
          You accused {midSentence(suspectName(save.victims[viewing]))}. They weren't the killer, and they were the next body.
        </p>
      </article>
    </section>
  ) : save.outcome === 'escaped' ? (
    <section className="panel">
      <article className="card verdict">
        <h2>The killer got away</h2>
        <p className="verdict-line">
          It was {midSentence(suspectName(killer))}, with the {itemName(c.weapon)}.
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
      stillPointing={possible.length}
      midnight={atMidnight(c, progress)}
      nextLabel="Back to the start"
    />
  );

  return (
    <Casebook
      key={`${save.ref.code}-${viewing}`}
      c={c}
      endBoard={save.ref.endBoard}
      progress={progress}
      onProgress={onProgress}
      onHome={onHome}
      onNewCase={onHome}
      title={ROUND_TIMES[viewing]}
      subtitle={`Round ${viewing + 1} of ${ROUNDS} · ${DIFFICULTY_LABEL[save.ref.difficulty]}${save.ref.perPuzzle ? `, ${save.ref.perPuzzle} clue${save.ref.perPuzzle === 1 ? '' : 's'} a puzzle` : ''}, ${c.suspects.length} guests${isNow && save.outcome === 'caught' ? ', solved' : ''}`}
      banner={tabs}
      gate={
        isNow && save.outcome === 'playing' && c.campaign
          ? { budget: c.campaign.budget, left: puzzlesLeft(save, c), picked: save.picked[now], onPick: (kind) => onSave(pick(save, c, kind)) }
          : undefined
      }
      accuse={accuse}
      readOnly={readOnly}
    />
  );
}
