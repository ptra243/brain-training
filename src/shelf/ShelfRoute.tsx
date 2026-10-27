import { Suspense, lazy } from 'react';

// The shelf screens are only for #shelf, so they load as their own chunk.
const ShelfPage = lazy(() => import('./ShelfPage.tsx').then((m) => ({ default: m.ShelfPage })));

/** The entry `main.tsx` renders for `#shelf` and `#shelf/...`. */
export function ShelfRoute() {
  return (
    <Suspense fallback={null}>
      <ShelfPage />
    </Suspense>
  );
}
