import { Suspense, lazy } from 'react';

// The case inspector is only for #dev, so it loads as its own chunk.
const CaseInspector = lazy(() => import('./CaseInspector.tsx').then((m) => ({ default: m.CaseInspector })));

export function DevPage() {
  return (
    <Suspense fallback={null}>
      <CaseInspector />
    </Suspense>
  );
}
