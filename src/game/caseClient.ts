// Builds cases in a module worker, falling back to the main thread if workers fail.
import { content } from '../content/index.ts';
import { roundsKey, runCaseJob, type CaseJob, type CaseJobResult } from './caseJobs.ts';

interface Pending {
  job: CaseJob;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

const random = () => crypto.getRandomValues(new Uint32Array(1))[0];

let worker: Worker | null = null;
let broken = typeof Worker === 'undefined';
let nextId = 1;
const pending = new Map<number, Pending>();

// Small cache of deterministic results (treated as immutable).
const CACHE_SIZE = 4;
const cache = new Map<string, unknown>();
const cacheKey = (job: CaseJob): string | null =>
  job.kind === 'campaign-rounds' ? `rounds:${roundsKey(job.save)}` : job.kind === 'case' ? JSON.stringify(job) : null;
function remember(key: string, value: unknown) {
  cache.delete(key);
  cache.set(key, value);
  while (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value as string);
}

/** Yield so the loading overlay can paint before blocking work. */
const yieldToPaint = () => new Promise<void>((done) => requestAnimationFrame(() => setTimeout(done, 0)));

async function runSync(job: CaseJob): Promise<unknown> {
  await yieldToPaint();
  return runCaseJob(content, job, random);
}

function breakWorker() {
  broken = true;
  worker?.terminate();
  worker = null;
  const jobs = [...pending.values()];
  pending.clear();
  for (const p of jobs) runSync(p.job).then(p.resolve, p.reject);
}

function getWorker(): Worker | null {
  if (broken) return null;
  if (worker) return worker;
  try {
    const w = new Worker(new URL('./caseWorker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<{ id: number; ok: boolean; value?: unknown; error?: string }>) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      if (e.data.ok) p.resolve(e.data.value);
      else p.reject(new Error(e.data.error));
    };
    w.onerror = breakWorker;
    w.onmessageerror = breakWorker;
    worker = w;
    return w;
  } catch {
    broken = true;
    return null;
  }
}

/** Build cases for a job: in a worker when possible, else on the main thread after a paint. */
export function generate<J extends CaseJob>(job: J): Promise<CaseJobResult<J>> {
  const key = cacheKey(job);
  if (key && cache.has(key)) return Promise.resolve(cache.get(key) as CaseJobResult<J>);

  const done = (value: unknown) => {
    if (key) remember(key, value);
    if (job.kind === 'campaign-new') {
      const made = value as { save: Parameters<typeof roundsKey>[0]; cases: unknown[] };
      remember(`rounds:${roundsKey(made.save)}`, made.cases);
    }
    return value as CaseJobResult<J>;
  };

  const w = getWorker();
  if (!w) return runSync(job).then(done);
  return new Promise<unknown>((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { job, resolve, reject });
    try {
      w.postMessage({ id, job });
    } catch {
      pending.delete(id);
      runSync(job).then(resolve, reject);
    }
  }).then(done);
}
