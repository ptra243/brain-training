import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import { reactRefresh } from 'eslint-plugin-react-refresh';

export default defineConfig(
  { ignores: ['dist', 'dev-dist', 'node_modules', '.claude/worktrees', '.claude/handoff', 'brain-training'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    rules: {
      // Same ref = same case: engine randomness goes through the seeded Rng,
      // new codes through crypto (root CLAUDE.md).
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded Rng (or crypto for new codes).' },
        { object: 'window', property: 'confirm', message: 'Use the in-app Dialog.' },
      ],
      'no-restricted-globals': ['error', { name: 'confirm', message: 'Use the in-app Dialog.' }],
    },
  },
  {
    files: ['scripts/**/*.ts', 'src/**/*.test.ts', '.claude/**/*.mjs', 'vite.config.ts', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest']],
  },
  {
    files: ['src/**/*.tsx'],
    extends: [reactRefresh.configs.vite()],
  },
);
