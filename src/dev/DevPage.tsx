import { Suspense, lazy } from 'react';
import { DevList } from './DevList.tsx';
import { previewIdFromHash } from './previews.ts';

// The dev pages are only for #dev, so they load as their own chunks.
const CaseInspector = lazy(() => import('./CaseInspector.tsx').then((m) => ({ default: m.CaseInspector })));
const ScenarioLoad = lazy(() => import('./ScenarioLoad.tsx').then((m) => ({ default: m.ScenarioLoad })));
const DevPreview = lazy(() => import('./DevPreview.tsx').then((m) => ({ default: m.DevPreview })));

/** `#dev` is the index of dev pages; `#dev/cases` the case inspector; `#dev/<id>` that one preview, full viewport; `#dev/load/<id>` loads a game state (scenarios.ts). */
export function DevPage() {
  const id = previewIdFromHash(window.location.hash);
  if (id === null) {
    return (
      <main className="inspector">
        <h1>Dev pages</h1>
        <DevList />
      </main>
    );
  }
  const load = /^load\/(.*)$/.exec(id);
  return (
    <Suspense fallback={null}>
      {load ? <ScenarioLoad id={load[1]} /> : id === 'cases' ? <CaseInspector /> : <DevPreview id={id} />}
    </Suspense>
  );
}
