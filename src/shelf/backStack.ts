// The Back button on #shelf. Opening a book, a puzzle or a pop-up is React state, so Android Back would
// close the tab. Each open layer pushes one history entry (same URL, so `hashchange` never fires) and
// Back pops the top layer. Plain TS: the history and the popstate hook are injected so node tests drive it.
//
// Entries are counted, not matched: above the shelf's own entry there is one guard entry plus one per
// layer, so closing a layer on screen "releases" it by going back one step, and the popstate that causes
// is ignored. Releases in one tick batch into one `history.go(-n)`.

export interface HistoryLike {
  pushState(state: unknown, title: string, url?: string): void;
  go(delta: number): void;
}

export interface BackEnv {
  history: HistoryLike;
  /** The current address, pushed again so the hash never changes. */
  href: () => string;
  /** Subscribe to popstate. */
  onPopState: (fn: () => void) => void;
  /** Run soon, after the current tick's synchronous work (batches releases). */
  soon: (fn: () => void) => void;
}

interface Layer {
  close: () => void;
  gone: boolean;
}

export interface BackStack {
  /** Register an open layer; Back calls `close`. The returned `release` is for when it closes on screen. */
  pushLayer: (close: () => void) => () => void;
  /** Keep one guard entry so Back at the bare shelf does nothing. Call from a user gesture. */
  ensureGuard: () => void;
  /** How many layers are open (tests). */
  depth: () => number;
}

export function createBackStack(env: BackEnv): BackStack {
  const layers: Layer[] = [];
  let guarded = false;
  let wantGuard = false;
  /** Releases waiting to go back one step each. */
  let pending = 0;
  /** A `history.go` is in flight: its popstate has not arrived. */
  let settling = false;
  let flushing = false;
  let queued: (() => void)[] = [];

  const push = () => env.history.pushState({ backLayer: true }, '', env.href());
  // A push waits while a traversal is in flight, or it would be swallowed by it.
  const run = (fn: () => void) => (settling ? queued.push(fn) : fn());
  // A new entry can take over one a release was about to remove.
  const entry = () => {
    if (pending > 0) pending--;
    else push();
  };

  function flush() {
    if (settling || pending === 0) return;
    const n = pending;
    pending = 0;
    settling = true;
    env.history.go(-n);
  }
  const scheduleFlush = () => {
    if (flushing) return;
    flushing = true;
    env.soon(() => {
      flushing = false;
      flush();
    });
  };

  // Every entry this stack pushes has this address.
  const home = env.href();

  env.onPopState(() => {
    // A different address is a link to another #shelf/... page, which reloads the app: not ours.
    if (env.href() !== home) return;
    if (settling) {
      settling = false;
      const todo = queued;
      queued = [];
      todo.forEach((fn) => fn());
      flush();
      return;
    }
    const top = layers.pop();
    if (top) {
      top.gone = true;
      top.close();
    } else if (wantGuard) {
      guarded = true;
      push();
    }
  });

  return {
    pushLayer(close) {
      const layer: Layer = { close, gone: false };
      layers.push(layer);
      run(entry);
      return () => {
        if (layer.gone) return;
        layer.gone = true;
        const i = layers.indexOf(layer);
        if (i >= 0) layers.splice(i, 1);
        pending++;
        scheduleFlush();
      };
    },
    ensureGuard() {
      wantGuard = true;
      if (guarded) return;
      guarded = true;
      run(push);
    },
    depth: () => layers.length,
  };
}

let shared: BackStack | null = null;

/** The one stack for this page, on the real history. */
export function shelfBack(): BackStack {
  shared ??= createBackStack({
    history: window.history,
    href: () => window.location.href,
    onPopState: (fn) => window.addEventListener('popstate', fn),
    soon: (fn) => queueMicrotask(fn),
  });
  return shared;
}

/**
 * Push the guard entry on the first tap or key press (Chrome ignores entries added without a gesture).
 * Only at the bare shelf: on a `#shelf/...` page Back is a real navigation and must work.
 */
export function startRootGuard(target: EventTarget = window, stack: BackStack = shelfBack()): () => void {
  const arm = () => {
    stack.ensureGuard();
    stop();
  };
  const stop = () => {
    target.removeEventListener('pointerdown', arm, true);
    target.removeEventListener('keydown', arm, true);
  };
  target.addEventListener('pointerdown', arm, true);
  target.addEventListener('keydown', arm, true);
  return stop;
}
