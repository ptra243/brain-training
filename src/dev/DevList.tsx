import { useState } from 'react';
import { devSections } from './devIndex.ts';

/** Every dev page with a link and what it shows, grouped, with jump buttons and a filter: the `#dev` index, and the list under an unknown id. */
export function DevList() {
  const [filter, setFilter] = useState('');
  const sections = devSections(filter);
  // The hash is the router, so jumping scrolls; it never sets an anchor.
  const jump = (anchor: string) => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return (
    <>
      <label className="dev-filter">
        <span>Filter</span>
        <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </label>
      {sections.length === 0 ? (
        <p className="muted">No dev page matches.</p>
      ) : (
        <>
          <div className="dev-jumps">
            {sections.map((s) => (
              <button key={s.anchor} type="button" onClick={() => jump(s.anchor)}>
                {s.title} ({s.rows.length})
              </button>
            ))}
          </div>
          {sections.map((s) => (
            <section key={s.anchor} id={s.anchor}>
              <h2>
                {s.title} ({s.rows.length})
              </h2>
              {s.note && <p className="muted">{s.note}</p>}
              <ul className="dev-rows">
                {s.rows.map((r) => (
                  <li key={r.href}>
                    <a href={r.href}>{r.id}</a>
                    <span className="muted dev-about" title={r.about}>
                      {r.about}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </>
  );
}
