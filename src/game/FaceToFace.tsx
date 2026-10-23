import { houseOf } from '../content/houses.ts';
import { useState } from 'react';
import { caseFacts } from '../engine/caseFacts.ts';
import { disproves } from '../engine/interrogation.ts';
import type { Case, Interrogation } from '../engine/types.ts';
import { endingKind, faceLine } from './face.ts';
import { InterrogationGame } from './games/InterrogationGame.tsx';
import { interrogationInitial } from './games/saveData.ts';
import type { InterrogationData } from './state.ts';

interface Props {
  c: Case;
  interrogation: Interrogation;
  /** Whether the accused is the killer, and whether the weapon was right (the verdict is already fixed). */
  killer: boolean;
  rightWeapon: boolean;
  /** The clue ids she had found when she accused. */
  found: readonly string[];
  /** The questioning is over (or skipped): show the verdict. */
  onDone: () => void;
}

/**
 * The accused in the chair after her accusation (campaign). It plays the verdict out and changes nothing:
 * no strikes, no clues, nothing saved. When she stops, or catches the lie, the accused has a closing line.
 */
export function FaceToFace({ c, interrogation, killer, rightWeapon, found, onDone }: Props) {
  const [data, setData] = useState<InterrogationData>(interrogationInitial);
  const [finished, setFinished] = useState<'won' | 'revealed' | null>(null);
  const evidence = c.clues.filter((cl) => found.includes(cl.id) && cl.delivery !== 'finale');
  const cf = caseFacts(houseOf(c), c);
  const seed = `${c.seed}-face-${interrogation.suspect}`;
  const kind = endingKind(killer, rightWeapon, interrogation.cracks);
  const finish = (status: 'won' | 'revealed') => setFinished(status);

  return (
    <div className="game-screen">
      <header className="game-header">
        <span />
        <h1>Questioning</h1>
        <span />
      </header>
      <div className="game-body">
        <InterrogationGame
          puzzle={interrogation}
          data={data}
          guests={c.guests}
          evidence={evidence}
          disproves={(cards, answer) => disproves(cf, cards.map((x) => x.fact), answer.answer.fact)}
          finished={finished}
          onChange={setData}
          onFinish={(status, d) => {
            setData(d);
            finish(status);
          }}
          face={{
            retort: (n) => faceLine('retort', `${seed}-${n}`),
            onStop: () => finish('revealed'),
            onSkip: onDone,
            onSolve: () => finish('revealed'),
          }}
        />
        {finished && (
          <section className="card face-ending" aria-live="polite">
            <p className={kind === 'innocent' ? 'face-line narrator' : 'face-line'}>
              {kind === 'innocent' ? faceLine(kind, seed) : `“${faceLine(kind, seed)}”`}
            </p>
            <button className="primary" onClick={onDone}>
              On to the verdict
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
