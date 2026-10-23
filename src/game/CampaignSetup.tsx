import { useState } from 'react';
import { PER_PUZZLE, type PerPuzzle } from '../engine/campaign.ts';
import { DIFFICULTIES } from '../engine/settings.ts';
import type { Difficulty } from '../engine/types.ts';
import { Picker } from './AccusePanel.tsx';
import { DIFFICULTY_LABEL } from './labels.ts';
import { Dialog } from './Dialog.tsx';
import { FINISHES, FINISH_HINT, FINISH_LABEL, type Finish } from './labels.ts';
import type { CampaignSave } from './campaignSave.ts';

const PER_PUZZLE_LABEL: Record<string, string> = { 3: 'Three', 2: 'Two', 1: 'One' };
type Accusing = 'anyone' | 'possible';
const ACCUSING_LABEL: Record<Accusing, string> = { anyone: 'Anyone alive', possible: 'Only possible killers' };

interface Props {
  /** The last campaign: its choices are where the pickers start. */
  campaign: CampaignSave | null;
  onHome: () => void;
  onStart: (difficulty: Difficulty, possibleOnly: boolean, endBoard: boolean, perPuzzle: PerPuzzle) => void;
}

/** Choose a new campaign's difficulty, who she can accuse and the final puzzle. */
export function CampaignSetup({ campaign, onHome, onStart }: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>(campaign?.ref.difficulty ?? 'medium');
  const [accusing, setAccusing] = useState<Accusing>(campaign?.ref.possibleOnly ? 'possible' : 'anyone');
  const [finish, setFinish] = useState<Finish>(campaign?.ref.endBoard ? 'jigsaw' : 'grid');
  const [perPuzzle, setPerPuzzle] = useState<PerPuzzle>(campaign?.ref.perPuzzle ?? 3);
  const [confirming, setConfirming] = useState(false);
  const unfinished = campaign?.outcome === 'playing';
  const start = () => onStart(difficulty, accusing === 'possible', finish === 'jigsaw', perPuzzle);

  return (
    <div className="casebook">
      <header className="case-header">
        <button className="step" aria-label="Home" onClick={onHome}>
          ‹
        </button>
        <div className="case-title">
          <h1>New campaign</h1>
        </div>
        <span aria-hidden="true" />
      </header>
      <main>
        <article className="card">
          <Picker
            legend="Difficulty"
            options={DIFFICULTIES}
            value={difficulty}
            onChange={(d) => setDifficulty(d as Difficulty)}
            name={(d) => DIFFICULTY_LABEL[d as Difficulty]}
          />
          <Picker
            legend="Clues per puzzle"
            options={PER_PUZZLE.map(String)}
            value={String(perPuzzle)}
            onChange={(v) => setPerPuzzle(Number(v) as PerPuzzle)}
            name={(v) => PER_PUZZLE_LABEL[v]}
          />
          <p className="muted home-lead">Fewer clues per puzzle means more puzzles to play each night.</p>
          <Picker
            legend="Who you can accuse"
            options={['anyone', 'possible']}
            value={accusing}
            onChange={(v) => setAccusing(v as Accusing)}
            name={(v) => ACCUSING_LABEL[v as Accusing]}
          />
          <Picker legend="Final puzzle" options={FINISHES} value={finish} onChange={(v) => setFinish(v as Finish)} name={(v) => FINISH_LABEL[v as Finish]} />
          <p className="muted home-lead">{FINISH_HINT[finish]}</p>
          <button className="primary" onClick={() => (unfinished ? setConfirming(true) : start())}>
            Start the campaign
          </button>
        </article>
      </main>

      {confirming && (
        <Dialog placement="center" labelId="new-campaign-title" onClose={() => setConfirming(false)}>
          <h2 id="new-campaign-title">Start a new campaign?</h2>
          <p className="dialog-text">Your campaign isn't over yet. A new one replaces it, with a new cast and killer.</p>
          <div className="dialog-actions">
            <button data-autofocus className="secondary" onClick={() => setConfirming(false)}>
              Keep playing
            </button>
            <button
              className="primary"
              onClick={() => {
                setConfirming(false);
                start();
              }}
            >
              Start new
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
