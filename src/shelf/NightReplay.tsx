import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Case } from '../engine/types.ts';
import { Summation } from '../game/Summation.tsx';
import { unlockedClueIds, type Progress } from '../game/state.ts';
import { fullSteps, roundInput, type SumStep } from '../game/summation.ts';
import { shelfCite } from './answer.ts';
import styles from './NightReplay.module.css';
import { useBackLayer } from './useBackLayer.ts';

interface Props {
  c: Case;
  progress: Progress;
  /** The last step's button, Skip and Back all end here (on the solved Answer page). */
  onClose: () => void;
  /** The step to open on (the dev preview). */
  startAt?: number;
}

/** The full-screen paper layer: `Summation` one step at a time over whichever case and progress each step belongs to. */
function Replay({ steps, caseOf, progressOf, escaped, onClose, startAt = 0 }: {
  steps: SumStep[];
  caseOf: (round: number) => Case;
  progressOf: (round: number) => Progress;
  escaped?: boolean;
  onClose: () => void;
  startAt?: number;
}) {
  const [at, setAt] = useState(Math.min(startAt, steps.length - 1));
  const rootRef = useRef<HTMLDivElement>(null);
  useBackLayer(true, onClose);
  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
  }, []);
  // Each step starts at the top of the page.
  useEffect(() => {
    rootRef.current?.scrollTo(0, 0);
  }, [at]);

  const step = steps[at];
  const last = at === steps.length - 1;
  const c = caseOf(step.round);
  return createPortal(
    <div ref={rootRef} className={styles.root} tabIndex={-1} data-testid="night-replay">
      <div className={styles.sheet}>
        <span className={styles.spine} aria-hidden="true" />
        <p className={styles.running}>The night, as it was</p>
        <Summation c={c} step={step} last={last} escaped={escaped} cite={shelfCite(c, progressOf(step.round), step)} onNext={() => (last ? onClose() : setAt(at + 1))} onSkip={onClose} />
      </div>
    </div>,
    document.body,
  );
}

/**
 * The ending: where every guest really was, one at a time, the killer last. It is `Summation` on a
 * full-screen paper page over the open book (portalled to `document.body`, like `PuzzlePage`), so the
 * notebook strip and the section swipes are covered. The cite line is the #shelf wording (`shelfCite`).
 */
export function NightReplay({ c, progress, onClose, startAt = 0 }: Props) {
  const [steps] = useState(() => fullSteps(roundInput(c, unlockedClueIds(c, progress))));
  return <Replay steps={steps} caseOf={() => c} progressOf={() => progress} onClose={onClose} startAt={startAt} />;
}

/** A campaign's night: a short step per earlier round, then the last round in full (`nightFor`). */
export function CampaignReplay({ steps, cases, rounds, escaped, onClose }: { steps: SumStep[]; cases: readonly Case[]; rounds: readonly Progress[]; escaped?: boolean; onClose: () => void }) {
  return <Replay steps={steps} caseOf={(i) => cases[i]} progressOf={(i) => rounds[i]} escaped={escaped} onClose={onClose} />;
}
