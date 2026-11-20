import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const uprightTypography = {
  selector:
    'Property[key.name="fontStyle"] > Literal[value=/^(italic|oblique)/i]',
  message: 'Clipcard typography uses upright fonts.',
};

export default [
  {
    ignores: [
      '**/dist/**',
      '**/.astro/**',
      '**/.wxt/**',
      '**/.output/**',
      '**/tokens.ts',
      '**/media/generated/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-syntax': ['error', uprightTypography],
    },
  },
  {
    files: ['apps/extension/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        uprightTypography,
        {
          selector: 'JSXText[value=/[\\p{L}\\p{N}]/u]',
          message: 'Use a Clipcard locale message for interface copy.',
        },
      ],
    },
  },
  {
    files: ['**/*.{js,mjs,ts,tsx,astro}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ['**/*.astro'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
];
