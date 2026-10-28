// One #dev/<id> preview, full viewport. Every button does nothing: a preview never saves or leaves the page.

import { useEffect, useLayoutEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { cats, content } from '../content/index.ts';
import { isSceneGame } from '../engine/gameKinds.ts';
import { caseCode, newPlayCase } from '../engine/caseRef.ts';
import { generateCase } from '../engine/generate.ts';
import { midSentence } from '../engine/text.ts';
import type { Case } from '../engine/types.ts';
import { otherHouses, variantsOf } from '../content/houses.ts';
import { Casebook } from '../game/Casebook.tsx';
import { MapPanel } from '../game/MapPanel.tsx';
import { Dialog } from '../game/Dialog.tsx';
import { YouSheet } from '../game/YouSheet.tsx';
import { clockTime, gamesLeft } from '../game/explore.ts';
import { ROUND_TIMES } from '../game/labels.ts';
import { caseTitle, faceClass, itemName, suspectColour, suspectName } from '../game/names.ts';
import { HintButton, HintNote } from '../game/games/Hints.tsx';
import chairStyles from '../game/games/InterrogationGame.module.css';
import { SuspectCounterFace } from '../game/SuspectCounterFace.tsx';
import { NosingBoardView } from '../game/games/NosingBoardView.tsx';
import { buildNosing, nosingInitial, nosingView } from '../games/nosing.ts';
import { nosingLadders, nosingSnakes } from '../content/nosing.ts';
import { NextMurderScene } from '../game/NextMurderScene.tsx';
import { OpeningScene } from '../game/OpeningScene.tsx';
import { campaignRound } from '../engine/campaign.ts';
import { openingScript } from '../game/opening.ts';
import { emptyProgress, mentions, reduce, visibleClues, type Progress } from '../game/state.ts';
import { DogFightStates } from './DogFightStates.tsx';
import { MotivesPreview } from './MotivesPreview.tsx';
import { PortraitGallery } from './PortraitGallery.tsx';
import { OpenBook } from '../shelf/OpenBook.tsx';
import { DevList } from './DevList.tsx';
import { PREVIEWS } from './previews.ts';

const noop = () => {};

// Sample lines come from the content, never from names written here.
const victim = content.suspects[0].id;
const killer = content.suspects[1].id;
const guests = content.suspects.map((s) => s.id);
const weapon = content.items[0].id;

/** The campaign round both casebook previews show: built once, with at most two puzzles to play. */
let sample: Case | undefined;
function sampleRound(): Case {
  if (sample) return sample;
  const base = generateCase(content, 1, 'medium');
  const games = base.games.filter((g) => !isSceneGame(g)).length;
  sample = {
    ...base,
    explore: true,
    campaign: { round: 0, rounds: 3, budget: games >= 2 ? 2 : 1, last: false, victims: [] },
  };
  return sample;
}

/** Progress with the first `budget` puzzles won, so the clock reads midnight. */
function finishedProgress(c: Case): Progress {
  const p = emptyProgress();
  const budget = c.campaign?.budget ?? 1;
  const games = c.games.filter((g) => !isSceneGame(g)).slice(0, budget);
  for (const g of games) p.games[g.kind] = { status: 'won', data: null };
  return p;
}

/** A round-1 campaign case whose opening has a cat sheet (free evidence), the first such code from a short list. */
let openingSample: Case | undefined;
function openingCase(): Case {
  if (openingSample) return openingSample;
  let found: Case | undefined;
  for (const code of ['ABCDE', 'K7QF2', 'ZZZZZ', 'M3N4P', 'Q9R8S', 'T2U3V', 'W5X6Y', 'B7C8D']) {
    const c = campaignRound(content, { mode: 'campaign', code, difficulty: 'medium' }, []);
    found ??= c;
    if (openingScript(c).catClues.length > 0) {
      found = c;
      break;
    }
  }
  openingSample = { ...found!, explore: true };
  return openingSample;
}

/** The opening's progress with the first `n` guests (and the cat, when asked) spoken to. */
function openingProgress(c: Case, n: number, cat = false): Progress {
  let p: Progress = { ...emptyProgress(), opening: { talked: [] } };
  for (const g of c.suspects.slice(0, n)) p = reduce(c, p, { type: 'opening-talk', guest: g });
  return cat ? reduce(c, p, { type: 'opening-cat' }) : p;
}

function OpeningPreview({ kind }: { kind: 'start' | 'midway' | 'cat' | 'skip' }) {
  const c = openingCase();
  const n = c.suspects.length;
  const progress = openingProgress(c, kind === 'start' ? 0 : kind === 'cat' ? n : kind === 'skip' ? 2 : 3);
  return (
    <OpeningScene
      c={c}
      progress={progress}
      dispatch={noop}
      onHome={noop}
      initial={kind === 'midway' ? { person: c.suspects[2] } : kind === 'cat' ? { person: 'cat' } : kind === 'skip' ? { skip: 'summary' } : undefined}
    />
  );
}

function NextMurderPreview() {
  return (
    <NextMurderScene heading={`${suspectName(victim, guests)} wasn't the killer`} nextTime={ROUND_TIMES[1].toLowerCase()} onContinue={noop}>
      Later that night, {midSentence(suspectName(victim, guests))} is found dead. The killer is still among the guests, and you have 2
      accusations left.
    </NextMurderScene>
  );
}

function EscapedPreview() {
  return (
    <Dialog placement="center" labelId="escaped-title" onClose={noop}>
      <h2 id="escaped-title">The killer got away</h2>
      <p className="dialog-text">
        {suspectName(victim, guests)} wasn't the killer either. By dawn, {midSentence(suspectName(killer, guests))} was gone, with the {itemName(weapon)}.
      </p>
      <div className="dialog-actions single">
        <button data-autofocus className="primary" onClick={noop}>
          See the case
        </button>
      </div>
    </Dialog>
  );
}

function GuessNowPreview() {
  return (
    <Dialog placement="center" labelId="guess-title" onClose={noop}>
      <h2 id="guess-title">Guess now?</h2>
      <p className="dialog-text">Your clues still point at 3 people. Guess now?</p>
      <div className="dialog-actions">
        <button data-autofocus className="secondary" onClick={noop}>
          Not yet
        </button>
        <button className="primary" onClick={noop}>
          Guess now
        </button>
      </div>
    </Dialog>
  );
}

function TimeCardPreview() {
  const c = sampleRound();
  const p = emptyProgress();
  // The card after the first of two puzzles: "10:30", one game left.
  const second = { ...c, campaign: { ...c.campaign!, budget: 2 } };
  const one = second.games.filter((g) => !isSceneGame(g))[0];
  if (one) p.games[one.kind] = { status: 'won', data: null };
  const left = gamesLeft(second, p);
  return (
    <Dialog placement="center" labelId="time-title" onClose={noop}>
      <div className="time-card held">
        <h2 id="time-title">{clockTime(second, p)}</h2>
        <p>{left ? `${left} game${left === 1 ? '' : 's'} left` : "Time's up"}</p>
      </div>
    </Dialog>
  );
}

function CasebookPreview({ midnight }: { midnight: boolean }) {
  const c = sampleRound();
  const budget = c.campaign?.budget ?? 1;
  const progress = midnight ? finishedProgress(c) : emptyProgress();
  return (
    <Casebook
      c={c}
      progress={progress}
      onProgress={noop}
      onHome={noop}
      onNewCase={noop}
      title={ROUND_TIMES[midnight ? 1 : 0]}
      gate={{ budget, left: midnight ? 0 : budget, picked: [], onPick: noop }}
      startTab="map"
    />
  );
}

/** The "You" sheet over the sample round, after one puzzle, with one pick left. */
function YouSheetPreview() {
  const c = sampleRound();
  const p = emptyProgress();
  const one = c.games.filter((g) => !isSceneGame(g))[0];
  if (one) p.games[one.kind] = { status: 'won', data: null };
  return <YouSheet c={c} progress={p} picksLeft={Math.max(0, (c.campaign?.budget ?? 1) - 1)} onClose={noop} />;
}

/** Every layout in all 8 orientations (turned and mirrored), each drawn by the real map with nobody placed. */
function HousesPreview() {
  const base = generateCase(content, 1, 'medium');
  return (
    <main className="panel">
      {otherHouses.map((layout) => (
        <section key={layout.id} aria-label={layout.name}>
          <h2 style={{ color: '#f4f0e4' }}>{layout.name}</h2>
          {variantsOf(layout).map((h) => {
            const c: Case = { ...base, suspects: [], items: [], rooms: h.rooms.map((r) => r.id), sceneRoom: h.rooms[0].id };
            return (
              <div key={h.id} data-testid={`house-${h.id}`}>
                <h3 style={{ color: '#d8ccb0' }}>{h.id}</h3>
                <MapPanel c={c} progress={emptyProgress()} dispatch={noop} onAccused={noop} house={h} />
              </div>
            );
          })}
        </section>
      ))}
    </main>
  );
}

/** The Nosing around board on each other house at medium, at the start of a game (no cat walk, no questions). */
function NosingHousesPreview() {
  return (
    <main className="panel">
      {otherHouses.map((h) => {
        const puzzle = buildNosing({ house: h, seed: `dev-${h.id}`, level: 'medium', sceneRoom: h.rooms[0].id, clues: ['c1', 'c2', 'c3', 'c4', 'c5'], ladders: nosingLadders, snakes: nosingSnakes });
        return (
          <section key={h.id} aria-label={h.name} data-testid={`nosing-${h.id}`} className="nosing">
            <h2 style={{ color: '#f4f0e4' }}>{h.name}</h2>
            <NosingBoardView puzzle={puzzle} view={nosingView(puzzle, nosingInitial())} catAt={0} />
          </section>
        );
      })}
    </main>
  );
}

/** The cat's circular counter on the hint chrome (a button per cat, an open note) and the questioning chair's portrait. */
function HintsPreview() {
  const chair = 'butler';
  return (
    <main className="panel">
      <section aria-label="Hint buttons" style={{ display: 'grid', gap: '0.6rem', justifyItems: 'start' }}>
        {cats.map((cat) => (
          <HintButton key={cat} helper={cat} onAsk={noop} />
        ))}
      </section>
      <section aria-label="Hint note">
        <HintNote helper={cats[0]} text={`${cats[0]} pads across your casebook and sits on a mark that isn't right.`} onClose={noop} />
      </section>
      <div className={chairStyles.interrogation}>
        <section className={`${chairStyles.chair} card`} aria-label="Questioning chair">
          <span className={`counter static${faceClass(chair)}`} style={{ '--counter': suspectColour(chair) } as CSSProperties} aria-hidden="true">
            <SuspectCounterFace id={chair} guests={[chair]} />
          </span>
          <div>
            <h2>{suspectName(chair, [chair])} is in the chair</h2>
            <p className="muted">3 questions left.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

/**
 * The #shelf puzzle book open on Case, ribbons dropped. Its styles live under body.shelf, so borrow
 * that class, in a layout effect so it is on before the book's own effect places the ribbons.
 */
/** A sample case with its first game finished, so the shelf pages show a list without her save. */
function useShelfSample(page?: 'unplayed' | 'won' | 'revealed') {
  return useMemo(() => {
    // A Play case, like her saved Quick case: every game carries clues.
    const { ref, c } = newPlayCase(content, () => 0.5);
    const progress = emptyProgress();
    progress.games[c.games[0].kind] = { status: page === 'revealed' ? 'revealed' : 'won' };
    // A puzzle page opens on the second game (still to play) or on the finished first one.
    const open = page === undefined ? undefined : page === 'unplayed' ? c.games[1].kind : c.games[0].kind;
    return { c, progress, ref: caseCode(ref), seen: true, open };
  }, [page]);
}

function ShelfFindACluePreview() {
  useLayoutEffect(() => {
    document.body.classList.add('shelf');
    return () => document.body.classList.remove('shelf');
  }, []);
  const sample = useShelfSample();
  return (
    <OpenBook
      title={caseTitle({ mode: 'quick', code: 'K7QF2', difficulty: 'medium', length: 'normal' })}
      tone="quick"
      from={{ left: 0, top: 0, width: 360, height: 780 }}
      onBack={noop}
      startOpen
      sample={sample}
    />
  );
}

/** The Find a clue page with a game's puzzle page already open over the book. */
function ShelfPuzzlePreview({ page }: { page: 'unplayed' | 'won' | 'revealed' }) {
  useLayoutEffect(() => {
    document.body.classList.add('shelf');
    return () => document.body.classList.remove('shelf');
  }, []);
  const sample = useShelfSample(page);
  return <OpenBook title={caseTitle({ mode: 'quick', code: 'K7QF2', difficulty: 'medium', length: 'normal' })} tone="quick" from={{ left: 0, top: 0, width: 360, height: 780 }} onBack={noop} sample={sample} />;
}

/** The New case book over a case built from a fixed seed: the opening not yet seen, nothing saved. */
function ShelfNewCasePreview() {
  useLayoutEffect(() => {
    document.body.classList.add('shelf');
    return () => document.body.classList.remove('shelf');
  }, []);
  // The real book swaps "New case" for the built case's title; a sample has no save, so title it here.
  const [{ title, fresh }] = useState(() => {
    const { ref, c } = newPlayCase(content, () => 0.5);
    return { title: caseTitle(ref), fresh: { c, progress: emptyProgress(), ref: caseCode(ref), seen: false } };
  });
  return <OpenBook title={title} tone="fresh" from={{ left: 0, top: 0, width: 360, height: 780 }} onBack={noop} sample={fresh} />;
}

function ShelfRibbonsPreview() {
  useLayoutEffect(() => {
    document.body.classList.add('shelf');
    return () => document.body.classList.remove('shelf');
  }, []);
  const sample = useShelfSample();
  return <OpenBook title={caseTitle({ mode: 'quick', code: 'K7QF2', difficulty: 'medium', length: 'normal' })} tone="quick" from={{ left: 0, top: 0, width: 360, height: 780 }} onBack={noop} startOpen sample={sample} />;
}

/**
 * The #shelf notebook over the sample case: a few games won (so there are clues), one guest placed, one
 * cross. `view` picks how it starts: peeking on Case, open on You, open on Grid, or open on a guest's page.
 */
function ShelfNotebookPreview({ view }: { view: 'peek' | 'you' | 'grid' | 'subject' }) {
  useLayoutEffect(() => {
    document.body.classList.add('shelf');
    return () => document.body.classList.remove('shelf');
  }, []);
  const sample = useMemo(() => {
    const { ref, c } = newPlayCase(content, () => 0.5);
    let progress = emptyProgress();
    for (const g of c.games.slice(0, 3)) progress = reduce(c, progress, { type: 'game-finish', kind: g.kind, status: 'won', data: null });
    progress = reduce(c, progress, { type: 'place', suspect: c.suspects[0], room: c.rooms[0] });
    progress = reduce(c, progress, { type: 'cycle', kind: 'suspect-room', row: c.suspects[1], col: c.rooms[1] });
    const found = visibleClues(c, progress);
    // The guest with the most clues about them, so the subject page has some.
    const count = (id: string) => found.filter((cl) => mentions(cl, { kind: 'suspect', id })).length;
    const guest = [...c.suspects].sort((a, b) => count(b) - count(a))[0];
    const notebook = {
      peek: {},
      you: { open: true, tab: 'you' as const },
      grid: { open: true, tab: 'grid' as const },
      subject: { open: true, tab: 'guests' as const, subject: { kind: 'suspect' as const, id: guest } },
    }[view];
    return { c, progress, ref: caseCode(ref), seen: true, notebook };
  }, [view]);
  return <OpenBook title={caseTitle({ mode: 'quick', code: 'K7QF2', difficulty: 'medium', length: 'normal' })} tone="quick" from={{ left: 0, top: 0, width: 360, height: 780 }} onBack={noop} startOpen sample={sample} />;
}

const SCREENS: Record<string, () => ReactNode> = {
  hints: () => <HintsPreview />,
  houses: () => <HousesPreview />,
  'nosing-houses': () => <NosingHousesPreview />,
  'next-murder': () => <NextMurderPreview />,
  opening: () => <OpeningPreview kind="start" />,
  'opening-midway': () => <OpeningPreview kind="midway" />,
  'opening-cat': () => <OpeningPreview kind="cat" />,
  'opening-skip': () => <OpeningPreview kind="skip" />,
  escaped: () => <EscapedPreview />,
  'guess-now': () => <GuessNowPreview />,
  'time-card': () => <TimeCardPreview />,
  explore: () => <CasebookPreview midnight={false} />,
  midnight: () => <CasebookPreview midnight />,
  'you-sheet': () => <YouSheetPreview />,
  motives: () => <MotivesPreview />,
  'shelf-ribbons': () => <ShelfRibbonsPreview />,
  'shelf-new-case': () => <ShelfNewCasePreview />,
  'shelf-find-a-clue': () => <ShelfFindACluePreview />,
  'shelf-notebook': () => <ShelfNotebookPreview view="peek" />,
  'shelf-notebook-you': () => <ShelfNotebookPreview view="you" />,
  'shelf-notebook-grid': () => <ShelfNotebookPreview view="grid" />,
  'shelf-notebook-subject': () => <ShelfNotebookPreview view="subject" />,
  'shelf-puzzle': () => <ShelfPuzzlePreview page="unplayed" />,
  'shelf-puzzle-won': () => <ShelfPuzzlePreview page="won" />,
  'shelf-puzzle-revealed': () => <ShelfPuzzlePreview page="revealed" />,
  portraits: () => <PortraitGallery />,
  dogfight: () => <DogFightStates />,
};

export function DevPreview({ id }: { id: string }) {
  const info = PREVIEWS.find((p) => p.id === id);
  const render = SCREENS[id];

  // A game screen keeps the baize page; the portrait gallery stays on the light dev page.
  useEffect(() => {
    document.body.classList.toggle('dev-game', info?.look === 'game');
  }, [info]);

  if (!info || !render) {
    return (
      <main className="inspector">
        <h1>No preview called "{id}"</h1>
        <DevList />
      </main>
    );
  }
  return (
    <>
      <a className="dev-back" href="#dev" aria-label="Back to dev pages">
        ‹
      </a>
      {render()}
    </>
  );
}
