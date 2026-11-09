import { useEffect, useEffectEvent, useState } from 'react';
import { createPortal } from 'react-dom';
import { generate } from '../game/caseClient.ts';
import { Dialog } from '../game/Dialog.tsx';
import { DIFFICULTY_LABEL } from '../game/labels.ts';
import { Shuffling } from '../game/Shuffling.tsx';
import { loadCampaign, saveCampaign } from '../game/storage.ts';
import {
  ACCUSING_LABEL,
  ACCUSING_OPTIONS,
  DIFFICULTY_OPTIONS,
  FINISHES,
  FINISH_HINT,
  FINISH_LABEL,
  PER_PUZZLE_LABEL,
  PER_PUZZLE_LEAD,
  PER_PUZZLE_OPTIONS,
  TITLE_HEADING,
  TITLE_LEAD,
  initialChoices,
  replacesUnfinished,
  startJob,
  stepOption,
  type Choices,
} from './campaignTitle.ts';
import book from './OpenBook.module.css';
import styles from './CampaignTitle.module.css';

/** The seal breaks for about this long before the book turns. */
const SEAL_MS = 400;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** One printed line she fills in: a radio group of 44px choices. */
function Line<T extends string | number>({ legend, options, value, label, onChange }: { legend: string; options: readonly T[]; value: T; label: (o: T) => string; onChange: (o: T) => void }) {
  const onKey = (e: React.KeyboardEvent) => {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = stepOption(options, value, dir);
    onChange(next);
    (e.currentTarget.querySelector(`[data-v="${String(next)}"]`) as HTMLElement | null)?.focus();
  };
  return (
    <div className={styles.line} role="radiogroup" aria-label={legend} onKeyDown={onKey}>
      <span className={styles.legend} aria-hidden="true">
        {legend}
      </span>
      <div className={styles.choices}>
        {options.map((o) => (
          <button key={String(o)} type="button" role="radio" aria-checked={o === value} data-v={String(o)} tabIndex={o === value ? 0 : -1} className={styles.choice} onClick={() => onChange(o)}>
            {label(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

interface Props {
  /** The page turns away (the seal is broken and the campaign is saved). */
  turning: boolean;
  /** The seal is broken and the campaign saved: the book moves on to chapter one. */
  onStarted: () => void;
  /** Leave for the shelf. */
  onBack: () => void;
}

/**
 * The New campaign book's title page: difficulty as three ribbon bookmarks, the other three options as
 * printed lines, and a wax seal to break. Making the campaign is `App.startCampaign`'s job and save, so
 * either shell carries it on. Nothing is saved until the build succeeds.
 */
export function CampaignTitle({ turning, onStarted, onBack }: Props) {
  // Her last campaign sets where the choices start; read once.
  const [last] = useState(() => loadCampaign());
  const [choices, setChoices] = useState<Choices>(() => initialChoices(last));
  const [status, setStatus] = useState<'idle' | 'building' | 'breaking' | 'failed'>('idle');
  const [confirming, setConfirming] = useState(false);
  const set = <K extends keyof Choices>(key: K, value: Choices[K]) => setChoices((c) => ({ ...c, [key]: value }));

  const begin = () => {
    if (status === 'building' || status === 'breaking') return;
    setStatus('building');
    generate(startJob(choices)).then(
      (made) => {
        saveCampaign(made.save);
        setStatus('breaking');
      },
      (err) => {
        console.error(err);
        setStatus('failed');
      },
    );
  };

  const started = useEffectEvent(() => onStarted());
  useEffect(() => {
    if (status !== 'breaking') return;
    const timer = setTimeout(() => started(), reducedMotion() ? 0 : SEAL_MS);
    return () => clearTimeout(timer);
  }, [status]);

  const busy = status === 'building' || status === 'breaking';
  return (
    <div className={`${styles.title} ${turning ? styles.turning : ''}`} data-testid="campaign-title" data-noswipe>
      <div className={styles.paper}>
        <p className={styles.kicker}>New campaign</p>
        <h2 className={styles.heading}>{TITLE_HEADING}</h2>
        <p className={styles.lead}>{TITLE_LEAD}</p>

        <div className={styles.ribbons} role="radiogroup" aria-label="Difficulty" onKeyDown={(e) => {
          const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
          if (!dir) return;
          e.preventDefault();
          const next = stepOption(DIFFICULTY_OPTIONS, choices.difficulty, dir);
          set('difficulty', next);
          (e.currentTarget.querySelector(`[data-v="${next}"]`) as HTMLElement | null)?.focus();
        }}>
          {DIFFICULTY_OPTIONS.map((d, i) => (
            <div key={d} className={styles.slot}>
              <button
                type="button"
                role="radio"
                aria-checked={d === choices.difficulty}
                data-v={d}
                tabIndex={d === choices.difficulty ? 0 : -1}
                className={`${styles.ribbon} ${book.satin} ${d === choices.difficulty ? styles.down : ''}`}
                data-i={i}
                onClick={() => set('difficulty', d)}
              >
                {DIFFICULTY_LABEL[d]}
              </button>
            </div>
          ))}
        </div>

        <div className={styles.lines}>
          <Line legend="Clues per puzzle" options={PER_PUZZLE_OPTIONS} value={choices.perPuzzle} label={(o) => PER_PUZZLE_LABEL[o]} onChange={(o) => set('perPuzzle', o)} />
          <p className={styles.hint}>{PER_PUZZLE_LEAD}</p>
          <Line legend="Who you can accuse" options={ACCUSING_OPTIONS} value={choices.accusing} label={(o) => ACCUSING_LABEL[o]} onChange={(o) => set('accusing', o)} />
          <Line legend="Final puzzle" options={FINISHES} value={choices.finish} label={(o) => FINISH_LABEL[o]} onChange={(o) => set('finish', o)} />
          <p className={styles.hint}>{FINISH_HINT[choices.finish]}</p>
        </div>

        {status === 'failed' ? (
          <div className={styles.failed} role="alert">
            <p>That campaign wouldn&apos;t deal. Go back to the shelf and try again.</p>
            <button type="button" className={styles.back} onClick={onBack}>
              Back to the shelf
            </button>
          </div>
        ) : null}

        <button type="button" className={`${styles.seal} ${status === 'breaking' ? styles.broken : ''}`} disabled={busy} onClick={() => (replacesUnfinished(last) ? setConfirming(true) : begin())}>
          <span className={styles.wax} aria-hidden="true" />
          <span>Break the seal</span>
        </button>
      </div>

      {confirming && (
        <Dialog placement="center" labelId="new-campaign-title" onClose={() => setConfirming(false)}>
          <h2 id="new-campaign-title">Start a new campaign?</h2>
          <p className="dialog-text">Your campaign isn&apos;t over yet. A new one replaces it, with a new cast and killer.</p>
          <div className="dialog-actions">
            <button data-autofocus className="secondary" onClick={() => setConfirming(false)}>
              Keep playing
            </button>
            <button
              className="primary"
              onClick={() => {
                setConfirming(false);
                begin();
              }}
            >
              Start new
            </button>
          </div>
        </Dialog>
      )}
      {/* On the body: the flying book's transform would otherwise hold this fixed overlay inside it. */}
      {status === 'building' ? createPortal(<Shuffling />, document.body) : null}
    </div>
  );
}
