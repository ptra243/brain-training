// Generates 100 cases per preset, plus 10 for every combination of levels,
// and reports any that aren't fair, plus clue-count stats. Run with:
// npm run check-cases
import { content } from '../src/content/index.ts';
import { roomAdjacency } from '../src/engine/house.ts';
import { caseCode, caseFor, codeFor, type QuickRef } from '../src/engine/caseRef.ts';
import { generateCase } from '../src/engine/generate.ts';
import { disproves } from '../src/engine/interrogation.ts';
import { DIFFICULTIES, LENGTHS, PRESETS, allLevels, caseSettings, levelsKey, presetOf, type CaseLevels } from '../src/engine/settings.ts';
import { allCandidates, countSolutions } from '../src/engine/solver.ts';
import { sceneCrossword, sceneWordSearch } from '../src/game/sceneGames.ts';
import { Rng } from '../src/engine/rng.ts';
import { countCatSolutions, generateCats, solvableBySimpleSteps } from '../src/games/cats.ts';
import { solutionAt } from '../src/games/crossword.ts';
import { everyWordOnce, leftovers } from '../src/games/wordsearch.ts';
import type { Case, Difficulty } from '../src/engine/types.ts';

const adjacency = roomAdjacency(content.house);
const PER_PRESET = 100;
const PER_COMBINATION = 10;
let failures = 0;

/** Everything that makes a case unfair, as messages. */
function problems(c: Case): string[] {
  const out: string[] = [];
  const solutions = countSolutions(allCandidates(c.rooms, c.items), c.clues.map((cl) => cl.fact), { suspects: c.suspects, adjacency }, 2);
  if (solutions !== 1) out.push(`${solutions} solutions`);
  // Every interrogation: one lie, and its proof really disproves it.
  for (const g of c.games.filter((g) => g.interrogation)) {
    const it = g.interrogation!;
    const lies = it.questions.filter((q) => q.lie);
    const evidence = it.useCaseClues ? c.clues : it.cards;
    const proof = it.proof.map((id) => evidence.find((e) => e.id === id)?.fact).filter((f) => f !== undefined);
    const cf = { suspects: c.suspects, rooms: c.rooms, items: c.items, solution: c.solution, ctx: { suspects: c.suspects, adjacency } };
    if (lies.length !== 1 || proof.length !== it.proof.length || !disproves(cf, proof, lies[0].answer.fact)) {
      out.push(`${g.kind} interrogation can't be caught fairly`);
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
    if (spelled !== answer) out.push(`${g.kind} spells ${spelled}, not ${answer}`);
  }
  // Cat puzzle: one answer; easy ones also come out by simple steps.
  for (const g of c.games.filter((g) => g.kind === 'cats')) {
    const p = generateCats(g.size, new Rng(g.seed), g.easy);
    if (countCatSolutions(p.zones, 2) !== 1 || (g.easy && !solvableBySimpleSteps(p.zones))) out.push(`cat puzzle isn't fair`);
  }
  // Clue shares: every rotating game unlocks something, none too much.
  const s = caseSettings(c.levels);
  const rotating = c.games.filter((g) => !g.unlocksScene && g.kind !== 'finale');
  if (rotating.length !== s.games) out.push(`${rotating.length} rotating games, not ${s.games}`);
  for (const g of rotating) {
    if (g.clues.length < 1 || g.clues.length > s.maxPerGame) out.push(`${g.kind} unlocks ${g.clues.length} clues`);
  }
  const finale = c.games.find((g) => g.kind === 'finale');
  if (finale && finale.clues.length > 2) out.push(`finale unlocks ${finale.clues.length} clues`);
  return out;
}

function run(levels: CaseLevels, count: number) {
  const label = levelsKey(levels);
  const counts: number[] = [];
  const types = new Map<string, number>();
  const started = performance.now();
  for (let n = 1; n <= count; n++) {
    try {
      const c = generateCase(content, n, levels);
      for (const p of problems(c)) {
        failures++;
        console.log(`  FAIL ${label} case ${n}: ${p}`);
      }
      counts.push(c.clues.length);
      for (const cl of c.clues) types.set(cl.fact.type, (types.get(cl.fact.type) ?? 0) + 1);
    } catch (err) {
      failures++;
      console.log(`  FAIL ${label} case ${n}: ${(err as Error).message}`);
    }
  }
  return { counts, types, ms: (performance.now() - started) / count };
}

for (const difficulty of ['easy', 'medium', 'hard'] as Difficulty[]) {
  const { counts, types, ms } = run(PRESETS[difficulty], PER_PRESET);
  const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
  console.log(
    `${difficulty.padEnd(6)} clues min ${Math.min(...counts)}  avg ${avg.toFixed(1)}  max ${Math.max(...counts)}  ` +
      `(${ms.toFixed(1)} ms per case)`,
  );
  console.log('        ' + [...types].sort((a, b) => b[1] - a[1]).map(([t, k]) => `${t} ${k}`).join(', '));
}

// Every other combination of levels, so any of them can be offered.
const others = allLevels().filter((l) => !presetOf(l));
let slowest = { label: '', ms: 0 };
for (const levels of others) {
  const { ms } = run(levels, PER_COMBINATION);
  if (ms > slowest.ms) slowest = { label: levelsKey(levels), ms };
}
console.log(`\n${others.length} other combinations × ${PER_COMBINATION} cases (slowest ${slowest.label}, ${slowest.ms.toFixed(1)} ms per case)`);

// Quick start: every difficulty and length she can pick, from codes spread over the range.
const PER_QUICK = 20;
for (const difficulty of DIFFICULTIES) {
  for (const length of LENGTHS) {
    for (let i = 1; i <= PER_QUICK; i++) {
      const ref: QuickRef = { mode: 'quick', code: codeFor(i * 1_215_773), difficulty, length };
      try {
        for (const p of problems(caseFor(content, ref))) {
          failures++;
          console.log(`  FAIL quick ${caseCode(ref)}: ${p}`);
        }
      } catch (err) {
        failures++;
        console.log(`  FAIL quick ${caseCode(ref)}: ${(err as Error).message}`);
      }
    }
  }
}
console.log(`${DIFFICULTIES.length * LENGTHS.length} Quick start choices × ${PER_QUICK} codes`);

const total = 3 * PER_PRESET + others.length * PER_COMBINATION + DIFFICULTIES.length * LENGTHS.length * PER_QUICK;
console.log(
  failures
    ? `\n${failures} problems`
    : `\nAll ${total} cases have exactly one solution, every interrogation can be caught fairly, every cat puzzle is fair, every word game spells its word, and every game unlocks a fair share of clues.`,
);
process.exit(failures ? 1 : 0);
