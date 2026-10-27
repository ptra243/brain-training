import { Bookcase } from './Bookcase.tsx';
import styles from './Shelf.module.css';

/** `#shelf` is the bookcase. Any `#shelf/...` is a screen that is not drawn yet. */
export function ShelfPage() {
  if (window.location.hash === '#shelf') return <Bookcase />;
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
