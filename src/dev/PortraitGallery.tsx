// The #dev/portraits gallery of the faceted portraits (docs/portraits.md): cards, counters,
// the three mood tints, the large view, the player and the cat coats.

import { cats } from '../content/index.ts';
import { catCoats, dogCoat, playerPortrait, portraits } from '../content/portraits.ts';
import { Portrait } from '../game/Portrait.tsx';

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
    </section>
  );
}
