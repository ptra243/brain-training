// What makes a generated case unfair, as messages: the checks the cases.*.sweep.ts files run on every case they
// build (one solution, the killer alone with the weapon, fair clue shares, Play-case blanks, interrogations,
// word searches wired to a thing of the scene room, tarot and nosing built from the case's clues, case and end boards, talk threads),
// and the campaign walker. Plain TS: the sweeps assert on the lists; nothing here prints or exits.
import { content } from '../content/index.ts';
import { nosingLadders, nosingSnakes } from '../content/nosing.ts';
import { emptyProgress } from '../game/state.ts';
import { readyBeats, setsFor } from '../game/talk.ts';
import { buildNosing, nosingSeed } from '../games/nosing.ts';
import { nosingProblems } from '../games/nosingSweeps.ts';
import { buildTarot, JOKER } from '../games/tarot.ts';
import { campaignCast, campaignRound, roundBudget, roundProblems, roundSuspects, walkedFreeVictim, type CampaignRef } from './campaign.ts';
import { boardSolvable } from './board.ts';
import type { Board } from './boardTypes.ts';
import { boardPuzzle, endBoard } from './caseBoard.ts';
import { caseContext, caseFacts, caseSpace, interrogationEvidence } from './caseFacts.ts';
import { isInterrogation, isSceneGame } from './gameKinds.ts';
import { disproves } from './interrogation.ts';
import { Rng } from './rng.ts';
import { countMatching } from './search.ts';
import { moodTop } from './sets.ts';
import { caseSettings } from './settings.ts';
import { TAROT_MAX_PAIRS, tarotClueCards } from './tarotCards.ts';
import type { Case } from './types.ts';
import { houseOf } from '../content/houses.ts';

/** Counts the sweeps print in their summary lines; they add up over the cases one process checks. */
export const stats = {
  /** Play cases: word games that blank a clue, how many of those clues name the scene room, and how many games cases draw. */
  play: { blanks: 0, sceneBlanks: 0, games: new Map<number, number>() },
  /** Case boards built, end boards built, and the slowest one (ms). */
  boards: { puzzles: 0, ends: 0, slowest: 0 },
  /** Talk: guests checked, and those with a beat still waiting for the solved case. */
  talk: { guests: 0, short: 0 },
  /** Tarot games checked per level. */
  tarot: { easy: 0, medium: 0, hard: 0, none: 0 } as Record<string, number>,
};

/** A board, timed. */
function timed(make: () => Board | null): Board | null {
  const t = performance.now();
  const b = make();
  stats.boards.slowest = Math.max(stats.boards.slowest, performance.now() - t);
  return b;
}

/** Every piece's truth is a packing the board's own rules accept. */
const packs = (b: Board) => boardSolvable(b, Object.fromEntries(Object.entries(b.truth).map(([id, t]) => [id, t.cells])));

/** Everything that makes a case unfair, as messages. */
export function problems(c: Case): string[] {
  const out: string[] = [];
  const facts = c.clues.map((cl) => cl.fact);
  const solutions = countMatching(caseSpace(c), facts, caseContext(houseOf(c), c), 2);
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

/** Play cases: no free clues, every game unlocks something, every word game blanks one room clue and hides an object of that room. */
export function playProblems(c: Case): string[] {
  const out: string[] = [];
  const { play } = stats;
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

/**
 * What's unfair about the games built from this case's facts: interrogations, word games, tarot, nosing, boards, talk.
 * The games' own rules are swept in their own files (tarot and cat hints in tarot.test.ts and cats.test.ts, nosing
 * boards in nosing.sweep.ts). nosingProblems checks the board, lock, questions and that a run meets the dog; it does not play the fight.
 */
export function puzzleProblems(c: Case): string[] {
  const out: string[] = [];
  const cf = caseFacts(houseOf(c), c);
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
  // Crossword boards are not built here. The crossword's own tests generate the board and check it: crosswordSeed in sceneGamesSweeps.ts, run from sceneGames.test.ts and sceneGames.sweep.ts. Word searches are built in wordBuilders.sweep.ts; here only their wiring.
  const searches = c.games.filter(isSceneGame).filter((g) => g.kind === 'wordsearch');
  if (!c.sceneGiven) {
    const things = houseOf(c).rooms.find((r) => r.id === c.sceneRoom)?.things ?? [];
    for (const g of searches) {
      if (!things.includes(g.scene.answer)) out.push(`wordsearch hides ${g.scene.answer}, not a thing of the scene room`);
      if (g.scene.answer === c.sceneClue.wordle.answer) out.push("wordsearch hides the scene sentence's word");
    }
  } else {
    // Play: the room is the blanked clue's (playProblems checks it); no two word games hide the same word while the room's list has another.
    const hidden = new Set<string>();
    for (const g of c.games.filter(isSceneGame)) {
      const answer = g.scene.answer;
      const fact = c.clues.find((cl) => cl.blank?.game === g.kind)?.fact;
      const room = fact && 'room' in fact ? houseOf(c).rooms.find((r) => r.id === fact.room) : undefined;
      const all = room ? (g.kind === 'wordle' ? room.objects : room.things) : [];
      if (g.kind === 'wordsearch' && hidden.has(answer.toUpperCase()) && all.some((w) => !hidden.has(w.toUpperCase()))) {
        out.push(`wordsearch hides ${answer}, which another word game already hides`);
      }
      hidden.add(answer.toUpperCase());
    }
  }
  // Tarot match: the board holds the reward cards and stays within the pair cap.
  for (const g of c.games.filter((g) => g.kind === 'tarot')) {
    const mine = c.clues.filter((cl) => g.clues.includes(cl.id)).map((cl) => cl.fact);
    const others = c.clues.filter((cl) => !g.clues.includes(cl.id)).map((cl) => cl.fact);
    const { deck, reward, other } = tarotClueCards(c, mine, others);
    const board = buildTarot(deck, { reward, other }, g.pairs, new Rng(g.seed));
    stats.tarot[g.level ?? 'none']++;
    if (g.pairs > TAROT_MAX_PAIRS || g.pairs < caseSettings(c.levels).tarotPairs) out.push(`tarot has ${g.pairs} pairs`);
    if (board.length !== g.pairs * 2 + 1 || board.filter((id) => id === JOKER).length !== 1) out.push('tarot board has the wrong size');
    for (const id of reward) if (board.filter((b) => b === id).length !== 2) out.push('tarot board is missing a reward card');
  }
  // Nosing around: builds with the case's clues, holds 1-7 of them, and is fair.
  for (const g of c.games.filter((g) => g.kind === 'nosing')) {
    const level = g.level;
    if (!level) {
      out.push('nosing has no level');
      continue;
    }
    if (g.clues.length < 1 || g.clues.length > 7) out.push(`nosing holds ${g.clues.length} clues`);
    try {
      const p = buildNosing({ house: houseOf(c), seed: nosingSeed(g.seed), level, sceneRoom: c.sceneRoom, clues: g.clues.slice(), ladders: nosingLadders, snakes: nosingSnakes });
      out.push(...nosingProblems(p, c.sceneRoom, g.clues.length));
    } catch (e) {
      out.push(`nosing does not build: ${(e as Error).message}`);
    }
  }
  // Case board puzzle: builds for its clues, and its answer packs.
  for (const g of c.games.filter((g) => g.kind === 'board')) {
    const b = timed(() => boardPuzzle(content, c, g));
    stats.boards.puzzles++;
    if (!b) out.push('case board puzzle has no board');
    else if (!packs(b)) out.push("case board puzzle's answer doesn't pack");
  }
  // End board (a starting option): builds from the free clues alone, and from every clue once the scene is known.
  const free = new Set(c.clues.filter((cl) => cl.delivery === 'given').map((cl) => cl.id));
  const puzzles = c.games.filter((g) => c.sceneGiven || !g.unlocksScene).length;
  for (const [found, scene, left] of [[free, c.sceneGiven ?? false, puzzles], [new Set(c.clues.map((cl) => cl.id)), true, 0]] as const) {
    const b = timed(() => endBoard(content, c, found, scene, left));
    stats.boards.ends++;
    if (!b) out.push(`no end board for ${found.size} clues`);
    else if (!packs(b)) out.push("end board's answer doesn't pack");
  }
  // Talk: every guest gets a thread, and with every game finished every beat is ready.
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
        stats.talk.guests++;
        if (c.campaign && (sets[s].mood < 0 || sets[s].mood > moodTop())) out.push(`${s}'s mood is out of range`);
        if (ready < thread.length) stats.talk.short++;
        if (ready < Math.min(2, thread.length)) out.push(`${s} has only ${ready} beat ready once every game is done`);
      }
    }
  } catch (err) {
    out.push(`character sets don't build: ${(err as Error).message}`);
  }
  return out;
}

/**
 * Walks a campaign's rounds, following these paths from each round:
 * 'all' every wrong accusation (no walked-free walk); 'two' the first wrong accusation plus the walked-free path
 * when it differs; 'wrong' only the first wrong accusation; 'walked' only the walked-free path.
 * The walked-free victim check runs on every walked round in every mode.
 * Returns every problem (with the path it was found on) and how many rounds were walked.
 */
export function walkCampaign(ref: CampaignRef, name: string, paths: 'all' | 'two' | 'wrong' | 'walked'): { problems: string[]; rounds: number } {
  const out: string[] = [];
  let rounds = 0;
  const perPuzzle = ref.perPuzzle ?? 3;
  const cast = campaignCast(content, ref);
  const walk = (victims: string[]) => {
    rounds++;
    const where = `${name} after [${victims.join(', ')}]`;
    try {
      const c = campaignRound(content, ref, victims);
      const sizes = c.games.filter((g) => !g.unlocksScene).map((g) => `${g.kind}:${g.clues.length}`);
      const tooMany = c.games.filter((g) => !g.unlocksScene && (g.clues.length < 1 || g.clues.length > perPuzzle));
      const budgetBad = c.campaign!.budget !== roundBudget(ref) ? [`budget ${c.campaign!.budget}, expected ${roundBudget(ref)}`] : [];
      const sizeProblems = [...budgetBad, ...tooMany.map((g) => `${g.kind} holds ${g.clues.length} clues of ${perPuzzle} (${sizes.join(' ')})`)];
      for (const p of [...sizeProblems, ...roundProblems(c), ...puzzleProblems(c)]) out.push(`${where}: ${p}`);
      if (c.campaign!.last) return;
      // She may accuse anyone alive; a wrong guess makes them the next body. Quick follows the first one only.
      let firstWrong: string | undefined;
      if (paths !== 'walked') {
        for (const s of c.suspects) {
          if (s === cast.killer) continue;
          walk([...victims, s]);
          firstWrong ??= s;
          if (paths !== 'all') break;
        }
      }
      // The killer with the wrong weapon walks free and a seeded innocent non-decoy dies: quick walks that path too.
      const walked = walkedFreeVictim(ref, c);
      const decoys = roundSuspects(c, c.clues.map((cl) => cl.fact));
      if (walked === cast.killer || !c.suspects.includes(walked) || (!c.campaign!.last && decoys.includes(walked))) {
        out.push(`${where}: walked-free victim ${walked} is the killer, not alive or a decoy`);
      } else if ((paths === 'two' && walked !== firstWrong) || paths === 'walked') {
        walk([...victims, walked]);
      }
    } catch (err) {
      out.push(`${where}: ${(err as Error).message}`);
    }
  };
  walk([]);
  return { problems: out, rounds };
}
