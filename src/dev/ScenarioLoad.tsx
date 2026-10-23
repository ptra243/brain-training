import { useEffect } from 'react';
import { Dialog } from '../game/Dialog.tsx';
import { DevList } from './DevList.tsx';
import { SCENARIOS } from './scenarios.ts';

/** `#dev/load/<id>`: asks first, since loading replaces the game saved in this browser, then opens the real game on it. */
export function ScenarioLoad({ id }: { id: string }) {
  const scenario = SCENARIOS.find((s) => s.id === id);
  useEffect(() => {
    document.body.classList.add('dev-game');
  }, []);

  if (!scenario) {
    return (
      <main className="inspector">
        <h1>No game state called "{id}"</h1>
        <DevList />
      </main>
    );
  }
  const back = () => {
    window.location.hash = '#dev';
  };
  const load = () => {
    scenario.load();
    // The page reloads on a hash change (main.tsx), so the game opens fresh on the new save.
    window.location.hash = '';
  };
  return (
    <Dialog placement="center" labelId="load-title" onClose={back}>
      <h2 id="load-title">Load "{scenario.id}"?</h2>
      <p className="dialog-text">{scenario.about}. This replaces the game saved in this browser. This can't be undone.</p>
      <div className="dialog-actions">
        <button data-autofocus className="secondary" onClick={back}>
          Cancel
        </button>
        <button className="primary" onClick={load}>
          Load it
        </button>
      </div>
    </Dialog>
  );
}
