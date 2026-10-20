/** Full-screen loading overlay while a case is built. Blocks taps at once; fades in late so quick builds don't flash. */
export function Shuffling() {
  return (
    <div className="shuffling" role="status" aria-live="polite">
      <div className="shuffling-card">
        <h2>Shuffling the cards…</h2>
      </div>
    </div>
  );
}
