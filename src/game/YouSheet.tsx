import type { Case } from '../engine/types.ts';
import { playerPortrait } from '../content/portraits.ts';
import { Dialog } from './Dialog.tsx';
import { PortraitCard } from './ExploreMap.tsx';
import type { Progress } from './state.ts';
import { youLines } from './youSheet.ts';

/** "You": her portrait and tonight at a glance. Information only, so it works in read-only rounds too. */
export function YouSheet({ c, progress, picksLeft, onClose }: { c: Case; progress: Progress; picksLeft?: number; onClose: () => void }) {
  return (
    <Dialog onClose={onClose} labelId="you-title">
      <div className="you-head">
        <h2 id="you-title">You</h2>
        <button data-autofocus type="button" className="sheet-close" aria-label="Close" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="you-card">
        <PortraitCard parts={playerPortrait} tint="none" caption="You" />
      </div>
      <ul className="you-lines">
        {youLines(c, progress, picksLeft).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </Dialog>
  );
}
