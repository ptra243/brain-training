import type { PortraitParts, StandeeParts } from '../content/portraits.ts';
import { transformAttr, type Layer } from './portrait.ts';
import type { Shape } from './portraitParts.ts';
import { STANDEE_EDGE, STANDEE_VIEW_BOX, standeeShapes } from './standee.ts';

const f = (n: number) => String(Math.round(n * 100) / 100);

/** One shape; with `edge` it is filled and stroked in that colour (the cut-out outline pass). */
function drawShape(s: Shape, i: number, edge?: string) {
  if (edge && s.fill === 'none') return null;
  const edgeProps = edge ? { fill: edge, stroke: edge, strokeWidth: STANDEE_EDGE.width, strokeLinejoin: 'round' as const } : null;
  if (s.t === 'rect') return <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill={edge ?? s.fill} fillOpacity={edge ? undefined : s.o} />;
  if (s.t === 'circle') {
    return edgeProps
      ? <circle key={i} cx={s.cx} cy={s.cy} r={s.r} {...edgeProps} />
      : <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} fillOpacity={s.o} stroke={s.stroke} strokeWidth={s.sw} />;
  }
  const points = s.pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
  return edgeProps
    ? <polygon key={i} points={points} {...edgeProps} />
    : <polygon key={i} points={points} fill={s.fill} fillOpacity={s.o} stroke={s.stroke} strokeWidth={s.sw} strokeLinejoin={s.stroke ? 'round' : undefined} />;
}

const drawLayers = (layers: Layer[], edge?: string) =>
  layers.map((l) => (
    <g key={l.id} transform={l.transform ? transformAttr(l.transform) : undefined}>
      {l.shapes.map((s, i) => drawShape(s, i, edge))}
    </g>
  ));

/** A full-body cut-out figure: an ivory edge pass under the figure itself. */
export function Standee({ parts, standee, label }: { parts: PortraitParts; standee: StandeeParts; label?: string }) {
  const layers = standeeShapes(parts, standee);
  return (
    <svg
      viewBox={STANDEE_VIEW_BOX}
      style={{ width: '100%', height: '100%', display: 'block' }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <g>{drawLayers(layers, STANDEE_EDGE.colour)}</g>
      <g>{drawLayers(layers)}</g>
    </svg>
  );
}
