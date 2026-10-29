// The little drawing on each game's #shelf puzzle label: a miniature of the puzzle itself (never a
// room, guest or weapon). 34 x 34 viewBox drawn at 26px, ink strokes 1 to 1.6px, only the paper's
// muted fills. The registry points each game at one of these and names its label kind.

import type { ReactNode, SVGProps } from 'react';

const INK = '#1e2a2f';

const Svg = ({ children, ...rest }: { children: ReactNode } & SVGProps<SVGSVGElement>) => (
  <svg width="26" height="26" viewBox="0 0 34 34" aria-hidden="true" {...rest}>
    {children}
  </svg>
);

export const WordleArt = () => {
  const row = (y: number, fills: Record<number, string>) =>
    [0, 1, 2, 3, 4].map((i) => <rect key={`${y}${i}`} x={1 + i * 6.6} y={y} width="5.6" height="5.6" fill={fills[i] ?? 'none'} />);
  return (
    <Svg fill="none" stroke={INK} strokeWidth="1">
      {row(10, { 1: '#e9d9a8', 3: '#b9c9a0' })}
      {row(18, {})}
    </Svg>
  );
};

export const CrosswordArt = () => {
  const black = new Set(['3,0', '1,1']);
  const cells = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 4; c++) cells.push(<rect key={`${r}${c}`} x={1 + c * 8} y={5 + r * 8} width="8" height="8" fill={black.has(`${c},${r}`) ? INK : 'none'} />);
  return (
    <Svg fill="none" stroke={INK} strokeWidth="1">
      {cells}
    </Svg>
  );
};

export const WordSearchArt = () => (
  <Svg>
    <g fontFamily="Georgia, serif" fontSize="8.5" fill={INK} textAnchor="middle">
      {[
        ['K', 'E', 'Y'],
        ['R', 'O', 'P'],
        ['T', 'A', 'N'],
      ].flatMap((row, r) =>
        row.map((ch, c) => (
          <text key={`${r}${c}`} x={6 + c * 11} y={10 + r * 11}>
            {ch}
          </text>
        )),
      )}
    </g>
    <rect x="1.5" y="1.8" width="31" height="11" rx="5.5" fill="none" stroke="#a8322d" strokeWidth="1.3" />
  </Svg>
);

export const CatsArt = () => (
  <Svg fill="none" stroke={INK} strokeWidth="1.3" strokeLinejoin="round">
    <path d="M5 30V16a4 4 0 0 1 8 0v4h8v-4a4 4 0 0 1 8 0v14" />
    <path d="M5 24h24" />
    <path d="M13 9l2-5 2 3 2-3 2 5" strokeLinecap="round" />
  </Svg>
);

export const SudokuArt = () => (
  <Svg>
    <g fill="none" stroke={INK}>
      <rect x="1.5" y="1.5" width="31" height="31" strokeWidth="1.6" />
      <path d="M11.8 1.5v31M22.2 1.5v31M1.5 11.8h31M1.5 22.2h31" strokeWidth=".8" />
    </g>
    <g fontFamily="Georgia, serif" fontSize="8" fill={INK} textAnchor="middle">
      <text x="6.6" y="9.6">4</text>
      <text x="27.4" y="9.6">7</text>
      <text x="17" y="20">1</text>
      <text x="6.6" y="30.4">9</text>
      <text x="27.4" y="30.4">2</text>
    </g>
  </Svg>
);

export const QuestioningArt = () => (
  <Svg fill="none" stroke={INK} strokeWidth="1.4" strokeLinejoin="round">
    <path d="M3 5h28v18H15l-7 6v-6H3z" />
    <path d="M14 11c0-2.4 1.6-3.4 3-3.4s3 1 3 2.8c0 2.2-3 2.2-3 4.6" strokeLinecap="round" />
    <circle cx="17" cy="19" r=".9" fill={INK} />
  </Svg>
);

export const BoardArt = () => (
  <Svg>
    <g fill="none" stroke={INK} strokeWidth="1.3">
      <rect x="2" y="2" width="30" height="30" />
      <path d="M14 2v14H2M14 16h18M22 16v16" />
    </g>
    <circle cx="8" cy="9" r="3" fill="#34436a" />
    <circle cx="27" cy="24" r="3" fill="#4f7a54" />
  </Svg>
);

export const TarotArt = () => (
  <Svg>
    <rect x="5" y="2" width="17" height="27" rx="2" fill="#fffdf6" stroke={INK} strokeWidth="1.2" transform="rotate(-10 13 16)" />
    <rect x="12" y="4" width="17" height="27" rx="2" fill="#fffdf6" stroke={INK} strokeWidth="1.2" transform="rotate(8 20 17)" />
    <path
      d="M21 11l1.6 3.4 3.7.4-2.8 2.5.8 3.7-3.3-1.9-3.3 1.9.8-3.7-2.8-2.5 3.7-.4z"
      fill="#d2a548"
      stroke="#9a7426"
      strokeWidth=".6"
      transform="rotate(8 20 17)"
    />
  </Svg>
);

export const NosingArt = () => (
  <Svg fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round">
    <circle cx="14" cy="14" r="9" />
    <path d="M21 21l9 9" strokeWidth="3" />
    <path d="M9.5 11a5 5 0 0 1 4-3.4" strokeWidth="1.2" />
  </Svg>
);

/** The finale's padlock. */
export const PadlockArt = () => (
  <Svg fill="none" stroke={INK} strokeWidth="1.5" strokeLinejoin="round">
    <rect x="7" y="15" width="20" height="16" rx="2.5" fill="#e9d9a8" />
    <path d="M11 15v-4a6 6 0 0 1 12 0v4" />
    <circle cx="17" cy="22" r="2" fill={INK} />
    <path d="M17 23.5v3" strokeLinecap="round" />
  </Svg>
);
