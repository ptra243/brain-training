import type { History } from './history.ts';
import { DIFFICULTY_LABEL } from './labels.ts';
import { caseTitle } from './names.ts';
import { campaignRowLine, campaignTotalsSentence, effortLines, quickRowLine, quickTotalsSentence, wrongWeaponSentence } from './runRecord.ts';

interface Props {
  history: History;
  onHome: () => void;
}

/** "Your record": finished Quick cases and campaigns, each a totals line then the newest rows. */
export function RecordView({ history, onHome }: Props) {
  return (
    <div className="casebook">
      <header className="case-header">
        <button className="step" aria-label="Home" onClick={onHome}>
          ‹
        </button>
        <div className="case-title">
          <h1>Your record</h1>
        </div>
        <span aria-hidden="true" />
      </header>
      <main className="record-main">
        <article className="card record-section" data-testid="record-quick">
          <h2>Quick play</h2>
          {history.quick.length === 0 ? (
            <p className="muted">No finished cases yet.</p>
          ) : (
            <>
              <p className="record-totals">{quickTotalsSentence(history.quickTotals)}</p>
              <ul className="record-rows">
                {history.quick.map((r) => (
                  <li key={r.id}>
                    <p className="record-name">{caseTitle(r.ref)}</p>
                    <p className="muted">{quickRowLine(r)}</p>
                    <p className="muted">{effortLines(r)}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </article>
        <article className="card record-section" data-testid="record-campaign">
          <h2>Campaign</h2>
          {history.campaign.length === 0 ? (
            <p className="muted">No finished campaigns yet.</p>
          ) : (
            <>
              <p className="record-totals">{campaignTotalsSentence(history.campaignTotals)}</p>
              <ul className="record-rows">
                {history.campaign.map((r) => (
                  <li key={r.id}>
                    <p className="record-name">
                      {DIFFICULTY_LABEL[r.ref.difficulty]} campaign {r.ref.code}
                    </p>
                    <p className="muted">{campaignRowLine(r)}</p>
                    <p className="muted">{[effortLines(r), wrongWeaponSentence(r.wrongWeaponTries)].filter(Boolean).join(' ')}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </article>
      </main>
    </div>
  );
}
