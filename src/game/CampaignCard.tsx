import { useState } from 'react';
import { ROUNDS } from '../engine/campaign.ts';
import { DIFFICULTIES } from '../engine/settings.ts';
import type { Difficulty } from '../engine/types.ts';
import { Picker } from './AccusePanel.tsx';
import { DIFFICULTY_LABEL } from './Casebook.tsx';
import { ROUND_TIMES } from './CampaignView.tsx';
import { Dialog } from './Dialog.tsx';
import { currentRound, type CampaignSave } from './campaign.ts';

type Accusing = 'anyone' | 'possible';
const ACCUSING_LABEL: Record<Accusing, string> = { anyone: 'Anyone alive', possible: 'Only possible killers' };

interface Props {
  campaign: CampaignSave | null;
  onContinue: () => void;
  onStart: (difficulty: Difficulty, possibleOnly: boolean) => void;
}

/** The home screen's campaign card: the one in progress, and starting a fresh one. */
export function CampaignCard({ campaign, onContinue, onStart }: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>(campaign?.ref.difficulty ?? 'medium');
  const [accusing, setAccusing] = useState<Accusing>(campaign?.ref.possibleOnly ? 'possible' : 'anyone');
  const [confirming, setConfirming] = useState(false);
  const unfinished = campaign?.outcome === 'playing';
  const start = () => onStart(difficulty, accusing === 'possible');

  const status = !campaign
    ? null
    : campaign.outcome === 'caught'
      ? 'You caught the killer.'
      : campaign.outcome === 'escaped'
        ? 'The killer got away.'
        : `${ROUND_TIMES[currentRound(campaign)]}, round ${currentRound(campaign) + 1} of ${ROUNDS}. ${
            ROUNDS - campaign.victims.length
          } accusation${ROUNDS - campaign.victims.length === 1 ? '' : 's'} left.`;

  return (
    <article className="card">
      <h2>Campaign</h2>
      <p className="muted home-lead">
        One long mystery over a whole night: 7 guests, one killer. Name the wrong person and they're the next body; after
        three wrong guesses the killer gets away.
      </p>
      {campaign && (
        <div className="home-campaign">
          <p className="home-case">
            {DIFFICULTY_LABEL[campaign.ref.difficulty]} campaign {campaign.ref.code}
          </p>
          <p className="muted">{status}</p>
          <button className={unfinished ? 'primary' : 'secondary'} onClick={onContinue}>
            {unfinished ? 'Continue' : 'Look back at it'}
          </button>
        </div>
      )}
      <Picker
        legend="Difficulty"
        options={DIFFICULTIES}
        value={difficulty}
        onChange={(d) => setDifficulty(d as Difficulty)}
        name={(d) => DIFFICULTY_LABEL[d as Difficulty]}
      />
      <Picker
        legend="Who you can accuse"
        options={['anyone', 'possible']}
        value={accusing}
        onChange={(v) => setAccusing(v as Accusing)}
        name={(v) => ACCUSING_LABEL[v as Accusing]}
      />
      <button className={unfinished ? 'secondary' : 'primary'} onClick={() => (unfinished ? setConfirming(true) : start())}>
        Start a new campaign
      </button>

      {confirming && campaign && (
        <Dialog placement="center" labelId="new-campaign-title" onClose={() => setConfirming(false)}>
          <h2 id="new-campaign-title">Start a new campaign?</h2>
          <p className="dialog-text">Your campaign isn't over yet. A new one replaces it, with a new cast and killer.</p>
          <div className="dialog-actions">
            <button data-autofocus className="secondary" onClick={() => setConfirming(false)}>
              Keep playing
            </button>
            <button
              className="primary"
              onClick={() => {
                setConfirming(false);
                start();
              }}
            >
              Start new
            </button>
          </div>
        </Dialog>
      )}
    </article>
  );
}
