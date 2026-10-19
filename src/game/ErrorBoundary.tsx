import { Component, type ReactNode } from 'react';
import { clearSaves } from './storage.ts';

interface State {
  failed: boolean;
}

/** Catches a crash anywhere below, so she sees a way out instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="home">
        <article className="card">
          <h2>Something went wrong</h2>
          <p className="dialog-text">Sorry, the game hit a problem. Try opening it again first.</p>
          <div className="dialog-actions">
            <button className="primary" onClick={() => window.location.reload()}>
              Try again
            </button>
            <button
              className="secondary"
              onClick={() => {
                clearSaves();
                window.location.reload();
              }}
            >
              Start fresh
            </button>
          </div>
          <p className="dialog-text">Starting fresh forgets the case you were playing.</p>
        </article>
      </div>
    );
  }
}
