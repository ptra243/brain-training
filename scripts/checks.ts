// The checks before committing, all at once: lint, tests, the case check and
// the build run in parallel, and each prints one pass/fail line (with the end
// of its log when it fails). `--full` runs the full case check instead of the
// quick one. The case check is skipped (a "skip" line) when no file it depends
// on changed since origin/main (scripts/caseCheckDeps.ts); `--full` and any
// git trouble always run it. The *.sweep.ts files run too (scripts/sweeps.ts),
// only those whose import closure holds a changed file (all with `--full` or
// when git can't say), as one "sweeps" line. e2e is separate: `npm run e2e`, for UI changes.

import { spawn } from 'node:child_process';
import { caseCheckNeeded, changedFiles, sweepsNeeded } from './caseCheckDeps.ts';
import { allSweepFiles } from './sweeps.ts';

const full = process.argv.includes('--full');
const checks = ['lint', 'test', full ? 'check-cases:full' : 'check-cases', 'sweeps', 'build'];
const TAIL = 20;
const changed = changedFiles();
const skipCases = !full && changed !== null && !caseCheckNeeded(changed);
const sweepFiles = full ? allSweepFiles() : sweepsNeeded(allSweepFiles(), changed);

interface Result {
  name: string;
  ok: boolean;
  seconds: number;
  log: string;
  skipped?: boolean;
  why?: string;
}

function run(name: string): Promise<Result> {
  const start = Date.now();
  return new Promise((resolve) => {
    // shell: npm is a .cmd on Windows. The sweeps run the chosen files directly.
    const command = name === 'sweeps' ? `node scripts/sweeps.ts${full ? ' --full' : ''} ${sweepFiles.join(' ')}` : `npm run ${name}`;
    const child = spawn(command, { shell: true, env: { ...process.env, FORCE_COLOR: '0' } });
    let log = '';
    child.stdout.on('data', (d) => (log += d));
    child.stderr.on('data', (d) => (log += d));
    child.on('close', (code) => resolve({ name, ok: code === 0, seconds: Math.round((Date.now() - start) / 1000), log }));
  });
}

const results = await Promise.all(
  checks.map((name) =>
    (skipCases && name === 'check-cases'
      ? Promise.resolve({ name, ok: true, seconds: 0, log: '', skipped: true, why: 'no case-check files changed' })
      : name === 'sweeps' && !sweepFiles.length
      ? Promise.resolve({ name, ok: true, seconds: 0, log: '', skipped: true, why: 'no sweep files affected' })
      : run(name)
    ).then((r) => {
      console.log(r.skipped ? `skip  ${r.name} (${r.why})` : `${r.ok ? 'pass' : 'FAIL'}  ${r.name} (${r.seconds}s)`);
      return r;
    }),
  ),
);

for (const r of results.filter((r) => !r.ok)) {
  console.log(`\n--- ${r.name}: last ${TAIL} lines ---`);
  console.log(r.log.trimEnd().split('\n').slice(-TAIL).join('\n'));
}
process.exit(results.every((r) => r.ok) ? 0 : 1);
