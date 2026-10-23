// One #dev/<id> preview, full viewport. Every button does nothing: a preview never saves or leaves the page.

import { useEffect, type ReactNode } from 'react';
import { content } from '../content/index.ts';
import { isSceneGame } from '../engine/gameKinds.ts';
import { generateCase } from '../engine/generate.ts';
import { midSentence } from '../engine/text.ts';
import type { Case } from '../engine/types.ts';
import { Casebook } from '../game/Casebook.tsx';
import { Dialog } from '../game/Dialog.tsx';
import { clockTime, gamesLeft } from '../game/explore.ts';
import { ROUND_TIMES } from '../game/labels.ts';
import { itemName, suspectName } from '../game/names.ts';
import { NextMurderScene } from '../game/NextMurderScene.tsx';
import { emptyProgress, type Progress } from '../game/state.ts';
import { PortraitGallery } from './PortraitGallery.tsx';
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

const SCREENS: Record<string, () => ReactNode> = {
  'next-murder': () => <NextMurderPreview />,
  escaped: () => <EscapedPreview />,
  'guess-now': () => <GuessNowPreview />,
  'time-card': () => <TimeCardPreview />,
  explore: () => <CasebookPreview midnight={false} />,
  midnight: () => <CasebookPreview midnight />,
  portraits: () => <PortraitGallery />,
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
        <ul>
          {PREVIEWS.map((p) => (
            <li key={p.id}>
              <a href={`#dev/${p.id}`}>{p.id}</a> <span className="muted">{p.about}</span>
            </li>
          ))}
        </ul>
      </main>
    );
  }
  return <>{render()}</>;
}
