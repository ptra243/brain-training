import type { CatCoat, PortraitParts } from '../content/portraits.ts';
import {
  catCropBox, catShapes, hasPortrait, FULL_VIEW_BOX, guestCropBox, portraitShapes, transformAttr, type Layer, type Tint,
} from './portrait.ts';
import type { Shape } from './portraitParts.ts';

// Re-exported so callers import both from here; the function lives in portrait.ts.
// eslint-disable-next-line react-refresh/only-export-components -- a one-line re-export, not a shared helper
export { hasPortrait };

type Props = {
  view: 'full' | 'counter';
  tint?: Tint;
  /** Decorative (aria-hidden) unless a label is given. */
  label?: string;
  className?: string;
} & ({ parts: PortraitParts; coat?: undefined } | { coat: CatCoat; parts?: undefined });

const f = (n: number) => String(Math.round(n * 100) / 100);

function drawShape(s: Shape, i: number) {
  if (s.t === 'rect') return <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill={s.fill} fillOpacity={s.o} />;
  if (s.t === 'circle') {
    return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} fillOpacity={s.o} stroke={s.stroke} strokeWidth={s.sw} />;
  }
  return (
    <polygon
      key={i}
      points={s.pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}
      fill={s.fill}
      fillOpacity={s.o}
      stroke={s.stroke}
      strokeWidth={s.sw}
      strokeLinejoin={s.stroke ? 'round' : undefined}
    />
  );
}

function drawLayer(l: Layer) {
  return (
    <g key={l.id} transform={l.transform ? transformAttr(l.transform) : undefined}>
      {l.shapes.map(drawShape)}
    </g>
  );
}

/** A faceted portrait: `full` is the whole 100 x 120 card art, `counter` the head crop (the counter's CSS clips it to a circle). */
export function Portrait({ parts, coat, view, tint = 'none', label, className }: Props) {
  const layers = parts ? portraitShapes(parts, tint) : catShapes(coat, tint);
  const viewBox = view === 'full' ? FULL_VIEW_BOX : parts ? guestCropBox(parts) : catCropBox();
  return (
    <svg
      className={className}
      viewBox={viewBox}
      style={{ width: '100%', height: '100%', display: 'block' }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {layers.map(drawLayer)}
    </svg>
  );
}
