// Runs seed sweeps: `node scripts/sweeps.ts [--full] [files...]` runs
// `node --test` on each given `*.sweep.ts` (default every one under src/), one
// process per file, all in parallel. Prints one pass/fail line per file plus
// the summary lines the file reports with `t.diagnostic`. `--full` sets
// SWEEP_FULL=1 (src/sweep.ts). Exits 1 if any file fails.

import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const full = args.includes('--full');
const given = args.filter((a) => !a.startsWith('--'));

/** Repo-relative (forward slash) paths of every *.sweep.ts under src/. */
export function allSweepFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.sweep.ts')) out.push(relative(root, p).split(sep).join('/'));
    }
  };
  walk(join(root, 'src'));
  return out.sort();
}

/** Given file arguments, where a trailing-star name like src/engine/cases.*.sweep.ts matches by prefix and suffix. */
function expand(patterns: string[]): string[] {
  const all = allSweepFiles();
  const files = patterns.flatMap((p) => {
    const norm = p.split(sep).join('/').replace(/^\.\//, '');
    if (!norm.includes('*')) return [norm];
    const [head, ...rest] = norm.split('*');
    const tail = rest.join('*');
    return all.filter((f) => f.startsWith(head) && f.endsWith(tail) && f.length >= head.length + tail.length && !f.slice(head.length, f.length - tail.length).includes('/'));
  });
  return [...new Set(files)];
}

function run(file: string): Promise<{ file: string; ok: boolean; seconds: number; log: string }> {
  const start = Date.now();
  return new Promise((done) => {
    const child = spawn(process.execPath, ['--test', '--test-reporter=tap', file], {
      cwd: root,
      env: { ...process.env, FORCE_COLOR: '0', ...(full ? { SWEEP_FULL: '1' } : {}) },
    });
    let log = '';
    child.stdout.on('data', (d) => (log += d));
    child.stderr.on('data', (d) => (log += d));
    child.on('close', (code) => done({ file, ok: code === 0, seconds: (Date.now() - start) / 1000, log }));
  });
}

// Node's own tap totals, not the file's summary lines.
const NODE_TOTALS = /^# (tests|suites|pass|fail|cancelled|skipped|todo|duration_ms)\b/;

if (import.meta.main) {
  const files = given.length ? expand(given) : allSweepFiles();
  if (!files.length) {
    console.log('no sweep files');
    process.exit(0);
  }
  const results = await Promise.all(
    files.map((f) =>
      run(f).then((r) => {
        console.log(`${r.ok ? 'pass' : 'FAIL'}  ${r.file} (${r.seconds.toFixed(1)}s)`);
        return r;
      }),
    ),
  );
  for (const r of results) {
    const notes = r.log.split('\n').filter((l) => l.startsWith('# ') && !NODE_TOTALS.test(l) && !l.startsWith('# Subtest:'));
    if (r.ok) {
      for (const l of notes) console.log(`  ${r.file}: ${l.slice(2)}`);
    } else {
      console.log(`\n--- ${r.file}: last 30 lines ---`);
      console.log(r.log.trimEnd().split('\n').slice(-30).join('\n'));
    }
  }
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}
