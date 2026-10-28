import './fonts.ts';
import { Bookcase } from './Bookcase.tsx';
import styles from './Shelf.module.css';

/** `#shelf` is the bookcase. Any `#shelf/...` is a screen that is not drawn yet. */
export function ShelfPage() {
  // The address with no hash is the bookcase too, when she chose the Shelf look (`main.tsx`).
  const hash = window.location.hash;
  if (hash === '#shelf' || hash === '' || hash === '#') return <Bookcase />;
  return (
    <main className={styles.page}>
      <div className={styles.soon}>
        <p>This page isn&apos;t drawn yet.</p>
        <a className={styles.back} href="#shelf">
          Back to the shelf
        </a>
      </div>
    </main>
  );
}
