import { useEffect, useEffectEvent, useRef } from 'react';

interface Props {
  /** "{Name} wasn't the killer". */
  title: string;
  /** What happened next, and how many accusations are left. */
  body: string;
  /** "Tap to go on to midnight". */
  line: string;
  onContinue: () => void;
}

// A jagged outline for the scream: spikes alternate between two radii, with a fixed wobble (no randomness).
const BURST = (() => {
  // Lower left, clear of the grandfather clock on the right.
  const [cx, cy, spikes] = [112, 400, 16];
  const wobble = [1, 0.92, 1.06, 0.95, 1.02];
  const points: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const outer = i % 2 === 0;
    const k = outer ? wobble[(i / 2) % wobble.length] : 0.84;
    const a = (Math.PI * i) / spikes;
    points.push(`${(cx + Math.cos(a) * 100 * k).toFixed(1)},${(cy + Math.sin(a) * 52 * k).toFixed(1)}`);
  }
  return points.join(' ');
})();

// Static rain, clipped to the glass.
const RAIN = (() => {
  const lines: { x: number; y: number }[] = [];
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 8; col++) lines.push({ x: 46 + col * 24 + (row % 2) * 12, y: 36 + row * 26 });
  }
  return lines;
})();

const CLOCK_TICKS = Array.from({ length: 12 }, (_, i) => i);

/**
 * The scene between rounds when she accuses the wrong person: a stormy night, a scream, a grandfather clock at midnight.
 * The whole screen is the button. A click only continues when the press began here (or came from the keyboard):
 * the tap that opened the scene sends a late click onto whatever is now underneath, which must not skip it.
 */
export function NextMurder({ title, body, line, onContinue }: Props) {
  const pressedHere = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const done = useEffectEvent(() => onContinue());

  // Focus once on open, and Escape continues (as closing the old dialog did).
  useEffect(() => {
    buttonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && done();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="next-murder" role="dialog" aria-modal="true" aria-labelledby="next-body-title">
      <button
        ref={buttonRef}
        data-autofocus
        className="nm-button"
        onPointerDown={() => {
          pressedHere.current = true;
        }}
        onClick={(e) => {
          const wanted = pressedHere.current || e.detail === 0;
          pressedHere.current = false;
          if (wanted) onContinue();
        }}
      >
        <svg className="nm-art" viewBox="0 0 360 480" aria-hidden="true" focusable="false">
          <defs>
            <clipPath id="nm-glass">
              <rect x="60" y="50" width="150" height="190" />
            </clipPath>
          </defs>
          <rect className="nm-room" x="0" y="0" width="360" height="480" />

          {/* The window: night sky, rain, the bolt, then the brass frame and mullion over them. */}
          <rect x="60" y="50" width="150" height="190" fill="#0b1424" />
          <g clipPath="url(#nm-glass)" className="nm-rain">
            {RAIN.map((r) => (
              <line key={`${r.x}-${r.y}`} x1={r.x} y1={r.y} x2={r.x - 8} y2={r.y + 22} />
            ))}
          </g>
          <polygon className="nm-bolt" points="150,50 118,118 142,118 110,190 176,104 150,104 180,50" />
          <rect className="nm-frame" x="60" y="50" width="150" height="190" />
          <line className="nm-mullion" x1="135" y1="50" x2="135" y2="240" />
          <line className="nm-mullion" x1="60" y1="145" x2="210" y2="145" />
          <rect className="nm-sill" x="52" y="240" width="166" height="10" rx="2" />

          {/* The lit room when the lightning shows. */}
          <rect className="nm-flash" x="-200" y="-200" width="760" height="900" />

          {/* A grandfather clock on the floor, both hands at twelve. The pendulum is still. */}
          <g className="nm-clock">
            <ellipse className="nm-case" cx="284" cy="108" rx="50" ry="46" />
            <polygon className="nm-case" points="284,52 275,74 293,74" />
            <rect className="nm-case" x="234" y="108" width="100" height="58" />
            <circle className="nm-clock-face" cx="284" cy="118" r="30" />
            {CLOCK_TICKS.map((i) => (
              <line
                key={i}
                className="nm-tick"
                x1="284"
                y1="92"
                x2="284"
                y2={i % 3 === 0 ? 100 : 96}
                transform={`rotate(${i * 30} 284 118)`}
              />
            ))}
            <line className="nm-hand" x1="284" y1="118" x2="284" y2="102" strokeWidth="4" />
            <line className="nm-hand" x1="284" y1="118" x2="284" y2="94" strokeWidth="2.5" />
            <circle cx="284" cy="118" r="3.5" fill="var(--ink)" />
            <rect className="nm-case" x="246" y="166" width="76" height="236" />
            <rect className="nm-glass" x="258" y="184" width="52" height="200" />
            <line className="nm-rod" x1="284" y1="198" x2="284" y2="328" />
            <ellipse className="nm-bob" cx="284" cy="346" rx="12" ry="16" />
            <rect className="nm-case" x="228" y="402" width="112" height="26" />
            <rect className="nm-case" x="234" y="428" width="18" height="16" />
            <rect className="nm-case" x="322" y="428" width="18" height="16" />
          </g>

          {/* The scream. */}
          <polygon className="nm-burst" points={BURST} />
          <text className="nm-scream" x="112" y="412" textAnchor="middle">
            Murder!
          </text>
        </svg>
        <span id="next-body-title" className="nm-title">
          {title}
        </span>
        <span className="nm-body">{body}</span>
        <span className="nm-go">{line}</span>
      </button>
    </div>
  );
}
