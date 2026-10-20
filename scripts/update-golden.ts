// Rewrites src/engine/golden.json from the current generator. Only run it when
// a change to generated cases is intended. Run with: npm run update-golden
import { writeFileSync } from 'node:fs';
import { goldenHashes } from '../src/engine/golden.ts';

const hashes = goldenHashes();
writeFileSync(new URL('../src/engine/golden.json', import.meta.url), JSON.stringify(hashes, null, 2) + '\n');
console.log(`Wrote ${Object.keys(hashes).length} golden hashes.`);
