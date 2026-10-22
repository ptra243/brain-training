import type { ReactNode } from 'react';
import { Dialog } from './Dialog.tsx';

interface Props {
  heading: string;
  /** The line under the heading. */
  children: ReactNode;
  /** The round time the button leads to, lowercase ("on to 10:00"). */
  nextTime: string;
  onContinue: () => void;
}

/** A jagged comic bubble around (258, 62). */
const BUBBLE = '310,62 287,72 284,93 258,82 232,93 229,72 206,62 229,52 232,31 258,42 284,31 287,52';

/**
 * The full-screen scene after a wrong accusation: a storm at the window, the room lit by a flash, the clock at
 * twelve and a scream. A tap anywhere (or the button) goes on. Only the bolt and the flash move, and only when
 * motion is welcome; otherwise it is a still, lit picture.
 */
export function NextMurderScene({ heading, children, nextTime, onContinue }: Props) {
  return (
    <Dialog placement="scene" labelId="next-body-title" onClose={onContinue}>
      <svg className="storm" viewBox="0 0 320 190" aria-hidden="true" focusable="false">
        <rect width="320" height="190" fill="#4a3b2b" />
        <rect y="150" width="320" height="40" fill="#2e2418" />
        <rect y="146" width="320" height="5" fill="#6b563c" />
        {/* The clock, both hands at twelve. */}
        <circle cx="52" cy="62" r="26" fill="#f4f0e4" stroke="#8e6f27" strokeWidth="4" />
        <g stroke="#1e2a2f" strokeLinecap="round">
          <line x1="52" y1="62" x2="52" y2="42" strokeWidth="3" />
          <line x1="52" y1="62" x2="52" y2="40" strokeWidth="2" />
        </g>
        <circle cx="52" cy="62" r="2.5" fill="#1e2a2f" />
        <path d="M52 38 v4 M52 82 v4 M28 62 h4 M72 62 h4" stroke="#1e2a2f" strokeWidth="2" />
        {/* The flash: the room goes dark, then lights. */}
        <rect className="storm-dark" width="320" height="190" fill="#0a0e12" opacity="0" />
        {/* The window, always visible. */}
        <rect x="100" y="14" width="92" height="124" fill="#1b2733" stroke="#8e6f27" strokeWidth="5" />
        <g stroke="#8fa5b8" strokeWidth="1.2" strokeLinecap="round" opacity="0.7">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <line key={i} x1={108 + i * 11} y1={22 + (i % 3) * 14} x2={104 + i * 11} y2={40 + (i % 3) * 14} />
          ))}
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <line key={i} x1={113 + i * 11} y1={72 + (i % 3) * 12} x2={109 + i * 11} y2={90 + (i % 3) * 12} />
          ))}
        </g>
        <polygon className="storm-bolt" points="150,16 134,66 148,66 138,112 166,54 152,54 162,16" fill="#fff6c2" stroke="#c8a24c" strokeWidth="1" />
        <line x1="146" y1="14" x2="146" y2="138" stroke="#8e6f27" strokeWidth="4" />
        <line x1="100" y1="76" x2="192" y2="76" stroke="#8e6f27" strokeWidth="4" />
        {/* The scream. */}
        <polygon points={BUBBLE} fill="#f4f0e4" stroke="#a8322d" strokeWidth="3" strokeLinejoin="round" />
        <text x="258" y="67" textAnchor="middle" fontFamily="var(--serif)" fontWeight="bold" fontSize="15" fill="#a8322d">
          Aaaah!
        </text>
      </svg>
      <h2 id="next-body-title">{heading}</h2>
      <p className="dialog-text">{children}</p>
      <div className="dialog-actions single">
        <button
          data-autofocus
          className="primary"
          onClick={(e) => {
            e.stopPropagation();
            onContinue();
          }}
        >
          On to {nextTime}
        </button>
      </div>
      <p className="scene-tap">Tap anywhere to continue</p>
    </Dialog>
  );
}
