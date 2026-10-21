// The checks before committing, all at once: lint, tests, the case check and
// the build run in parallel, and each prints one pass/fail line (with the end
// of its log when it fails). `--full` runs the full case check instead of the
// quick one. e2e is separate: `npm run e2e`, for UI changes.

import { spawn } from 'node:child_process';

const full = process.argv.includes('--full');
const checks = ['lint', 'test', full ? 'check-cases:full' : 'check-cases', 'build'];
const TAIL = 20;

interface Result {
  name: string;
  ok: boolean;
  seconds: number;
  log: string;
}

function run(name: string): Promise<Result> {
  const start = Date.now();
  return new Promise((resolve) => {
    // shell: npm is a .cmd on Windows.
    const child = spawn(`npm run ${name}`, { shell: true, env: { ...process.env, FORCE_COLOR: '0' } });
    let log = '';
    child.stdout.on('data', (d) => (log += d));
    child.stderr.on('data', (d) => (log += d));
    child.on('close', (code) => resolve({ name, ok: code === 0, seconds: Math.round((Date.now() - start) / 1000), log }));
  });
}

const results = await Promise.all(
  checks.map((name) =>
    run(name).then((r) => {
      console.log(`${r.ok ? 'pass' : 'FAIL'}  ${r.name} (${r.seconds}s)`);
      return r;
    }),
  ),
);

for (const r of results.filter((r) => !r.ok)) {
  console.log(`\n--- ${r.name}: last ${TAIL} lines ---`);
  console.log(r.log.trimEnd().split('\n').slice(-TAIL).join('\n'));
}
process.exit(results.every((r) => r.ok) ? 0 : 1);
