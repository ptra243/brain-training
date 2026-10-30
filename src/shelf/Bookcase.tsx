import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Dialog } from '../game/Dialog.tsx';
import { caseTitle } from '../game/names.ts';
import { OptionsSheet } from '../game/OptionsSheet.tsx';
import { loadCampaign, loadQuick } from '../game/storage.ts';
import { OpenBook, type Box, type Tone } from './OpenBook.tsx';
import { fitScale } from './fitScale.ts';
import { StickerTin } from './StickerTin.tsx';
import { startRootGuard } from './backStack.ts';
import { useBackLayer } from './useBackLayer.ts';
import type { PickRequest } from './useQuickBook.ts';
import styles from './Shelf.module.css';

/** The book she has taken down: which one, what it says, and where it stood. */
interface Taken {
  id: 'quick' | 'new' | 'pick';
  title: string;
  tone: Tone;
  from: Box;
  /** The tin's games, for a case built from them. */
  pick?: PickRequest;
}

// Nothing on this screen is drawn yet beyond the shelf itself, so every control goes here.
const SOON = '#shelf/soon';

const ROUND_TITLES = ['9pm', 'Midnight', '3am'];
const ROUNDS = 3;

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

interface BookProps {
  label: string;
  title: string;
  className: string;
  /** Title size in px. */
  size: number;
  /** Takes the book down in place (no address change). Without it the link goes to `#shelf/soon`. */
  onOpen?: (e: MouseEvent<HTMLAnchorElement>) => void;
  /** Hidden while its case page is open. */
  gone?: boolean;
  /** The seal drawn under the title. */
  seal: ReactNode;
  /** Small text between the title and the seal. */
  note?: ReactNode;
  /** Sticks out of the shelf, with a brass ribbon. */
  out?: boolean;
}

/** One book you can pick up: the whole spine is a link. */
function Book({ label, title, className, size, onOpen, gone, seal, note, out }: BookProps) {
  return (
    <a href={SOON} aria-label={label} onClick={onOpen} className={cx(styles.book, className, out && styles.out, gone && styles.gone)}>
      <span className={styles.spineTitle} style={{ fontSize: size }}>
        {title}
      </span>
      {note}
      {seal}
      {out ? <span aria-hidden="true" className={styles.ribbon} /> : null}
    </a>
  );
}

/** A thin decorative spine: not a button. */
const thin = (className: string, children?: ReactNode) => (
  <span aria-hidden="true" className={cx(styles.thin, className)}>
    {children}
  </span>
);

const Plaque = ({ id, children }: { id: string; children: string }) => (
  <div className={styles.board}>
    <h2 id={id} className={styles.plaque}>
      {children}
    </h2>
  </div>
);

const MagnifierSeal = () => (
  <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true" className={cx(styles.seal, styles.tiltL8)}>
    <circle cx="17" cy="17" r="15.5" fill="#fbf4e2" />
    <circle cx="17" cy="17" r="12.5" fill="#c76b4f" />
    <circle cx="15" cy="15" r="5" fill="none" stroke="#fbf4e2" strokeWidth="2.4" />
    <path d="M19 19l4.5 4.5" stroke="#fbf4e2" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);

const EnvelopeSeal = ({ className }: { className: string }) => (
  <svg width="32" height="32" viewBox="0 0 34 34" aria-hidden="true" className={cx(styles.seal, className)}>
    <rect x="2" y="5" width="30" height="24" rx="5" fill="#fbf4e2" />
    <rect x="5" y="8" width="24" height="18" rx="3" fill="#6f8f9a" />
    <path d="M7 11l10 7 10-7" fill="none" stroke="#fbf4e2" strokeWidth="2" />
    <circle cx="17" cy="19" r="3.4" fill="#b8423a" />
  </svg>
);

const MoonSeal = () => (
  <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true" className={cx(styles.seal, styles.tiltR7)}>
    <circle cx="17" cy="17" r="15.5" fill="#fbf4e2" />
    <circle cx="17" cy="17" r="12.5" fill="#3f4f75" />
    <path d="M20 9a8.5 8.5 0 1 0 5 14 7 7 0 1 1-5-14z" fill="#f3d68c" />
    <circle cx="11" cy="12" r="1" fill="#fbf4e2" />
  </svg>
);

/** The sticker tin lying on the shelf: red and gold, lid ajar, three stickers peeking out. */
const TinArt = () => (
  <svg width="86" height="70" viewBox="0 0 86 70" aria-hidden="true" className={styles.tinArt}>
    <rect x="9" y="22" width="16" height="12" rx="2" fill="#fffdf6" stroke="#34436a" strokeWidth="1.5" transform="rotate(-8 17 28)" />
    <rect x="34" y="19" width="16" height="12" rx="2" fill="#fffdf6" stroke="#4f7a54" strokeWidth="1.5" transform="rotate(5 42 25)" />
    <rect x="58" y="22" width="16" height="12" rx="2" fill="#fffdf6" stroke="#7b5a78" strokeWidth="1.5" transform="rotate(-4 66 28)" />
    <rect x="4" y="30" width="78" height="36" rx="5" fill="#8a3029" stroke="#c8a24c" strokeWidth="2" />
    <rect x="9" y="35" width="68" height="26" rx="3" fill="none" stroke="#c8a24c" strokeWidth="1" />
    <path d="M2 24l8-8h66l8 8v6H2z" fill="#6e231e" stroke="#c8a24c" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M43 40l2.6 5.2 5.7.8-4.1 4 1 5.7-5.2-2.7-5.2 2.7 1-5.7-4.1-4 5.7-.8z" fill="#e8c66a" />
  </svg>
);

function Cat() {
  return (
    <svg className={styles.cat} width="72" height="36" viewBox="0 0 72 36" aria-hidden="true">
      <ellipse cx="34" cy="27" rx="26" ry="9" className={styles.fillCat} />
      <circle cx="55" cy="21" r="9.5" className={styles.fillCat} />
      <path d="M49 14l2-8 5 7zM58 13l4-7 2 9z" className={styles.fillCat} />
      <path d="M10 29c-8 2-8 6 2 5" className={styles.strokeCat} strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M51 21q2 2 4 0M58 21q2 2 4 0" stroke="#5a3418" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M22 23q3 3 6 0M32 22q3 3 6 0" stroke="rgba(0,0,0,.18)" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Window() {
  return (
    <svg className={styles.window} width="58" height="58" viewBox="0 0 58 58" aria-hidden="true">
      <path d="M10 54V30a19 19 0 0 1 38 0v24z" className={styles.fillWood} />
      <path d="M15 54V31a14 14 0 0 1 28 0v23z" fill="#2b3a4f" />
      <circle cx="35" cy="22" r="3" fill="#f3e6c0" />
      <circle cx="22" cy="34" r="1.5" fill="#f3e6c0" />
      <circle cx="38" cy="40" r="1.2" fill="#f3e6c0" />
      <path d="M29 17v37M15 36h28" className={styles.strokeWood} strokeWidth="2.5" />
    </svg>
  );
}

function Teacup() {
  return (
    <svg className={styles.teacup} width="44" height="40" viewBox="0 0 44 40" aria-hidden="true">
      <ellipse cx="20" cy="37" rx="18" ry="3" fill="#efe6d0" />
      <path d="M8 18h24v6a12 12 0 0 1-24 0z" fill="#efe6d0" />
      <path d="M32 21c7 0 7 8 0 8" stroke="#efe6d0" strokeWidth="3" fill="none" />
      <path d="M10 22h20" stroke="#c76b4f" strokeWidth="2" />
      <path d="M16 14c-2-3 2-5 0-8M23 14c-2-3 2-5 0-8" stroke="rgba(255,255,255,.4)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function SlimCandle() {
  return (
    <svg className={styles.candle} width="24" height="52" viewBox="0 0 24 52" aria-hidden="true">
      <rect x="7" y="14" width="10" height="34" fill="#f2ead2" />
      <path d="M12 2c4 5 4 9 0 11-4-2-4-6 0-11z" fill="#f0b544" />
      <rect x="2" y="48" width="20" height="4" className={styles.fillBrass} />
    </svg>
  );
}

function StarBadge() {
  return (
    <svg className={styles.star} width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 1l2.6 5.6 6 .7-4.5 4.1 1.2 6L10 14.4 4.7 17.4l1.2-6L1.4 7.3l6-.7z" fill="#e6c35c" stroke="#fbf4e2" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/** The library: one honey-oak bookcase. Her save is only read, to see which books stick out. */
export function Bookcase() {
  const campaign = loadCampaign();
  const playing = campaign?.outcome === 'playing' ? campaign : null;
  const round = playing ? Math.min(Math.max(playing.rounds.length, 1), ROUNDS) : 0;
  const roundTitle = ROUND_TITLES[round - 1];

  // Opening a book is React state, never a hash change: `main.tsx` reloads on every hashchange.
  const [taken, setTaken] = useState<Taken | null>(null);
  const [options, setOptions] = useState(false);
  // The sticker tin screen, and where the tin stood so the book can open from there.
  const [tin, setTin] = useState<Box | null>(null);
  // Asks first when she has an unsolved Quick case that a new one would replace.
  const [confirming, setConfirming] = useState<HTMLAnchorElement | null>(null);
  // Back puts the book (or the tin screen) away. The first tap arms the guard so Back at the bare shelf does nothing.
  useBackLayer(tin !== null, () => setTin(null));
  useBackLayer(taken !== null, () => setTaken(null));
  useEffect(() => (['', '#', '#shelf'].includes(window.location.hash) ? startRootGuard() : undefined), []);
  // Read again whenever a book is taken down or put back: the New case book saves a case while open.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `taken` is the trigger, not an input
  const quick = useMemo(() => loadQuick(), [taken]);
  const quickTitle = quick ? caseTitle(quick.ref) : '';
  const trigger = useRef<HTMLAnchorElement | null>(null);
  const caseRef = useRef<HTMLDivElement>(null);
  const rugRef = useRef<HTMLDivElement>(null);

  // One screen, no scroll: scale the bookcase (cat included) down with CSS zoom just enough for the
  // page to fit the visible height. Measured at zoom 1, so it is redone on every resize.
  useLayoutEffect(() => {
    const shelf = caseRef.current;
    const rug = rugRef.current;
    if (!shelf || !rug) return;
    const fit = () => {
      shelf.style.zoom = '';
      const margin = parseFloat(getComputedStyle(shelf).marginTop) || 0;
      const scalable = margin + shelf.offsetHeight;
      const fixed = shelf.offsetTop - margin + rug.offsetHeight + 12; // above the case, plus the rug's strip
      const viewport = window.visualViewport?.height ?? window.innerHeight;
      const factor = fitScale(viewport, fixed, scalable);
      if (factor < 1) shelf.style.zoom = String(factor);
    };
    fit();
    window.addEventListener('resize', fit);
    window.visualViewport?.addEventListener('resize', fit);
    return () => {
      window.removeEventListener('resize', fit);
      window.visualViewport?.removeEventListener('resize', fit);
    };
  }, []);

  const take = (el: HTMLAnchorElement, id: Taken['id'], title: string, tone: Tone) => {
    trigger.current = el;
    const r = el.getBoundingClientRect(); // before the book is hidden
    setTaken({ id, title, tone, from: { left: r.left, top: r.top, width: r.width, height: r.height } });
  };

  // Back on the shelf: put focus on the book she took down.
  useEffect(() => {
    if (taken === null && tin === null) trigger.current?.focus({ preventScroll: true });
  }, [taken, tin]);

  return (
    <>
      <main className={styles.page} inert={taken !== null || tin !== null}>
        <span aria-hidden="true" className={styles.glow} />

        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Casebook</h1>
            <p className={styles.lede}>Take a book off the shelf.</p>
          </div>
          <button type="button" aria-label="Options" className={styles.gear} onClick={() => setOptions(true)}>
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
            </svg>
          </button>
          <Window />
        </header>

        <div ref={caseRef} className={styles.case}>
          <Cat />

          <section aria-labelledby="shelf-quick">
            <div className={styles.shelf}>
              {quick ? (
                <Book
                  label={`Your case, ${quickTitle}: continue`}
                  title={quickTitle}
                  size={quickTitle.length > 15 ? 12 : 15}
                  className={styles.quickBook}
                  out
                  seal={<MagnifierSeal />}
                  onOpen={(e) => {
                    e.preventDefault();
                    take(e.currentTarget, 'quick', quickTitle, 'quick');
                  }}
                  gone={taken?.id === 'quick'}
                />
              ) : null}
              <Book
                label="New case"
                title="New case"
                size={15}
                className={styles.newCase}
                seal={<EnvelopeSeal className={styles.tiltR5} />}
                onOpen={(e) => {
                  e.preventDefault();
                  if (quick && !quick.progress.solved) setConfirming(e.currentTarget);
                  else take(e.currentTarget, 'new', 'New case', 'fresh');
                }}
                gone={taken?.id === 'new'}
              />
              <a
                href={SOON}
                aria-label="Choose your games"
                className={styles.tinStack}
                onClick={(e) => {
                  e.preventDefault();
                  trigger.current = e.currentTarget;
                  const r = e.currentTarget.getBoundingClientRect();
                  setTin({ left: r.left, top: r.top, width: r.width, height: r.height });
                }}
              >
                <TinArt />
              </a>
              {thin(styles.q1)}
              {thin(styles.q2)}
              <a href={SOON} aria-label="An odd-looking book" className={styles.secret}>
                <span aria-hidden="true" className={styles.diamond} />
              </a>
            </div>
            <Plaque id="shelf-quick">QUICK PLAY</Plaque>
          </section>

          <section aria-labelledby="shelf-campaign">
            <div className={styles.shelf}>
              {playing ? (
                <Book
                  label={`Your campaign, ${roundTitle}, round ${round} of ${ROUNDS}: continue`}
                  title={roundTitle}
                  size={16}
                  className={styles.campaignBook}
                  seal={<MoonSeal />}
                  note={
                    <span className={styles.note}>
                      {round} of {ROUNDS}
                    </span>
                  }
                />
              ) : null}
              <Book label="New campaign" title="New campaign" size={14} className={styles.newCampaign} seal={<EnvelopeSeal className={styles.tiltL5} />} />
              {thin(styles.c1)}
              {thin(styles.c2)}
              <Teacup />
              <SlimCandle />
            </div>
            <Plaque id="shelf-campaign">CAMPAIGN</Plaque>
          </section>

          <section aria-labelledby="shelf-record">
            <a href={SOON} aria-label="Your record: the guest book" className={cx(styles.shelf, styles.recordShelf)}>
              <span aria-hidden="true" className={styles.guestStack}>
                <span className={styles.guestBottom} />
                <span className={styles.guestTop} />
                <span className={styles.guestLabel}>Guest book</span>
              </span>
              {thin(styles.r1)}
              {thin(styles.r2)}
              {thin(styles.r3)}
              {thin(styles.r4, <StarBadge />)}
              {thin(styles.r5)}
              {thin(styles.r6)}
              {thin(styles.r7)}
            </a>
            <Plaque id="shelf-record">YOUR RECORD</Plaque>
          </section>
        </div>

        <div className={styles.floor}>
          <div ref={rugRef} className={styles.rug}>
            <p className={styles.rugText}>Tap a book to take it to the table</p>
          </div>
        </div>
      </main>
      {tin && !taken ? (
        <StickerTin
          unsolved={quick && !quick.progress.solved ? quickTitle : null}
          onBack={() => setTin(null)}
          onStick={(code, games) => {
            setTaken({ id: 'pick', title: 'New case', tone: 'fresh', from: tin, pick: { code, games } });
            setTin(null);
          }}
        />
      ) : null}
      {options ? <OptionsSheet current="shelf" onClose={() => setOptions(false)} /> : null}
      {confirming && quick ? (
        <Dialog placement="center" labelId="new-case-title" onClose={() => setConfirming(null)}>
          <h2 id="new-case-title">Start a new case?</h2>
          <p className="dialog-text">{quickTitle} isn&apos;t solved yet. A new case replaces it.</p>
          <div className="dialog-actions">
            <button data-autofocus className="secondary" onClick={() => setConfirming(null)}>
              Keep playing
            </button>
            <button
              className="primary"
              onClick={() => {
                const el = confirming;
                setConfirming(null);
                take(el, 'new', 'New case', 'fresh');
              }}
            >
              Start new
            </button>
          </div>
        </Dialog>
      ) : null}
      {taken ? <OpenBook key={taken.id} title={taken.title} tone={taken.tone} from={taken.from} onBack={() => setTaken(null)} pick={taken.pick} /> : null}
    </>
  );
}
