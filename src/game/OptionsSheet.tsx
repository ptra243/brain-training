import { Dialog } from './Dialog.tsx';
import { chooseLook, type Look } from './look.ts';

const CHOICES: { look: Look; label: string }[] = [
  { look: 'classic', label: 'Classic' },
  { look: 'shelf', label: 'Shelf' },
];

/** The options sheet, shared by both shells: for now just her look. */
export function OptionsSheet({ current, onClose }: { current: Look; onClose: () => void }) {
  return (
    <Dialog placement="center" labelId="options-title" onClose={onClose}>
      <h2 id="options-title">Options</h2>
      <p className="dialog-text" id="look-label">
        Look
      </p>
      <div className="dialog-actions" role="group" aria-labelledby="look-label">
        {CHOICES.map(({ look, label }) => (
          <button
            key={look}
            className={look === current ? 'primary' : 'secondary'}
            aria-pressed={look === current}
            onClick={() => (look === current ? onClose() : chooseLook(look))}
          >
            {label}
          </button>
        ))}
      </div>
    </Dialog>
  );
}
