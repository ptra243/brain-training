// Generates cases and reports any that aren't fair, plus clue-count stats.
// Seed sweeps moved out of `npm test` (nosing bots, boards and dog square, dog fights, locks, scene word games; the
// per-seed checks live in src/**/*Sweeps.ts): quick runs a sample of seeds the tests do not use, full runs every seed.
// Quick (default, `npm run check-cases`): 20 per preset, 1 per combination of
// levels, 2 per Quick start choice, 15 Quick play codes, 1 campaign per
// difficulty and per clues-per-puzzle (one wrong-guess path each), every 12th
// combination of three or more picked games. Full (`npm run check-cases:full`,
// used by CI): 100, 10, 20, 50, 3 campaigns with every wrong-guess path, and
// every picked combination. Quick uses the same seeds as the start of a full run.
import { content } from '../src/content/index.ts';
import { caseContext, caseFacts, caseSpace, interrogationEvidence } from '../src/engine/caseFacts.ts';
import { campaignCast, campaignRound, roundBudget, roundProblems, roundSuspects, walkedFreeVictim, type CampaignRef } from '../src/engine/campaign.ts';
import { PICK_ORDER, caseCode, caseFor, codeFor, pickedInOrder, type Cast, type PlayRef, type QuickRef } from '../src/engine/caseRef.ts';
import { generateCase } from '../src/engine/generate.ts';
import { boardPuzzle, endBoard } from '../src/engine/caseBoard.ts';
import { boardSolvable } from '../src/engine/board.ts';
import type { Board } from '../src/engine/boardTypes.ts';
import { disproves } from '../src/engine/interrogation.ts';
import { isInterrogation, isSceneGame } from '../src/engine/gameKinds.ts';
import { DIFFICULTIES, LENGTHS, PRESETS, allLevels, caseSettings, levelsKey, presetOf, type CaseLevels } from '../src/engine/settings.ts';
import { countMatching } from '../src/engine/search.ts';
import { emptyProgress } from '../src/game/state.ts';
import { moodTop } from '../src/engine/sets.ts';
import { readyBeats, setsFor } from '../src/game/talk.ts';
import { sceneCrossword, sceneWordSearch } from '../src/game/sceneGames.ts';
import { Rng, hashSeed } from '../src/engine/rng.ts';
import { TAROT_MAX_PAIRS, tarotClueCards } from '../src/engine/tarotCards.ts';
import { JOKER, buildTarot, flip, resolveTurn, tarotHint, tarotInitial, tarotSolved } from '../src/games/tarot.ts';
import { nosingLadders, nosingSnakes } from '../src/content/nosing.ts';
import { buildNosing, nosingInitial, nosingSeed, nosingSplit, nosingStep, nosingView, type NosingPuzzle } from '../src/games/nosing.ts';
import { nosingBounds, nosingSpec } from '../src/games/nosingBoard.ts';
import { lockHand } from '../src/games/lock.ts';
import { dogApply, dogSimView, dogStart } from '../src/games/dogFight.ts';
import { evaluateGrid, solveGrid } from '../src/games/numberGrid.ts';
import { countCatSolutions, generateCats, solvableBySimpleSteps } from '../src/games/cats.ts';
import { CROSSWORD_SIZE, solutionAt } from '../src/games/crossword.ts';
import { houseOf } from '../src/content/houses.ts';
import { eachVariant, sampledVariants, spreadSeeds } from '../src/content/houseSweeps.ts';
import { houseCaseSweep } from '../src/engine/houseCaseSweeps.ts';
import { LEVELS as NOSING_LEVELS_LIST, botSeed as nosingBotSeed, dogSquareSeed as nosingDogSquareSeed } from '../src/games/nosingSweeps.ts';
import { BOARD_SEEDS, boardSeed as nosingBoardSeed } from '../src/games/nosingBoardSweeps.ts';
import { LEVELS as DOG_LEVELS, challengeSeed as dogChallengeSeed, dogPlaysSeed, doubleSeed as dogDoubleSeed, hintBotSeed as dogHintBotSeed, redealSeed as dogRedealSeed, smallestBotSeed as dogSmallestBotSeed } from '../src/games/dogFightSweeps.ts';
import { faceSeed, type FaceStats } from '../src/game/faceSweeps.ts';
import { movedRateOk, openingSeed, type OpeningStats } from '../src/game/openingSweeps.ts';
import { compareSearch, FACT_TYPES as SEARCH_FACT_TYPES } from '../src/engine/searchSweeps.ts';
import { LOCK_LEVELS, LOCK_SEEDS, lockHintSeed, lockPrefixSeed, lockTierSeed } from '../src/games/lockSweeps.ts';
import { CROSSWORD_SIZES, crosswordSeed as crosswordGridSeed, roomThings, sceneCaseSeed } from '../src/game/sceneGamesSweeps.ts';
import { CROSSWORD_BUILD_SIZES, WORDSEARCH_LEVELS, crosswordSameSeed, wordSearchSameSeed } from '../src/games/wordBuildersSweeps.ts';
import { everyWordOnce, leftovers } from '../src/games/wordsearch.ts';
import type { Case, Difficulty } from '../src/engine/types.ts';

const FULL = process.argv.includes('--full');
// `--only nosing` runs just the nosing sections (scan, boards on every house, walkers, dog fights, locks) while tuning;
// `npm run checks` stays the whole check.
const onlyAt = process.argv.indexOf('--only');
const ONLY = onlyAt < 0 ? null : process.argv[onlyAt + 1];
if (ONLY !== null && ONLY !== 'nosing') {
  console.log(`Unknown --only ${ONLY ?? ''} (only "nosing" is supported)`);
  process.exit(1);
}
const NOSING_ONLY = ONLY === 'nosing';
console.log(`${FULL ? 'Full check' : 'Quick check (pass --full for every sample)'}${NOSING_ONLY ? ', nosing sections only' : ''}`);
const PER_PRESET = FULL ? 100 : 20;
const PER_COMBINATION = FULL ? 10 : 1;
let failures = 0;
// Case boards: how many were built, and the slowest.
const boards = { puzzles: 0, ends: 0, slowest: 0 };

// Time spent: per section of this script (wall clock), and per kind of work across all sections.
const sections: [string, number][] = [];
let sectionStart = performance.now();
/** Ends the section running since the last call. */
function section(name: string) {
  const now = performance.now();
  sections.push([name, now - sectionStart]);
  sectionStart = now;
}
const work = new Map<string, number>();
/** Runs `f`, adding its time to `kind`. Nested calls count in both. */
function clock<T>(kind: string, f: () => T): T {
  const t = performance.now();
  try {
    return f();
  } finally {
    work.set(kind, (work.get(kind) ?? 0) + performance.now() - t);
  }
}
const secs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

/** A board, timed. */
function timed(make: () => Board | null): Board | null {
  const t = performance.now();
  const b = clock('case boards', make);
  boards.slowest = Math.max(boards.slowest, performance.now() - t);
  return b;
}

/** Every piece's truth is a packing the board's own rules accept. */
const packs = (b: Board) => boardSolvable(b, Object.fromEntries(Object.entries(b.truth).map(([id, t]) => [id, t.cells])));

// Talk: guests checked, and those with a beat still waiting for the solved case.
const talkChecked = { guests: 0, short: 0 };

const tarotChecked: Record<string, number> = { easy: 0, medium: 0, hard: 0, none: 0 };
const nosingChecked: Record<string, number> = { easy: 0, medium: 0, hard: 0, none: 0 };
// The dog fights played by the hint bot: dog plays seen, and how many were the fallback (redeals found nothing).
const dogPlays = { plays: 0, fallbacks: 0 };

/** Whether a run meets the dog: a walker that answers every question right (or wrong) must be stopped by it before the lock. */
function meetsDog(p: NosingPuzzle, right: boolean): boolean {
  let s = nosingInitial();
  for (let n = 0; n < 400; n++) {
    const v = nosingView(p, s);
    if (v.phase === 'dog') return true;
    if (v.finished || v.phase === 'lock' || v.phase === 'open') return false;
    const move =
      v.phase === 'question' ? { t: 'answer' as const, value: v.question!.q.answer + (right ? 0 : 1) }
      : v.phase === 'speed' ? { t: 'speed' as const, right: right ? 40 : 0 }
      : { t: 'roll' as const };
    const next = nosingStep(p, s, move);
    if (next === s) return false;
    s = next;
  }
  return false;
}

/** The hint bot (three hints, then play) wins the fight within 6 turns; counts the dog's plays. */
function dogProblems(p: NosingPuzzle): string[] {
  const out: string[] = [];
  if (p.board.squares[p.dogSquare]?.kind !== 'snake') out.push(`nosing dog square ${p.dogSquare} is not a snake head`);
  for (const right of [true, false]) if (!meetsDog(p, right)) out.push(`nosing run never meets the dog (answering ${right ? 'right' : 'wrong'})`);
  const sim = dogStart(p.dogFight);
  let turns = 0;
  for (let view = dogSimView(p.dogFight, sim); !view.over && turns < 10; view = dogSimView(p.dogFight, sim)) {
    dogPlays.plays++;
    if (view.dog.fallback) dogPlays.fallbacks++;
    for (let k = 0; k < 3; k++) dogApply(sim, { t: 'hint' });
    if (!dogApply(sim, { t: 'play' }).ok) {
      out.push('nosing dog fight: the hints left a grid that can not be played');
      break;
    }
    turns++;
  }
  if (dogSimView(p.dogFight, sim).over !== 'won' || turns > 6) out.push(`nosing dog fight: the hint bot did not win within 6 turns (${turns})`);
  return out;
}

/** Everything that makes a Nosing around puzzle unfair. */
function nosingProblems(p: NosingPuzzle, sceneRoom: string, clueCount: number): string[] {
  const out: string[] = [];
  const lv = nosingSpec(p.house, p.level);
  const { board, lock } = p;
  const len = board.path.length;
  // The board: the exact turn and question bounds sit inside the level's ranges.
  const b = clock('nosing bounds', () => nosingBounds(board, p.seed, lv));
  if (b.minTurns < lv.turns[0] || b.maxTurns > lv.turns[1]) out.push(`nosing turns ${b.minTurns}-${b.maxTurns} outside ${lv.turns.join('-')}`);
  if (b.minQuestions < lv.minQuestions) out.push(`nosing has only ${b.minQuestions} questions`);
  if (len < lv.len[0] || len > lv.len[1]) out.push(`nosing path of ${len} squares`);
  // The lock meets its tier, and is exact with no bonuses.
  const tier = { easy: { lo: 20, hi: 99 }, medium: { lo: 100, hi: 299 }, hard: { lo: 300, hi: 699 } }[p.level];
  if (lock.numbers.length !== 6) out.push(`nosing lock has ${lock.numbers.length} numbers`);
  if (lock.target < tier.lo || lock.target > tier.hi) out.push(`nosing lock target ${lock.target}`);
  const hand = lockHand(lock);
  const way = clock('nosing lock solver', () => solveGrid(hand, lock.target, 4));
  if (!way) out.push('nosing lock has no exact way');
  else {
    if (p.level === 'easy' && way.numbersUsed > 3) out.push('nosing easy lock needs more than 3 numbers');
    if (p.level === 'hard' && way.numbersUsed < 4) out.push('nosing hard lock needs fewer than 4 numbers');
  }
  const stored = evaluateGrid(hand, lock.way);
  if (!stored.submittable || stored.answer !== lock.target || stored.errors.length) out.push('nosing lock way misses the target');
  // Questions: whole numbers from 0 to 9999, the answer among the choices.
  for (const [i, q] of Object.entries(p.questions)) {
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 9999) out.push(`nosing question ${i} answers ${q.answer}`);
    if (!q.choices.includes(q.answer) || new Set(q.choices).size !== 3) out.push(`nosing question ${i} has bad choices`);
  }
  for (const [i, list] of Object.entries(p.speed)) {
    if (list.some((q) => new Set(q.cards).size !== 4 || !q.cards.includes(q.answer) || q.text.split('_').length !== 2)) out.push(`nosing speed round ${i} has a bad answer`);
  }
  board.squares.forEach((sq, i) => {
    if ((sq.kind === 'ladder' || (sq.kind === 'snake' && i !== p.dogSquare) || sq.kind === 'obstacle' || sq.kind === 'search') && !p.questions[i]) out.push(`nosing square ${i} has no question`);
    if (sq.kind === 'speed' && !p.speed[i]) out.push(`nosing square ${i} has no speed round`);
    if (sq.kind === 'ladder' || sq.kind === 'snake') {
      const c = (sq.kind === 'ladder' ? nosingLadders : nosingSnakes).find((x) => x.id === sq.contentId);
      if (!c) out.push(`nosing ${sq.kind} ${i} has no content`);
      else if (c.rooms !== 'any' && !c.rooms.includes(board.roomOf[i])) out.push(`nosing ${sq.kind} ${c.id} sits in ${board.roomOf[i]}`);
    }
  });
  // One search square in every room the path enters (all rooms for the manor; the bigger houses enter only some on easy); the clue squares match the split; the lock is in a clue room, never the scene room.
  const rooms = new Set(board.roomOf);
  if (lv.enterExtra === undefined && rooms.size !== p.house.rooms.length) out.push('nosing path misses a room');
  const searchRooms = board.squares.flatMap((sq, i) => (sq.kind === 'search' ? [board.roomOf[i]] : []));
  if (searchRooms.length !== rooms.size || new Set(searchRooms).size !== rooms.size || searchRooms.some((r) => !rooms.has(r))) out.push('nosing: not one search square in every room');
  const idx = board.squares.flatMap((sq) => (sq.kind === 'search' && sq.clueIndex != null ? [sq.clueIndex] : [])).sort();
  const split = nosingSplit(clueCount);
  if (idx.length !== split.search || idx.some((v, k) => v !== k)) out.push(`nosing has ${idx.length} clue squares for ${split.search} search clues`);
  if (p.searchClues.length !== split.search || p.lockClues.length !== split.lock) out.push('nosing clue split is wrong');
  const lockRoom = board.roomOf[len - 1];
  if (lockRoom === sceneRoom) out.push('nosing lock is in the scene room');
  if (!board.clueRooms.includes(lockRoom)) out.push('nosing lock room is not a clue room');
  if (board.clueRooms.includes(sceneRoom)) out.push('nosing has a clue in the scene room');
  out.push(...clock('nosing dog fight', () => dogProblems(p)));
  nosingChecked[p.level]++;
  return out;
}

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
  const solutions = clock('one solution', () => countMatching(caseSpace(c), facts, caseContext(houseOf(c), c), 2));
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
    const room = 'room' in fact ? houseOf(c).rooms.find((r) => r.id === fact.room) : undefined;
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
  const cf = caseFacts(houseOf(c), c);
  clock('interrogations', () => {
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
  });
  // Scene word games: each builds, and spells its hidden word.
  clock('word games', () => {
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
  });
  // Tarot match: the board holds the reward cards, stays within the pair cap, and following the cat's hints wins.
  clock('tarot', () => {
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
  });
  // Nosing around: the board, lock and questions are fair.
  for (const g of c.games.filter((g) => g.kind === 'nosing')) {
    const level = g.level;
    if (!level) {
      out.push('nosing has no level');
      continue;
    }
    if (g.clues.length < 1 || g.clues.length > 7) out.push(`nosing holds ${g.clues.length} clues`);
    try {
      const p = clock('nosing build', () => buildNosing({ house: houseOf(c), seed: nosingSeed(g.seed), level, sceneRoom: c.sceneRoom, clues: g.clues.slice(), ladders: nosingLadders, snakes: nosingSnakes }));
      out.push(...nosingProblems(p, c.sceneRoom, g.clues.length));
    } catch (e) {
      out.push(`nosing does not build: ${(e as Error).message}`);
    }
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
  // Talk: every guest gets a thread, and with every game finished every beat is ready.
  const talkStart = performance.now();
  try {
    const sets = setsFor(c);
    const done = { ...emptyProgress(), games: Object.fromEntries(c.games.map((g) => [g.kind, { status: 'won' as const }])) };
    for (const s of c.suspects) {
      const thread = sets[s]?.thread;
      if (!thread || thread.length < 2 || thread.length > 3) out.push(`${s} has no usable thread`);
      else {
        // The formula (1 + about + floor(other / 2)) can fall a beat short in a 3-game Play case;
        // solving the case readies every beat. Count them, but only fail below 2 beats.
        const ready = readyBeats(c, done, s, thread.length);
        talkChecked.guests++;
        if (c.campaign && (sets[s].mood < 0 || sets[s].mood > moodTop())) out.push(`${s}'s mood is out of range`);
        if (ready < thread.length) talkChecked.short++;
        if (ready < Math.min(2, thread.length)) out.push(`${s} has only ${ready} beat ready once every game is done`);
      }
    }
  } catch (err) {
    out.push(`character sets don't build: ${(err as Error).message}`);
  }
  work.set('talk', (work.get('talk') ?? 0) + performance.now() - talkStart);
  // Cat puzzle: one answer; easy ones also come out by simple steps.
  clock('cats', () => {
    for (const g of c.games.filter((g) => g.kind === 'cats')) {
      const p = generateCats(g.size, new Rng(g.seed), g.easy);
      if (countCatSolutions(p.zones, 2) !== 1 || (g.easy && !solvableBySimpleSteps(p.zones))) out.push(`cat puzzle isn't fair`);
    }
  });
  return out;
}

function run(levels: CaseLevels, count: number) {
  const label = levelsKey(levels);
  const counts: number[] = [];
  const types = new Map<string, number>();
  const started = performance.now();
  for (let n = 1; n <= count; n++) {
    try {
      const c = clock('generate', () => generateCase(content, n, levels));
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

const others = allLevels().filter((l) => !presetOf(l));
if (!NOSING_ONLY) {
  for (const difficulty of ['easy', 'medium', 'hard'] as Difficulty[]) {
    const { counts, types, ms } = run(PRESETS[difficulty], PER_PRESET);
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    console.log(
      `${difficulty.padEnd(6)} clues min ${Math.min(...counts)}  avg ${avg.toFixed(1)}  max ${Math.max(...counts)}  ` +
        `(${ms.toFixed(1)} ms per case)`,
    );
    console.log('        ' + [...types].sort((a, b) => b[1] - a[1]).map(([t, k]) => `${t} ${k}`).join(', '));
  }
  section('presets');

  // Every other combination of levels, so any of them can be offered.
  let slowest = { label: '', ms: 0 };
  for (const levels of others) {
    const { ms } = run(levels, PER_COMBINATION);
    if (ms > slowest.ms) slowest = { label: levelsKey(levels), ms };
  }
  console.log(`\n${others.length} other combinations × ${PER_COMBINATION} cases (slowest ${slowest.label}, ${slowest.ms.toFixed(1)} ms per case)`);
  section('other combinations');
}

const PER_QUICK = FULL ? 20 : 2;
const CASTS: Cast[] = ['classic', 'big'];
const QUICK_CHOICES = DIFFICULTIES.length * LENGTHS.length * CASTS.length;
if (!NOSING_ONLY) {
  // Quick start: every difficulty, length and cast she can pick, from codes spread over the range.
  for (const difficulty of DIFFICULTIES) {
    for (const length of LENGTHS) {
      for (const cast of CASTS) {
      for (let i = 1; i <= PER_QUICK; i++) {
        const ref: QuickRef = { mode: 'quick', code: codeFor(i * 1_215_773), difficulty, length, cast };
        try {
          for (const p of problems(clock('generate', () => caseFor(content, ref)))) {
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
  console.log(`${QUICK_CHOICES} Quick start choices × ${PER_QUICK} codes`);
  section('Quick start');
}

const PER_PLAY = FULL ? 50 : 15;
if (!NOSING_ONLY) {
  // Quick play: the code alone rolls the levels.
  const playStarted = performance.now();
  for (let i = 1; i <= PER_PLAY; i++) {
    const ref: PlayRef = { mode: 'play', code: codeFor(i * 1_215_773) };
    try {
      for (const p of problems(clock('generate', () => caseFor(content, ref)))) {
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

  section('Quick play');

  // Picked cases ("Choose games"): her games plus any top-ups, checked like any Play case.
  const PER_PICK = FULL ? 40 : 10;
  for (let i = 1; i <= PER_PICK; i++) {
    const rng = new Rng(hashSeed(`check-pick-${i}`));
    const games = rng.shuffle([...PICK_ORDER]).slice(0, 3 + rng.int(PICK_ORDER.length - 2));
    const ref: PlayRef = { mode: 'play', code: codeFor(i * 2_654_435), games: pickedInOrder(games) };
    try {
      const c = clock('generate', () => caseFor(content, ref));
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
  section('picked');

  // Every combination of three or more picked games builds with every picked game in it (picked.test.ts checks every 12th).
  // Full: all of them; quick: every 12th, offset by 6 so the test's sample is not repeated.
  {
    const codes = ['K7QF2', 'B3M9X', 'Z4HRT'];
    let combos = 0;
    let checked = 0;
    for (let m = 1; m < 1 << PICK_ORDER.length; m++) {
      const games = PICK_ORDER.filter((_, i) => m & (1 << i));
      if (games.length < 3) continue;
      const stress = games.length === PICK_ORDER.length || (games.length === 3 && games.includes('tarot') && games.includes('board'));
      const some = stress ? codes : [codes[combos % codes.length]];
      const mine = FULL || combos % 12 === 6;
      combos++;
      if (!mine) continue;
      for (const code of some) {
        checked++;
        const ref: PlayRef = { mode: 'play', code, games };
        try {
          const c = clock('generate', () => caseFor(content, ref));
          for (const g of games) {
            if (!c.games.some((x) => x.kind === g)) {
              failures++;
              console.log(`  FAIL combination ${caseCode(ref)}: missing ${g}`);
            }
          }
          for (const g of c.games) {
            if (g.kind !== 'finale' && (g.clues.length < 1 || g.clues.length > 7)) {
              failures++;
              console.log(`  FAIL combination ${caseCode(ref)}: ${g.kind} has ${g.clues.length} clues`);
            }
          }
        } catch (err) {
          failures++;
          console.log(`  FAIL combination ${caseCode(ref)}: ${(err as Error).message}`);
        }
      }
    }
    console.log(`${checked} picked-game cases from ${FULL ? 'all' : 'every 12th of'} ${combos} combinations of three or more games`);
  }
  section('picked combinations');
}

if (!NOSING_ONLY) {
  // Tarot match: keep drawing Play codes until every level has a few cases (each checked above like any case).
  const TAROT_WANT = 5;
  let tarotCodes = 0;
  for (let i = 1000; i < 3000 && DIFFICULTIES.some((d) => tarotChecked[d] < TAROT_WANT); i++) {
    const ref: PlayRef = { mode: 'play', code: codeFor(i * 1_215_773) };
    tarotCodes++;
    try {
      const c = clock('generate', () => caseFor(content, ref));
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
  section('tarot scan');
}

// Nosing around: keep drawing Play codes until every level has a few cases, then force every scene room at every level.
const NOSING_WANT = 5;
let nosingCodes = 0;
for (let i = 5000; i < 9000 && DIFFICULTIES.some((d) => nosingChecked[d] < NOSING_WANT); i++) {
  const ref: PlayRef = { mode: 'play', code: codeFor(i * 1_215_773) };
  nosingCodes++;
  try {
    const c = clock('generate', () => caseFor(content, ref));
    if (!c.games.some((g) => g.kind === 'nosing')) continue;
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
  if (nosingChecked[d] < NOSING_WANT) {
    failures++;
    console.log(`  FAIL nosing: only ${nosingChecked[d]} ${d} cases in ${nosingCodes} Play codes`);
  }
}
const inCases = { ...nosingChecked };
let forced = 0;
for (const level of DIFFICULTIES) {
  for (const [r, room] of content.house.rooms.entries()) {
    for (const share of FULL ? [3, 4, 5, 6, 7] : [3 + (r % 5)]) {
      forced++;
      const seed = `check-${level}-${room.id}-${share}`;
      try {
        const p = clock('nosing build', () => buildNosing({ house: content.house, seed, level, sceneRoom: room.id, clues: Array.from({ length: share }, (_, k) => `c${k + 1}`), ladders: nosingLadders, snakes: nosingSnakes }));
        for (const m of nosingProblems(p, room.id, share)) {
          failures++;
          console.log(`  FAIL nosing ${seed}: ${m}`);
        }
      } catch (err) {
        failures++;
        console.log(`  FAIL nosing ${seed}: ${(err as Error).message}`);
      }
    }
  }
}
console.log(`Nosing around: easy ${inCases.easy}, medium ${inCases.medium}, hard ${inCases.hard} Play cases checked (${nosingCodes} extra Play codes scanned), plus ${forced} forced boards (every scene room at every level)`);
section('nosing scan and forced boards');

let rounds = 0;
if (!NOSING_ONLY) {
  // Campaigns: every path of wrong accusations, each round fair for any puzzles she picks.
  const PER_DIFFICULTY = FULL ? 3 : 1;
  const campaignStarted = performance.now();
  let campaigns = 0;
  /** Walks a campaign's rounds: every wrong accusation when `exhaustive`, else the first one and the walked-free path. */
  function walkCampaign(ref: CampaignRef, name: string, exhaustive: boolean) {
      const perPuzzle = ref.perPuzzle ?? 3;
      const cast = campaignCast(content, ref);
      const walk = (victims: string[]) => {
        rounds++;
        const where = `${name} after [${victims.join(', ')}]`;
        try {
          const c = clock('generate', () => campaignRound(content, ref, victims));
          const sizes = c.games.filter((g) => !g.unlocksScene).map((g) => `${g.kind}:${g.clues.length}`);
          const tooMany = c.games.filter((g) => !g.unlocksScene && (g.clues.length < 1 || g.clues.length > perPuzzle));
          const budgetBad = c.campaign!.budget !== roundBudget(ref) ? [`budget ${c.campaign!.budget}, expected ${roundBudget(ref)}`] : [];
          const sizeProblems = [...budgetBad, ...tooMany.map((g) => `${g.kind} holds ${g.clues.length} clues of ${perPuzzle} (${sizes.join(' ')})`)];
          for (const p of [...sizeProblems, ...roundProblems(c), ...puzzleProblems(c)]) {
            failures++;
            console.log(`  FAIL ${where}: ${p}`);
          }
          if (c.campaign!.last) return;
          // She may accuse anyone alive; a wrong guess makes them the next body. Quick follows the first one only.
          let firstWrong: string | undefined;
          for (const s of c.suspects) {
            if (s === cast.killer) continue;
            walk([...victims, s]);
            firstWrong ??= s;
            if (!exhaustive) break;
          }
          // The killer with the wrong weapon walks free and a seeded innocent non-decoy dies: quick walks that path too.
          const walked = walkedFreeVictim(ref, c);
          const decoys = roundSuspects(c, c.clues.map((cl) => cl.fact));
          if (walked === cast.killer || !c.suspects.includes(walked) || (!c.campaign!.last && decoys.includes(walked))) {
            failures++;
            console.log(`  FAIL ${where}: walked-free victim ${walked} is the killer, not alive or a decoy`);
          } else if (!exhaustive && walked !== firstWrong) {
            walk([...victims, walked]);
          }
        } catch (err) {
          failures++;
          console.log(`  FAIL ${where}: ${(err as Error).message}`);
        }
      };
      walk([]);
  }
  for (const perPuzzle of [3, 2, 1] as const) for (const difficulty of DIFFICULTIES) {
    for (let i = 1; i <= PER_DIFFICULTY; i++) {
      campaigns++;
      const ref: CampaignRef = { mode: 'campaign', code: codeFor(i * 2_654_435), difficulty, ...(perPuzzle !== 3 && { perPuzzle }) };
      walkCampaign(ref, `campaign ${ref.code}-${difficulty}`, FULL);
    }
  }
  console.log(`${campaigns} campaigns (1, 2 and 3 clues per puzzle), ${FULL ? 'every wrong-guess path' : 'one wrong-guess path each'}: ${rounds} rounds (${((performance.now() - campaignStarted) / rounds).toFixed(0)} ms per round)`);
  section('campaigns');

  // Cases on the other houses: the same checks as above (problems, puzzleProblems, campaign rounds), built through the *In variants.
  {
    const roundsBefore = rounds;
    const counts = houseCaseSweep({
      full: FULL,
      check(label, make) {
        try {
          for (const p of problems(clock('generate', make))) {
            failures++;
            console.log(`  FAIL house ${label}: ${p}`);
          }
        } catch (err) {
          failures++;
          console.log(`  FAIL house ${label}: ${(err as Error).message}`);
        }
      },
      campaign: (label, ref) => walkCampaign(ref, `house ${label}`, false),
    });
    console.log(`Other houses (${sampledVariants(FULL).length} of ${eachVariant().length} variants): ${Object.entries(counts).map(([d, c]) => `${d} ${c.cases} cases on ${c.houses} houses`).join(', ')}; ${rounds - roundsBefore} campaign rounds`);
  }
  section('other houses');
}

// Seed sweeps moved out of `npm test` (src/**/*Sweeps.ts): the tests keep a few fixed seeds, quick takes a sample
// spread over the rest (so never the tests' own seeds), and --full takes every seed the tests used to check.
/** Seed numbers 0..total-1 for --full; otherwise `count` of them spread over [from, total), where `from` is how many npm test runs. */
const seedsOf = (from: number, total: number, count: number): number[] => spreadSeeds(FULL, from, total, count);
/** Runs one seed's assertions (timed under `kind`); a thrown one is a failure. */
function holds<T>(kind: string, where: string, f: () => T): { ok: true; value: T } | { ok: false } {
  try {
    return { ok: true, value: clock(kind, f) };
  } catch (err) {
    failures++;
    console.log(`  FAIL ${where}: ${(err as Error).message.split('\n')[0]}`);
    return { ok: false };
  }
}
/** A statistical bound across the seeds checked. */
function bound(ok: boolean, what: string) {
  if (ok) return;
  failures++;
  console.log(`  FAIL ${what}`);
}

if (!NOSING_ONLY) {
  // Fast search against the old exhaustive one on random small cases (search.test.ts keeps seeds 0-29).
  {
    const r = holds('search vs oracle', 'search vs oracle', () => compareSearch(seedsOf(30, 3000, 150)));
    if (r.ok) {
      for (const m of r.value.mismatches.slice(0, 5)) {
        failures++;
        console.log(`  FAIL search vs oracle: ${m}`);
      }
      bound(SEARCH_FACT_TYPES.every((t) => (r.value.types.get(t) ?? 0) > 0), 'search vs oracle: some fact type never came up');
      console.log(`Search vs old search: ${r.value.instances} random cases, ${r.value.comparisons} counts agree (${r.value.none} no answer, ${r.value.one} one, ${r.value.many} several; fast ${(r.value.fastMs / 1000).toFixed(1)}s, old ${(r.value.oracleMs / 1000).toFixed(1)}s)`);
    }
  }
  section('search vs oracle');
}

// Nosing around walkers: right, wrong and random answers meet the dog, stay in the turn window and reach the lock
// (nosing.test.ts keeps seeds 0-6 per level). The card fight and the lock are not played here: the dog-fight section
// (the smallest bot loses most fights) and the lock tests do that.
{
  const parts: string[] = [];
  for (const level of NOSING_LEVELS_LIST) {
    let ran = 0;
    for (const i of seedsOf(7, 100, 6)) {
      const r = holds('nosing bots', `nosing bots ${level} seed ${i}`, () => nosingBotSeed(level, i));
      if (r.ok) ran++;
    }
    for (const i of seedsOf(10, 100, 20)) holds('nosing dog square', `nosing dog square ${level} seed ${i}`, () => nosingDogSquareSeed(level, i));
    parts.push(`${level} ${ran} seeds`);
  }
  console.log(`Nosing bots: ${parts.join(', ')}; dog square ${FULL ? 100 : 20} seeds per level`);
}
section('nosing bots');

// Nosing around boards: every rule over seeds (nosingBoard.test.ts keeps seeds 0-35 per level).
{
  let built = 0;
  for (const level of NOSING_LEVELS_LIST) {
    for (const i of seedsOf(36, BOARD_SEEDS, 24)) {
      holds('nosing boards', `nosing board ${level} seed ${i}`, () => nosingBoardSeed(level, i));
      built++;
    }
  }
  // Every other house at every level: builds within the attempt cap, turn bounds hold, doors respected.
  for (const { house } of eachVariant().filter((x) => x.v === 0)) {
    for (const level of NOSING_LEVELS_LIST) {
      for (const i of seedsOf(0, BOARD_SEEDS, 24)) {
        holds('nosing boards', `nosing board ${house.id} ${level} seed ${i}`, () => nosingBoardSeed(level, i, house));
        built++;
      }
      for (const i of seedsOf(0, 100, 3)) holds('nosing bots', `nosing bots ${house.id} ${level} seed ${i}`, () => nosingBotSeed(level, i, house));
    }
  }
  // ...and each turned or mirrored variant of every other house (the manor is never turned).
  let variantBoards = 0;
  for (const { v, house: variant } of eachVariant().filter((x) => x.v > 0)) {
    for (const level of NOSING_LEVELS_LIST) {
      for (const i of seedsOf(v, 10, 2)) {
        holds('nosing boards', `nosing board ${variant.id} ${level} seed ${i}`, () => nosingBoardSeed(level, i, variant));
        variantBoards++;
      }
      for (const i of seedsOf(v, 3, 1)) holds('nosing bots', `nosing bots ${variant.id} ${level} seed ${i}`, () => nosingBotSeed(level, i, variant));
    }
  }
  console.log(`Nosing boards: ${built} boards satisfy every rule (${FULL ? BOARD_SEEDS : 24} seeds per level and house; bots on ${FULL ? 100 : 3} seeds per other house and level); ${variantBoards} more on the 7 variants of each (${FULL ? 10 : 2} seeds per level, bots on ${FULL ? 3 : 1})`);
}
section('nosing boards');

// Dog fight: bots over many seeds (dogFight.test.ts keeps seeds 0-5 per level).
{
  const parts: string[] = [];
  for (const level of DOG_LEVELS) {
    const turns: number[] = [];
    let lost = 0;
    let fights = 0;
    for (const i of seedsOf(6, 100, 10)) {
      fights++;
      const hint = holds('dog fights', `dog hint bot ${level} seed ${i}`, () => dogHintBotSeed(level, i));
      if (hint.ok) turns.push(hint.value);
      const small = holds('dog fights', `dog smallest bot ${level} seed ${i}`, () => dogSmallestBotSeed(level, i));
      if (small.ok && small.value) lost++;
    }
    const mean = turns.reduce((a, b) => a + b, 0) / Math.max(1, turns.length);
    bound(lost >= fights * 0.8, `dog smallest bot ${level}: lost only ${lost}/${fights} fights (needs 80%)`);
    const tot = { plays: 0, fallbacks: 0, redeals: 0 };
    for (const i of seedsOf(6, 100, 10)) {
      const r = holds('dog fights', `dog plays ${level} seed ${i}`, () => dogPlaysSeed(level, i));
      if (!r.ok) continue;
      tot.plays += r.value.plays;
      tot.fallbacks += r.value.fallbacks;
      tot.redeals += r.value.redeals;
    }
    const count = { plays: 0, redealed: 0, fallbacks: 0 };
    for (const i of seedsOf(6, 200, 40)) {
      const r = holds('dog fights', `dog redeals ${level} seed ${i}`, () => dogRedealSeed(level, i));
      if (!r.ok) continue;
      count.plays += r.value.plays;
      count.redealed += r.value.redealed;
      count.fallbacks += r.value.fallbacks;
    }
    bound(count.fallbacks <= count.plays / 50, `dog ${level}: ${count.fallbacks} fallbacks in ${count.plays} dog plays (over 2%)`);
    let doubles = 0;
    const doubleSeeds = seedsOf(60, 600, 150);
    for (const i of doubleSeeds) {
      const r = holds('dog fights', `dog double ${level} seed ${i}`, () => dogDoubleSeed(level, i));
      if (r.ok && r.value) doubles++;
    }
    bound(doubles > doubleSeeds.length * 0.2 && doubles < doubleSeeds.length * 0.45, `dog ${level}: a double is possible on ${doubles}/${doubleSeeds.length} attacks (wanted 20-45%)`);
    const ch = { attacks: 0, drawn: 0, kinds: {} as Record<string, number> };
    for (const i of seedsOf(20, 400, 60)) {
      const r = holds('dog fights', `dog challenge ${level} seed ${i}`, () => dogChallengeSeed(level, i));
      if (!r.ok) continue;
      ch.attacks += r.value.attacks;
      ch.drawn += r.value.drawn;
      for (const [k, n] of Object.entries(r.value.kinds)) ch.kinds[k] = (ch.kinds[k] ?? 0) + n;
    }
    bound(ch.drawn >= ch.attacks * 0.5, `dog ${level}: a challenge on only ${ch.drawn}/${ch.attacks} attacks`);
    const kinds = Object.entries(ch.kinds).sort().map(([k, n]) => `${k} ${n}`).join(', ');
    parts.push(`${level}: challenge on ${ch.drawn}/${ch.attacks} attacks (${kinds})`);
    parts.push(`${level}: hint bot mean ${mean.toFixed(2)} turns, smallest bot lost ${lost}/${fights}, redeals ${count.redealed} and fallbacks ${count.fallbacks} in ${count.plays} plays, double on ${doubles}/${doubleSeeds.length}`);
  }
  console.log(`Dog fights (${FULL ? 'all' : 'sampled'} seeds): ${parts.join('; ')}`);
}
section('dog fights');

// Locks: tier rules (confirmed by the solver), the note and hint prefixes, and hints reaching the target (lock.test.ts keeps seeds 0-11).
{
  let n = 0;
  for (const level of LOCK_LEVELS) {
    for (const i of seedsOf(12, LOCK_SEEDS, 12)) {
      holds('locks', `lock tier ${level} seed ${i}`, () => lockTierSeed(level, i));
      holds('locks', `lock prefixes ${level} seed ${i}`, () => lockPrefixSeed(level, i));
      holds('locks', `lock hints ${level} seed ${i}`, () => lockHintSeed(level, i));
      n++;
    }
  }
  console.log(`Locks: ${n} seeds checked for the tier rules, the hint prefixes and the hint path (${FULL ? LOCK_SEEDS : 12} per level)`);
}
section('locks');

if (!NOSING_ONLY) {
  // Scene word games: every room thing hidden in a crossword (the test uses each at one size; quick every other thing at another, --full all),
  // and the word games of cases 1-10 per difficulty (the test builds cases 1-2).
  {
    const things = roomThings();
    let grids = 0;
    things.forEach((answer, k) => {
      if (!FULL && k % 2) return; // quick: every other thing, at a size the test did not use
      const sizes = FULL ? CROSSWORD_SIZES : [CROSSWORD_SIZES[(k + 1) % CROSSWORD_SIZES.length]];
      for (const [size] of sizes) {
        for (let seed = 1; seed <= (size === CROSSWORD_SIZE ? 2 : 1); seed++) {
          holds('crossword grids', `crossword ${answer} size ${size} seed ${seed}`, () => crosswordGridSeed(answer, size, seed));
          grids++;
        }
      }
    });
    let cases = 0;
    for (const difficulty of DIFFICULTIES) {
      for (const n of FULL ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [5, 10]) {
        holds('scene games', `scene games ${difficulty} case ${n}`, () => sceneCaseSeed(difficulty, n));
        cases++;
      }
    }
    console.log(`Scene games: ${things.length} room things in ${grids} crossword grids, ${cases} cases' word games`);
  }
  section('scene games');

  // Fast crossword and word search builders against the oracle (today's builders): the same puzzle for the same seed
  // (wordBuilders.test.ts keeps a few fixed answers at seed 1). Quick: every other room thing at one size/level, seed 3;
  // --full: every room thing at every size and level for seeds 1 and 2.
  {
    let crosswords = 0;
    let searches = 0;
    roomThings().forEach((answer, k) => {
      if (!FULL && k % 2) return;
      const j = (k >> 1) + 1;
      const sizes = FULL ? CROSSWORD_BUILD_SIZES : [CROSSWORD_BUILD_SIZES[j % CROSSWORD_BUILD_SIZES.length]];
      const levels = FULL ? WORDSEARCH_LEVELS : [WORDSEARCH_LEVELS[j % WORDSEARCH_LEVELS.length]];
      for (const seed of FULL ? [1, 2] : [3]) {
        for (const size of sizes) {
          holds('builders vs oracle', `crossword vs oracle ${answer} size ${size} seed ${seed}`, () => crosswordSameSeed(answer, size, seed));
          crosswords++;
        }
        for (const level of levels) {
          holds('builders vs oracle', `word search vs oracle ${answer} level ${level} seed ${seed}`, () => wordSearchSameSeed(answer, level, seed));
          searches++;
        }
      }
    });
    console.log(`Word builders vs oracle: ${crosswords} crosswords and ${searches} word searches match the old builders`);
  }
  section('builders vs oracle');

  // Face to face (src/game/faceSweeps.ts): the test keeps seeds 0-2.
  {
    const stats: FaceStats = { killers: 0, cracks: 0, innocents: 0 };
    for (const seed of seedsOf(3, 60, 10)) holds('face to face', `face to face seed ${seed}`, () => faceSeed(seed, stats));
    console.log(`Face to face: ${stats.killers} killer and ${stats.innocents} innocent questionings fair (${stats.cracks} killers crack: no clue catches a lie)`);
  }
  section('face to face');

  // Campaign opening (src/game/openingSweeps.ts): the test keeps seeds 0-2.
  {
    const stats: OpeningStats = { cases: 0, moved: 0 };
    for (const seed of seedsOf(3, 400, FULL ? 400 : 80)) holds('opening', `opening seed ${seed}`, () => openingSeed(seed, stats));
    if (!movedRateOk(stats)) holds('opening', 'moved-body rate', () => { throw new Error(`${stats.moved} of ${stats.cases} bodies moved`); });
    console.log(`Opening: ${stats.cases} campaigns deliver every free clue once and meet every guest; ${stats.moved} bodies moved`);
  }
  section('opening');
}

if (!NOSING_ONLY) console.log(`Talk: ${talkChecked.guests} guests have a thread; ${talkChecked.short} still have a beat waiting for the solved case once every game is done`);
console.log(`Case boards:${boards.puzzles} puzzles and ${boards.ends} end boards built (slowest ${boards.slowest.toFixed(0)} ms)`);

// Built cases are a small sample of dog fights (about 140 plays on the quick run). The 2%
// limit stays on the dog-fight seed sweep above. 3% here still keeps the copy-of-her-cards
// play rare, and one extra play from a different case mix does not fail the check.
if (dogPlays.fallbacks > dogPlays.plays * 0.03) {
  failures++;
  console.log(`  FAIL nosing dog: its fallback play fired ${dogPlays.fallbacks} of ${dogPlays.plays} times (over 3%)`);
}
console.log(`Nosing dog: ${dogPlays.plays} dog plays across the fights the hint bot won, ${dogPlays.fallbacks} fallbacks`);

const total_ms = sections.reduce((a, [, ms]) => a + ms, 0);
console.log(`\nTime by section (${secs(total_ms)}): ${sections.map(([n, ms]) => `${n} ${secs(ms)}`).join(', ')}`);
console.log(`Time by work (nested work counts in both): ${[...work].sort((a, b) => b[1] - a[1]).map(([n, ms]) => `${n} ${secs(ms)}`).join(', ')}`);
const total = 3 * PER_PRESET + others.length * PER_COMBINATION + QUICK_CHOICES * PER_QUICK + PER_PLAY + rounds;
console.log(
  failures
    ? `\n${failures} problems`
    : NOSING_ONLY
      ? '\nThe nosing sections pass. This was not the whole check: run npm run checks before reporting.'
      : `\nAll ${total} cases have exactly one solution, every interrogation can be caught fairly, every cat puzzle is fair, every word game spells its word, every case board builds, every game unlocks a fair share of clues, every Quick play word game hides an object of the room its clue names, and every campaign round is fair whatever she picks.`,
);
process.exit(failures ? 1 : 0);
