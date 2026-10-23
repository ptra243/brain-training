import { DEV_PAGES } from './previews.ts';
import { SCENARIOS } from './scenarios.ts';

/** Every dev page with a link and what it shows: the `#dev` index, and the list under an unknown id. */
export function DevList() {
  return (
    <>
      <ul>
        {DEV_PAGES.map((p) => (
          <li key={p.id}>
            <a href={`#dev/${p.id}`}>{p.id}</a> <span className="muted">{p.about}</span>
          </li>
        ))}
      </ul>
      <h2>Load a game state</h2>
      <p className="muted">Replaces the game saved in this browser, then opens the real game. Asks first.</p>
      <ul>
        {SCENARIOS.map((s) => (
          <li key={s.id}>
            <a href={`#dev/load/${s.id}`}>{s.id}</a> <span className="muted">{s.about}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
