// Worker entry: builds cases off the main thread. Content is imported here, never posted.
import { content } from '../content/index.ts';
import { runCaseJob, type CaseJob } from './caseJobs.ts';

const scope = self as unknown as { onmessage: ((e: MessageEvent) => void) | null; postMessage(m: unknown): void };
scope.onmessage = (e: MessageEvent<{ id: number; job: CaseJob; randoms: number[] }>) => {
  const { id, job, randoms } = e.data;
  // New codes use numbers drawn on the main thread (so the page decides, and tests can fix them); more only if a job runs out.
  let next = 0;
  const random = () => (next < randoms.length ? randoms[next++] : crypto.getRandomValues(new Uint32Array(1))[0]);
  try {
    scope.postMessage({ id, ok: true, value: runCaseJob(content, job, random) });
  } catch (err) {
    scope.postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
