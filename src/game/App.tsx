import { useEffect, useState, type ReactNode } from 'react';
import { caseCode, type CaseRef, type Cast, type PickedGame } from '../engine/caseRef.ts';
import type { Length } from '../engine/settings.ts';
import type { Case, Difficulty } from '../engine/types.ts';
import { CampaignCard } from './CampaignCard.tsx';
import { CampaignSetup } from './CampaignSetup.tsx';
import { CampaignView } from './CampaignView.tsx';
import { Casebook } from './Casebook.tsx';
import type { CampaignSave } from './campaign.ts';
import { generate } from './caseClient.ts';
import { Home } from './Home.tsx';
import { PickGames } from './PickGames.tsx';
import { Shuffling } from './Shuffling.tsx';
import { caseTitle } from './names.ts';
import { emptyProgress, type Progress } from './state.ts';
import { loadCampaign, loadQuick, loadScreen, saveCampaign, saveQuick, saveScreen, type Screen } from './storage.ts';

interface Current {
  ref: CaseRef;
  c: Case;
  progress: Progress;
}

/** Codes come from the browser's random numbers; the engine itself stays seeded. */
const randomNumber = () => crypto.getRandomValues(new Uint32Array(1))[0];

/** The home screen, or the case she's in. Reopening the app goes back to where she was. */
export function App() {
  // Saves are read at once (cheap); the cases are rebuilt from them in the background.
  const [saved] = useState(() => ({ quick: loadQuick(), campaign: loadCampaign() }));
  const [current, setCurrent] = useState<Current | null>(null);
  const [campaign, setCampaign] = useState<CampaignSave | null>(null);
  const [booting, setBooting] = useState(!!(saved.quick || saved.campaign));
  const [busy, setBusy] = useState(false);
  const [screen, setScreen] = useState<Screen>(() => (saved.quick || saved.campaign ? loadScreen() : 'home'));

  // A save that no longer builds is dropped.
  useEffect(() => {
    if (!booting) return;
    let live = true;
    const quick = saved.quick
      ? generate({ kind: 'case', ref: saved.quick.ref }).then(
          (c): Current | null => (saved.quick ? { ...saved.quick, c } : null),
          () => null,
        )
      : Promise.resolve(null);
    const camp = saved.campaign
      ? generate({ kind: 'campaign-rounds', save: saved.campaign }).then(
          () => saved.campaign,
          () => null,
        )
      : Promise.resolve(null);
    Promise.all([quick, camp]).then(([q, c]) => {
      if (!live) return;
      setCurrent(q);
      setCampaign(c);
      setBooting(false);
    });
    return () => {
      live = false;
    };
  }, [booting, saved]);

  // Don't overwrite the saved screen with the placeholder before the boot finishes.
  useEffect(() => {
    if (!booting) saveScreen(screen);
  }, [screen, booting]);
  useEffect(() => {
    if (current) saveQuick({ ref: current.ref, progress: current.progress });
  }, [current]);
  useEffect(() => {
    if (campaign) saveCampaign(campaign);
  }, [campaign]);

  const go = (s: Screen) => {
    setScreen(s);
    window.scrollTo(0, 0);
  };

  /** Run one build behind the overlay; taps are ignored meanwhile. Failures are logged and she stays put. */
  const building = async <T,>(work: () => Promise<T>, done: (made: T) => void, rethrow = false): Promise<void> => {
    if (busy) return;
    setBusy(true);
    try {
      done(await work());
    } catch (err) {
      console.error(err);
      if (rethrow) throw err;
    } finally {
      setBusy(false);
    }
  };

  const startCase = (made: { ref: CaseRef; c: Case }) => {
    setCurrent({ ref: made.ref, c: made.c, progress: emptyProgress() });
    go('case');
  };

  const startPlay = () => building(() => generate({ kind: 'play' }), startCase);

  /** The case she picked games for, from the code she saw. Rejects if it won't build. */
  const startPick = (code: string, games: PickedGame[]) => building(() => generate({ kind: 'pick', code, games }), startCase, true);

  /** Another old-style Quick start case (only reachable from a saved one). */
  const start = (difficulty: Difficulty, length: Length, cast: Cast, endBoard: boolean) =>
    building(
      () => generate({ kind: 'quick', difficulty, length, cast }),
      (made) => startCase({ ref: { ...made.ref, ...(endBoard && { endBoard }) }, c: made.c }),
    );

  const startCampaign = (difficulty: Difficulty, possibleOnly: boolean, endBoard: boolean) =>
    building(
      () => generate({ kind: 'campaign-new', difficulty, possibleOnly, endBoard }),
      (made) => {
        setCampaign(made.save);
        go('campaign');
      },
    );

  if (booting) return <Shuffling />;

  let body: ReactNode;
  if (screen === 'campaign' && campaign) {
    body = <CampaignView save={campaign} onSave={setCampaign} onHome={() => go('home')} />;
  } else if (screen === 'pick') {
    body = <PickGames random={randomNumber} onHome={() => go('home')} onStart={startPick} />;
  } else if (screen === 'campaign-setup') {
    body = <CampaignSetup campaign={campaign} onHome={() => go('home')} onStart={startCampaign} />;
  } else if (screen === 'case' && current) {
    body = (
      <Casebook
        key={caseCode(current.ref)}
        c={current.c}
        title={caseTitle(current.ref)}
        progress={current.progress}
        endBoard={current.ref.mode === 'quick' ? current.ref.endBoard : undefined}
        onProgress={(update) => setCurrent((cur) => cur && { ...cur, progress: update(cur.progress) })}
        onHome={() => go('home')}
        onNewCase={() =>
          current.ref.mode === 'play' ? startPlay() : start(current.ref.difficulty, current.ref.length, current.ref.cast ?? 'classic', !!current.ref.endBoard)
        }
      />
    );
  } else {
    body = (
      <Home
        current={current}
        onContinue={() => go('case')}
        onStart={startPlay}
        onChoose={() => go('pick')}
        campaign={<CampaignCard campaign={campaign} onContinue={() => go('campaign')} onNew={() => go('campaign-setup')} />}
      />
    );
  }
  return (
    <>
      {body}
      {busy && <Shuffling />}
    </>
  );
}
