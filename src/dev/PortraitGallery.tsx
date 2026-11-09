// The #dev/portraits art gallery (docs/art-guide.md, docs/portraits.md): the guest portraits, earlier
// looks kept in earlierPortraits, the mood tints, large view, player, cat coats and dog, then
// placeholder sections for standees, room plates and props that are not drawn yet.

import { cats } from '../content/index.ts';
import { catCoats, dogCoat, earlierPortraits, playerPortrait, portraits, standees } from '../content/portraits.ts';
import { Portrait } from '../game/Portrait.tsx';
import { Standee } from '../game/Standee.tsx';

const roleName = (id: string) => {
  const words = id.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

function Counters({ children }: { children: (size: 'big' | 'small') => React.ReactNode }) {
  return (
    <div className="pg-counters">
      <span className="pg-counter pg-big">{children('big')}</span>
      <span className="pg-counter pg-small">{children('small')}</span>
    </div>
  );
}

export function PortraitGallery() {
  const ids = Object.keys(portraits);
  const earlier = Object.entries(earlierPortraits).flatMap(([id, looks]) => looks.map((look) => ({ id, look })));
  return (
    <section className="pg">
      <h2>Portraits</h2>
      <div className="pg-grid">
        {ids.map((id) => (
          <figure key={id} className="pg-card">
            <div className="pg-art">
              <Portrait parts={portraits[id]} view="full" label={roleName(id)} />
            </div>
            <figcaption>{roleName(id)}</figcaption>
            <Counters>{() => <Portrait parts={portraits[id]} view="counter" />}</Counters>
          </figure>
        ))}
      </div>

      <h2>Earlier looks</h2>
      {earlier.length === 0 ? (
        <p className="pg-muted">None yet: a replaced look moves here.</p>
      ) : (
        <div className="pg-grid">
          {earlier.map(({ id, look }) => (
            <figure key={`${id}/${look.name}`} className="pg-card">
              <div className="pg-art">
                <Portrait parts={look.parts} view="full" label={`${roleName(id)}, ${look.name}`} />
              </div>
              <figcaption>{roleName(id)} — {look.name}</figcaption>
              <Counters>{() => <Portrait parts={look.parts} view="counter" />}</Counters>
              <p className="pg-why">Replaced {look.replaced}: {look.why}</p>
            </figure>
          ))}
        </div>
      )}

      <h3>Mood tints (hostile, none, warm)</h3>
      <div className="pg-row">
        {(['hostile', 'none', 'warm'] as const).map((tint) => (
          <figure key={tint} className="pg-card">
            <div className="pg-art">
              <Portrait parts={portraits.hostess} view="full" tint={tint} label={`Hostess, ${tint}`} />
            </div>
            <figcaption>{tint}</figcaption>
          </figure>
        ))}
      </div>

      <h3>Large view</h3>
      <div className="pg-large">
        <Portrait parts={portraits.butler} view="full" label="Butler, large" />
      </div>

      <h3>You</h3>
      <div className="pg-row">
        <figure className="pg-card">
          <div className="pg-art">
            <Portrait parts={playerPortrait} view="full" label="You" />
          </div>
          <figcaption>You</figcaption>
          <Counters>{() => <Portrait parts={playerPortrait} view="counter" />}</Counters>
        </figure>
      </div>

      <h3>The cats</h3>
      <div className="pg-grid">
        {catCoats.map((coat, i) => (
          <figure key={cats[i]} className="pg-card">
            <div className="pg-art">
              <Portrait coat={coat} view="full" label={`${cats[i]}, the house cat`} />
            </div>
            <figcaption>{cats[i]}</figcaption>
            <Counters>{() => <Portrait coat={coat} view="counter" />}</Counters>
          </figure>
        ))}
      </div>

      <h3>The dog</h3>
      <div className="pg-row">
        <figure className="pg-card">
          <div className="pg-art">
            <Portrait dog={dogCoat} view="full" label="The dog" />
          </div>
          <figcaption>The dog</figcaption>
          <Counters>{() => <Portrait dog={dogCoat} view="counter" />}</Counters>
        </figure>
      </div>
      <div className="pg-row">
        {(['hostile', 'none', 'warm'] as const).map((tint) => (
          <figure key={tint} className="pg-card">
            <div className="pg-art">
              <Portrait dog={dogCoat} view="full" tint={tint} label={`The dog, ${tint}`} />
            </div>
            <figcaption>{tint}</figcaption>
          </figure>
        ))}
      </div>

      <h2>Standees (full body)</h2>
      <p className="pg-muted">Frame 160 × 240; poses with elbows out use the full width.</p>
      <div className="pg-row">
        {Object.entries(standees).map(([id, standee]) => (
          <figure key={id} className="pg-card">
            <div style={{ width: 160, height: 240, background: 'var(--card-edge)' }}>
              <Standee parts={portraits[id]} standee={standee} label={roleName(id)} />
            </div>
            <figcaption>{roleName(id)}</figcaption>
          </figure>
        ))}
      </div>

      <h2>Room plates</h2>
      <p className="pg-muted">Not drawn yet. Frame 360 × 220 at phone width, straight-on view, the room's tint.</p>

      <h2>Props</h2>
      <p className="pg-muted">Not drawn yet. Line icons, 34 × 34 viewBox like the shelf labels.</p>
    </section>
  );
}
