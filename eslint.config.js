import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/.vercel/**', '**/.vite/**', '**/vite.config.js', '**/vite.config.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['frontend/src/**/*.{ts,tsx}'], languageOptions: { globals: globals.browser } },
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    // Only the two classic hook rules: the plugin's newer React-Compiler rules
    // flag large parts of the existing UI and are out of scope here.
    rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'warn' },
  },
  { files: ['**/*.js', 'frontend/vite.config.ts'], languageOptions: { globals: globals.node } },
  { rules: { 'no-unused-vars': 'off', '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } }
);
