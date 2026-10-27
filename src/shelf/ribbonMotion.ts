// The ribbons and the page turn on #shelf, ported from docs/mockups/ribbons-prototype.html.
// Plain DOM and Web Animations: it takes elements and numbers, knows no React. The component
// renders the elements once and calls `attachRibbons` in an effect; this module owns the
// `hidden`, `inert`, transform and class changes on them from then on.

import { MOTION, RIBBON, SWAY, dropOrder, flickCount, tuckStep, turnDirection, type Motion } from './ribbonPlan.ts';

export interface RibbonElements {
  /** Holds the pages, the leaves while one turns, and `under`. */
  pages: HTMLElement;
  /** Shadow under a turning leaf. */
  under: HTMLElement;
  /** The page of each section, in book order. */
  sections: HTMLElement[];
  /** The 44px strip at the top that drops the ribbons. */
  pull: HTMLElement;
  /** Over the page while the ribbons are down: a tap or swipe up tucks them. */
  scrim: HTMLElement;
  /** The nav the ribbons hang in. */
  nav: HTMLElement;
  /** The ribbon buttons, in book order. */
  ribbons: HTMLElement[];
  /** The ribbon lying in the crease. */
  crease: HTMLElement;
}

/** The hashed CSS-module class names the code toggles or creates. */
export interface RibbonClasses {
  open: string;
  empty: string;
  leaf: string;
  page: string;
  back: string;
  blank: string;
  shade: string;
}

export interface RibbonOptions {
  /** Called when a turn starts, with the section she is turning to. */
  onTurn?: (section: number) => void;
  /** Drop the ribbons straight away (the dev preview). */
  startOpen?: boolean;
  motion?: Motion;
}

export interface RibbonControls {
  drop: () => void;
  tuck: () => void;
  turnTo: (section: number) => void;
  /** Removes the listeners and any leaf still in flight. */
  dispose: () => void;
}

const CREASE_SHOWN = 'polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 7px), 0 100%)';
const CREASE_HIDDEN = 'polygon(0 0, 100% 0, 100% 0, 50% 0, 0 0)';

export function attachRibbons(els: RibbonElements, cls: RibbonClasses, opts: RibbonOptions = {}): RibbonControls {
  const S: Motion = opts.motion ?? { ...MOTION };
  const { pages: pagesEl, under, sections, pull, scrim, nav, ribbons, crease } = els;
  const slots = ribbons.map((r) => r.parentElement as HTMLElement);
  const count = ribbons.length;
  const disposers: (() => void)[] = [];
  const on = <E extends EventTarget>(target: E, type: string, handler: (e: never) => void) => {
    target.addEventListener(type, handler as EventListener);
    disposers.push(() => target.removeEventListener(type, handler as EventListener));
  };

  let cur = 0;
  let open = false;
  let busy = false;

  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  // From the fixed RIBBON length, never measured: at rest only the tip shows; gone is fully above the page.
  const restY = RIBBON.tip - RIBBON.visible;
  const goneY = -(RIBBON.visible + RIBBON.hidden) - 10;

  function moveRibbon(r: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions) {
    const now = getComputedStyle(r).transform;
    r.getAnimations().forEach((a) => a.cancel());
    const from = now === 'none' ? 'translateY(0)' : now;
    r.style.transform = from;
    const a = r.animate([{ transform: from }, ...frames], { fill: 'forwards', ...options });
    a.finished
      .then(() => {
        a.commitStyles();
        a.cancel();
      })
      .catch(() => {});
  }

  function drop() {
    if (open || busy) return;
    open = true;
    nav.classList.add(cls.open);
    nav.inert = false;
    scrim.hidden = false;
    pull.hidden = true;
    dropOrder(count, cur).forEach((i, order) => {
      const r = ribbons[i];
      if (reduced()) return moveRibbon(r, [{ transform: 'translateY(0)' }], { duration: 0 });
      // Falls with a little give, swings past and settles like satin.
      const s = S.sway * SWAY[i];
      moveRibbon(
        r,
        [
          { transform: `translateY(${S.over}px) rotate(${s}deg)`, offset: 0.55 },
          { transform: `translateY(${-S.over * 0.25}px) rotate(${-s * 0.55}deg)`, offset: 0.78 },
          { transform: `translateY(${S.over * 0.08}px) rotate(${s * 0.2}deg)`, offset: 0.9 },
          { transform: 'translateY(0) rotate(0deg)' },
        ],
        { duration: S.drop, delay: order * S.stagger, easing: 'cubic-bezier(.25,.7,.35,1)' },
      );
    });
  }

  function tuck() {
    const wasOpen = open;
    open = false;
    nav.classList.remove(cls.open);
    nav.inert = true;
    scrim.hidden = true;
    pull.hidden = false;
    ribbons.forEach((r, i) => {
      const target = i === cur ? goneY : restY;
      if (!wasOpen && i !== cur && Math.round(new DOMMatrix(getComputedStyle(r).transform).m42) === Math.round(target)) return;
      if (reduced()) return moveRibbon(r, [{ transform: `translateY(${target}px)` }], { duration: 0 });
      moveRibbon(r, [{ transform: `translateY(${target}px) rotate(0deg)` }], {
        duration: S.drop * 0.6,
        delay: tuckStep(count, i) * S.stagger * 0.5,
        easing: 'cubic-bezier(.5,0,.75,.4)',
      });
    });
  }

  function setCurrent(i: number) {
    ribbons.forEach((r, k) => {
      slots[k].classList.toggle(cls.empty, k === i);
      if (k === i) r.setAttribute('aria-current', 'page');
      else r.removeAttribute('aria-current');
    });
  }

  // The crease ribbon is pulled up and out, then the new one is drawn down into the crease.
  function swapCrease(i: number, outDelay: number, inDelay: number) {
    const el = crease;
    if (reduced()) {
      el.dataset.i = String(i);
      return;
    }
    el.getAnimations().forEach((a) => a.cancel());
    const out = el.animate([{ clipPath: CREASE_SHOWN }, { clipPath: CREASE_HIDDEN }], {
      duration: S.drop * 0.5,
      delay: outDelay,
      easing: 'cubic-bezier(.5,0,.75,.4)',
      fill: 'forwards',
    });
    out.finished
      .then(() => {
        el.dataset.i = String(i);
        out.cancel();
        el.animate([{ clipPath: CREASE_HIDDEN }, { clipPath: CREASE_SHOWN }], {
          duration: S.drop,
          delay: Math.max(0, inDelay - outDelay - S.drop * 0.5),
          easing: 'cubic-bezier(.25,.7,.35,1)',
          fill: 'backwards',
        });
      })
      .catch(() => {});
  }

  function makeLeaf(page: HTMLElement, blank: boolean, z: number) {
    const leaf = document.createElement('div');
    leaf.className = cls.leaf;
    leaf.style.zIndex = String(z);
    leaf.setAttribute('aria-hidden', 'true');
    const front = page.cloneNode(true) as HTMLElement;
    front.hidden = false;
    front.removeAttribute('aria-label');
    if (blank) front.classList.add(cls.blank);
    const shade = document.createElement('div');
    shade.className = cls.shade;
    front.appendChild(shade);
    const back = document.createElement('div');
    back.className = `${cls.page} ${cls.back}`;
    leaf.append(front, back);
    pagesEl.appendChild(leaf);
    return { leaf, shade };
  }

  const leavesInFlight = new Set<HTMLElement>();

  function turnTo(i: number) {
    if (busy) return;
    const dir = turnDirection(cur, i);
    if (dir === 'stay') return tuck();
    busy = true;
    const from = sections[cur];
    const to = sections[i];
    const fwd = dir === 'forward';
    const extra = flickCount(cur, i, S.flicks);
    cur = i;
    setCurrent(i);
    tuck();
    opts.onTurn?.(i);

    if (reduced()) {
      swapCrease(i, 0, 0);
      to.hidden = false;
      to.style.zIndex = '6';
      to.animate([{ opacity: 0 }, { opacity: 1 }], { duration: S.fade, easing: 'ease-out' }).finished.then(() => {
        from.hidden = true;
        to.style.zIndex = '';
        busy = false;
      });
      return;
    }

    const flat = 'rotateY(0deg)';
    const over = 'rotateY(-180deg)';
    const mid = `rotateY(-75deg) skewY(${-S.curl}deg)`;
    const lift: Keyframe[] = [{ transform: flat }, { transform: mid, offset: 0.42 }, { transform: over }];
    const land: Keyframe[] = [{ transform: over }, { transform: mid, offset: 0.58 }, { transform: flat }];
    const ease = 'cubic-bezier(.45,.05,.35,1)';
    const anims: Animation[] = [];
    const leaves: HTMLElement[] = [];
    const shadeFrames: Keyframe[] = fwd
      ? [{ opacity: 0 }, { opacity: 1, offset: 0.4 }, { opacity: 0 }]
      : [{ opacity: 0 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }];
    const total = S.turn + extra * S.flickGap;
    swapCrease(i, 0, total);

    if (fwd) {
      // The old page lifts off the new one; a few blank leaves follow it when she skips sections.
      to.hidden = false;
      from.hidden = true;
      const main = makeLeaf(from, false, 10);
      leaves.push(main.leaf);
      anims.push(main.leaf.animate(lift, { duration: S.turn, easing: ease, fill: 'forwards' }));
      anims.push(main.shade.animate(shadeFrames, { duration: S.turn }));
      for (let k = 0; k < extra; k++) {
        const b = makeLeaf(from, true, 9 - k);
        leaves.push(b.leaf);
        anims.push(b.leaf.animate(lift, { duration: S.turn * 0.55, delay: (k + 1) * S.flickGap, easing: ease, fill: 'both' }));
      }
      anims.push(under.animate([{ opacity: 0.8 }, { opacity: 0 }], { duration: total }));
    } else {
      // Blank leaves fall back first, then the page she asked for lands on top.
      for (let k = 0; k < extra; k++) {
        const b = makeLeaf(from, true, 6 + k);
        leaves.push(b.leaf);
        anims.push(b.leaf.animate(land, { duration: S.turn * 0.55, delay: k * S.flickGap, easing: ease, fill: 'both' }));
      }
      const main = makeLeaf(to, false, 10);
      leaves.push(main.leaf);
      const delay = extra * S.flickGap;
      anims.push(main.leaf.animate(land, { duration: S.turn, delay, easing: ease, fill: 'both' }));
      anims.push(main.shade.animate(shadeFrames, { duration: S.turn, delay, fill: 'backwards' }));
      anims.push(under.animate([{ opacity: 0 }, { opacity: 0.6, offset: 0.5 }, { opacity: 0 }], { duration: total }));
    }
    leaves.forEach((l) => leavesInFlight.add(l));

    Promise.all(anims.map((a) => a.finished))
      .then(() => {
        to.hidden = false;
        from.hidden = true;
        leaves.forEach((l) => {
          l.remove();
          leavesInFlight.delete(l);
        });
        busy = false;
      })
      .catch(() => {});
  }

  // The pull strip: a swipe down or a tap drops the ribbons. It never turns a page.
  let startY: number | null = null;
  let startX = 0;
  let fired = false;
  on(pull, 'pointerdown', (e: PointerEvent) => {
    startY = e.clientY;
    startX = e.clientX;
    fired = false;
  });
  on(pull, 'pointermove', (e: PointerEvent) => {
    if (startY === null || fired) return;
    if (e.clientY - startY > 16) {
      fired = true;
      drop();
    }
  });
  on(window, 'pointerup', (e: PointerEvent) => {
    if (startY === null) return;
    const still = Math.abs(e.clientY - startY) < 10 && Math.abs(e.clientX - startX) < 10;
    if (!fired && still) drop();
    startY = null;
  });
  // A keyboard activation has no pointer: click with detail 0.
  on(pull, 'click', (e: MouseEvent) => {
    if (e.detail === 0) drop();
  });

  // Over the dropped ribbons: a tap on the page or a swipe up tucks them.
  let scrimY: number | null = null;
  on(scrim, 'pointerdown', (e: PointerEvent) => {
    scrimY = e.clientY;
  });
  on(scrim, 'pointermove', (e: PointerEvent) => {
    if (scrimY !== null && scrimY - e.clientY > 16) {
      scrimY = null;
      tuck();
    }
  });
  on(scrim, 'pointerup', () => {
    if (scrimY !== null) {
      scrimY = null;
      tuck();
    }
  });

  // A ribbon turns the page only when the tap started on it while the ribbons were already down,
  // so the late click from the tap that dropped them can't land on one.
  let armed = -1;
  ribbons.forEach((r, i) => {
    on(r, 'pointerdown', () => {
      armed = open ? i : -1;
    });
    on(r, 'click', (e: MouseEvent) => {
      const ok = e.detail === 0 ? open : armed === i && open;
      armed = -1;
      if (ok) turnTo(i);
    });
  });
  on(document, 'keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') tuck();
  });

  // Start with the current ribbon out of its slot.
  nav.inert = true;
  setCurrent(cur);
  ribbons.forEach((r, i) => {
    r.style.transform = `translateY(${i === cur ? goneY : restY}px)`;
  });
  if (opts.startOpen) drop();

  return {
    drop,
    tuck,
    turnTo,
    dispose() {
      disposers.forEach((d) => d());
      leavesInFlight.forEach((l) => l.remove());
      leavesInFlight.clear();
    },
  };
}
