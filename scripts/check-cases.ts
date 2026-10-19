// Generates 100 cases per preset, plus 10 for every combination of levels,
// and reports any that aren't fair, plus clue-count stats. Run with:
// npm run check-cases
import { content } from '../src/content/index.ts';
import { caseContext, caseFacts, caseSpace, interrogationEvidence } from '../src/engine/caseFacts.ts';
import { campaignCast, campaignRound, roundProblems, type CampaignRef } from '../src/engine/campaign.ts';
import { caseCode, caseFor, codeFor, type Cast, type QuickRef } from '../src/engine/caseRef.ts';
import { generateCase } from '../src/engine/generate.ts';
import { boardPuzzle, endBoard } from '../src/engine/caseBoard.ts';
import { boardSolvable } from '../src/engine/board.ts';
import type { Board } from '../src/engine/boardTypes.ts';
import { disproves } from '../src/engine/interrogation.ts';
import { isInterrogation, isSceneGame } from '../src/engine/gameKinds.ts';
import { DIFFICULTIES, LENGTHS, PRESETS, allLevels, caseSettings, levelsKey, presetOf, type CaseLevels } from '../src/engine/settings.ts';
import { countMatching } from '../src/engine/search.ts';
import { sceneCrossword, sceneWordSearch } from '../src/game/sceneGames.ts';
import { Rng } from '../src/engine/rng.ts';
import { countCatSolutions, generateCats, solvableBySimpleSteps } from '../src/games/cats.ts';
import { solutionAt } from '../src/games/crossword.ts';
import { everyWordOnce, leftovers } from '../src/games/wordsearch.ts';
import type { Case, Difficulty } from '../src/engine/types.ts';

const PER_PRESET = 100;
const PER_COMBINATION = 10;
let failures = 0;
// Case boards: how many were built, and the slowest.
const boards = { puzzles: 0, ends: 0, slowest: 0 };

/** A board, timed. */
function timed(make: () => Board | null): Board | null {
  const t = performance.now();
  const b = make();
  boards.slowest = Math.max(boards.slowest, performance.now() - t);
  return b;
}

/** Every piece's truth is a packing the board's own rules accept. */
const packs = (b: Board) => boardSolvable(b, Object.fromEntries(Object.entries(b.truth).map(([id, t]) => [id, t.cells])));

/** Everything that makes a case unfair, as messages. */
function problems(c: Case): string[] {
  const out: string[] = [];
  const facts = c.clues.map((cl) => cl.fact);
  const solutions = countMatching(caseSpace(c), facts, caseContext(content.house, c), 2);
  if (solutions !== 1) out.push(`${solutions} solutions`);
  // The killer was alone at the scene, holding the weapon.
  const k = c.suspects.indexOf(c.murderer);
  if (c.solution.room.filter((r) => r === c.sceneRoom).length !== 1 || c.solution.room[k] !== c.sceneRoom) out.push('killer not alone at the scene');
  if (c.solution.item[k] !== c.weapon) out.push("killer doesn't hold the weapon");
  out.push(...puzzleProblems(c));
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

/** What's unfair about the minigames themselves: interrogations, word games, cat puzzles. */
function puzzleProblems(c: Case): string[] {
  const out: string[] = [];
  const cf = caseFacts(content.house, c);
  // Every interrogation: one lie, and its proof really disproves it.
  for (const g of c.games.filter(isInterrogation)) {
    const it = g.interrogation;
    const lies = it.questions.filter((q) => q.lie);
    const evidence = interrogationEvidence(c, it);
    const proof = it.proof.map((id) => evidence.find((e) => e.id === id)?.fact).filter((f) => f !== undefined);
    if (lies.length !== 1 || proof.length !== it.proof.length || !disproves(cf, proof, lies[0].answer.fact)) {
      out.push(`${g.kind} interrogation can't be caught fairly`);
    }
  }
  // Scene word games: each builds, and spells its hidden word.
  for (const g of c.games.filter(isSceneGame).filter((g) => g.kind !== 'wordle')) {
    const answer = g.scene.answer;
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
  // Case board puzzle: builds for its clues, and its answer packs.
  for (const g of c.games.filter((g) => g.kind === 'board')) {
    const b = timed(() => boardPuzzle(content, c, g));
    boards.puzzles++;
    if (!b) out.push('case board puzzle has no board');
    else if (!packs(b)) out.push("case board puzzle's answer doesn't pack");
  }
  // End board (a starting option): builds from the free clues alone, and from every clue once the scene is known.
  const free = new Set(c.clues.filter((cl) => cl.delivery === 'given').map((cl) => cl.id));
  const puzzles = c.games.filter((g) => !g.unlocksScene).length;
  for (const [found, scene, left] of [[free, false, puzzles], [new Set(c.clues.map((cl) => cl.id)), true, 0]] as const) {
    const b = timed(() => endBoard(content, c, found, scene, left));
    boards.ends++;
    if (!b) out.push(`no end board for ${found.size} clues`);
    else if (!packs(b)) out.push("end board's answer doesn't pack");
  }
  // Cat puzzle: one answer; easy ones also come out by simple steps.
  for (const g of c.games.filter((g) => g.kind === 'cats')) {
    const p = generateCats(g.size, new Rng(g.seed), g.easy);
    if (countCatSolutions(p.zones, 2) !== 1 || (g.easy && !solvableBySimpleSteps(p.zones))) out.push(`cat puzzle isn't fair`);
  }
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

// Quick start: every difficulty, length and cast she can pick, from codes spread over the range.
const PER_QUICK = 20;
const CASTS: Cast[] = ['classic', 'big'];
for (const difficulty of DIFFICULTIES) {
  for (const length of LENGTHS) {
    for (const cast of CASTS) {
    for (let i = 1; i <= PER_QUICK; i++) {
      const ref: QuickRef = { mode: 'quick', code: codeFor(i * 1_215_773), difficulty, length, cast };
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
}
const QUICK_CHOICES = DIFFICULTIES.length * LENGTHS.length * CASTS.length;
console.log(`${QUICK_CHOICES} Quick start choices × ${PER_QUICK} codes`);

// Campaigns: every path of wrong accusations, each round fair for any puzzles she picks.
const PER_DIFFICULTY = 3;
let rounds = 0;
const campaignStarted = performance.now();
for (const difficulty of DIFFICULTIES) {
  for (let i = 1; i <= PER_DIFFICULTY; i++) {
    const ref: CampaignRef = { mode: 'campaign', code: codeFor(i * 2_654_435), difficulty };
    const cast = campaignCast(content, ref);
    const walk = (victims: string[]) => {
      rounds++;
      const where = `campaign ${ref.code}-${difficulty} after [${victims.join(', ')}]`;
      try {
        const c = campaignRound(content, ref, victims);
        for (const p of [...roundProblems(content, c), ...puzzleProblems(c)]) {
          failures++;
          console.log(`  FAIL ${where}: ${p}`);
        }
        if (c.campaign!.last) return;
        // She may accuse anyone alive; a wrong guess makes them the next body.
        for (const s of c.suspects) if (s !== cast.killer) walk([...victims, s]);
      } catch (err) {
        failures++;
        console.log(`  FAIL ${where}: ${(err as Error).message}`);
      }
    };
    walk([]);
  }
}
console.log(`${DIFFICULTIES.length * PER_DIFFICULTY} campaigns, every wrong-guess path: ${rounds} rounds (${((performance.now() - campaignStarted) / rounds).toFixed(0)} ms per round)`);

console.log(`Case boards: ${boards.puzzles} puzzles and ${boards.ends} end boards built (slowest ${boards.slowest.toFixed(0)} ms)`);

const total = 3 * PER_PRESET + others.length * PER_COMBINATION + QUICK_CHOICES * PER_QUICK + rounds;
console.log(
  failures
    ? `\n${failures} problems`
    : `\nAll ${total} cases have exactly one solution, every interrogation can be caught fairly, every cat puzzle is fair, every word game spells its word, every case board builds, every game unlocks a fair share of clues, and every campaign round is fair whatever she picks.`,
);
process.exit(failures ? 1 : 0);
