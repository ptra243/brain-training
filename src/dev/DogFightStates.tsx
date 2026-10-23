// The #dev/dogfight "Dog fight states" panel: a real NosingDog screen on fixed views, so the arena
// band can be judged in each situation (who attacks, lives, the last-turn line).

import { useState } from 'react';
import { cats } from '../content/index.ts';
import { NosingDog } from '../game/games/NosingDog.tsx';
import type { DogNumberCard, DogOpCard, DogTurnResult, DogView } from '../games/dogFight.ts';
import type { GridEval, GridFill } from '../games/numberGrid.ts';

const numbers: DogNumberCard[] = [
  { index: 0, id: 'fool', value: 4, name: 'The Fool', used: false },
  { index: 1, id: 'magician', value: 7, name: 'The Magician', used: false },
  { index: 2, id: 'empress', value: 3, name: 'The Empress', used: false },
  { index: 3, id: 'emperor', value: 9, name: 'The Emperor', used: false },
  { index: 4, id: 'lovers', value: 2, name: 'The Lovers', used: false },
];
const ops: DogOpCard[] = [
  { index: 0, op: '+', used: false },
  { index: 1, op: '*', used: false },
  { index: 2, op: '-', used: false },
];
const fill: GridFill = [0, 1, 2].map(() => ({ rowOp: null, nums: [null, null, null], ops: [null, null] }) as GridFill[number]);
const evaluation: GridEval = {
  rows: [0, 1, 2].map(() => ({ used: false, value: null, total: null })),
  errors: [],
  answer: null,
  numbersUsed: 0,
  submittable: false,
};

const lastOf = (over: Partial<DogTurnResult>): DogTurnResult => ({
  turn: 2,
  role: 'attack',
  catValue: 14,
  dogValue: 11,
  catLines: [],
  dogLines: [],
  dogLost: 0,
  catLost: 0,
  bonusCard: false,
  challenge: null,
  challengeMet: false,
  ...over,
});

const baseView: DogView = {
  turn: 3,
  role: 'defend',
  catLives: 3,
  dogLives: 3,
  numbers,
  ops,
  dog: { value: 13, fill, lines: [], numbers: [6, 7, 2], ops: ['+', '*'], cardIds: [], redeals: 0, fallback: false },
  fill,
  eval: evaluation,
  last: null,
  over: null,
  hints: 0,
  hintsThisTurn: 0,
  challenge: null,
  swapAvailable: true,
};
const attackView: DogView = { ...baseView, role: 'attack', challenge: { kind: 'even' } };

const bonusNumbers: DogNumberCard[] = [...numbers, { index: 5, id: 'chariot', value: 8, name: 'The Chariot', used: false }];
const bonusOps: DogOpCard[] = [...ops, { index: 3, op: '/', used: false }];

const states: { name: string; view: DogView }[] = [
  { name: 'Dog attacks', view: baseView },
  { name: 'Cat attacks', view: attackView },
  { name: 'Dog just lost a life', view: { ...attackView, dogLives: 2, last: lastOf({ dogLost: 1 }) } },
  { name: 'Cat on 1 life', view: { ...baseView, catLives: 1 } },
  { name: 'Dog on 1 life', view: { ...attackView, dogLives: 1 } },
  { name: 'Extra draw (bonus hand)', view: { ...baseView, numbers: bonusNumbers, ops: bonusOps } },
  { name: 'Last: attack twice', view: { ...attackView, dogLives: 1, last: lastOf({ dogLost: 2 }) } },
  { name: 'Last: attack once', view: { ...attackView, dogLives: 2, last: lastOf({ dogLost: 1 }) } },
  { name: 'Last: attack missed', view: { ...attackView, last: lastOf({ catValue: 8 }) } },
  { name: 'Last: defend lost', view: { ...baseView, catLives: 2, last: lastOf({ role: 'defend', catLost: 1, catValue: 9, dogValue: 13 }) } },
  { name: 'Last: defend met', view: { ...baseView, last: lastOf({ role: 'defend', catValue: 15, dogValue: 13 }) } },
  { name: 'Last: defend exact', view: { ...baseView, last: lastOf({ role: 'defend', catValue: 13, dogValue: 13, bonusCard: true }) } },
];

export function DogFightStates() {
  const [i, setI] = useState(0);
  const [helper, setHelper] = useState(cats[0]);
  return (
    <section className="pg">
      <h2>Dog fight states</h2>
      <div className="pg-row">
        {states.map((s, k) => (
          <button key={s.name} className={k === i ? 'primary' : 'secondary'} aria-pressed={k === i} onClick={() => setI(k)}>
            {s.name}
          </button>
        ))}
      </div>
      <label>
        Cat{' '}
        <select style={{ minHeight: 44 }} value={helper} onChange={(e) => setHelper(e.target.value)}>
          {cats.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <NosingDog view={states[i].view} helper={helper} hints={null} onMove={() => {}} />
    </section>
  );
}
