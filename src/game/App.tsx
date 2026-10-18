import { useEffect, useState } from 'react';
import { content } from '../content/index.ts';
import { caseCode, caseFor, newQuickCase, type Cast, type QuickRef } from '../engine/caseRef.ts';
import type { Length } from '../engine/settings.ts';
import type { Case, Difficulty } from '../engine/types.ts';
import { Casebook } from './Casebook.tsx';
import { Home } from './Home.tsx';
import { emptyProgress, type Progress } from './state.ts';
import { loadQuick, loadScreen, saveQuick, saveScreen, type Screen } from './storage.ts';

interface Current {
  ref: QuickRef;
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

/** Codes come from the browser's random numbers; the engine itself stays seeded. */
const randomNumber = () => crypto.getRandomValues(new Uint32Array(1))[0];

/** The home screen, or the case she's in. Reopening the app goes back to where she was. */
export function App() {
  const [current, setCurrent] = useState<Current | null>(restore);
  const [screen, setScreen] = useState<Screen>(() => (current ? loadScreen() : 'home'));

  useEffect(() => saveScreen(screen), [screen]);
  useEffect(() => {
    if (current) saveQuick({ ref: current.ref, progress: current.progress });
  }, [current]);

  const go = (s: Screen) => {
    setScreen(s);
    window.scrollTo(0, 0);
  };

  const start = (difficulty: Difficulty, length: Length, cast: Cast) => {
    const { ref, c } = newQuickCase(content, difficulty, length, cast, randomNumber);
    setCurrent({ ref, c, progress: emptyProgress() });
    go('case');
  };

  if (screen === 'case' && current) {
    return (
      <Casebook
        key={caseCode(current.ref)}
        c={current.c}
        progress={current.progress}
        onProgress={(update) => setCurrent((cur) => cur && { ...cur, progress: update(cur.progress) })}
        onHome={() => go('home')}
        onNewCase={() => start(current.ref.difficulty, current.ref.length, current.ref.cast ?? 'classic')}
      />
    );
  }
  return <Home current={current} onContinue={() => go('case')} onStart={start} />;
}
