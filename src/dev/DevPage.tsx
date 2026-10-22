import { Suspense, lazy } from 'react';
import { previewIdFromHash } from './previews.ts';

// The dev pages are only for #dev, so they load as their own chunks.
const CaseInspector = lazy(() => import('./CaseInspector.tsx').then((m) => ({ default: m.CaseInspector })));
const DevPreview = lazy(() => import('./DevPreview.tsx').then((m) => ({ default: m.DevPreview })));

/** `#dev` is the case inspector; `#dev/<id>` is that one preview, full viewport. */
export function DevPage() {
  const id = previewIdFromHash(window.location.hash);
  return <Suspense fallback={null}>{id === null ? <CaseInspector /> : <DevPreview id={id} />}</Suspense>;
}
