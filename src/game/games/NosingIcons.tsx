import type { MarkKind } from './nosingUi.ts';
import styles from './NosingKey.module.css';

// The icons of the Nosing board, drawn once around (0, 0) in squares (about 0.5 wide).
// The board scales and places them; the key draws the same shapes in small SVGs.

/** A five-point star, outer radius 0.22. */
const STAR = Array.from({ length: 10 }, (_, k) => {
  const a = (-90 + k * 36) * (Math.PI / 180);
  const r = k % 2 === 0 ? 0.22 : 0.095;
  return `${Math.round(Math.cos(a) * r * 1000) / 1000},${Math.round(Math.sin(a) * r * 1000) / 1000}`;
}).join(' ');

export function Paw() {
  return (
    <>
      <ellipse cx="0" cy="0.14" rx="0.17" ry="0.14" />
      <ellipse cx="-0.2" cy="-0.06" rx="0.07" ry="0.09" />
      <ellipse cx="-0.07" cy="-0.2" rx="0.07" ry="0.1" />
      <ellipse cx="0.07" cy="-0.2" rx="0.07" ry="0.1" />
      <ellipse cx="0.2" cy="-0.06" rx="0.07" ry="0.09" />
    </>
  );
}

const CAT_SHAPE = (
  <>
    <path className="ear" d="M-0.27 -0.16 L-0.21 -0.4 L-0.06 -0.27 Z M0.27 -0.16 L0.21 -0.4 L0.06 -0.27 Z" />
    <circle className="face" r="0.3" />
  </>
);

/** The shape of one kind of square, without any position. */
export function MarkIcon({ kind }: { kind: MarkKind }) {
  switch (kind) {
    case 'obstacle':
      return (
        <g className="mi mi-obstacle">
          <rect className="card" x="-0.17" y="-0.22" width="0.34" height="0.44" rx="0.04" />
          <path d="M-0.07 -0.08 C-0.07 -0.2 0.09 -0.2 0.09 -0.09 C0.09 -0.01 0 -0.02 0 0.06" />
          <circle className="ink" cx="0" cy="0.14" r="0.025" />
        </g>
      );
    case 'search':
      return (
        <g className="mi mi-search">
          <circle className="card" cx="-0.05" cy="-0.05" r="0.15" />
          <line x1="0.06" y1="0.06" x2="0.22" y2="0.22" />
        </g>
      );
    case 'speed':
      return (
        <g className="mi mi-speed">
          <path className="brass" d="M-0.15 -0.2 H0.15 L0.02 0 L0.15 0.2 H-0.15 L-0.02 0 Z" />
          <line x1="-0.17" y1="-0.2" x2="0.17" y2="-0.2" />
          <line x1="-0.17" y1="0.2" x2="0.17" y2="0.2" />
        </g>
      );
    case 'catFind':
      return (
        <g className="mi mi-catfind">
          <polygon className="brass" points={STAR} />
        </g>
      );
    case 'ladder':
      return (
        <g className="mi mi-paw">
          <Paw />
        </g>
      );
    case 'snake':
      return (
        <g className="mi mi-wool">
          <circle className="pencil" r="0.19" />
          <path d="M-0.15 -0.08 C-0.05 -0.02 0.07 -0.18 0.15 -0.07 M-0.18 0.03 C-0.05 0.1 0.08 -0.05 0.18 0.05 M-0.1 0.14 C0 0.1 0.08 0.1 0.11 0.14" className="thread" />
        </g>
      );
    case 'dog':
      return (
        <g className="mi mi-dog">
          <path className="dark" d="M-0.2 -0.14 L-0.3 0.04 L-0.14 0 Z M0.2 -0.14 L0.3 0.04 L0.14 0 Z" />
          <ellipse className="brass" rx="0.18" ry="0.16" />
          <ellipse className="ink" cx="0" cy="0.05" rx="0.06" ry="0.04" />
        </g>
      );
    case 'door':
      return (
        <g className="mi mi-door">
          <rect className="card" x="-0.14" y="-0.22" width="0.28" height="0.44" rx="0.04" />
          <circle className="ink" cx="0.07" cy="0.02" r="0.025" />
        </g>
      );
    case 'lock':
      return (
        <g className="mi mi-lock">
          <path d="M-0.12 -0.04 V-0.12 A0.12 0.12 0 0 1 0.12 -0.12 V-0.04" />
          <rect className="brass" x="-0.18" y="-0.05" width="0.36" height="0.26" rx="0.04" />
        </g>
      );
    case 'cat':
      return (
        <g className="mi mi-cat">
          {CAT_SHAPE}
          <circle className="eye" cx="-0.1" cy="-0.04" r="0.04" />
          <circle className="eye" cx="0.1" cy="-0.04" r="0.04" />
        </g>
      );
    case 'purr':
      return <g className="mi mi-ghost">{CAT_SHAPE}</g>;
  }
}

/** A small SVG of one icon, for the key. */
export function KeyIcon({ kind }: { kind: MarkKind }) {
  return (
    <svg className={styles.icon} viewBox="-0.4 -0.45 0.8 0.9" aria-hidden="true">
      <MarkIcon kind={kind} />
    </svg>
  );
}
