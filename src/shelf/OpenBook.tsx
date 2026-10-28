import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import styles from './OpenBook.module.css';
import { FindAClue } from './FindAClue.tsx';
import { Notebook } from './Notebook.tsx';
import { useQuickBook, type SampleCase } from './useQuickBook.ts';
import { attachRibbons } from './ribbonMotion.ts';
import { SECTIONS } from './ribbonPlan.ts';

/** Where the book sat on the shelf, in viewport pixels. */
export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type Tone = 'quick' | 'fresh';

/** The case page is a column no wider than this, like the shelf page. */
const MAX_WIDTH = 480;

// Static sample copy: this prototype is not wired to a real case.
const BLURB = 'Dinner is over and nobody is going anywhere. Somewhere in this house is the clue that names the killer.';
const CHOICES = [
  { story: "A newspaper lies folded on the window seat, its crossword half done in someone else's ink.", game: 'Mini crossword', level: 'Medium', page: 24 },
  { story: 'The cat keeps trotting off down the hall and looking back at you.', game: 'Nosing around', level: 'Easy', page: 53 },
  { story: 'A tarot deck lies face down on the card table, half dealt.', game: 'Tarot match', level: 'Hard', page: 46 },
];

const ICONS: ReactNode[] = [
  <svg key="case" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="M15 15l5.5 5.5" />
  </svg>,
  <svg key="map" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
    <rect x="3.5" y="4" width="17" height="16" />
    <path d="M12 4v7M3.5 11h5M12 11h8.5M15 11v9" />
  </svg>,
  <svg key="puzzles" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" />
    <path d="M9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16" />
  </svg>,
  <svg key="answer" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <circle cx="12" cy="12" r="5" />
  </svg>,
];

/** The New case book stays a sample until step 3. */
function NewCaseSample() {
  return (
    <>
      <p className={styles.blurb}>{BLURB}</p>
      <h2 className={styles.find}>Find a clue</h2>
      <ul className={styles.choices}>
        {CHOICES.map((c) => (
          <li key={c.page}>
            <button type="button" className={styles.choice}>
              <span className={styles.story}>{c.story}</span>
              <span className={styles.meta}>
                <span>
                  {c.game} · {c.level}
                </span>
                <b>p. {c.page}</b>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className={styles.foot}>Turn to page 24, 46 or 53.</p>
    </>
  );
}

interface OpenBookProps {
  title: string;
  tone: Tone;
  from: Box;
  onBack: () => void;
  /** Drop the ribbons as soon as the book is open (the dev preview). */
  startOpen?: boolean;
  /** A case to show instead of her saved one (the dev preview). */
  sample?: SampleCase;
}

/**
 * The book she took down, open on a puzzle book's pages: ribbons for Case, Map, Puzzles and Answer.
 * It is mounted when she takes the book, so the CSS animation plays once. The section is state
 * here, not the address, and nothing touches her save. The ribbon and page-turn motion is
 * `ribbonMotion.ts`, which owns the pages' `hidden` and the ribbons' transforms after the first render.
 * The cover is hidden by `prefers-reduced-motion`, which leaves only the page.
 */
export function OpenBook({ title, tone, from, onBack, startOpen, sample }: OpenBookProps) {
  const backRef = useRef<HTMLButtonElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const underRef = useRef<HTMLDivElement>(null);
  const pullRef = useRef<HTMLButtonElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const creaseRef = useRef<HTMLSpanElement>(null);
  const [section, setSection] = useState(0);
  // Her case, shared by the Case page and the notebook. The New case book has none.
  const book = useQuickBook(sample, tone === 'quick');
  const [puzzleOpen, setPuzzleOpen] = useState(false);

  // Where the book started, as a move and a scale from the page's final place. Read once.
  const [start] = useState<CSSProperties>(() => {
    const width = Math.min(window.innerWidth, MAX_WIDTH);
    const left = Math.max(0, (window.innerWidth - MAX_WIDTH) / 2);
    return {
      '--dx': `${from.left - left}px`,
      '--dy': `${from.top}px`,
      '--sx': from.width / width,
      '--sy': from.height / window.innerHeight,
    } as CSSProperties;
  });

  useEffect(() => {
    backRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const pages = pagesRef.current;
    const under = underRef.current;
    const pull = pullRef.current;
    const scrim = scrimRef.current;
    const nav = navRef.current;
    const crease = creaseRef.current;
    if (!pages || !under || !pull || !scrim || !nav || !crease) return;
    const controls = attachRibbons(
      {
        pages,
        under,
        sections: Array.from(pages.querySelectorAll<HTMLElement>('[data-section]')),
        pull,
        scrim,
        nav,
        ribbons: Array.from(nav.querySelectorAll<HTMLElement>('button')),
        crease,
      },
      { open: styles.open, empty: styles.empty, leaf: styles.leaf, page: styles.page, back: styles.back, blank: styles.blank, shade: styles.shade },
      { onTurn: setSection, startOpen },
    );
    return controls.dispose;
  }, [startOpen]);

  return (
    <div className={styles.stage}>
      <div className={styles.flyer} style={start}>
        <section className={styles.app} style={book ? ({ paddingBottom: 'calc(52px + env(safe-area-inset-bottom, 0px))' } as CSSProperties) : undefined} aria-label={`${title}: ${SECTIONS[section]}`} data-section={SECTIONS[section]}>
          <header className={styles.head}>
            <button ref={backRef} type="button" className={styles.round} aria-label="Back to the shelf" onClick={onBack}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <h1 className={styles.caseTitle}>{title}</h1>
          </header>

          <div className={styles.book}>
            <div className={styles.spread}>
              <div className={styles.verso} aria-hidden="true" />
              <div className={styles.pages} ref={pagesRef}>
                <section className={styles.page} data-section="Case" aria-label="Case">
                  <div className={styles.running}>
                    <span>Case</span>
                  </div>
                  {tone === 'quick' ? <FindAClue book={book} sample={sample} onPuzzleOpen={setPuzzleOpen} /> : <NewCaseSample />}
                </section>
                {SECTIONS.slice(1).map((name) => (
                  <section key={name} className={styles.page} data-section={name} aria-label={name} hidden>
                    <div className={styles.running}>
                      <span>{name}</span>
                    </div>
                    <p className={styles.lede}>This page isn&apos;t drawn yet.</p>
                  </section>
                ))}
                <div className={styles.under} ref={underRef} />
              </div>
            </div>

            <div className={styles.gutter} aria-hidden="true" />
            <div className={styles.crease} aria-hidden="true">
              <span ref={creaseRef} className={styles.satin} data-i="0" />
            </div>
            <button ref={pullRef} type="button" className={styles.pull} aria-label="Show the ribbons" />
            <div ref={scrimRef} className={styles.scrim} hidden />
            <nav ref={navRef} className={styles.ribbons} aria-label="Parts of the case">
              {SECTIONS.map((name, i) => (
                <div key={name} className={styles.slot}>
                  <button type="button" className={styles.ribbon + ' ' + styles.satin} data-i={i}>
                    {ICONS[i]}
                    {name}
                  </button>
                </div>
              ))}
            </nav>
          </div>
          {book ? <Notebook book={book} sample={sample} hidden={puzzleOpen} /> : null}
        </section>

        <div aria-hidden="true" className={`${styles.cover} ${tone === 'quick' ? styles.quick : styles.fresh}`}>
          <span className={styles.frame} />
          <span className={`${styles.coverTitle} ${title.length > 16 ? styles.long : ''}`}>{title}</span>
          <span className={styles.coverSeal} />
        </div>
      </div>
    </div>
  );
}
