import { useEffect, useEffectEvent, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ROUNDS } from '../engine/campaign.ts';
import { candleLabel } from './campaignBook.ts';
import type { LaterScene } from './campaignAnswer.ts';
import type { EndScene } from './campaignEnd.ts';
import styles from './CandleScene.module.css';
import { trapTab } from './focusTrap.ts';
import { useBackLayer } from './useBackLayer.ts';

/** One big candle: lit, going out (the flame shrinks, then a wisp of smoke), or already out. */
function Candle({ state }: { state: 'lit' | 'going' | 'out' }) {
  return (
    <svg viewBox="0 0 44 120" className={`${styles.candle} ${styles[state === 'lit' ? 'lit' : 'out']} ${state === 'going' ? styles.going : ''}`} aria-hidden="true">
      <circle className={styles.glow} cx="22" cy="26" r="26" />
      <rect x="11" y="44" width="22" height="70" rx="3" fill="#f3ead3" stroke="#6b5a3a" strokeWidth="1.5" />
      <path d="M12 62h20M12 82h20" stroke="#d9c9a0" strokeWidth="1.5" />
      <path d="M22 44v-8" stroke="#2a2118" strokeWidth="2.5" strokeLinecap="round" />
      <path className={styles.flame} d="M22 8c6.5 7.5 8.5 13 8.5 17A8.5 8.5 0 0 1 22 33.5 8.5 8.5 0 0 1 13.5 25c0-4.4 4.2-8 8.5-17z" />
      <path className={styles.smoke} d="M22 32c-5-4 5-7.5 0-12.5s4.5-6.5 2.5-11.5" />
    </svg>
  );
}

/**
 * "Later that night": the candles on the table, the one just spent going out (a short fade; with reduced
 * motion it is simply out), the body that was found and what is left. Full screen over the book. Continue,
 * Back and Escape all close it: the book is then on the next chapter.
 */
export function CandleScene({ scene, onContinue }: { scene: LaterScene | EndScene; onContinue: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const goRef = useRef<HTMLButtonElement>(null);
  useBackLayer(true, onContinue);
  const close = useEffectEvent(() => onContinue());
  useEffect(() => {
    goRef.current?.focus({ preventScroll: true });
    const root = rootRef.current;
    const untrap = root ? trapTab(root) : undefined;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      untrap?.();
    };
  }, []);
  return createPortal(
    <div ref={rootRef} className={styles.table} role="dialog" aria-modal="true" aria-labelledby="later-title" tabIndex={-1} data-testid={scene.kind === 'escaped' ? 'escaped-scene' : 'later-scene'}>
      <div className={styles.column}>
        <div className={styles.candles} role="img" aria-label={candleLabel(scene.lit)}>
          {Array.from({ length: ROUNDS }, (_, i) => (
            <Candle key={i} state={i < scene.lit ? 'lit' : i === scene.lit ? 'going' : 'out'} />
          ))}
        </div>
        <h2 id="later-title" className={styles.title}>
          {scene.heading}
        </h2>
        <p className={styles.text}>{scene.text}</p>
        <button ref={goRef} type="button" className={styles.go} onClick={onContinue}>
          {'button' in scene ? scene.button : `On to ${scene.nextTime}`}
        </button>
      </div>
    </div>,
    document.body,
  );
}
