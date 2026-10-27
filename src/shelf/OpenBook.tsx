import { useEffect, useRef, useState, type CSSProperties } from 'react';
import styles from './OpenBook.module.css';

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

const RIBBONS = ['Case', 'Map', 'Puzzles', 'Answer'];

// Static sample copy: this prototype is not wired to a real case.
const BLURB = 'Dinner is over and nobody is going anywhere. Somewhere in this house is the clue that names the killer.';
const CHOICES = [
  { story: 'The Butler left his newspaper folded open at the crossword.', game: 'Mini crossword', level: 'Medium', page: 24 },
  { story: 'The cat keeps trotting off down the hall and looking back at you.', game: 'Nosing around', level: 'Easy', page: 53 },
  { story: 'A tarot deck lies face down on the card table, half dealt.', game: 'Tarot match', level: 'Hard', page: 46 },
];

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

interface OpenBookProps {
  title: string;
  tone: Tone;
  from: Box;
  onBack: () => void;
}

/**
 * The book she took down, and the case page it opens onto. It is mounted when she takes the
 * book, so the CSS animation plays once. Nothing here touches the address or her save.
 * The cover is hidden by `prefers-reduced-motion`, which leaves only the page.
 */
export function OpenBook({ title, tone, from, onBack }: OpenBookProps) {
  const backRef = useRef<HTMLButtonElement>(null);

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

  return (
    <div className={styles.stage}>
      <div className={styles.flyer} style={start}>
        <section className={styles.sheet} aria-label={`${title}: case page`}>
          <header className={styles.band}>
            <button ref={backRef} type="button" className={styles.back} onClick={onBack}>
              <span aria-hidden="true">‹</span> Back to the shelf
            </button>
            <h1 className={styles.caseTitle}>{title}</h1>
            <nav className={styles.ribbons} aria-label="Parts of the case">
              {RIBBONS.map((name, i) => (
                <button key={name} type="button" className={cx(styles.ribbon, i === 0 && styles.current)} aria-current={i === 0 ? 'page' : undefined}>
                  {name}
                </button>
              ))}
            </nav>
          </header>

          <div className={styles.paper}>
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
                      <span className={styles.page}>page {c.page}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className={styles.turn}>Turn to page 24, 46 or 53.</p>
          </div>
        </section>

        <div aria-hidden="true" className={cx(styles.cover, tone === 'quick' ? styles.quick : styles.fresh)}>
          <span className={styles.frame} />
          <span className={cx(styles.coverTitle, title.length > 16 && styles.long)}>{title}</span>
          <span className={styles.coverSeal} />
        </div>
      </div>
    </div>
  );
}
