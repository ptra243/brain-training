import { useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import styles from './OpenBook.module.css';
import { FindAClue } from './FindAClue.tsx';
import { caseTitle } from '../game/names.ts';
import { AnswerPage } from './AnswerPage.tsx';
import { MapPlate } from './MapPlate.tsx';
import { Notebook } from './Notebook.tsx';
import { accuseAction, afterMapTap, ringedSubject, type AccuseRequest, type Height } from './notebook.ts';
import type { Subject } from '../game/state.ts';
import { Shuffling } from '../game/Shuffling.tsx';
import { useQuickBook, type PickRequest, type SampleCase } from './useQuickBook.ts';
import { useCampaignBook, type Resolved, type SampleCampaign } from './useCampaignBook.ts';
import { atMidnight } from '../game/explore.ts';
import type { LaterScene } from './campaignAnswer.ts';
import { CampaignAnswer } from './CampaignAnswer.tsx';
import { CampaignOver } from './CampaignOver.tsx';
import { escapedScene, nightFor } from './campaignEnd.ts';
import { CampaignReplay } from './NightReplay.tsx';
import { recordFinishedRuns } from './recordRuns.ts';
import { loadCampaign } from '../game/storage.ts';
import { CandleScene } from './CandleScene.tsx';
import { QuestionSpread } from './QuestionSpread.tsx';
import { chapterTitle, isNightChapter } from './campaignBook.ts';
import { CampaignPlan } from './CampaignPlan.tsx';
import { CampaignRoom, type TalkRequest } from './CampaignRoom.tsx';
import { CampaignOpening } from './CampaignOpening.tsx';
import { CampaignTitle } from './CampaignTitle.tsx';
import { openingActive } from './campaignOpening.ts';
import { attachRibbons } from './ribbonMotion.ts';
import { sectionsFor } from './ribbonPlan.ts';
import { stepIndex, watchSwipe, type SwipeDir } from './swipe.ts';
import { useBackLayer } from './useBackLayer.ts';

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

const ICONS: ReactNode[] = [
  <svg key="case" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="M15 15l5.5 5.5" />
  </svg>,
  <svg key="map" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
    <rect x="3.5" y="4" width="17" height="16" />
    <path d="M12 4v7M3.5 11h5M12 11h8.5M15 11v9" />
  </svg>,
  <svg key="answer" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <circle cx="12" cy="12" r="5" />
  </svg>,
];

interface OpenBookProps {
  title: string;
  tone: Tone;
  from: Box;
  onBack: () => void;
  /** Drop the ribbons as soon as the book is open (the dev preview). */
  startOpen?: boolean;
  /** A case to show instead of her saved one (the dev preview). */
  sample?: SampleCase;
  /** Build the case from the sticker tin's games (a picked case) instead of a plain Play case. */
  pick?: PickRequest;
  /** The campaign book: ribbons Room, Plan and Answer over her campaign save instead of a Quick case. */
  campaign?: boolean;
  /** A campaign to show instead of her saved one (the dev preview). */
  campaignSample?: SampleCampaign;
  /** The New campaign book: it opens on a title page, and the campaign is made and saved when she breaks the seal. */
  newCampaign?: boolean;
}

/**
 * The book she took down, open on a puzzle book's pages: ribbons for Case, Map and Answer.
 * It is mounted when she takes the book, so the CSS animation plays once. The section is state
 * here, not the address, and nothing touches her save. The ribbon and page-turn motion is
 * `ribbonMotion.ts`, which owns the pages' `hidden` and the ribbons' transforms after the first render.
 * The cover is hidden by `prefers-reduced-motion`, which leaves only the page.
 */
export function OpenBook({ title: coverTitle, tone, from, onBack, startOpen, sample, pick, campaign, campaignSample, newCampaign }: OpenBookProps) {
  const sections = sectionsFor(campaign ? 'campaign' : 'quick');
  const backRef = useRef<HTMLButtonElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const underRef = useRef<HTMLDivElement>(null);
  const pullRef = useRef<HTMLButtonElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const creaseRef = useRef<HTMLSpanElement>(null);
  const [section, setSection] = useState(0);
  const appRef = useRef<HTMLElement>(null);
  // The ribbons are a Back layer while they hang down; Back tucks them.
  const [ribbonsDown, setRibbonsDown] = useState(false);
  const tuckRef = useRef<(() => void) | null>(null);
  // The ribbons' page turn, for the Jigsaw's Accuse button.
  const turnRef = useRef<((i: number) => void) | null>(null);
  // Her case, shared by the Case page and the notebook. The New case book builds one and saves it.
  const book = useQuickBook(sample, campaign ? 'none' : tone === 'quick' ? 'saved' : 'new', pick);
  // The "later that night" scene after a wrong accusation: it sits on the table over the book, which turns to the next Room page behind it.
  const [scene, setScene] = useState<LaterScene | null>(() => campaignSample?.later ?? null);
  // A verdict has been applied (after the questioning, or at once if it could not be built).
  const resolved = (r: Resolved) => {
    if (r.scene) {
      setScene(r.scene);
      turnRef.current?.(0);
    } else if (r.verdict) {
      turnRef.current?.(sections.indexOf('Answer'));
      // The night ends: caught plays the replay once; escaped shows the got-away scene first. The guest book gets the run at once.
      if (r.verdict === 'caught') setEnding('replay');
      if (r.verdict === 'escaped') setEnding('scene');
      if (!campaignSample) void recordFinishedRuns();
    }
  };
  // The ending playing over the book this visit: the got-away scene, then the night's replay. Never on a reload.
  const [ending, setEnding] = useState<'scene' | 'replay' | null>(() => campaignSample?.ending ?? null);
  // A campaign that was already finished when the book opened lands on its closing page.
  const [startOnAnswer] = useState(() => !!campaign && !newCampaign && !campaignSample && (loadCampaign()?.outcome ?? 'playing') !== 'playing');
  // The New campaign book starts on its title page: 'open', then 'turning' once the campaign is saved, then 'gone'.
  const [titlePhase, setTitlePhase] = useState<'open' | 'turning' | 'gone'>(newCampaign ? 'open' : 'gone');
  const campaignBook = useCampaignBook(campaignSample, !!campaign && titlePhase !== 'open', resolved);
  const over = campaignBook ? campaignBook.over : null;
  // What the notebook reads: the campaign chapter on the pages (read-only once it can't change), or her Quick case.
  const notebookBook = campaign ? campaignBook || null : book || null;
  const endSave = campaignBook ? campaignBook.save : null;
  const endCases = campaignBook ? campaignBook.cases : null;
  const nightSteps = useMemo(() => (ending === 'replay' && endSave && endSave.outcome !== 'playing' && endCases ? nightFor(endSave, endCases) : null), [ending, endSave, endCases]);
  // Chapter one opens on its opening: no ribbons or notebook until it is done, as on a puzzle page.
  const opening = !!campaignBook && openingActive(campaignBook.round, campaignBook.current, campaignBook.progress, campaignBook.readOnly, !!campaignBook.pending);
  const night = !!campaignBook && isNightChapter(campaignBook.round);
  // Midnight and 3am use the midnight-green palette. It is a body class so a turning leaf (added to body) takes it too.
  useLayoutEffect(() => {
    if (!night) return;
    document.body.classList.add(styles.midnight);
    return () => document.body.classList.remove(styles.midnight);
  }, [night]);
  const title = campaign ? (campaignBook ? chapterTitle(campaignBook.round) : coverTitle) : book && book.fullRef ? caseTitle(book.fullRef) : coverTitle;
  // A guest page's Accuse without a weapon: the Answer form gets the guest written in. A new `seq` is a new request.
  const [prefill, setPrefill] = useState<{ suspect: string; seq: number } | null>(() => (campaignSample?.guest ? { suspect: campaignSample.guest, seq: 1 } : null));
  const [puzzleOpen, setPuzzleOpen] = useState(false);
  const sampleSection = campaign ? campaignSample?.section : sample?.section;
  // How far the notebook is up, which page it shows (a map tap sets `focus`), and so which piece is ringed.
  const [height, setHeight] = useState<Height>(() => (sample?.notebook?.half ? 'half' : sample?.notebook?.open ? 'full' : 'peek'));
  const [focus, setFocus] = useState<{ subject: Subject; seq: number } | null>(null);
  // The Plan page's tap on a guest in her room: the Room page opens the talk spread on them.
  const [talkRequest, setTalkRequest] = useState<TalkRequest | null>(null);
  const [pageSubject, setPageSubject] = useState<Subject | null>(() => sample?.notebook?.subject ?? null);

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

  // A tap on a guest or a plan counter: that subject's page in the notebook, raised as the Map plate does.
  const showSubject = (subject: Subject) => {
    setFocus((f) => ({ subject, seq: (f?.seq ?? 0) + 1 }));
    setHeight(afterMapTap(height));
  };

  const talkTo = (id: string) => {
    setTalkRequest((r) => ({ id, seq: (r?.seq ?? 0) + 1 }));
    turnRef.current?.(0);
  };

  const accuseGuest = (req: AccuseRequest) => {
    const which = campaignBook || book;
    if (!which) return;
    setHeight('peek');
    // With a weapon given the try is handed in as the Answer page's own button does; the page then shows it
    // (in a campaign the book then opens the questioning). A campaign only takes guests its form lists.
    const action = campaignBook && !campaignBook.allowed.includes(req.suspect) ? null : accuseAction(req);
    if (action) which.dispatch(action);
    // A handed-in try leaves the form blank again, as the Answer page's own button does.
    setPrefill((p) => ({ suspect: action ? '' : req.suspect, seq: (p?.seq ?? 0) + 1 }));
    turnRef.current?.(sections.indexOf('Answer'));
  };

  // Back puts the notebook away first, then the ribbons; the book and the puzzle page register themselves.
  useBackLayer(height !== 'peek', () => setHeight('peek'));
  useBackLayer(ribbonsDown, () => tuckRef.current?.());

  // A sideways swipe on the page turns to the next or previous section (no wrap). Not while the notebook
  // is up (it swipes its own tabs), a puzzle page or a pop-up is open.
  const swipeSection = useEffectEvent((dir: SwipeDir) => {
    const to = stepIndex(section, sections.length, dir);
    if (to !== null) turnRef.current?.(to);
  });
  const canSwipe = useEffectEvent(() => height === 'peek' && !puzzleOpen && !opening && titlePhase !== 'open' && !document.querySelector('[role="dialog"]'));
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;
    return watchSwipe(app, (dir) => swipeSection(dir), () => canSwipe());
  }, []);

  // The title page's leaf is gone once it has turned away.
  useEffect(() => {
    if (titlePhase !== 'turning') return;
    const timer = setTimeout(() => setTitlePhase('gone'), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 540);
    return () => clearTimeout(timer);
  }, [titlePhase]);

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
      { onTurn: setSection, onDropped: setRibbonsDown, startOpen },
    );
    // A sample can open on another section (the dev previews); a real book always starts on Case.
    if (startOpen && sampleSection) controls.turnTo(sampleSection);
    // A campaign that was already finished opens on its closing page.
    else if (startOnAnswer) controls.turnTo(2);
    turnRef.current = controls.turnTo;
    tuckRef.current = controls.tuck;
    return () => {
      turnRef.current = null;
      tuckRef.current = null;
      controls.dispose();
    };
    // The Answer section is the third of a campaign book; `startOnAnswer` is fixed for a mounted book.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startOpen, sampleSection]);

  // At midnight the book turns to Answer once a chapter (the Room and Plan pages are frozen). Not while a puzzle page is open: it waits for that to close.
  const midnight = !!campaignBook && !campaignBook.readOnly && atMidnight(campaignBook.c, campaignBook.progress);
  const chapter = campaignBook ? campaignBook.round : -1;
  const held = !!campaignBook && !!campaignBook.pending;
  const turnedFor = useRef(-1);
  useEffect(() => {
    if (!midnight || puzzleOpen || held || over || turnedFor.current === chapter) return;
    turnedFor.current = chapter;
    turnRef.current?.(sections.indexOf('Answer'));
    // `sections` is fixed for a mounted book.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [midnight, puzzleOpen, held, over, chapter]);

  return (
    <div className={styles.stage}>
      <div className={styles.flyer} style={start}>
        <section ref={appRef} className={styles.app} style={notebookBook && !opening ? ({ paddingBottom: 'calc(52px + env(safe-area-inset-bottom, 0px))' } as CSSProperties) : undefined} aria-label={`${title}: ${sections[section]}`} data-section={sections[section]}>
          <header className={styles.head}>
            <button ref={backRef} type="button" className={styles.round} aria-label="Back to the shelf" onClick={onBack}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <h1 className={styles.caseTitle}>{title}</h1>
          </header>

          <div className={styles.book} data-opening={opening || titlePhase === 'open' ? '' : undefined}>
            <div className={styles.spread}>
              <div className={styles.verso} aria-hidden="true" />
              <div className={styles.pages} ref={pagesRef}>
                <section className={styles.page} data-section={sections[0]} aria-label={sections[0]}>
                  <div className={styles.running}>
                    <span>{sections[0]}</span>
                  </div>
                  {campaign ? (
                    opening && campaignBook ? (
                      <CampaignOpening book={campaignBook} initialPerson={campaignSample?.openingGuest} />
                    ) : (
                      <CampaignRoom book={campaignBook} onPuzzleOpen={setPuzzleOpen} onSubject={showSubject} initialTalk={campaignSample?.talk} talkRequest={talkRequest} />
                    )
                  ) : tone === 'fresh' && book === null ? (
                    <p className={styles.lede}>Laying out the cards…</p>
                  ) : tone === 'fresh' && book === false ? (
                    <p className={styles.lede}>{pick ? "The cat couldn't make a case. Try again later." : "That case wouldn't deal. Go back and try again."}</p>
                  ) : (
                    <FindAClue book={book} sample={sample} onPuzzleOpen={setPuzzleOpen} skipOpening={!!pick} />
                  )}
                </section>
                {sections.slice(1).map((name) => (
                  <section key={name} className={styles.page} data-section={name} aria-label={name} hidden>
                    <div className={styles.running}>
                      <span>{name}</span>
                    </div>
                    {campaign ? (
                      name === 'Plan' ? (
                        <CampaignPlan book={campaignBook} height={height} onTalk={talkTo} onSubject={showSubject} />
                      ) : name === 'Answer' && campaignBook ? (
                        campaignBook.over || campaignBook.readOnly ? (
                          <CampaignOver book={campaignBook} onBack={onBack} onReplay={() => setEnding('replay')} />
                        ) : (
                          <CampaignAnswer book={campaignBook} prefill={prefill} />
                        )
                      ) : (
                        <p className={styles.lede}>This page isn&apos;t drawn yet.</p>
                      )
                    ) : name === 'Answer' && book ? (
                      <AnswerPage book={book} onBack={onBack} prefill={prefill} />
                    ) : name === 'Map' && book ? (
                      <MapPlate
                        book={book}
                        ring={ringedSubject(height, pageSubject)}
                        height={height}
                        onSubject={showSubject}
                        onTuck={() => setHeight('peek')}
                      />
                    ) : (
                      <p className={styles.lede}>This page isn&apos;t drawn yet.</p>
                    )}
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
              {sections.map((name, i) => (
                <div key={name} className={styles.slot}>
                  <button type="button" className={styles.ribbon + ' ' + styles.satin} data-i={i}>
                    {ICONS[i]}
                    {name}
                  </button>
                </div>
              ))}
            </nav>
            {titlePhase !== 'gone' ? <CampaignTitle turning={titlePhase === 'turning'} onStarted={() => setTitlePhase('turning')} onBack={onBack} /> : null}
          </div>
          {notebookBook ? (
            <Notebook
              book={notebookBook}
              sample={sample}
              hidden={puzzleOpen || opening}
              height={height}
              onHeight={setHeight}
              focus={focus}
              onPage={setPageSubject}
              onAccuse={campaignBook && campaignBook.readOnly ? undefined : () => { setHeight('peek'); turnRef.current?.(sections.indexOf('Answer')); }}
              onAccuseGuest={campaignBook && campaignBook.readOnly ? undefined : accuseGuest}
            />
          ) : null}
        </section>

        <div aria-hidden="true" className={`${styles.cover} ${tone === 'quick' ? styles.quick : styles.fresh}`}>
          <span className={styles.frame} />
          <span className={`${styles.coverTitle} ${title.length > 16 ? styles.long : ''}`}>{title}</span>
          <span className={styles.coverSeal} />
        </div>
      </div>
      {/* Outside the flyer: its page-turn transform would otherwise hold this "fixed" overlay inside the book. */}
      {pick && book === null ? <Shuffling /> : null}
      {campaignBook && campaignBook.pending && !campaignBook.questioning ? <Shuffling /> : null}
      {campaignBook && campaignBook.pending && campaignBook.questioning ? (
        <QuestionSpread
          key={campaignBook.pending.accused}
          c={campaignBook.c}
          interrogation={campaignBook.questioning}
          killer={campaignBook.pending.accused === campaignBook.c.murderer}
          rightWeapon={campaignBook.progress.accusations.at(-1)?.item === campaignBook.c.weapon}
          found={campaignBook.found}
          startAsked={campaignSample?.asked}
          onDone={campaignBook.resolve}
        />
      ) : null}
      {scene ? <CandleScene scene={scene} onContinue={() => setScene(null)} /> : null}
      {campaignBook && over && ending === 'scene' ? <CandleScene scene={escapedScene(campaignBook.save, campaignBook.cases[campaignBook.current])} onContinue={() => setEnding('replay')} /> : null}
      {campaignBook && over && nightSteps && endCases && endSave ? <CampaignReplay steps={nightSteps} cases={endCases} rounds={endSave.rounds} escaped={over === 'escaped'} onClose={() => setEnding(null)} /> : null}
    </div>
  );
}
