// Generates 100 cases per difficulty and reports any that don't have exactly
// one solution, plus clue-count stats. Run with: npm run check-cases
import { content } from '../src/content/index.ts';
import { roomAdjacency } from '../src/engine/house.ts';
import { generateCase } from '../src/engine/generate.ts';
import { disproves } from '../src/engine/interrogation.ts';
import { allCandidates, countSolutions } from '../src/engine/solver.ts';
import { sceneCrossword, sceneWordSearch } from '../src/game/sceneGames.ts';
import { solutionAt } from '../src/games/crossword.ts';
import { everyWordOnce, leftovers } from '../src/games/wordsearch.ts';
import type { Difficulty } from '../src/engine/types.ts';

const adjacency = roomAdjacency(content.house);
let failures = 0;

for (const difficulty of ['easy', 'medium', 'hard'] as Difficulty[]) {
  const counts: number[] = [];
  const types = new Map<string, number>();
  const started = performance.now();
  for (let n = 1; n <= 100; n++) {
    try {
      const c = generateCase(content, n, difficulty);
      const solutions = countSolutions(
        allCandidates(c.rooms, c.items),
        c.clues.map((cl) => cl.fact),
        { suspects: c.suspects, adjacency },
        2,
      );
      if (solutions !== 1) {
        failures++;
        console.log(`  FAIL ${difficulty} case ${n}: ${solutions} solutions`);
      }
      // Every interrogation: one lie, and its proof really disproves it.
      for (const g of c.games.filter((g) => g.interrogation)) {
        const it = g.interrogation!;
        const lies = it.questions.filter((q) => q.lie);
        const evidence = it.useCaseClues ? c.clues : it.cards;
        const proof = it.proof.map((id) => evidence.find((e) => e.id === id)?.fact).filter((f) => f !== undefined);
        const cf = { suspects: c.suspects, rooms: c.rooms, items: c.items, solution: c.solution, ctx: { suspects: c.suspects, adjacency } };
        if (lies.length !== 1 || proof.length !== it.proof.length || !disproves(cf, proof, lies[0].answer.fact)) {
          failures++;
          console.log(`  FAIL ${difficulty} case ${n}: ${g.kind} interrogation can't be caught fairly`);
        }
      }
      // Scene word games: each builds, and spells its hidden word.
      for (const g of c.games.filter((g) => g.unlocksScene && g.kind !== 'wordle')) {
        const answer = g.scene!.answer;
        const spelled =
          g.kind === 'crossword'
            ? (() => {
                const cw = sceneCrossword(g);
                return cw.shaded.map(([r, col]) => solutionAt(cw, r, col)).join('');
              })()
            : (() => {
                const ws = sceneWordSearch(c, g);
                return everyWordOnce(ws) ? leftovers(ws).map(([r, col]) => ws.grid[r][col]).join('') : '';
              })();
        if (spelled !== answer) {
          failures++;
          console.log(`  FAIL ${difficulty} case ${n}: ${g.kind} spells ${spelled}, not ${answer}`);
        }
      }
      counts.push(c.clues.length);
      for (const cl of c.clues) types.set(cl.fact.type, (types.get(cl.fact.type) ?? 0) + 1);
    } catch (err) {
      failures++;
      console.log(`  FAIL ${difficulty} case ${n}: ${(err as Error).message}`);
    }
  }
  const ms = (performance.now() - started) / 100;
  const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
  console.log(
    `${difficulty.padEnd(6)} clues min ${Math.min(...counts)}  avg ${avg.toFixed(1)}  max ${Math.max(...counts)}  ` +
      `(${ms.toFixed(1)} ms per case)`,
  );
  console.log(
    '        ' +
      [...types].sort((a, b) => b[1] - a[1]).map(([t, k]) => `${t} ${k}`).join(', '),
  );
}

console.log(failures ? `\n${failures} bad cases` : '\nAll 300 cases have exactly one solution, every interrogation can be caught fairly, and every word game spells its word.');
process.exit(failures ? 1 : 0);
