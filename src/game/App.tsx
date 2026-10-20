import { useEffect, useState } from 'react';
import { content } from '../content/index.ts';
import type { CampaignRef } from '../engine/campaign.ts';
import { caseCode, caseFor, codeFor, newPickCase, newPlayCase, newQuickCase, type CaseRef, type Cast, type PickedGame } from '../engine/caseRef.ts';
import type { Length } from '../engine/settings.ts';
import type { Case, Difficulty } from '../engine/types.ts';
import { CampaignCard } from './CampaignCard.tsx';
import { CampaignSetup } from './CampaignSetup.tsx';
import { CampaignView } from './CampaignView.tsx';
import { Casebook } from './Casebook.tsx';
import { newCampaign, roundCase, type CampaignSave } from './campaign.ts';
import { Home } from './Home.tsx';
import { PickGames } from './PickGames.tsx';
import { caseTitle } from './names.ts';
import { emptyProgress, type Progress } from './state.ts';
import { loadCampaign, loadQuick, loadScreen, saveCampaign, saveQuick, saveScreen, type Screen } from './storage.ts';

interface Current {
  ref: CaseRef;
  c: Case;
  progress: Progress;
}

/** Her saved case, rebuilt from its code. A save that no longer builds is dropped. */
function restore(): Current | null {
  const saved = loadQuick();
  if (!saved) return null;
  try {
    return { ...saved, c: caseFor(content, saved.ref) };
  } catch {
    return null;
  }
}

/** Her saved campaign, if its first round still builds. */
function restoreCampaign(): CampaignSave | null {
  const saved = loadCampaign();
  if (!saved) return null;
  try {
    roundCase(content, saved, 0);
    return saved;
  } catch {
    return null;
  }
}

/** Codes come from the browser's random numbers; the engine itself stays seeded. */
const randomNumber = () => crypto.getRandomValues(new Uint32Array(1))[0];

/** The home screen, or the case she's in. Reopening the app goes back to where she was. */
export function App() {
  const [current, setCurrent] = useState<Current | null>(restore);
  const [campaign, setCampaign] = useState<CampaignSave | null>(restoreCampaign);
  const [screen, setScreen] = useState<Screen>(() => (current || campaign ? loadScreen() : 'home'));

  useEffect(() => saveScreen(screen), [screen]);
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

  const startPlay = () => {
    const made = newPlayCase(content, randomNumber);
    setCurrent({ ref: made.ref, c: made.c, progress: emptyProgress() });
    go('case');
  };

  /** The case she picked games for, from the code she saw. Throws if it won't build. */
  const startPick = (code: string, games: PickedGame[]) => {
    const made = newPickCase(content, code, games);
    setCurrent({ ref: made.ref, c: made.c, progress: emptyProgress() });
    go('case');
  };

  /** Another old-style Quick start case (only reachable from a saved one). */
  const start = (difficulty: Difficulty, length: Length, cast: Cast, endBoard: boolean) => {
    const made = newQuickCase(content, difficulty, length, cast, randomNumber);
    const ref: CaseRef = { ...made.ref, ...(endBoard && { endBoard }) };
    setCurrent({ ref, c: made.c, progress: emptyProgress() });
    go('case');
  };

  const startCampaign = (difficulty: Difficulty, possibleOnly: boolean, endBoard: boolean) => {
    for (let tries = 0; tries < 10; tries++) {
      const ref: CampaignRef = { mode: 'campaign', code: codeFor(randomNumber()), difficulty, ...(possibleOnly && { possibleOnly }), ...(endBoard && { endBoard }) };
      const save = newCampaign(ref);
      try {
        roundCase(content, save, 0);
      } catch {
        continue; // try another code
      }
      setCampaign(save);
      go('campaign');
      return;
    }
  };

  if (screen === 'campaign' && campaign) {
    return <CampaignView save={campaign} onSave={setCampaign} onHome={() => go('home')} />;
  }
  if (screen === 'pick') {
    return <PickGames random={randomNumber} onHome={() => go('home')} onStart={startPick} />;
  }
  if (screen === 'campaign-setup') {
    return <CampaignSetup campaign={campaign} onHome={() => go('home')} onStart={startCampaign} />;
  }
  if (screen === 'case' && current) {
    return (
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
  }
  return (
    <Home
      current={current}
      onContinue={() => go('case')}
      onStart={startPlay}
      onChoose={() => go('pick')}
      campaign={<CampaignCard campaign={campaign} onContinue={() => go('campaign')} onNew={() => go('campaign-setup')} />}
    />
  );
}
