import { ROUNDS } from '../engine/campaign.ts';
import { DIFFICULTY_LABEL } from './labels.ts';
import { ROUND_TIMES } from './labels.ts';
import { currentRound, type CampaignSave } from './campaign.ts';

interface Props {
  campaign: CampaignSave | null;
  onContinue: () => void;
  /** Open the campaign setup screen. */
  onNew: () => void;
  /** Open "Your record". */
  onRecord: () => void;
}

/** The home screen's campaign card: the one in progress, and a way to set up a fresh one. */
export function CampaignCard({ campaign, onContinue, onNew, onRecord }: Props) {
  const unfinished = campaign?.outcome === 'playing';

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
      <button className={unfinished ? 'secondary' : 'primary'} onClick={onNew}>
        New campaign
      </button>
      <button className="secondary home-record" onClick={onRecord}>
        Your record
      </button>
    </article>
  );
}
