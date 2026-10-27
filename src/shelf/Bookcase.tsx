import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { caseTitle } from '../game/names.ts';
import { loadCampaign, loadQuick } from '../game/storage.ts';
import { OpenBook, type Box, type Tone } from './OpenBook.tsx';
import styles from './Shelf.module.css';

/** The book she has taken down: which one, what it says, and where it stood. */
interface Taken {
  id: 'quick' | 'new';
  title: string;
  tone: Tone;
  from: Box;
}

/** The title on the "New case" prototype page. */
const NEW_CASE_TITLE = 'The Orchid Room';

// Nothing on this screen is drawn yet beyond the shelf itself, so every control goes here.
const SOON = '#shelf/soon';

const ROUND_TITLES = ['9pm', 'Midnight', '3am'];
const ROUNDS = 3;

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

interface SpineProps {
  label: string;
  title: string;
  /** Spine width in px and title size in px. */
  width: number;
  size: number;
  className: string;
  out?: boolean;
  /** Lay a long title flat and let it wrap, instead of running it up the spine. */
  flat?: boolean;
  /** Takes the book down in place (no address change). Without it the link goes to `#shelf/soon`. */
  onOpen?: (e: MouseEvent<HTMLAnchorElement>) => void;
  /** Hidden while its case page is open. */
  gone?: boolean;
  children?: ReactNode;
}

/** One book: the whole spine is a link. */
function Spine({ label, title, width, size, className, out, flat, onOpen, gone, children }: SpineProps) {
  return (
    <a href={SOON} aria-label={label} onClick={onOpen} className={cx(styles.spine, className, out && styles.out, gone && styles.gone)} style={{ width }}>
      <span aria-hidden="true" className={styles.rule} />
      <span className={cx(styles.spineTitle, flat && styles.flat)} style={{ fontSize: size }}>
        {title}
      </span>
      {children}
      {out ? <span aria-hidden="true" className={styles.rule} /> : null}
      {out ? <span aria-hidden="true" className={styles.ribbon} /> : null}
    </a>
  );
}

/** A thin decorative spine: not a button. */
const thin = (width: number, height: number, background: string, extra?: string) => (
  <span aria-hidden="true" className={cx(styles.thin, extra)} style={{ width, height, background }} />
);

const Seal = () => <span aria-hidden="true" className={styles.seal} />;


function Candle({ lit }: { lit: boolean }) {
  return (
    <svg width="12" height="20" viewBox="0 0 12 20" aria-hidden="true">
      {lit ? <path d="M6 0c2.6 3.4 2.6 5.6 0 7.6-2.6-2-2.6-4.2 0-7.6z" fill="#f6c453" /> : null}
      <rect x="3" y="8" width="6" height="12" rx="1" fill={lit ? '#f4ead2' : '#8b7a8c'} />
    </svg>
  );
}

function Cat() {
  return (
    <svg className={styles.cat} width="74" height="34" viewBox="0 0 74 34" aria-hidden="true">
      <path d="M58 26c10 0 16-3 14-9-1-3-4-3-5-1 1 3-2 5-9 5z" fill="#d9792b" />
      <ellipse cx="34" cy="23" rx="28" ry="10" fill="#e8923a" />
      <path d="M22 15l3 8M32 14l1 9M42 15l-1 8" stroke="#c46a1f" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="12" cy="21" r="9" fill="#ee9b44" />
      <path d="M5 15 4 6l7 5zM15 12l6-6 1 9z" fill="#ee9b44" />
      <path d="M6 20q2.5 2 5 0" stroke="#6a3410" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M13 21q2.5 2 5 0" stroke="#6a3410" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="11.5" cy="24.5" r="1.2" fill="#c9605a" />
    </svg>
  );
}

function Window() {
  return (
    <svg className={styles.window} width="38" height="46" viewBox="0 0 38 46" aria-hidden="true">
      <path d="M3 45V17C3 8 10 2 19 2s16 6 16 15v28z" fill="#8a5a2b" />
      <path d="M7 41V17C7 10.5 12 6 19 6s12 4.5 12 11v24z" fill="#2f4a6e" />
      <path d="M19 6v35M7 24h24" stroke="#8a5a2b" strokeWidth="2.4" />
      <path d="M26 12l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z" fill="#f6e3a1" />
      <rect x="1" y="43" width="36" height="3" rx="1" fill="#6f4520" />
    </svg>
  );
}

function Teacup() {
  return (
    <svg className={styles.teacup} width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
      <path d="M13 8c-3-3 3-5 0-8M19 9c-3-3 3-5 0-9" stroke="#e9dcc0" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M6 14h22v7a11 10 0 0 1-22 0z" fill="#f4ecd8" />
      <path d="M28 16h3a4 4 0 0 1 0 8h-4" stroke="#f4ecd8" strokeWidth="2.4" fill="none" />
      <path d="M6 17h22" stroke="#c0883f" strokeWidth="1.6" />
      <ellipse cx="17" cy="35" rx="15" ry="3.4" fill="#e3d6b8" />
    </svg>
  );
}

function SlimCandle() {
  return (
    <svg className={styles.slim} width="22" height="72" viewBox="0 0 22 72" aria-hidden="true">
      <path d="M11 0c4 5 4 9 0 12-4-3-4-7 0-12z" fill="#f6c453" />
      <rect x="8" y="14" width="6" height="42" rx="1" fill="#f4ead2" />
      <path d="M11 56v8M5 66h12M2 72h18" stroke="#c9a24a" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** The library: one honey-oak bookcase. Her save is only read, to see which books stick out. */
export function Bookcase() {
  const quick = loadQuick();
  const campaign = loadCampaign();
  const playing = campaign?.outcome === 'playing' ? campaign : null;
  const round = playing ? Math.min(Math.max(playing.rounds.length, 1), ROUNDS) : 0;
  const roundTitle = ROUND_TITLES[round - 1];

  // Opening a book is React state, never a hash change: `main.tsx` reloads on every hashchange.
  const [taken, setTaken] = useState<Taken | null>(null);
  const trigger = useRef<HTMLAnchorElement | null>(null);

  const take = (e: MouseEvent<HTMLAnchorElement>, id: Taken['id'], title: string, tone: Tone) => {
    e.preventDefault();
    trigger.current = e.currentTarget;
    const r = e.currentTarget.getBoundingClientRect(); // before the book is hidden
    setTaken({ id, title, tone, from: { left: r.left, top: r.top, width: r.width, height: r.height } });
  };

  // Back on the shelf: put focus on the book she took down.
  useEffect(() => {
    if (taken === null) trigger.current?.focus({ preventScroll: true });
  }, [taken]);

  return (
    <>
    <main className={styles.page} inert={taken !== null}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <h1 className={styles.title}>Casebook</h1>
          <p className={styles.lede}>Take a book off the shelf.</p>
        </div>
        <Window />
      </header>

      <div className={styles.case}>
        <Cat />

        <section className={styles.unit} aria-labelledby="shelf-quick">
          <div className={styles.shelf}>
            {quick ? (
              <Spine
                label={`Your case, ${caseTitle(quick.ref)}: continue`}
                title={caseTitle(quick.ref)}
                width={80}
                size={15}
                className={styles.quickBook}
                out
                flat
                onOpen={(e) => take(e, 'quick', caseTitle(quick.ref), 'quick')}
                gone={taken?.id === 'quick'}
              />
            ) : null}
            <Spine
              label="New case"
              title="New case"
              width={64}
              size={14}
              className={cx(styles.newCase, styles.cover)}
              onOpen={(e) => take(e, 'new', NEW_CASE_TITLE, 'fresh')}
              gone={taken?.id === 'new'}
            >
              <Seal />
            </Spine>
            <span className={styles.stack}>
              <a href={SOON} aria-label="Choose your games" title="Choose your games" className={styles.frame}>
                <span aria-hidden="true" className={cx(styles.fanCard, styles.fanLeft)} />
                <span aria-hidden="true" className={cx(styles.fanCard, styles.fanRight)} />
                <span aria-hidden="true" className={cx(styles.fanCard, styles.fanMid)} />
              </a>
              <span aria-hidden="true" className={styles.flatBook} style={{ background: '#a0343a' }} />
              <span aria-hidden="true" className={styles.flatBook} style={{ background: '#6d2a35', width: 52 }} />
              <span aria-hidden="true" className={styles.flatBook} style={{ background: '#c26a4a', width: 58 }} />
            </span>
            {thin(15, 100, '#c97b7b')}
            {thin(13, 118, '#3f8a8a')}
            {thin(16, 110, '#8aa56a')}
            {thin(14, 96, '#e7d9b5', styles.diamond)}
          </div>
          <div className={styles.board}>
            <h2 id="shelf-quick" className={styles.plaque}>
              QUICK PLAY
            </h2>
          </div>
        </section>

        <section className={styles.unit} aria-labelledby="shelf-campaign">
          <div className={styles.shelf}>
            {playing ? (
              <Spine label={`Your campaign, ${roundTitle}, round ${round} of ${ROUNDS}: continue`} title={roundTitle} width={70} size={17} className={styles.campaignBook} out>
                <span className={styles.of}>
                  {round} of {ROUNDS}
                </span>
                <span aria-hidden="true" className={styles.candles}>
                  {ROUND_TITLES.map((t, i) => (
                    <Candle key={t} lit={i < round} />
                  ))}
                </span>
              </Spine>
            ) : null}
            <Spine label="New campaign" title="New campaign" width={64} size={13} className={cx(styles.newCampaign, styles.cover)}>
              <Seal />
            </Spine>
            <Teacup />
            <SlimCandle />
          </div>
          <div className={styles.board}>
            <h2 id="shelf-campaign" className={styles.plaque}>
              CAMPAIGN
            </h2>
          </div>
        </section>

        <section className={styles.unit} aria-labelledby="shelf-record">
          <div className={styles.shelf}>
            <Spine label="Guest book" title="Guest book" width={64} size={13} className={cx(styles.guest, styles.cover)} />
            {thin(14, 92, '#c97b7b')}
            {thin(16, 108, '#3f8a8a')}
            {thin(13, 98, '#e7d9b5')}
            {thin(20, 122, '#7a5a9a', styles.star)}
            {thin(14, 104, '#d9a441')}
            {thin(18, 116, '#c97b7b')}
            {thin(14, 94, '#4f7a9a')}
          </div>
          <div className={styles.board}>
            <h2 id="shelf-record" className={styles.plaque}>
              YOUR RECORD
            </h2>
          </div>
        </section>

        <div className={styles.base}>
          <p className={styles.tap}>Tap a book to take it to the table</p>
        </div>
      </div>
    </main>
    {taken ? <OpenBook key={taken.id} title={taken.title} tone={taken.tone} from={taken.from} onBack={() => setTaken(null)} /> : null}
    </>
  );
}
