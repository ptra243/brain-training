// Worker entry: builds cases off the main thread. Content is imported here, never posted.
import { content } from '../content/index.ts';
import { runCaseJob, type CaseJob } from './caseJobs.ts';

const scope = self as unknown as { onmessage: ((e: MessageEvent) => void) | null; postMessage(m: unknown): void };
const random = () => crypto.getRandomValues(new Uint32Array(1))[0];

scope.onmessage = (e: MessageEvent<{ id: number; job: CaseJob }>) => {
  const { id, job } = e.data;
  try {
    scope.postMessage({ id, ok: true, value: runCaseJob(content, job, random) });
  } catch (err) {
    scope.postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
