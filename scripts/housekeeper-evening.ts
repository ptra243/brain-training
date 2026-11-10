// Prints whole Housekeeper's-hour evenings as text for real cases, so a generated evening can be read.
//   node scripts/housekeeper-evening.ts [refs...]     refs: case-6-easy, campaign-<CODE>-<difficulty>
//   node scripts/housekeeper-evening.ts               the first offered easy, medium and hard numbered case and campaign round 1 at easy and hard
//   node scripts/housekeeper-evening.ts --survey      counts only
import { housekeeperHour as hour } from '../src/content/housekeeperHour.ts';
import { content } from '../src/content/index.ts';
import { campaignRound, type CampaignRef } from '../src/engine/campaign.ts';
import { campaignHouseId } from '../src/engine/campaign.ts';
import { codeFor } from '../src/engine/caseRef.ts';
import { generateCase } from '../src/engine/generate.ts';
import { Rng, hashSeed } from '../src/engine/rng.ts';
import { DIFFICULTIES } from '../src/engine/settings.ts';
import type { Case, Difficulty } from '../src/engine/types.ts';
import { buildEvening, eveningInput, fill, reportFor, statementFor, type Evening, type Moves } from '../src/games/housekeeperHour.ts';

const numbered = (n: number, d: Difficulty): Case => generateCase(content, n, d);
const campaignRef = (i: number, difficulty: Difficulty): CampaignRef => {
  const ref: CampaignRef = { mode: 'campaign', code: codeFor(i * 2_654_435), difficulty };
  return { ...ref, houseId: campaignHouseId(ref) };
};
const campaign = (i: number, d: Difficulty): Case => campaignRound(content, campaignRef(i, d), []);

function parseRef(text: string): { label: string; c: Case } {
  const num = /^(?:case-)?(\d+)-(easy|medium|hard)$/.exec(text);
  if (num) return { label: text, c: numbered(Number(num[1]), num[2] as Difficulty) };
  const camp = /^campaign-([A-Z0-9]{5})-(easy|medium|hard)$/.exec(text);
  if (camp) {
    const ref: CampaignRef = { mode: 'campaign', code: camp[1], difficulty: camp[2] as Difficulty };
    return { label: text, c: campaignRound(content, { ...ref, houseId: campaignHouseId(ref) }, []) };
  }
  throw new Error(`Cannot read ref "${text}" (try case-6-easy or campaign-<CODE>-easy)`);
}

function show(label: string, c: Case): boolean {
  const input = eveningInput(c, hour);
  console.log(`\n${'='.repeat(70)}\n${label}   house ${c.houseId}`);
  if (!input) {
    console.log('Not offered (the Housekeeper is not seated).');
    return false;
  }
  const ev = buildEvening(hour, input);
  console.log(`Cast: ${c.suspects.map((s) => input.names[s]).join(', ')}; victim: ${input.names[c.victim]}`);
  ev.rounds.forEach((jobs, r) => {
    console.log(`\n-- Round ${r + 1} (${['8:00', '8:15', '8:30'][r]})`);
    jobs.forEach((j, k) => {
      const def = hour.requests.find((d) => d.id === j.request)!;
      console.log(`  Job ${k + 1}: ${input.names[j.guest]} in the ${input.roomNames[j.room]}: "${def.words}"  [fits: ${def.fits.join(' or ')}]`);
      for (const s of hour.staff) {
        // Beats as if no earlier visits: the first visit of each staff member.
        const rep = reportFor(hour, ev, r, k, s.id, []);
        console.log(`      ${s.name} (${s.kind}):${rep.mismatch ? ` ${rep.mismatch}` : ''}`);
        console.log(`        "${rep.line}"${rep.beat ? `   [${fill(rep.beat.pre, ev, j)}${rep.beat.answer}${fill(rep.beat.post, ev, j)}]` : '   [repeat visit]'}`);
      }
    });
  });
  playthrough(ev, c.seed);
  return true;
}

/** One sample game: random sends and ticks from a seeded Rng, then the statement. */
function playthrough(ev: Evening, seed: number) {
  const rng = new Rng(hashSeed('housekeeper-sample-' + seed));
  const sends = ev.rounds.map(() => rng.shuffle(hour.staff.map((s) => s.id)));
  const ticks: (number | null)[] = ev.rounds.map(() => {
    const t = rng.int(4);
    return t === 3 ? null : t;
  });
  const moves: Moves = { sends, ticks, answers: [] };
  console.log('\nSample playthrough:');
  sends.forEach((row, r) => {
    const parts = row.map((id, k) => `job ${k + 1} -> ${hour.staff.find((s) => s.id === id)!.name}`);
    const t = ticks[r];
    console.log(`  Round ${r + 1}: ${parts.join(', ')}; tick: ${t === null ? 'none' : `job ${t + 1}${reportFor(hour, ev, r, t, row[t], sends.slice(0, r)).tickable ? '' : ' (repeat visit, cannot be ticked)'}`}`);
  });
  console.log('Statement:');
  for (const line of statementFor(hour, ev, moves)) {
    console.log(`  ${line.before}___${line.after}   [${line.options.join(' / ')}]  answer: ${line.answer}`);
  }
}

function survey() {
  const header = ['set', 'cases', 'seat her'];
  const rows: string[][] = [];
  const total = { cases: 0, seated: 0 };
  const count = (label: string, cases: Iterable<Case>) => {
    let n = 0, seated = 0;
    for (const c of cases) {
      n++;
      if (eveningInput(c, hour)) seated++;
    }
    rows.push([label, n, seated].map(String));
    total.cases += n; total.seated += seated;
  };
  for (const d of DIFFICULTIES) {
    count(`numbered 1-200, ${d}`, (function* () { for (let n = 1; n <= 200; n++) yield numbered(n, d); })());
  }
  for (const d of DIFFICULTIES) {
    count(`campaign round 1, ${d} (100)`, (function* () { for (let i = 1; i <= 100; i++) yield campaign(i, d); })());
  }
  rows.push(['all', total.cases, total.seated].map(String));
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const fmt = (r: string[]) => r.map((v, i) => (i === 0 ? v.padEnd(widths[i]) : v.padStart(widths[i]))).join('  ');
  console.log(fmt(header));
  for (const r of rows) console.log(fmt(r));
  const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) : '0') + '%';
  console.log(`\nHousekeeper seated in ${pct(total.seated, total.cases)} of cases.`);
}

const args = process.argv.slice(2);
if (args.includes('--survey')) {
  survey();
} else if (args.length) {
  for (const a of args) {
    const { label, c } = parseRef(a);
    show(label, c);
  }
} else {
  for (const d of ['easy', 'medium', 'hard'] as const) {
    for (let n = 1; n < 400; n++) {
      const c = numbered(n, d);
      if (eveningInput(c, hour)) { show(`case-${n}-${d}`, c); break; }
    }
  }
  for (const d of ['easy', 'hard'] as const) {
    for (let i = 1; i < 400; i++) {
      const c = campaign(i, d);
      if (eveningInput(c, hour)) { show(`campaign-${codeFor(i * 2_654_435)}-${d} round 1`, c); break; }
    }
  }
}
