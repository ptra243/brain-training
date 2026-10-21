// Generates cases and reports any that aren't fair, plus clue-count stats.
// Quick (default, `npm run check-cases`): 20 per preset, 2 per combination of
// levels, 5 per Quick start choice, 15 Quick play codes, 1 campaign per
// difficulty. Full (`npm run check-cases:full`, used by CI): 100, 10, 20, 50
// and 3. Quick uses the same seeds as the start of a full run.
import { content } from '../src/content/index.ts';
import { caseContext, caseFacts, caseSpace, interrogationEvidence } from '../src/engine/caseFacts.ts';
import { campaignCast, campaignRound, roundBudget, roundProblems, type CampaignRef } from '../src/engine/campaign.ts';
import { PICK_ORDER, caseCode, caseFor, codeFor, pickedInOrder, type Cast, type PlayRef, type QuickRef } from '../src/engine/caseRef.ts';
import { generateCase } from '../src/engine/generate.ts';
import { boardPuzzle, endBoard } from '../src/engine/caseBoard.ts';
import { boardSolvable } from '../src/engine/board.ts';
import type { Board } from '../src/engine/boardTypes.ts';
import { disproves } from '../src/engine/interrogation.ts';
import { isInterrogation, isSceneGame } from '../src/engine/gameKinds.ts';
import { DIFFICULTIES, LENGTHS, PRESETS, allLevels, caseSettings, levelsKey, presetOf, type CaseLevels } from '../src/engine/settings.ts';
import { countMatching } from '../src/engine/search.ts';
import { sceneCrossword, sceneWordSearch } from '../src/game/sceneGames.ts';
import { Rng, hashSeed } from '../src/engine/rng.ts';
import { TAROT_MAX_PAIRS, tarotClueCards } from '../src/engine/tarotCards.ts';
import { JOKER, buildTarot, flip, resolveTurn, tarotHint, tarotInitial, tarotSolved } from '../src/games/tarot.ts';
import { countCatSolutions, generateCats, solvableBySimpleSteps } from '../src/games/cats.ts';
import { solutionAt } from '../src/games/crossword.ts';
import { everyWordOnce, leftovers } from '../src/games/wordsearch.ts';
import type { Case, Difficulty } from '../src/engine/types.ts';

const FULL = process.argv.includes('--full');
console.log(FULL ? 'Full check' : 'Quick check (pass --full for every sample)');
const PER_PRESET = FULL ? 100 : 20;
const PER_COMBINATION = FULL ? 10 : 2;
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

const tarotChecked: Record<string, number> = { easy: 0, medium: 0, hard: 0, none: 0 };

/** Turn the hinted card (or a fresh one), then its partner if seen: the board must finish. */
function tarotHintsWin(board: readonly string[], seed: number): boolean {
  let s = tarotInitial();
  const rng = new Rng(seed + 1);
  for (let turns = 0; turns < 300; turns++) {
    if (tarotSolved(board, s)) return true;
    const h = tarotHint(board, s, seed);
    s = h.state;
    const down = () => board.map((_, i) => i).filter((i) => !s.matched.includes(i) && !s.picked.includes(i) && board[i] !== JOKER && s.jokerGone !== i);
    const fresh = () => down().filter((i) => !s.seen.includes(i));
    const first = h.ghost ?? rng.pick(fresh().length ? fresh() : down());
    s = flip(board, s, seed, first);
    const partner = board.findIndex((id, i) => i !== first && id === board[first]);
    const second = s.seen.includes(partner) && !s.picked.includes(partner) ? partner : rng.pick(fresh().length ? fresh() : down().filter((i) => !s.picked.includes(i)));
    s = flip(board, s, seed, second);
    s = resolveTurn(board, s, seed);
  }
  return tarotSolved(board, s);
}

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
  if (c.sceneGiven) return [...out, ...playProblems(c)];
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

// Play: how often word games blank a scene-room clue, and how many games cases draw.
const play = { blanks: 0, sceneBlanks: 0, games: new Map<number, number>() };

/** Play cases: no free clues, every game unlocks something, every word game blanks one room clue and hides an object of that room. */
function playProblems(c: Case): string[] {
  const out: string[] = [];
  if (c.clues.some((cl) => cl.delivery === 'given')) out.push('a Play case has free clues');
  const s = caseSettings(c.levels);
  for (const g of c.games) {
    if (g.kind === 'finale') {
      if (g.clues.length > 2) out.push(`finale unlocks ${g.clues.length} clues`);
    } else if (g.clues.length < 1 || g.clues.length > s.maxPerGame) out.push(`${g.kind} unlocks ${g.clues.length} clues`);
  }
  const words = c.games.filter(isSceneGame);
  const drawn = c.games.filter((g) => g.kind !== 'finale').length;
  play.games.set(drawn, (play.games.get(drawn) ?? 0) + 1);
  for (const g of words) {
    const blanked = c.clues.filter((cl) => cl.blank?.game === g.kind);
    if (blanked.length !== 1 || !g.clues.includes(blanked[0].id)) {
      out.push(`${g.kind} has ${blanked.length} blanked clues of its own`);
      continue;
    }
    const { fact, blank } = blanked[0];
    const room = 'room' in fact ? content.house.rooms.find((r) => r.id === fact.room) : undefined;
    if (!room) out.push(`${g.kind} blanks a clue that names no one room`);
    else if (!(g.kind === 'wordle' ? room.objects : room.things).includes(blank!.answer)) out.push(`${g.kind} hides ${blank!.answer}, not an object of the ${room.name}`);
    if (blank!.answer !== g.scene.answer) out.push(`${g.kind} hides ${g.scene.answer} but its clue needs ${blank!.answer}`);
    if (blank!.answer === c.sceneClue.wordle.answer) out.push(`${g.kind} hides the scene sentence's word`);
    play.blanks++;
    if (room?.id === c.sceneRoom) play.sceneBlanks++;
  }
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
  // Tarot match: the board holds the reward cards, stays within the pair cap, and following the cat's hints wins.
  for (const g of c.games.filter((g) => g.kind === 'tarot')) {
    const mine = c.clues.filter((cl) => g.clues.includes(cl.id)).map((cl) => cl.fact);
    const others = c.clues.filter((cl) => !g.clues.includes(cl.id)).map((cl) => cl.fact);
    const { deck, reward, other } = tarotClueCards(c, mine, others);
    const board = buildTarot(deck, { reward, other }, g.pairs, new Rng(g.seed));
    tarotChecked[g.level ?? 'none']++;
    if (g.pairs > TAROT_MAX_PAIRS || g.pairs < caseSettings(c.levels).tarotPairs) out.push(`tarot has ${g.pairs} pairs`);
    if (board.length !== g.pairs * 2 + 1 || board.filter((id) => id === JOKER).length !== 1) out.push('tarot board has the wrong size');
    for (const id of reward) if (board.filter((b) => b === id).length !== 2) out.push('tarot board is missing a reward card');
    if (!tarotHintsWin(board, g.seed)) out.push("following the cat's hints does not win tarot");
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
  const puzzles = c.games.filter((g) => c.sceneGiven || !g.unlocksScene).length;
  for (const [found, scene, left] of [[free, c.sceneGiven ?? false, puzzles], [new Set(c.clues.map((cl) => cl.id)), true, 0]] as const) {
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
const PER_QUICK = FULL ? 20 : 5;
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

// Quick play: the code alone rolls the levels.
const PER_PLAY = FULL ? 50 : 15;
const playStarted = performance.now();
for (let i = 1; i <= PER_PLAY; i++) {
  const ref: PlayRef = { mode: 'play', code: codeFor(i * 1_215_773) };
  try {
    for (const p of problems(caseFor(content, ref))) {
      failures++;
      console.log(`  FAIL play ${caseCode(ref)}: ${p}`);
    }
  } catch (err) {
    failures++;
    console.log(`  FAIL play ${caseCode(ref)}: ${(err as Error).message}`);
  }
}
console.log(
  `${PER_PLAY} Quick play codes (${((performance.now() - playStarted) / PER_PLAY).toFixed(0)} ms per case): ` +
    `${play.sceneBlanks} of ${play.blanks} word games blank a scene-room clue; games drawn ${[...play.games].sort((a, b) => a[0] - b[0]).map(([n, k]) => `${n}: ${k}`).join(', ')}`,
);

// Picked cases ("Choose games"): her games plus any top-ups, checked like any Play case.
const PER_PICK = FULL ? 40 : 10;
for (let i = 1; i <= PER_PICK; i++) {
  const rng = new Rng(hashSeed(`check-pick-${i}`));
  const games = rng.shuffle([...PICK_ORDER]).slice(0, 3 + rng.int(PICK_ORDER.length - 2));
  const ref: PlayRef = { mode: 'play', code: codeFor(i * 2_654_435), games: pickedInOrder(games) };
  try {
    const c = caseFor(content, ref);
    for (const p of problems(c)) {
      failures++;
      console.log(`  FAIL picked ${caseCode(ref)}: ${p}`);
    }
    for (const g of ref.games!) {
      if (!c.games.some((x) => x.kind === g)) {
        failures++;
        console.log(`  FAIL picked ${caseCode(ref)}: missing ${g}`);
      }
    }
  } catch (err) {
    failures++;
    console.log(`  FAIL picked ${caseCode(ref)}: ${(err as Error).message}`);
  }
}
console.log(`${PER_PICK} picked cases`);

// Tarot match: keep drawing Play codes until every level has a few cases (each checked above like any case).
const TAROT_WANT = 5;
let tarotCodes = 0;
for (let i = 1000; i < 3000 && DIFFICULTIES.some((d) => tarotChecked[d] < TAROT_WANT); i++) {
  const ref: PlayRef = { mode: 'play', code: codeFor(i * 1_215_773) };
  tarotCodes++;
  try {
    const c = caseFor(content, ref);
    if (!c.games.some((g) => g.kind === 'tarot')) continue;
    for (const p of problems(c)) {
      failures++;
      console.log(`  FAIL play ${caseCode(ref)}: ${p}`);
    }
  } catch (err) {
    failures++;
    console.log(`  FAIL play ${caseCode(ref)}: ${(err as Error).message}`);
  }
}
for (const d of DIFFICULTIES) {
  if (tarotChecked[d] < TAROT_WANT) {
    failures++;
    console.log(`  FAIL tarot: only ${tarotChecked[d]} ${d} cases in ${tarotCodes} Play codes`);
  }
}
console.log(`Tarot match: easy ${tarotChecked.easy}, medium ${tarotChecked.medium}, hard ${tarotChecked.hard} cases checked (${tarotCodes} extra Play codes scanned)`);

// Campaigns: every path of wrong accusations, each round fair for any puzzles she picks.
const PER_DIFFICULTY = FULL ? 3 : 1;
let rounds = 0;
const campaignStarted = performance.now();
let campaigns = 0;
for (const perPuzzle of [3, 2, 1] as const) for (const difficulty of DIFFICULTIES) {
  for (let i = 1; i <= PER_DIFFICULTY; i++) {
    campaigns++;
    const ref: CampaignRef = { mode: 'campaign', code: codeFor(i * 2_654_435), difficulty, ...(perPuzzle !== 3 && { perPuzzle }) };
    const cast = campaignCast(content, ref);
    const walk = (victims: string[]) => {
      rounds++;
      const where = `campaign ${ref.code}-${difficulty} after [${victims.join(', ')}]`;
      try {
        const c = campaignRound(content, ref, victims);
        const sizes = c.games.filter((g) => !g.unlocksScene).map((g) => `${g.kind}:${g.clues.length}`);
        const tooMany = c.games.filter((g) => !g.unlocksScene && (g.clues.length < 1 || g.clues.length > perPuzzle));
        const budgetBad = c.campaign!.budget !== roundBudget(ref) ? [`budget ${c.campaign!.budget}, expected ${roundBudget(ref)}`] : [];
        const sizeProblems = [...budgetBad, ...tooMany.map((g) => `${g.kind} holds ${g.clues.length} clues of ${perPuzzle} (${sizes.join(' ')})`)];
        for (const p of [...sizeProblems, ...roundProblems(content, c), ...puzzleProblems(c)]) {
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
console.log(`${campaigns} campaigns (1, 2 and 3 clues per puzzle), every wrong-guess path: ${rounds} rounds (${((performance.now() - campaignStarted) / rounds).toFixed(0)} ms per round)`);

console.log(`Case boards: ${boards.puzzles} puzzles and ${boards.ends} end boards built (slowest ${boards.slowest.toFixed(0)} ms)`);

const total = 3 * PER_PRESET + others.length * PER_COMBINATION + QUICK_CHOICES * PER_QUICK + PER_PLAY + rounds;
console.log(
  failures
    ? `\n${failures} problems`
    : `\nAll ${total} cases have exactly one solution, every interrogation can be caught fairly, every cat puzzle is fair, every word game spells its word, every case board builds, every game unlocks a fair share of clues, every Quick play word game hides an object of the room its clue names, and every campaign round is fair whatever she picks.`,
);
process.exit(failures ? 1 : 0);
