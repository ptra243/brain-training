// Which files a sweep depends on, so `npm run checks` can skip it when none of
// them changed: the static import closure of its entry file (a *.sweep.ts),
// plus data files the closure reads from disk.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
// Files outside the import closure that always mean "run it".
const SWEEPS_ALWAYS = ['package.json', 'package-lock.json', 'scripts/checks.ts', 'scripts/caseCheckDeps.ts', 'scripts/sweeps.ts'];
const SPECIFIER = /(?:from\s*|import\s*\(?\s*)['"](\.{1,2}\/[^'"]+)['"]/g;
// Reads of non-imported data files, e.g. readFileSync(new URL('../x.json', import.meta.url)).
const FS_READ = /\b(?:readFileSync|readFile|readdirSync|readdir)\s*\(/;

function resolveSpecifier(fromFile: string, spec: string): string | null {
  const base = resolve(dirname(fromFile), spec);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.json`, resolve(base, 'index.ts')]) {
    if (existsSync(candidate) && /\.(ts|tsx|json)$/.test(candidate)) return candidate;
  }
  return null;
}

/** Repo-relative (forward slash) paths of the import closure of `entry` (repo-relative), and any data files it reads. */
export function closure(entry: string): Set<string> {
  const seen = new Set<string>();
  const reads = new Set<string>();
  const todo = [resolve(root, entry)];
  while (todo.length) {
    const file = todo.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    if (file.endsWith('.json')) continue;
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(SPECIFIER)) {
      const dep = resolveSpecifier(file, m[1]);
      if (dep) todo.push(dep);
    }
    if (FS_READ.test(text)) {
      // Any relative path literal in a file that reads from disk counts as data it may read.
      for (const m of text.matchAll(/['"`](\.{1,2}\/[^'"`]+)['"`]/g)) {
        const p = resolve(dirname(file), m[1]);
        if (existsSync(p) && !seen.has(p) && !/\.(ts|tsx)$/.test(p)) reads.add(p);
      }
    }
  }
  return new Set([...seen, ...reads].map((f) => relative(root, f).split(sep).join('/')));
}

/** The sweep files (repo-relative) whose closure holds a changed file; all of them when `changed` is null (git can't say). */
export function sweepsNeeded(sweepFiles: string[], changed: string[] | null, closureOf = closure): string[] {
  if (changed === null || changed.some((f) => SWEEPS_ALWAYS.includes(f))) return sweepFiles;
  return sweepFiles.filter((s) => {
    const files = closureOf(s);
    return changed.some((f) => files.has(f));
  });
}

/** Changed files vs origin/main plus untracked ones; null when git can't say (fail safe: run). */
export function changedFiles(): string[] | null {
  try {
    const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
    return [...lines(git('diff', '--name-only', 'origin/main')), ...lines(git('ls-files', '--others', '--exclude-standard'))];
  } catch {
    return null;
  }
}
